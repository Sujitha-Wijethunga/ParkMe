import { getApiBaseUrl } from '../constants/api';
import { SAMPLE_NEARBY_PARKING_LOTS } from '../constants/driverSampleData';
export { getApiBaseUrl };

export interface SearchSuggestionItem {
  id: string;
  name: string;
  address: string;
  city?: string;
  subtitle: string;
  availableSpaces?: number;
  pricePerHour?: number;
  type: 'lot' | 'city';
}

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

/**
 * Autocomplete suggestions for driver search input.
 * Debounced and cancels superseded requests with signal.
 */
export async function fetchSearchSuggestions(
  query: string,
  signal?: AbortSignal
): Promise<SearchSuggestionItem[]> {
  const clean = query.trim();
  if (!clean) return [];

  try {
    const url = `${getApiBaseUrl().replace(/\/+$/, '')}/api/parking-lots/suggestions?q=${encodeURIComponent(clean)}`;
    const res = await fetch(url, {
      signal,
      headers: { Accept: 'application/json' },
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        return data;
      }
    }
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw err;
    }
  }

  // Graceful offline fallback from local sample dataset
  const lower = clean.toLowerCase();
  const matchedLots = SAMPLE_NEARBY_PARKING_LOTS.filter((lot) => {
    const hay = `${lot.name} ${lot.address} ${lot.city || ''}`.toLowerCase();
    return hay.includes(lower);
  }).slice(0, 6);

  return matchedLots.map((lot) => ({
    id: lot.id,
    name: lot.name,
    address: lot.address,
    city: lot.city,
    subtitle: lot.city ? `${lot.address}, ${lot.city}` : lot.address,
    availableSpaces: lot.availableSpaces,
    pricePerHour: lot.pricePerHour,
    type: 'lot',
  }));
}


