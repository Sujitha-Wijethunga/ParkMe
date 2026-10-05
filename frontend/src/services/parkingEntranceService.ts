import { Linking, Platform, Alert } from 'react-native';

export interface ParkingEntranceInfo {
  lotId: string;
  lotName: string;
  address: string;
  entranceName: string;
  latitude: number | null;
  longitude: number | null;
  hasVerifiedEntrance: boolean;
  statusMessage?: string;
}

/**
 * Verified vehicle entrances for known ParkMe parking lots in Colombo.
 * Each lot specifies its exact vehicle access point rather than an arbitrary center point.
 */
export const VERIFIED_LOT_ENTRANCES: Record<string, {
  name: string;
  address: string;
  entranceName: string;
  latitude: number;
  longitude: number;
}> = {
  'lot-1': {
    name: 'One Galle Face Mall Parking',
    address: '1A Centre Road, Colombo 02',
    entranceName: 'Gate 01 — East Entrance (off Centre Rd / Justice Akbar Mawatha)',
    latitude: 6.9272,
    longitude: 79.8462,
  },
  'lot-2': {
    name: 'Liberty Plaza Multi-Story',
    address: 'R.A. De Mel Mawatha, Colombo 03',
    entranceName: 'R.A. De Mel Mawatha Ramp Entrance',
    latitude: 6.9064,
    longitude: 79.8522,
  },
  'lot-3': {
    name: 'Crescat Boulevard Parking',
    address: '89 Galle Road, Colombo 03',
    entranceName: 'Galle Road Vehicle Access Ramp',
    latitude: 6.9178,
    longitude: 79.8495,
  },
  'lot-4': {
    name: 'Majestic City Basement',
    address: '10 Station Road, Colombo 04',
    entranceName: 'Station Road Basement Gate',
    latitude: 6.8942,
    longitude: 79.8550,
  },
};

/**
 * Validates whether latitude and longitude are valid, non-zero finite numbers.
 */
export function isValidLatLng(lat: unknown, lng: unknown): boolean {
  if (typeof lat !== 'number' || typeof lng !== 'number') return false;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return false;
  if (lat === 0 && lng === 0) return false; // uninitialized origin
  return true;
}

/**
 * Resolves verified vehicle entrance coordinates for a lot.
 * Supports:
 * 1. Verified lot entrance registry (lot-1, lot-2, lot-3, lot-4).
 * 2. Dynamic lot object with entranceCoordinates ({ lat, lng }).
 * 3. Dynamic lot object with GeoJSON entranceLocation.coordinates ([lng, lat]).
 * 4. Flags lots with missing or uninitialized coordinates.
 *
 * @param lotId ID of the parking lot
 * @param lotObject Optional dynamic lot object from API or constants
 */
export function getParkingLotEntranceInfo(
  lotId: string,
  lotObject?: any
): ParkingEntranceInfo {
  // Check verified registry first
  const registryEntry = VERIFIED_LOT_ENTRANCES[lotId];
  if (registryEntry) {
    return {
      lotId,
      lotName: lotObject?.name || registryEntry.name,
      address: lotObject?.address || registryEntry.address,
      entranceName: registryEntry.entranceName,
      latitude: registryEntry.latitude,
      longitude: registryEntry.longitude,
      hasVerifiedEntrance: true,
      statusMessage: `Verified entrance at ${registryEntry.entranceName}`,
    };
  }

  // Check if lotObject has entranceCoordinates { lat, lng }
  if (lotObject?.entranceCoordinates) {
    const lat = lotObject.entranceCoordinates.lat;
    const lng = lotObject.entranceCoordinates.lng;
    if (isValidLatLng(lat, lng)) {
      return {
        lotId,
        lotName: lotObject.name || 'Parking Lot',
        address: lotObject.address || '',
        entranceName: lotObject.entranceName || 'Designated Vehicle Entrance',
        latitude: lat,
        longitude: lng,
        hasVerifiedEntrance: true,
        statusMessage: lotObject.entranceName || 'Designated Vehicle Entrance',
      };
    }
  }

  // Check if lotObject has GeoJSON entranceLocation { coordinates: [lng, lat] }
  if (
    lotObject?.entranceLocation &&
    Array.isArray(lotObject.entranceLocation.coordinates) &&
    lotObject.entranceLocation.coordinates.length === 2
  ) {
    const [lng, lat] = lotObject.entranceLocation.coordinates;
    if (isValidLatLng(lat, lng)) {
      return {
        lotId,
        lotName: lotObject.name || 'Parking Lot',
        address: lotObject.address || '',
        entranceName: lotObject.entranceName || 'Designated Vehicle Entrance',
        latitude: lat,
        longitude: lng,
        hasVerifiedEntrance: true,
        statusMessage: lotObject.entranceName || 'Designated Vehicle Entrance',
      };
    }
  }

  // If coordinates are missing or invalid
  return {
    lotId,
    lotName: lotObject?.name || 'Parking Lot',
    address: lotObject?.address || '',
    entranceName: '',
    latitude: null,
    longitude: null,
    hasVerifiedEntrance: false,
    statusMessage: 'Verified vehicle entrance coordinates are missing for this lot.',
  };
}

