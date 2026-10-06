const assert = require('node:assert/strict');
const { afterEach, beforeEach, suite, test } = require('node:test');
const Reservation = require('../models/Reservation');
const ParkingSpace = require('../models/ParkingSpace');
const ParkingLot = require('../models/ParkingLot');
const { cancelReservation } = require('../controllers/reservationController');

const originalMethods = {
  reservationFindById: Reservation.findById,
  reservationFindOneAndUpdate: Reservation.findOneAndUpdate,
  spaceFindByIdAndUpdate: ParkingSpace.findByIdAndUpdate,
  lotFindByIdAndUpdate: ParkingLot.findByIdAndUpdate,
};

suite('Driver upcoming reservation cancellation', () => {
  let reservation;
  let updateQuery;
  let updateData;
  let spaceUpdate;
  let lotUpdate;

  beforeEach(() => {
    reservation = {
      _id: 'reservation-1',
      driver: { toString: () => 'driver-1' },
      parkingSpace: 'space-1',
      parkingLot: 'lot-1',
      startTime: new Date(Date.now() + 60 * 60 * 1000),
      status: 'pending',
    };
    updateQuery = null;
    updateData = null;
    spaceUpdate = null;
    lotUpdate = null;
    Reservation.findById = async () => reservation;
    Reservation.findOneAndUpdate = async (query, update) => {
      updateQuery = query;
      updateData = update;
      Object.assign(reservation, update.$set);
      return reservation;
    };
    ParkingSpace.findByIdAndUpdate = async (...args) => {
      spaceUpdate = args;
    };
    ParkingLot.findByIdAndUpdate = async (...args) => {
      lotUpdate = args;
    };
  });

  afterEach(() => {
    Reservation.findById = originalMethods.reservationFindById;
    Reservation.findOneAndUpdate = originalMethods.reservationFindOneAndUpdate;
    ParkingSpace.findByIdAndUpdate = originalMethods.spaceFindByIdAndUpdate;
    ParkingLot.findByIdAndUpdate = originalMethods.lotFindByIdAndUpdate;
  });

  async function callCancellation(body = {}, driverId = 'driver-1') {
    const response = {
      statusCode: 200,
      body: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(payload) {
        this.body = payload;
        return this;
      },
    };
    await cancelReservation(
      {
        params: { id: 'reservation-1' },
        user: { _id: { toString: () => driverId } },
        body,
      },
      response,
      (error) => {
        throw error;
      }
    );
    return response;
  }

  test('cancels an eligible upcoming booking, saves reason, and releases its space', async () => {
    const response = await callCancellation({
      reason: 'Other reason',
      note: 'Plans changed',
    });

    assert.equal(response.statusCode, 200);
    assert.equal(reservation.status, 'cancelled');
    assert.equal(reservation.cancellationReason, 'Other reason');
    assert.equal(reservation.cancellationNote, 'Plans changed');
    assert.ok(reservation.cancelledAt instanceof Date);
    assert.equal(updateQuery.status, 'pending');
    assert.ok(updateQuery.startTime.$gt instanceof Date);
    assert.deepEqual(spaceUpdate, ['space-1', { status: 'available' }]);
    assert.deepEqual(lotUpdate, ['lot-1', { $inc: { availableSpaces: 1 } }]);
  });

  test('rejects an invalid cancellation reason without releasing the space', async () => {
    const response = await callCancellation({ reason: 'Not a valid option' });

    assert.equal(response.statusCode, 400);
    assert.equal(updateData, null);
    assert.equal(spaceUpdate, null);
    assert.equal(lotUpdate, null);
  });

  test('rejects cancellation details longer than 500 characters', async () => {
    const response = await callCancellation({
      reason: 'Other reason',
      note: 'x'.repeat(501),
    });

    assert.equal(response.statusCode, 400);
    assert.equal(updateData, null);
    assert.equal(spaceUpdate, null);
  });

  test('rejects reservations owned by another driver', async () => {
    const response = await callCancellation(
      { reason: 'Change of plans / Schedule changed' },
      'driver-2'
    );

    assert.equal(response.statusCode, 403);
    assert.equal(updateData, null);
    assert.equal(spaceUpdate, null);
  });

  test('rejects active and past reservations', async (context) => {
    for (const status of ['active', 'pending']) {
      await context.test(`rejects ${status} reservation when cancellation is not upcoming`, async () => {
        reservation.status = status;
        if (status === 'pending') reservation.startTime = new Date(Date.now() - 60 * 1000);

        const response = await callCancellation({
          reason: 'Change of plans / Schedule changed',
        });

        assert.equal(response.statusCode, 400);
        assert.equal(updateData, null);
        assert.equal(spaceUpdate, null);
        assert.equal(lotUpdate, null);
      });
    }
  });
});
