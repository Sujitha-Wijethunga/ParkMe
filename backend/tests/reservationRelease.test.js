const assert = require('node:assert/strict');
const { afterEach, beforeEach, suite, test } = require('node:test');
const Reservation = require('../models/Reservation');
const Payment = require('../models/Payment');
const ParkingSpace = require('../models/ParkingSpace');
const ParkingLot = require('../models/ParkingLot');
const { releaseReservation } = require('../controllers/reservationController');

const originalMethods = {
  reservationFindById: Reservation.findById,
  paymentFindOne: Payment.findOne,
  lotFindById: ParkingLot.findById,
  spaceFindByIdAndUpdate: ParkingSpace.findByIdAndUpdate,
  lotFindByIdAndUpdate: ParkingLot.findByIdAndUpdate,
};

suite('Driver active reservation release', () => {
  let reservation;
  let spaceUpdate;
  let lotUpdate;

  beforeEach(() => {
    reservation = {
      _id: 'reservation-1',
      driver: { toString: () => 'driver-1' },
      parkingSpace: 'space-1',
      parkingLot: 'lot-1',
      startTime: new Date(Date.now() - 60 * 60 * 1000),
      verifiedAt: new Date(Date.now() - 30 * 60 * 1000),
      endTime: new Date(Date.now() + 60 * 60 * 1000),
      status: 'active',
      save: async function save() {
        return this;
      },
    };
    spaceUpdate = null;
    lotUpdate = null;
    Reservation.findById = async () => reservation;
    Payment.findOne = () => ({ select: async () => ({ method: 'card' }) });
    ParkingLot.findById = async () => ({ pricePerHour: 120 });
    ParkingSpace.findByIdAndUpdate = async (...args) => {
      spaceUpdate = args;
    };
    ParkingLot.findByIdAndUpdate = async (...args) => {
      lotUpdate = args;
    };
  });

  afterEach(() => {
    Reservation.findById = originalMethods.reservationFindById;
    Payment.findOne = originalMethods.paymentFindOne;
    ParkingLot.findById = originalMethods.lotFindById;
    ParkingSpace.findByIdAndUpdate = originalMethods.spaceFindByIdAndUpdate;
    ParkingLot.findByIdAndUpdate = originalMethods.lotFindByIdAndUpdate;
  });

  async function callRelease(driverId = 'driver-1') {
    const response = {
      statusCode: 200,
      body: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(body) {
        this.body = body;
        return this;
      },
    };

    await releaseReservation(
      { params: { id: 'reservation-1' }, user: { _id: { toString: () => driverId } } },
      response,
      (error) => {
        throw error;
      }
    );
    return response;
  }

  test('marks the driver’s active reservation completed and frees its space', async () => {
    const response = await callRelease();

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.message, 'Parking space released');
    assert.equal(reservation.status, 'completed');
    assert.equal(reservation.finalAmount, 60);
    assert.ok(reservation.actualEndTime instanceof Date);
    assert.equal(response.body.paymentMethod, 'card');
    assert.deepEqual(spaceUpdate, ['space-1', { status: 'available' }]);
    assert.deepEqual(lotUpdate, ['lot-1', { $inc: { availableSpaces: 1 } }]);
  });

  test('rejects release when the reservation belongs to another driver', async () => {
    const response = await callRelease('driver-2');

    assert.equal(response.statusCode, 403);
    assert.equal(reservation.status, 'active');
    assert.equal(spaceUpdate, null);
    assert.equal(lotUpdate, null);
  });

  test('rejects release unless the reservation is active', async () => {
    reservation.status = 'pending';
    reservation.startTime = new Date(Date.now() + 60 * 60 * 1000);
    reservation.endTime = new Date(Date.now() + 2 * 60 * 60 * 1000);
    const response = await callRelease();

    assert.equal(response.statusCode, 400);
    assert.equal(reservation.status, 'pending');
    assert.equal(spaceUpdate, null);
    assert.equal(lotUpdate, null);
  });

  test('completes and frees a pending reservation during its scheduled window', async () => {
    reservation.status = 'pending';
    reservation.startTime = new Date(Date.now() - 30 * 60 * 1000);
    reservation.verifiedAt = undefined;
    reservation.endTime = new Date(Date.now() + 30 * 60 * 1000);
    const response = await callRelease();

    assert.equal(response.statusCode, 200);
    assert.equal(reservation.status, 'completed');
    assert.ok(reservation.actualEndTime instanceof Date);
    assert.ok(reservation.finalAmount > 0);
    assert.deepEqual(spaceUpdate, ['space-1', { status: 'available' }]);
    assert.deepEqual(lotUpdate, ['lot-1', { $inc: { availableSpaces: 1 } }]);
  });

  test('returns not found when the reservation does not exist', async () => {
    Reservation.findById = async () => null;
    const response = await callRelease();

    assert.equal(response.statusCode, 404);
    assert.equal(response.body.message, 'Reservation not found');
    assert.equal(spaceUpdate, null);
    assert.equal(lotUpdate, null);
  });

  test('does not release the space when the parking rate is unavailable', async () => {
    ParkingLot.findById = async () => ({ pricePerHour: null });
    const response = await callRelease();

    assert.equal(response.statusCode, 400);
    assert.equal(reservation.status, 'active');
    assert.equal(reservation.actualEndTime, undefined);
    assert.equal(spaceUpdate, null);
    assert.equal(lotUpdate, null);
  });
});
