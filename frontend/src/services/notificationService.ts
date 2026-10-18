/**
 * Push Notification Service (Frontend)
 *
 * Registers device for Expo push notifications, saves token to backend,
 * and schedules local notifications (e.g., parking expiry warnings).
 */
import { Platform } from 'react-native';
import { API_BASE_URL } from '../constants/api';

// Gracefully try to import expo-notifications (requires native build)
let Notifications: any = null;
try {
  Notifications = require('expo-notifications');
} catch {
  // Not yet installed or running in Expo Go without dev client
}

// Configure notification behavior when app is in foreground
if (Notifications) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

/**
 * Request permissions and get Expo push token.
 * Returns the token string or null if unavailable.
 */
export async function registerForPushNotifications(): Promise<string | null> {
  if (!Notifications) {
    console.log('[Push] expo-notifications not available (requires dev build)');
    return null;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('parkme_default', {
      name: 'ParkMe Notifications',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#1E3A5F',
      sound: 'default',
    });
    await Notifications.setNotificationChannelAsync('parkme_parking', {
      name: 'Parking Alerts',
      description: 'Alerts for parking expiry and check-in/checkout',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 500],
      lightColor: '#F97316',
      sound: 'default',
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.warn('[Push] Push notification permission denied');
    return null;
  }

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
    });
    return tokenData.data;
  } catch (err: any) {
    console.warn('[Push] Could not get push token:', err?.message);
    return null;
  }
}

/**
 * Save the push token to the ParkMe backend.
 */
export async function savePushTokenToBackend(token: string, authToken: string): Promise<void> {
  try {
    await fetch(`${API_BASE_URL}/api/notifications/push-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ pushToken: token }),
    });
  } catch (err: any) {
    console.warn('[Push] Failed to save push token to backend:', err?.message);
  }
}

/**
 * Schedule a LOCAL notification for parking expiry warning (15 min before).
 * Pass expiryDate as the actual booking end time.
 */
export async function scheduleParkingExpiryNotification(
  vehiclePlate: string,
  lotName: string,
  expiryDate: Date,
  reservationId: string
): Promise<string | null> {
  if (!Notifications) return null;

  // Trigger 15 minutes before expiry
  const triggerMs = expiryDate.getTime() - 15 * 60 * 1000;
  const nowMs = Date.now();

  if (triggerMs <= nowMs) {
    // Expiry is too soon, fire immediately
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '⏰ Parking Expiring Soon',
        body: `Your parking at ${lotName} for ${vehiclePlate} expires in less than 15 minutes!`,
        data: { type: 'parking_expiry_warning', reservationId, vehiclePlate },
        sound: 'default',
        categoryIdentifier: 'parkme_parking',
      },
      trigger: null, // immediate
    });
    return null;
  }

  const identifier = await Notifications.scheduleNotificationAsync({
    content: {
      title: '⏰ Parking Expiring Soon',
      body: `Your parking at ${lotName} for ${vehiclePlate} expires in 15 minutes. Tap to extend.`,
      data: { type: 'parking_expiry_warning', reservationId, vehiclePlate },
      sound: 'default',
      categoryIdentifier: 'parkme_parking',
    },
    trigger: {
      date: new Date(triggerMs),
    },
  });

  return identifier;
}

/**
 * Cancel a previously scheduled notification.
 */
export async function cancelScheduledNotification(identifier: string): Promise<void> {
  if (!Notifications) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(identifier);
  } catch (err: any) {
    console.warn('[Push] Failed to cancel notification:', err?.message);
  }
}

/**
 * Clear all scheduled notifications.
 */
export async function clearAllNotifications(): Promise<void> {
  if (!Notifications) return;
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    await Notifications.dismissAllNotificationsAsync();
  } catch (err: any) {
    console.warn('[Push] Failed to clear notifications:', err?.message);
  }
}

export { Notifications };
