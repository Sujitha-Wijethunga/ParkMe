import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const TOKEN_KEY = 'parkme_driver_token';
const USER_KEY = 'parkme_driver_user';
const BOOKING_KEY_PREFIX = 'parkme_driver_bookings_';
const SESSION_FEEDBACK_KEY_PREFIX = 'parkme_driver_session_feedback_';

export interface DriverUser {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'driver';
}

export interface DriverSessionFeedback {
  reservationId: string;
  rating: number | null;
  feedback: string;
  submittedAt: string;
}

// In-memory fallback for environments without SecureStore or localStorage
let memoryStorage: Record<string, string> = {};

async function setItem(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
        return;
      }
    } catch {
      // localStorage unavailable (e.g. private browsing quota)
    }
    memoryStorage[key] = value;
    return;
  }

  try {
    await SecureStore.setItemAsync(key, value);
  } catch (error) {
    console.warn(`[SecureStore.setItemAsync] Failed for key ${key}:`, error);
    memoryStorage[key] = value;
  }
}

async function getItem(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
    } catch {
      // localStorage unavailable
    }
    return memoryStorage[key] || null;
  }

  try {
    return await SecureStore.getItemAsync(key);
  } catch (error) {
    console.warn(`[SecureStore.getItemAsync] Failed for key ${key}:`, error);
    return memoryStorage[key] || null;
  }
}

async function deleteItem(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
        return;
      }
    } catch {
      // localStorage unavailable
    }
    delete memoryStorage[key];
    return;
  }

  try {
    await SecureStore.deleteItemAsync(key);
  } catch (error) {
    console.warn(`[SecureStore.deleteItemAsync] Failed for key ${key}:`, error);
    delete memoryStorage[key];
  }
}

/**
 * Stores the driver's JWT token securely.
 * Passwords are never stored in persistent storage.
 */
export async function saveDriverToken(token: string): Promise<void> {
  await setItem(TOKEN_KEY, token);
}

/**
 * Retrieves the stored driver JWT token.
 */
export async function getDriverToken(): Promise<string | null> {
  return await getItem(TOKEN_KEY);
}

/**
 * Removes the stored driver JWT token upon logout or session invalidation.
 */
export async function removeDriverToken(): Promise<void> {
  await deleteItem(TOKEN_KEY);
}

/**
 * Stores the authenticated driver user profile.
 */
export async function saveDriverUser(user: DriverUser): Promise<void> {
  await setItem(USER_KEY, JSON.stringify(user));
}

/**
 * Retrieves the cached driver user profile.
 */
export async function getDriverUser(): Promise<DriverUser | null> {
  const data = await getItem(USER_KEY);
  if (!data) return null;
  try {
    return JSON.parse(data) as DriverUser;
  } catch {
    return null;
  }
}

/**
 * Clears the driver user profile from storage.
 */
export async function removeDriverUser(): Promise<void> {
  await deleteItem(USER_KEY);
}

/**
 * Clears all driver authentication credentials.
 */
export async function clearDriverSession(): Promise<void> {
  await Promise.all([removeDriverToken(), removeDriverUser()]);
}

/**
 * Stores both driver profile and JWT token into storage.
 */
export async function saveDriverSession(user: DriverUser, token: string): Promise<void> {
  await Promise.all([saveDriverToken(token), saveDriverUser(user)]);
}

/**
 * Stores bookings created by the current client-side booking flow, keyed by driver.
 */
export async function saveDriverBookingData(userId: string, data: string): Promise<void> {
  if (!userId) throw new Error('A driver ID is required to save a booking.');
  await setItem(`${BOOKING_KEY_PREFIX}${userId}`, data);
}

/**
 * Retrieves bookings created by the current client-side booking flow.
 */
export async function getDriverBookingData(userId: string): Promise<string | null> {
  if (!userId) return null;
  return getItem(`${BOOKING_KEY_PREFIX}${userId}`);
}

export async function saveDriverSessionFeedback(
  userId: string,
  sessionFeedback: DriverSessionFeedback
): Promise<void> {
  if (!userId) throw new Error('A driver ID is required to save session feedback.');
  if (!sessionFeedback.reservationId) throw new Error('A booking ID is required to save session feedback.');
  if (
    sessionFeedback.rating !== null &&
    (!Number.isInteger(sessionFeedback.rating) || sessionFeedback.rating < 1 || sessionFeedback.rating > 5)
  ) {
    throw new Error('The session rating must be between 1 and 5.');
  }

  const key = `${SESSION_FEEDBACK_KEY_PREFIX}${userId}`;
  const saved = await getItem(key);
  let feedbackByReservation: Record<string, DriverSessionFeedback> = {};
  if (saved) {
    try {
      const parsed: unknown = JSON.parse(saved);
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        throw new Error('Saved session feedback has an unexpected format.');
      }
      feedbackByReservation = parsed as Record<string, DriverSessionFeedback>;
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error('Saved session feedback is invalid and could not be updated.');
      }
      throw error;
    }
  }

  feedbackByReservation[sessionFeedback.reservationId] = sessionFeedback;
  await setItem(key, JSON.stringify(feedbackByReservation));
}
