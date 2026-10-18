/**
 * Push Notification Service (Expo Push Notifications)
 *
 * Sends push notifications to drivers and staff via Expo's push service.
 * Uses expo-server-sdk to validate tokens and batch messages.
 */

let Expo;
try {
  const expoModule = require('expo-server-sdk');
  Expo = expoModule.Expo || expoModule.default?.Expo || expoModule;
  if (typeof Expo === 'object' && Expo.Expo) Expo = Expo.Expo;
} catch {
  // Graceful degradation if expo-server-sdk is not yet installed
  Expo = null;
}

const expoClient = Expo ? new Expo() : null;

/**
 * Send push notifications to one or many Expo push tokens.
 *
 * @param {string | string[]} pushTokens   - One or more Expo push tokens
 * @param {string} title                   - Notification title
 * @param {string} body                    - Notification body
 * @param {object} [data]                  - Optional payload data
 * @returns {Promise<void>}
 */
async function sendPushNotification(pushTokens, title, body, data = {}) {
  if (!expoClient) {
    console.warn('[Push] expo-server-sdk not available. Skipping push notification.');
    return;
  }

  const tokens = Array.isArray(pushTokens) ? pushTokens : [pushTokens];

  const messages = [];
  for (const token of tokens) {
    if (!token) continue;
    if (!Expo.isExpoPushToken(token)) {
      console.warn(`[Push] Invalid Expo push token: ${token}`);
      continue;
    }
    messages.push({
      to: token,
      sound: 'default',
      title,
      body,
      data,
      priority: 'high',
    });
  }

  if (messages.length === 0) return;

  const chunks = expoClient.chunkPushNotifications(messages);
  for (const chunk of chunks) {
    try {
      const ticketChunk = await expoClient.sendPushNotificationsAsync(chunk);
      for (const ticket of ticketChunk) {
        if (ticket.status === 'error') {
          console.error(`[Push] Notification error: ${ticket.message}`, ticket.details);
        }
      }
    } catch (err) {
      console.error('[Push] Failed to send notification batch:', err.message);
    }
  }
}

/**
 * Notify driver that their parking expires soon (15 minutes warning).
 */
async function notifyParkingExpiringSoon(driverPushToken, vehiclePlate, lotName, reservationId) {
  await sendPushNotification(
    driverPushToken,
    '⏰ Parking Expiring Soon',
    `Your parking at ${lotName} expires in 15 minutes. Tap to extend or check out.`,
    { type: 'parking_expiry_warning', reservationId, vehiclePlate }
  );
}

/**
 * Notify staff about a new driver check-in request at the gate.
 */
async function notifyStaffCheckInRequest(staffPushTokens, driverName, vehiclePlate, lotName) {
  await sendPushNotification(
    staffPushTokens,
    '🚗 Driver at Gate',
    `${driverName} (${vehiclePlate}) is requesting check-in at ${lotName}.`,
    { type: 'checkin_request', vehiclePlate }
  );
}

/**
 * Notify staff about a driver checkout request.
 */
async function notifyStaffCheckoutRequest(staffPushTokens, vehiclePlate, slotNumber) {
  await sendPushNotification(
    staffPushTokens,
    '🔓 Checkout Request',
    `Vehicle ${vehiclePlate} (Slot ${slotNumber}) is requesting checkout.`,
    { type: 'checkout_request', vehiclePlate, slotNumber }
  );
}

module.exports = {
  sendPushNotification,
  notifyParkingExpiringSoon,
  notifyStaffCheckInRequest,
  notifyStaffCheckoutRequest,
};
