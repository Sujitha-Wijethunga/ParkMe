import {
  isValidCoordinate,
  buildGoogleMapsUniversalUrl,
  shareDirectionsUrl,
  launchDrivingNavigation,
} from './navigationLauncher';

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
export const isValidLatLng = isValidCoordinate;

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
export { isValidCoordinate, buildGoogleMapsUniversalUrl, shareDirectionsUrl, launchDrivingNavigation };


/**
 * Launches Google Maps navigation using React Native Linking.
 * Delegates to launchDrivingNavigation for unified behavior across ParkMe.
 *
 * Direct approach:
 * 1. Validates destination coordinates before attempting to build or open the URL.
 * 2. Attempts Linking.openURL(universalUrl) directly without a Linking.canOpenURL() gate.
 * 3. On actual rejection, attempts native intent fallback and provides a user-facing
 *    fallback dialog that lets the user copy or share the directions URL.
 *
 * Note: Calling this does NOT mark the user as arrived in ParkMe.
 */
export async function launchGoogleMapsNavigation(params: {
  destLat: number;
  destLng: number;
  lotName?: string;
}): Promise<{ success: boolean; url: string; error?: string }> {
  return launchDrivingNavigation({
    destLat: params.destLat,
    destLng: params.destLng,
    lotName: params.lotName,
  });
}
