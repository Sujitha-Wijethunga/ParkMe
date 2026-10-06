import Constants from 'expo-constants';
import { Platform } from 'react-native';

export interface NearbyDrivingLot {
  id: string;
  name: string;
  address: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  entranceCoordinates: {
    lat: number;
    lng: number;
  } | null;
  hasEntranceCoordinates: boolean;
  navigationCoordinates: {
    lat: number;
    lng: number;
  };
  navigationCoordinatesNote: string;
  availableSpaces: number;
  totalSpaces: number;
  pricePerHour: number;
  status: 'Available' | 'Limited' | 'Full';
  amenities: string[];
  openTime?: string;
  closeTime?: string;
  durationSeconds: number;
  durationMinutes?: number | null;
  durationFormatted: string;
  distanceMeters: number;
  distanceFormatted: string;
  imageUrl?: string;
  isWithinFiveMinutes?: boolean;
  isDistanceFallback?: boolean;
  freshness?: string;
  parkingType?: string;
  isCovered?: boolean;
}

export interface NearbyDrivingResponse {
  origin: { lat: number; lng: number };
  maxDurationSeconds: number;
  results: NearbyDrivingLot[];
  count: number;
  provider: string;
  providerAttribution: string;
  isLiveTraffic: boolean;
  isDistanceFallback?: boolean;
  disclaimer: string;
}

export interface LotAvailabilityCheck {
  lotId: string;
  name: string;
  address: string;
  availableSpaces: number;
  totalSpaces: number;
  pricePerHour: number;
  isAvailable: boolean;
  hasEntranceCoordinates: boolean;
  navigationCoordinates: {
    lat: number;
    lng: number;
  };
  navigationCoordinatesNote: string;
  lastChecked: string;
  disclaimer: string;
}

/**
 * Determine the backend API URL.
 * Supports:
 * - EXPO_PUBLIC_API_URL environment variable
 * - Dynamic LAN IP when running on physical device via Expo development
 * - Android emulator loopback (10.0.2.2)
 * - Localhost fallback for web / iOS simulator
 */
export function getApiBaseUrl(): string {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  // Attempt to extract development host IP from Expo Constants
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const ip = hostUri.split(':')[0];
    if (ip && ip !== 'localhost' && ip !== '127.0.0.1') {
      return `http://${ip}:5000`;
    }
  }

  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:5000';
  }

  return 'http://localhost:5000';
}

/**
 * Fetches parking lots within driving time limit (e.g. 300s = 5 min)
 *
 * @param lat Driver current latitude
 * @param lng Driver current longitude
 * @param maxDurationSeconds Driving duration limit (300 for 5 min, 600 for 10 min)
 */
export async function fetchNearbyDrivingLots(
  lat: number,
  lng: number,
  maxDurationSeconds: number = 300
): Promise<NearbyDrivingResponse> {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}/api/parking-lots/nearby-driving?lat=${encodeURIComponent(
    lat
  )}&lng=${encodeURIComponent(lng)}&maxDuration=${encodeURIComponent(
    maxDurationSeconds
  )}&availableOnly=true`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errData = await response.json().catch(() => null);
      const msg = errData?.message || `Server returned error ${response.status}`;
      throw new Error(msg);
    }

    const data: NearbyDrivingResponse = await response.json();
    return data;
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('Connection timed out while searching for nearby parking. Please check your network.');
    }
    throw err;
  }
}

/**
 * Re-checks a single lot's live availability immediately before launching navigation.
 * Ensures driver is not sent to a lot that just filled up.
 */
export async function checkLotAvailability(lotId: string): Promise<LotAvailabilityCheck> {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}/api/parking-lots/${encodeURIComponent(lotId)}/availability`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errData = await response.json().catch(() => null);
      throw new Error(errData?.message || `Failed to verify lot availability (${response.status})`);
    }

    const data: LotAvailabilityCheck = await response.json();
    return data;
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('Availability check timed out. Please try again.');
    }
    throw err;
  }
}

/**
 * Fetches all active parking lots across Sri Lanka from backend API,
 * with optional text search (by city, landmark, or street name).
 */
export async function fetchAllParkingLots(search?: string): Promise<any[]> {
  const baseUrl = getApiBaseUrl();
  const url = search && search.trim()
    ? `${baseUrl}/api/parking-lots?search=${encodeURIComponent(search.trim())}`
    : `${baseUrl}/api/parking-lots`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Server returned status ${response.status}`);
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('Search request timed out. Please check your connection.');
    }
    throw err;
  }
}

