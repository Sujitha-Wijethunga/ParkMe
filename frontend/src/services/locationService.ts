import * as Location from 'expo-location';
import { Linking, Platform } from 'react-native';

export type LocationErrorCode =
  | 'SERVICES_DISABLED'
  | 'PERMISSION_DENIED'
  | 'PERMISSION_BLOCKED'
  | 'TIMEOUT'
  | 'UNAVAILABLE'
  | 'UNKNOWN';

export interface LocationError {
  code: LocationErrorCode;
  message: string;
  canRetry: boolean;
  canOpenSettings: boolean;
}

export interface DriverCoordinate {
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  timestamp?: number;
}

/**
 * Service to request foreground location and obtain the driver's current position.
 *
 * Rules adhered to:
 * - Uses foreground permission only (no background tracking).
 * - Finite timeout (8000ms) with balanced accuracy.
 * - Clear recovery actions for disabled services, denied, and permanently blocked permissions.
 * - Never silently falls back to a hardcoded location.
 * - No recurring polling or automatic loops.
 */
export async function getCurrentDriverLocation(
  timeoutMs: number = 8000
): Promise<DriverCoordinate> {
  // 1. Verify device location services are enabled
  try {
    const servicesEnabled = await Location.hasServicesEnabledAsync();
    if (!servicesEnabled) {
      const error: LocationError = {
        code: 'SERVICES_DISABLED',
        message: 'Location services are disabled on your device. Please turn on GPS / Location.',
        canRetry: true,
        canOpenSettings: true,
      };
      throw error;
    }
  } catch (err: any) {
    if (err?.code === 'SERVICES_DISABLED') throw err;
    // Continue if hasServicesEnabledAsync fails on web
  }

  // 2. Request Foreground Permission
  let permissionResponse = await Location.getForegroundPermissionsAsync();
  if (permissionResponse.status !== 'granted') {
    if (!permissionResponse.canAskAgain) {
      const error: LocationError = {
        code: 'PERMISSION_BLOCKED',
        message:
          'Location access is blocked. Please enable Location permission for ParkMe in your app settings.',
        canRetry: false,
        canOpenSettings: true,
      };
      throw error;
    }

    // Ask user for foreground permission
    permissionResponse = await Location.requestForegroundPermissionsAsync();
    if (permissionResponse.status !== 'granted') {
      const error: LocationError = {
        code: 'PERMISSION_DENIED',
        message: 'Location permission was denied. ParkMe requires your location to calculate 5-minute driving reach.',
        canRetry: true,
        canOpenSettings: !permissionResponse.canAskAgain,
      };
      throw error;
    }
  }

  // 3. Obtain location with finite timeout
  let location: Location.LocationObject | null = null;

  try {
    const positionPromise = Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        const error: LocationError = {
          code: 'TIMEOUT',
          message: 'Location request timed out. Please check your GPS signal and try again.',
          canRetry: true,
          canOpenSettings: false,
        };
        reject(error);
      }, timeoutMs);
    });

    location = await Promise.race([positionPromise, timeoutPromise]);
  } catch (err: any) {
    // Attempt fallback to last known location if current location timed out
    if (err?.code === 'TIMEOUT') {
      try {
        const lastKnown = await Location.getLastKnownPositionAsync({
          maxAge: 60000, // 1 minute max age
        });
        if (lastKnown) {
          location = lastKnown;
        } else {
          throw err;
        }
      } catch {
        throw err;
      }
    } else {
      throw err;
    }
  }

  if (!location || !location.coords) {
    const error: LocationError = {
      code: 'UNAVAILABLE',
      message: 'Unable to determine your current location. Please verify your GPS signal.',
      canRetry: true,
      canOpenSettings: false,
    };
    throw error;
  }

  return {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
    accuracy: location.coords.accuracy,
    timestamp: location.timestamp,
  };
}

/**
 * Opens device application settings so user can grant blocked permissions.
 */
export async function openLocationSettings(): Promise<void> {
  if (Platform.OS === 'web') {
    return;
  }
  try {
    await Linking.openSettings();
  } catch (err) {
    console.warn('Unable to open settings:', err);
  }
}
