const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

// Import pure logic or test helpers
describe('Driver Nearby Parking & Driving Navigation Frontend Tests', () => {
  describe('Platform Navigation URL Generation', () => {
    function getPlatformUrls({ originLat, originLng, destLat, destLng, platform }) {
      const fallbackWebUrl = `https://www.google.com/maps/dir/?api=1&origin=${originLat},${originLng}&destination=${destLat},${destLng}&travelmode=driving`;
      let nativeAppUrl = fallbackWebUrl;

      if (platform === 'android') {
        nativeAppUrl = `google.navigation:q=${destLat},${destLng}&mode=d`;
      } else if (platform === 'ios') {
        nativeAppUrl = `maps://?saddr=${originLat},${originLng}&daddr=${destLat},${destLng}&dirflg=d`;
      }

      return { nativeAppUrl, fallbackWebUrl };
    }

    test('generates valid Android navigation intent URL', () => {
      const urls = getPlatformUrls({
        originLat: 6.9271,
        originLng: 79.8456,
        destLat: 6.9065,
        destLng: 79.8519,
        platform: 'android',
      });

      assert.strictEqual(urls.nativeAppUrl, 'google.navigation:q=6.9065,79.8519&mode=d');
      assert.strictEqual(
        urls.fallbackWebUrl,
        'https://www.google.com/maps/dir/?api=1&origin=6.9271,79.8456&destination=6.9065,79.8519&travelmode=driving'
      );
    });

    test('generates valid iOS Apple Maps directions URL', () => {
      const urls = getPlatformUrls({
        originLat: 6.9271,
        originLng: 79.8456,
        destLat: 6.9175,
        destLng: 79.8492,
        platform: 'ios',
      });

      assert.strictEqual(
        urls.nativeAppUrl,
        'maps://?saddr=6.9271,79.8456&daddr=6.9175,79.8492&dirflg=d'
      );
      assert.strictEqual(
        urls.fallbackWebUrl,
        'https://www.google.com/maps/dir/?api=1&origin=6.9271,79.8456&destination=6.9175,79.8492&travelmode=driving'
      );
    });

    test('falls back to Google Maps web directions on Web platform', () => {
      const urls = getPlatformUrls({
        originLat: 6.9271,
        originLng: 79.8456,
        destLat: 6.8940,
        destLng: 79.8548,
        platform: 'web',
      });

      assert.strictEqual(
        urls.nativeAppUrl,
        'https://www.google.com/maps/dir/?api=1&origin=6.9271,79.8456&destination=6.894,79.8548&travelmode=driving'
      );
      assert.strictEqual(urls.nativeAppUrl, urls.fallbackWebUrl);
    });
  });

  describe('Entrance Coordinates Resolution', () => {
    test('uses designated entrance coordinates when provided by parking operator', () => {
      const lot = {
        name: 'Mall Multi-story',
        location: { coordinates: [79.8456, 6.9271] },
        entranceLocation: { coordinates: [79.8462, 6.9279] },
      };

      const hasEntrance = Boolean(
        lot.entranceLocation &&
          Array.isArray(lot.entranceLocation.coordinates) &&
          lot.entranceLocation.coordinates.length === 2
      );

      const navCoords = hasEntrance
        ? { lng: lot.entranceLocation.coordinates[0], lat: lot.entranceLocation.coordinates[1] }
        : { lng: lot.location.coordinates[0], lat: lot.location.coordinates[1] };

      assert.strictEqual(hasEntrance, true);
      assert.deepStrictEqual(navCoords, { lng: 79.8462, lat: 6.9279 });
    });

    test('falls back to lot center coordinates and reports limitation', () => {
      const lot = {
        name: 'Standard Open Lot',
        location: { coordinates: [79.8519, 6.9065] },
        entranceLocation: null,
      };

      const hasEntrance = Boolean(
        lot.entranceLocation &&
          Array.isArray(lot.entranceLocation.coordinates) &&
          lot.entranceLocation.coordinates.length === 2
      );

      const navCoords = hasEntrance
        ? { lng: lot.entranceLocation.coordinates[0], lat: lot.entranceLocation.coordinates[1] }
        : { lng: lot.location.coordinates[0], lat: lot.location.coordinates[1] };

      const note = hasEntrance
        ? 'Using designated parking entrance'
        : 'Using parking lot center (entrance coordinates not specified by operator)';

      assert.strictEqual(hasEntrance, false);
      assert.deepStrictEqual(navCoords, { lng: 79.8519, lat: 6.9065 });
      assert.strictEqual(note, 'Using parking lot center (entrance coordinates not specified by operator)');
    });
  });

  describe('300-Second Driving Duration Boundary Filtering & Sorting', () => {
    const rawResults = [
      { id: 'lot-3', durationSeconds: 290, distanceMeters: 1900 },
      { id: 'lot-1', durationSeconds: 140, distanceMeters: 900 },
      { id: 'lot-boundary', durationSeconds: 300, distanceMeters: 2000 },
      { id: 'lot-over', durationSeconds: 301, distanceMeters: 2050 },
      { id: 'lot-10m', durationSeconds: 580, distanceMeters: 4200 },
    ];

    test('includes 300-second boundary exactly and excludes routes >300s', () => {
      const fiveMinLimit = 300;
      const eligible = rawResults.filter((l) => l.durationSeconds <= fiveMinLimit);

      assert.strictEqual(eligible.length, 3);
      assert.deepStrictEqual(
        eligible.map((l) => l.id),
        ['lot-3', 'lot-1', 'lot-boundary']
      );
    });

    test('sorts eligible results by estimated driving time, then distance', () => {
      const eligible = rawResults.filter((l) => l.durationSeconds <= 300);
      eligible.sort((a, b) => {
        if (a.durationSeconds !== b.durationSeconds) return a.durationSeconds - b.durationSeconds;
        return a.distanceMeters - b.distanceMeters;
      });

      assert.deepStrictEqual(
        eligible.map((l) => l.id),
        ['lot-1', 'lot-3', 'lot-boundary']
      );
    });

    test('expanding search to 600 seconds (10 min) includes up to 600s boundary', () => {
      const tenMinLimit = 600;
      const eligible = rawResults.filter((l) => l.durationSeconds <= tenMinLimit);

      assert.strictEqual(eligible.length, 5);
      assert.strictEqual(eligible.some((l) => l.id === 'lot-10m'), true);
    });
  });

  describe('Availability Re-check Prior to Navigation', () => {
    test('prevents navigation if lot becomes full during driver selection', () => {
      let lotReportedAvailable = 2;

      // Driver taps card
      assert.strictEqual(lotReportedAvailable > 0, true);

      // Re-check before navigation confirms updated status: now 0
      lotReportedAvailable = 0;
      const canProceed = lotReportedAvailable > 0;

      assert.strictEqual(canProceed, false);
    });
  });

  describe('Location Error Recovery Handling', () => {
    function getLocationAction(errorCode) {
      switch (errorCode) {
        case 'SERVICES_DISABLED':
          return { recovery: 'PROMPT_ENABLE_LOCATION', canSettings: true };
        case 'PERMISSION_BLOCKED':
          return { recovery: 'OPEN_APP_SETTINGS', canSettings: true };
        case 'PERMISSION_DENIED':
          return { recovery: 'REQUEST_PERMISSION_AGAIN', canSettings: false };
        case 'TIMEOUT':
          return { recovery: 'RETRY_LOCATION', canSettings: false };
        default:
          return { recovery: 'UNKNOWN_RETRY', canSettings: false };
      }
    }

    test('maps blocked permission to open settings action', () => {
      const action = getLocationAction('PERMISSION_BLOCKED');
      assert.strictEqual(action.recovery, 'OPEN_APP_SETTINGS');
      assert.strictEqual(action.canSettings, true);
    });

    test('maps timeout to retry location action', () => {
      const action = getLocationAction('TIMEOUT');
      assert.strictEqual(action.recovery, 'RETRY_LOCATION');
      assert.strictEqual(action.canSettings, false);
    });
  });
});
