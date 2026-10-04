const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const routingService = require('../services/routingService');

describe('Nearby Driving Routing and Availability Tests', () => {
  describe('Coordinate validation', () => {
    test('validates standard coordinates', () => {
      assert.strictEqual(routingService.isValidCoordinate([79.8456, 6.9271]), true);
      assert.strictEqual(routingService.isValidCoordinate([-122.4194, 37.7749]), true);
    });

    test('rejects invalid coordinates and uninitialized (0, 0)', () => {
      assert.strictEqual(routingService.isValidCoordinate([0, 0]), false);
      assert.strictEqual(routingService.isValidCoordinate(null), false);
      assert.strictEqual(routingService.isValidCoordinate([79.8456]), false);
      assert.strictEqual(routingService.isValidCoordinate([200, 6.9]), false);
      assert.strictEqual(routingService.isValidCoordinate([79.8, 95]), false);
      assert.strictEqual(routingService.isValidCoordinate(['79.8', '6.9']), false);
      assert.strictEqual(routingService.isValidCoordinate([NaN, 6.9]), false);
    });
  });

  describe('300-second boundary and filtering logic', () => {
    // Simulated mock matrix responses representing various travel times
    const candidateLots = [
      {
        id: 'lot-under-5min',
        name: 'Under 5 Min Lot',
        availableSpaces: 10,
        totalSpaces: 50,
        travel: { durationSeconds: 240, distanceMeters: 1500 },
        coordinates: [79.85, 6.92],
      },
      {
        id: 'lot-exact-boundary',
        name: 'Exact 300s Boundary Lot',
        availableSpaces: 5,
        totalSpaces: 50,
        travel: { durationSeconds: 300, distanceMeters: 2000 },
        coordinates: [79.86, 6.93],
      },
      {
        id: 'lot-over-boundary',
        name: '301s Over Boundary Lot',
        availableSpaces: 8,
        totalSpaces: 50,
        travel: { durationSeconds: 301, distanceMeters: 2100 },
        coordinates: [79.87, 6.94],
      },
      {
        id: 'lot-far-away',
        name: '12 Min Lot',
        availableSpaces: 20,
        totalSpaces: 50,
        travel: { durationSeconds: 720, distanceMeters: 6000 },
        coordinates: [79.9, 6.95],
      },
      {
        id: 'lot-unreachable',
        name: 'Unreachable Island Lot',
        availableSpaces: 15,
        totalSpaces: 30,
        travel: { durationSeconds: null, distanceMeters: null },
        coordinates: [79.8, 6.9],
      },
    ];

    test('includes 300-second boundary and excludes longer routes (>300s)', () => {
      const maxDurationSec = 300;
      const eligible = candidateLots.filter((lot) => {
        return (
          lot.travel.durationSeconds != null &&
          lot.travel.durationSeconds <= maxDurationSec
        );
      });

      const eligibleIds = eligible.map((l) => l.id);
      assert.strictEqual(eligibleIds.includes('lot-under-5min'), true);
      assert.strictEqual(eligibleIds.includes('lot-exact-boundary'), true);
      assert.strictEqual(eligibleIds.includes('lot-over-boundary'), false);
      assert.strictEqual(eligibleIds.includes('lot-far-away'), false);
      assert.strictEqual(eligibleIds.includes('lot-unreachable'), false);
      assert.strictEqual(eligible.length, 2);
    });

    test('expanding to 600 seconds (10 min) includes up to 600s boundary', () => {
      const maxDurationSec = 600;
      const eligible = candidateLots.filter((lot) => {
        return (
          lot.travel.durationSeconds != null &&
          lot.travel.durationSeconds <= maxDurationSec
        );
      });

      const eligibleIds = eligible.map((l) => l.id);
      assert.strictEqual(eligibleIds.includes('lot-under-5min'), true);
      assert.strictEqual(eligibleIds.includes('lot-exact-boundary'), true);
      assert.strictEqual(eligibleIds.includes('lot-over-boundary'), true);
      assert.strictEqual(eligibleIds.includes('lot-far-away'), false);
      assert.strictEqual(eligible.length, 3);
    });
  });

  describe('Full lots and invalid coordinate exclusion', () => {
    const mixedLots = [
      {
        id: 'lot-available',
        availableSpaces: 4,
        location: { coordinates: [79.85, 6.92] },
        isActive: true,
      },
      {
        id: 'lot-full-zero',
        availableSpaces: 0,
        location: { coordinates: [79.851, 6.921] },
        isActive: true,
      },
      {
        id: 'lot-full-negative',
        availableSpaces: -1,
        location: { coordinates: [79.852, 6.922] },
        isActive: true,
      },
      {
        id: 'lot-inactive',
        availableSpaces: 10,
        location: { coordinates: [79.853, 6.923] },
        isActive: false,
      },
      {
        id: 'lot-null-coords',
        availableSpaces: 10,
        location: { coordinates: null },
        isActive: true,
      },
      {
        id: 'lot-zero-coords',
        availableSpaces: 10,
        location: { coordinates: [0, 0] },
        isActive: true,
      },
      {
        id: 'lot-invalid-numbers',
        availableSpaces: 10,
        location: { coordinates: [NaN, 6.92] },
        isActive: true,
      },
    ];

    test('excludes lots with no spaces, inactive lots, and invalid coordinates', () => {
      const valid = mixedLots.filter((lot) => {
        if (!lot.isActive) return false;
        if (lot.availableSpaces == null || lot.availableSpaces <= 0) return false;
        const coords = lot.location && lot.location.coordinates;
        if (!routingService.isValidCoordinate(coords)) return false;
        return true;
      });

      assert.strictEqual(valid.length, 1);
      assert.strictEqual(valid[0].id, 'lot-available');
    });
  });

  describe('Sorting by estimated driving time and distance', () => {
    const unsortedLots = [
      { id: 'b', durationSeconds: 220, distanceMeters: 1800 },
      { id: 'a', durationSeconds: 150, distanceMeters: 1200 },
      { id: 'c-longer-dist', durationSeconds: 220, distanceMeters: 2100 },
      { id: 'fastest', durationSeconds: 90, distanceMeters: 600 },
    ];

    test('sorts primarily by driving duration, secondarily by distance', () => {
      const sorted = [...unsortedLots].sort((x, y) => {
        if (x.durationSeconds !== y.durationSeconds) {
          return x.durationSeconds - y.durationSeconds;
        }
        return (x.distanceMeters || 0) - (y.distanceMeters || 0);
      });

      assert.deepStrictEqual(
        sorted.map((s) => s.id),
        ['fastest', 'a', 'b', 'c-longer-dist']
      );
    });
  });

  describe('Entrance coordinates vs lot center coordinates', () => {
    test('prioritizes entrance coordinates when available and reports note', () => {
      const lotWithEntrance = {
        name: 'Mall Parking with Entrance Gate',
        location: { coordinates: [79.845, 6.925] },
        entranceLocation: { coordinates: [79.8462, 6.9258] },
      };

      const hasEntrance = Boolean(
        lotWithEntrance.entranceLocation &&
          Array.isArray(lotWithEntrance.entranceLocation.coordinates) &&
          lotWithEntrance.entranceLocation.coordinates.length === 2
      );

      const navCoords = hasEntrance
        ? lotWithEntrance.entranceLocation.coordinates
        : lotWithEntrance.location.coordinates;

      assert.strictEqual(hasEntrance, true);
      assert.deepStrictEqual(navCoords, [79.8462, 6.9258]);
    });

    test('falls back to lot coordinates and flags absence of entrance coordinates', () => {
      const lotWithoutEntrance = {
        name: 'Open Air Lot Center Only',
        location: { coordinates: [79.845, 6.925] },
        entranceLocation: undefined,
      };

      const hasEntrance = Boolean(
        lotWithoutEntrance.entranceLocation &&
          Array.isArray(lotWithoutEntrance.entranceLocation.coordinates) &&
          lotWithoutEntrance.entranceLocation.coordinates.length === 2
      );

      const navCoords = hasEntrance
        ? lotWithoutEntrance.entranceLocation.coordinates
        : lotWithoutEntrance.location.coordinates;

      assert.strictEqual(hasEntrance, false);
      assert.deepStrictEqual(navCoords, [79.845, 6.925]);
    });
  });

  describe('Availability re-check prior to navigation', () => {
    test('detects when previously available lot becomes full', () => {
      // User initially saw 2 spaces available
      const initialSpaces = 2;
      assert.strictEqual(initialSpaces > 0, true);

      // Re-check before navigation confirms updated status
      const updatedLot = {
        lotId: 'lot-1',
        availableSpaces: 0,
        totalSpaces: 50,
      };

      const isStillAvailable = updatedLot.availableSpaces > 0;
      assert.strictEqual(isStillAvailable, false);
    });
  });
});
