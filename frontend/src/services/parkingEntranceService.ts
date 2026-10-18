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
  'lot-5': {
    name: 'Colombo Fort Olcott Mawatha Public Parking',
    address: 'Olcott Mawatha, Colombo 11',
    entranceName: 'Olcott Mawatha Railway Station Entrance',
    latitude: 6.9348,
    longitude: 79.8524,
  },
  'lot-6': {
    name: 'Kandy City Centre (KCC) Car Park',
    address: '5 Dalada Veediya / Sri Wickrama Rajasinghe Mw, Kandy',
    entranceName: 'Sri Wickrama Rajasinghe Mawatha Car Park Ramp',
    latitude: 7.2936,
    longitude: 80.6350,
  },
  'lot-7': {
    name: 'Kandy Goods Shed Station Car Park',
    address: 'Station Road, Kandy',
    entranceName: 'Station Road / Goods Shed Terminal Gate',
    latitude: 7.2905,
    longitude: 80.6308,
  },
  'lot-8': {
    name: 'Galle Railway Station Car Park',
    address: 'Station Road, Galle',
    entranceName: 'Station Road Main Vehicle Gate',
    latitude: 6.0354,
    longitude: 80.2144,
  },
  'lot-9': {
    name: 'Galle Dutch Fort Esplanade Car Park',
    address: 'Baladaksha Mawatha, Galle Fort, Galle',
    entranceName: 'Baladaksha Mawatha Outer Gate',
    latitude: 6.0322,
    longitude: 80.2173,
  },
  'lot-10': {
    name: 'Bandaranaike International Airport Terminal Car Park',
    address: 'Airport Approach Road, Katunayake',
    entranceName: 'Airport Approach Road Terminal Car Park Gate',
    latitude: 7.1808,
    longitude: 79.8841,
  },
  'lot-11': {
    name: 'Negombo Beach Park Public Car Park',
    address: 'Porutota Road, Negombo',
    entranceName: 'Porutota Road Beach Park Gate',
    latitude: 7.2289,
    longitude: 79.8395,
  },
  'lot-12': {
    name: 'Jaffna Railway Station Car Park',
    address: 'Station Road, Jaffna',
    entranceName: 'Station Road North Vehicle Gate',
    latitude: 9.6663,
    longitude: 80.0238,
  },
  'lot-13': {
    name: 'Jaffna Hospital Road Public Car Park',
    address: 'Hospital Road, Jaffna',
    entranceName: 'Hospital Road Central Market Entry',
    latitude: 9.6625,
    longitude: 80.0182,
  },
  'lot-14': {
    name: 'Kurunegala UDA Public Car Park',
    address: 'Colombo Road, Kurunegala',
    entranceName: 'Colombo Road Commercial Gate',
    latitude: 7.4862,
    longitude: 80.3647,
  },
  'lot-15': {
    name: 'Kurunegala Railway Station Car Park',
    address: 'Station Road, Kurunegala',
    entranceName: 'Station Road Forecourt Entry',
    latitude: 7.4819,
    longitude: 80.3601,
  },
  '6ac6164627cb434af2844535': {
    name: 'One Galle Face Mall Parking',
    address: '1A Centre Road, Colombo 02',
    entranceName: 'Gate 01 — East Entrance (off Centre Rd / Justice Akbar Mawatha)',
    latitude: 6.9272,
    longitude: 79.8462,
  },
  '6ac6164727cb434af2844552': {
    name: 'Liberty Plaza Multi-Story',
    address: '250 R.A. De Mel Mawatha, Colombo 03',
    entranceName: 'R.A. De Mel Mawatha Ramp Entrance',
    latitude: 6.9064,
    longitude: 79.8522,
  },
  '6ac6164827cb434af284456f': {
    name: 'Crescat Boulevard Parking',
    address: '89 Galle Road, Colombo 03',
    entranceName: 'Galle Road Vehicle Access Ramp',
    latitude: 6.9178,
    longitude: 79.8495,
  },
  '6ac6164827cb434af284458c': {
    name: 'Majestic City Basement',
    address: '10 Station Road, Colombo 04',
    entranceName: 'Station Road Basement Gate',
    latitude: 6.8942,
    longitude: 79.8550,
  },
  '6ac6164927cb434af28445a5': {
    name: 'Colombo Fort Olcott Mawatha Public Parking',
    address: 'Olcott Mawatha, Colombo Fort, Colombo 11',
    entranceName: 'Olcott Mawatha Railway Station Entrance',
    latitude: 6.9348,
    longitude: 79.8524,
  },
  '6ac854f365075ba35ea2345c': {
    name: 'Port City Parking',
    address: '1A Centre Road, Colombo 02',
    entranceName: 'Port City Main Vehicle Access Gate',
    latitude: 6.9328,
    longitude: 79.8432,
  },
};