/**
 * Builds the free Google Maps universal navigation URL.
 * Omission of origin allows Google Maps to use the device's current GPS location.
 *
 * Format:
 * https://www.google.com/maps/dir/?api=1&destination=LATITUDE,LONGITUDE&travelmode=driving&dir_action=navigate
 */
export function buildGoogleMapsUniversalUrl(lat: number, lng: number): string {
  if (!isValidLatLng(lat, lng)) {
    throw new Error(`Invalid navigation destination coordinates: lat=${lat}, lng=${lng}`);
  }
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving&dir_action=navigate`;
}

/**
 * Launches Google Maps navigation using React Native Linking.
 *
 * 1. Opens universal Google Maps URL with turn-by-turn driving navigation mode.
 * 2. On Android/iOS, tries native Google Maps app intent first if available.
 * 3. Falls back smoothly to web browser directions if the app cannot be opened.
 * 4. Handles errors gracefully with user-friendly alerts.
 *
 * Note: Calling this does NOT mark the user as arrived in ParkMe.
 */
export async function launchGoogleMapsNavigation(params: {
  destLat: number;
  destLng: number;
  lotName?: string;
}): Promise<{ success: boolean; url: string; openedInApp: boolean }> {
  const { destLat, destLng, lotName } = params;

  if (!isValidLatLng(destLat, destLng)) {
    Alert.alert(
      'Navigation Unavailable',
      'The destination coordinates for this parking lot are invalid or missing.',
      [{ text: 'OK', style: 'default' }]
    );
    return { success: false, url: '', openedInApp: false };
  }

  const universalUrl = buildGoogleMapsUniversalUrl(destLat, destLng);
  const androidAppIntent = `google.navigation:q=${destLat},${destLng}&mode=d`;
  const iosAppIntent = `comgooglemaps://?daddr=${destLat},${destLng}&directionsmode=driving`;

  try {
    // Attempt native app intent on mobile devices
    if (Platform.OS === 'android') {
      const canOpenIntent = await Linking.canOpenURL(androidAppIntent).catch(() => false);
      if (canOpenIntent) {
        await Linking.openURL(androidAppIntent);
        return { success: true, url: androidAppIntent, openedInApp: true };
      }
    } else if (Platform.OS === 'ios') {
      const canOpenIos = await Linking.canOpenURL(iosAppIntent).catch(() => false);
      if (canOpenIos) {
        await Linking.openURL(iosAppIntent);
        return { success: true, url: iosAppIntent, openedInApp: true };
      }
    }

    // Try universal Google Maps URL (opens Google Maps app via App Links, or browser)
    const canOpenUniversal = await Linking.canOpenURL(universalUrl).catch(() => true);
    if (canOpenUniversal) {
      await Linking.openURL(universalUrl);
      return { success: true, url: universalUrl, openedInApp: false };
    }

    Alert.alert(
      'Unable to Open Navigation',
      'No compatible maps application or web browser was found on your device to open driving directions.',
      [{ text: 'OK', style: 'default' }]
    );
    return { success: false, url: universalUrl, openedInApp: false };
  } catch (err: any) {
    console.warn('Navigation launch error:', err);
    // Fallback attempt to open universal URL in browser
    try {
      await Linking.openURL(universalUrl);
      return { success: true, url: universalUrl, openedInApp: false };
    } catch {
      Alert.alert(
        'Navigation Error',
        `Could not launch Google Maps directions${lotName ? ` to ${lotName}` : ''}. Please ensure a web browser or Google Maps is installed.`,
        [{ text: 'OK', style: 'default' }]
      );
      return { success: false, url: universalUrl, openedInApp: false };
    }
  }
}
