const assert = require('node:assert/strict');
const { afterEach, beforeEach, suite, test } = require('node:test');
const Reservation = require('../models/Reservation');
const ParkingSpace = require('../models/ParkingSpace');
const ParkingLot = require('../models/ParkingLot');
const { createReservation } = require('../controllers/reservationController');

const originalSpaceFindById = ParkingSpace.findById;
const originalLotFindById = ParkingLot.findById;
const originalResFindOne = Reservation.findOne;
const originalResCreate = Reservation.create;
const originalSpaceFindByIdAndUpdate = ParkingSpace.findByIdAndUpdate;
const originalLotFindByIdAndUpdate = ParkingLot.findByIdAndUpdate;

suite('Vehicle space validation on reservation creation', () => {
  let createdReservation;

  beforeEach(() => {
    createdReservation = null;

    ParkingSpace.findById = async (id) => ({
      _id: id,
      parkingLot: 'lot-1',
      status: 'available',
      vehicleType: 'Car',
    });

    ParkingLot.findById = async (id) => ({
      _id: id,
      pricePerHour: 150,
      vehicleTariffs: { Car: 150, Bike: 50, SUV: 200, EV: 180 },
    });

    Reservation.findOne = async () => null; // No overlap

    Reservation.create = async (doc) => {
      createdReservation = doc;
      return { _id: 'res-new-1', ...doc };
    };

    ParkingSpace.findByIdAndUpdate = async () => {};
    ParkingLot.findByIdAndUpdate = async () => {};
  });

  afterEach(() => {
    ParkingSpace.findById = originalSpaceFindById;
    ParkingLot.findById = originalLotFindById;
    Reservation.findOne = originalResFindOne;
    Reservation.create = originalResCreate;
    ParkingSpace.findByIdAndUpdate = originalSpaceFindByIdAndUpdate;
    ParkingLot.findByIdAndUpdate = originalLotFindByIdAndUpdate;
  });

  async function callCreate(body) {
    const res = {
      statusCode: 200,
      body: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        this.body = data;
        return this;
      },
    };
    let nextError = null;
    await createReservation(
      {
        body,
        user: { _id: 'driver-123', role: 'driver' },
      },
      res,
      (err) => { nextError = err; }
    );
    if (nextError) throw nextError;
    return res;
  }

  test('allows reservation when requested vehicle type matches space vehicle type', async () => {
    const start = new Date(Date.now() + 3600000).toISOString();
    const end = new Date(Date.now() + 7200000).toISOString();
    const res = await callCreate({
      parkingSpaceId: 'space-car-1',
      startTime: start,
      endTime: end,
      vehicleType: 'Car',
    });

    assert.equal(res.statusCode, 201);
    assert.equal(createdReservation.vehicleType, 'Car');
  });

  test('rejects reservation when space is designated for a different vehicle type', async () => {
    // Space is for Bike, user specifies Car
    ParkingSpace.findById = async (id) => ({
      _id: id,
      parkingLot: 'lot-1',
      status: 'available',
      vehicleType: 'Bike',
    });

    const start = new Date(Date.now() + 3600000).toISOString();
    const end = new Date(Date.now() + 7200000).toISOString();
    const res = await callCreate({
      parkingSpaceId: 'space-bike-1',
      startTime: start,
      endTime: end,
      vehicleType: 'Car',
    });

    assert.equal(res.statusCode, 409);
    assert.match(res.body.message, /designated for Bike vehicles only/);
    assert.equal(createdReservation, null);
  });

  test('allows reservation when space is designated for "any" vehicle type', async () => {
    ParkingSpace.findById = async (id) => ({
      _id: id,
      parkingLot: 'lot-1',
      status: 'available',
      vehicleType: 'any',
    });

    const start = new Date(Date.now() + 3600000).toISOString();
    const end = new Date(Date.now() + 7200000).toISOString();
    const res = await callCreate({
      parkingSpaceId: 'space-any-1',
      startTime: start,
      endTime: end,
      vehicleType: 'SUV',
    });

    assert.equal(res.statusCode, 201);
    assert.equal(createdReservation.vehicleType, 'SUV');
    assert.equal(createdReservation.totalAmount, 200); // 1 hour * 200 SUV rate
  });

  test('rejects reservation when invalid vehicle type is provided', async () => {
    const start = new Date(Date.now() + 3600000).toISOString();
    const end = new Date(Date.now() + 7200000).toISOString();
    const res = await callCreate({
      parkingSpaceId: 'space-car-1',
      startTime: start,
      endTime: end,
      vehicleType: 'Aeroplane',
    });

    assert.equal(res.statusCode, 400);
    assert.match(res.body.message, /Invalid vehicle type/);
    assert.equal(createdReservation, null);
  });
});