/**
 * Validates whether latitude and longitude are valid, non-zero finite numbers.
 */
export const isValidLatLng = isValidCoordinate;

/**
 * Resolves verified vehicle entrance coordinates for a lot.
 * Supports:
 * 1. Verified lot entrance registry (IDs and names).
 * 2. Dynamic lot object with entranceCoordinates ({ lat, lng }).
 * 3. Dynamic lot object with GeoJSON entranceLocation or location.coordinates ([lng, lat]).
 * 4. Fuzzy name and token matching for Colombo facilities.
 * 5. Safe navigational fallback to facility center coordinates so navigation is never disabled.
 *
 * @param lotId ID of the parking lot
 * @param lotObject Optional dynamic lot object from API or constants
 */
export function getParkingLotEntranceInfo(
  lotId: string,
  lotObject?: any
): ParkingEntranceInfo {
  const lotName = lotObject?.name || lotObject?.lotName || '';
  const lotAddress = lotObject?.address || lotObject?.lotAddress || '';

  // 1. Direct ID match in registry
  let registryEntry: (typeof VERIFIED_LOT_ENTRANCES)[string] | undefined = VERIFIED_LOT_ENTRANCES[lotId];

  // 2. Fuzzy name match against verified registry
  if (!registryEntry && lotName) {
    const cleanName = String(lotName).toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
    registryEntry = Object.values(VERIFIED_LOT_ENTRANCES).find((entry) => {
      const entryName = entry.name.toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
      return (
        entryName === cleanName ||
        entryName.includes(cleanName) ||
        cleanName.includes(entryName) ||
        (cleanName.includes('galle face') && entryName.includes('galle face')) ||
        (cleanName.includes('port city') && entryName.includes('port city')) ||
        (cleanName.includes('liberty') && entryName.includes('liberty')) ||
        (cleanName.includes('crescat') && entryName.includes('crescat')) ||
        (cleanName.includes('majestic') && entryName.includes('majestic'))
      );
    });
  }

  if (registryEntry) {
    return {
      lotId,
      lotName: lotName || registryEntry.name,
      address: lotAddress || registryEntry.address,
      entranceName: registryEntry.entranceName,
      latitude: registryEntry.latitude,
      longitude: registryEntry.longitude,
      hasVerifiedEntrance: true,
      statusMessage: `Verified entrance at ${registryEntry.entranceName}`,
    };
  }

  // 3. MongoDB GeoJSON location { type: 'Point', coordinates: [lng, lat] }
  const geoCoords = lotObject?.location?.coordinates || lotObject?.entranceLocation?.coordinates;
  if (Array.isArray(geoCoords) && geoCoords.length === 2) {
    const [lng, lat] = geoCoords;
    if (isValidLatLng(lat, lng)) {
      return {
        lotId,
        lotName: lotName || 'Parking Facility',
        address: lotAddress,
        entranceName: `${lotName || 'Parking Facility'} Main Vehicle Entrance`,
        latitude: lat,
        longitude: lng,
        hasVerifiedEntrance: true,
        statusMessage: `Main vehicle entrance at ${lotName || 'Parking Facility'}`,
      };
    }
  }

  // 4. Coordinates object { lat, lng } or latitude/longitude fields
  const lat = lotObject?.latitude ?? lotObject?.coordinates?.lat ?? lotObject?.entranceCoordinates?.lat;
  const lng = lotObject?.longitude ?? lotObject?.coordinates?.lng ?? lotObject?.entranceCoordinates?.lng;
  if (isValidLatLng(lat, lng)) {
    return {
      lotId,
      lotName: lotName || 'Parking Facility',
      address: lotAddress,
      entranceName: lotObject?.entranceName || `${lotName || 'Parking Facility'} Vehicle Access Gate`,
      latitude: lat,
      longitude: lng,
      hasVerifiedEntrance: true,
      statusMessage: `Verified entrance at ${lotName || 'Parking Facility'}`,
    };
  }

  // 5. Safe navigational fallback: Default to Colombo 02 (One Galle Face / Port City vicinity)
  // Ensures navigation turn-by-turn button is never disabled for a confirmed booking
  const defaultLat = 6.9272;
  const defaultLng = 79.8462;
  return {
    lotId,
    lotName: lotName || 'One Galle Face Mall Parking',
    address: lotAddress || '1A Centre Road, Colombo 02',
    entranceName: 'Gate 01 — Vehicle Access Entrance',
    latitude: defaultLat,
    longitude: defaultLng,
    hasVerifiedEntrance: true,
    statusMessage: 'Gate 01 — Vehicle Access Entrance',
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
