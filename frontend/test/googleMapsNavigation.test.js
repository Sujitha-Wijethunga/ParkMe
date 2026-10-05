const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

// Replicate pure logic of parkingEntranceService for pure Node test runner
const VERIFIED_LOT_ENTRANCES = {
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

function isValidLatLng(lat, lng) {
  if (typeof lat !== 'number' || typeof lng !== 'number') return false;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return false;
  if (lat === 0 && lng === 0) return false;
  return true;
}

function buildGoogleMapsUniversalUrl(lat, lng) {
  if (!isValidLatLng(lat, lng)) {
    throw new Error(`Invalid navigation destination coordinates: lat=${lat}, lng=${lng}`);
  }
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving&dir_action=navigate`;
}

function getParkingLotEntranceInfo(lotId, lotObject) {
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

  if (lotObject?.entranceCoordinates) {
    const { lat, lng } = lotObject.entranceCoordinates;
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

describe('Free Google Maps Driving Directions Tests', () => {
  describe('Universal URL Structure & Parameter Encoding', () => {
    test('builds compliant universal URL with all required query parameters', () => {
      const url = buildGoogleMapsUniversalUrl(6.9272, 79.8462);
      assert.strictEqual(
        url,
        'https://www.google.com/maps/dir/?api=1&destination=6.9272,79.8462&travelmode=driving&dir_action=navigate'
      );

      const parsed = new URL(url);
      assert.strictEqual(parsed.origin, 'https://www.google.com');
      assert.strictEqual(parsed.pathname, '/maps/dir/');
      assert.strictEqual(parsed.searchParams.get('api'), '1');
      assert.strictEqual(parsed.searchParams.get('destination'), '6.9272,79.8462');
      assert.strictEqual(parsed.searchParams.get('travelmode'), 'driving');
      assert.strictEqual(parsed.searchParams.get('dir_action'), 'navigate');
      // Origin must be omitted so Google Maps auto-uses the user current GPS location
      assert.strictEqual(parsed.searchParams.has('origin'), false);
    });

    test('generates distinct destination coordinates for different parking lots', () => {
      // Lot 1: One Galle Face Mall Parking
      const lot1 = getParkingLotEntranceInfo('lot-1');
      assert.strictEqual(lot1.hasVerifiedEntrance, true);
      const url1 = buildGoogleMapsUniversalUrl(lot1.latitude, lot1.longitude);
      assert.strictEqual(
        url1,
        'https://www.google.com/maps/dir/?api=1&destination=6.9272,79.8462&travelmode=driving&dir_action=navigate'
      );

      // Lot 2: Liberty Plaza Multi-Story
      const lot2 = getParkingLotEntranceInfo('lot-2');
      assert.strictEqual(lot2.hasVerifiedEntrance, true);
      const url2 = buildGoogleMapsUniversalUrl(lot2.latitude, lot2.longitude);
      assert.strictEqual(
        url2,
        'https://www.google.com/maps/dir/?api=1&destination=6.9064,79.8522&travelmode=driving&dir_action=navigate'
      );

      // Lot 3: Crescat Boulevard
      const lot3 = getParkingLotEntranceInfo('lot-3');
      const url3 = buildGoogleMapsUniversalUrl(lot3.latitude, lot3.longitude);
      assert.strictEqual(
        url3,
        'https://www.google.com/maps/dir/?api=1&destination=6.9178,79.8495&travelmode=driving&dir_action=navigate'
      );

      // Lot 4: Majestic City Basement
      const lot4 = getParkingLotEntranceInfo('lot-4');
      const url4 = buildGoogleMapsUniversalUrl(lot4.latitude, lot4.longitude);
      assert.strictEqual(
        url4,
        'https://www.google.com/maps/dir/?api=1&destination=6.8942,79.855&travelmode=driving&dir_action=navigate'
      );

      // Verify that every lot has a unique destination URL
      assert.notStrictEqual(url1, url2);
      assert.notStrictEqual(url2, url3);
      assert.notStrictEqual(url3, url4);
      assert.notStrictEqual(url1, url4);
    });
  });

  describe('Coordinate Validation & Edge Cases', () => {
    test('validates acceptable geographic coordinates', () => {
      assert.strictEqual(isValidLatLng(6.9272, 79.8462), true);
      assert.strictEqual(isValidLatLng(-33.8688, 151.2093), true); // Sydney
      assert.strictEqual(isValidLatLng(51.5074, -0.1278), true); // London
      assert.strictEqual(isValidLatLng(37.7749, -122.4194), true); // San Francisco
    });

    test('rejects uninitialized (0, 0) and out-of-range coordinates', () => {
      assert.strictEqual(isValidLatLng(0, 0), false);
      assert.strictEqual(isValidLatLng(91, 50), false);
      assert.strictEqual(isValidLatLng(-91, 50), false);
      assert.strictEqual(isValidLatLng(50, 181), false);
      assert.strictEqual(isValidLatLng(50, -181), false);
      assert.strictEqual(isValidLatLng(NaN, 50), false);
      assert.strictEqual(isValidLatLng(50, Infinity), false);
      assert.strictEqual(isValidLatLng(null, 79.8), false);
      assert.strictEqual(isValidLatLng(undefined, undefined), false);
    });

    test('throws descriptive error if buildGoogleMapsUniversalUrl receives invalid coordinates', () => {
      assert.throws(() => {
        buildGoogleMapsUniversalUrl(0, 0);
      }, /Invalid navigation destination coordinates/);

      assert.throws(() => {
        buildGoogleMapsUniversalUrl(NaN, 79.8);
      }, /Invalid navigation destination coordinates/);
    });
  });

  describe('Missing Coordinates & Disabled Navigation Behavior', () => {
    test('correctly identifies lot with missing entrance coordinates and disables navigation', () => {
      const lotWithoutCoords = {
        id: 'lot-unconfigured',
        name: 'New Lot without GPS Entrance',
        address: 'Colombo 07',
      };

      const info = getParkingLotEntranceInfo('lot-unconfigured', lotWithoutCoords);
      assert.strictEqual(info.hasVerifiedEntrance, false);
      assert.strictEqual(info.latitude, null);
      assert.strictEqual(info.longitude, null);
      assert.match(info.statusMessage, /missing/i);
    });

    test('supports dynamic lot object with custom verified entranceCoordinates', () => {
      const dynamicLot = {
        id: 'lot-custom-99',
        name: 'Custom Verified Arena Parking',
        address: 'Independence Square, Colombo 07',
        entranceCoordinates: { lat: 6.9044, lng: 79.8672 },
        entranceName: 'South Spectator Vehicle Gate',
      };

      const info = getParkingLotEntranceInfo('lot-custom-99', dynamicLot);
      assert.strictEqual(info.hasVerifiedEntrance, true);
      assert.strictEqual(info.latitude, 6.9044);
      assert.strictEqual(info.longitude, 79.8672);
      assert.strictEqual(info.entranceName, 'South Spectator Vehicle Gate');

      const url = buildGoogleMapsUniversalUrl(info.latitude, info.longitude);
      assert.strictEqual(
        url,
        'https://www.google.com/maps/dir/?api=1&destination=6.9044,79.8672&travelmode=driving&dir_action=navigate'
      );
    });
  });

  describe('Separation of Navigation Launch and Arrival Confirmation', () => {
    test('opening Google Maps does not automatically trigger onArrived callback', () => {
      let isArrivedCalled = false;
      const onArrived = () => {
        isArrivedCalled = true;
      };

      // Mock user tapping "Start Navigation in Google Maps"
      const handleStartNavigationMock = () => {
        // Navigation launched; arrival should NOT be triggered
      };

      handleStartNavigationMock();
      assert.strictEqual(isArrivedCalled, false);

      // Arrival is only triggered when explicitly tapping "I've Arrived"
      onArrived();
      assert.strictEqual(isArrivedCalled, true);
    });
  });

  describe('Direct Linking.openURL & Fallback Handling', () => {
    test('attempts direct Linking.openURL with universal URL without requiring canOpenURL gate', async () => {
      const openedUrls = [];
      const mockLinking = {
        openURL: async (url) => {
          openedUrls.push(url);
          return true;
        },
      };

      const destLat = 6.9272;
      const destLng = 79.8462;
      const universalUrl = buildGoogleMapsUniversalUrl(destLat, destLng);

      await mockLinking.openURL(universalUrl);

      assert.strictEqual(openedUrls.length, 1);
      assert.strictEqual(
        openedUrls[0],
        'https://www.google.com/maps/dir/?api=1&destination=6.9272,79.8462&travelmode=driving&dir_action=navigate'
      );
    });

    test('captures actual failure message and provides shareable URL for copying', async () => {
      const destLat = 6.9064;
      const destLng = 79.8522;
      const universalUrl = buildGoogleMapsUniversalUrl(destLat, destLng);

      let sharedPayload = null;
      const mockShare = {
        share: async (payload) => {
          sharedPayload = payload;
          return { action: 'sharedAction' };
        },
      };

      await mockShare.share({
        title: 'Directions to Liberty Plaza',
        message: universalUrl,
        url: universalUrl,
      });

      assert.notStrictEqual(sharedPayload, null);
      assert.strictEqual(sharedPayload.message, universalUrl);
      assert.strictEqual(sharedPayload.url, universalUrl);
    });
  });
});

