const assert = require('node:assert/strict');
const { afterEach, beforeEach, suite, test } = require('node:test');
const mongoose = require('mongoose');

const User = require('../models/User');
const ParkingLot = require('../models/ParkingLot');
const ParkingSpace = require('../models/ParkingSpace');
const Reservation = require('../models/Reservation');
const Payment = require('../models/Payment');
const Attendance = require('../models/Attendance');
const LeaveRequest = require('../models/LeaveRequest');
const Notification = require('../models/Notification');
const {
  createReservation,
  extendReservation,
  completeReservation,
  releaseReservation,
} = require('../controllers/reservationController');

suite('MongoDB Schema Validations & Model Integrity', () => {
  test('User model validates vehicles subdocument and roles', async () => {
    const validUser = new User({
      name: 'Nimal Perera',
      email: 'nimal@example.com',
      password: 'password123',
      role: 'driver',
      vehicles: [
        {
          plateNumber: 'WP CAB-7829',
          model: 'Toyota Prius',
          vehicleType: 'Car',
          isDefault: true,
        },
      ],
    });
    const err = await validUser.validate();
    assert.strictEqual(err, undefined);

    const invalidRoleUser = new User({
      name: 'Nimal Perera',
      email: 'nimal2@example.com',
      password: 'password123',
      role: 'superman',
    });
    await assert.rejects(
      async () => await invalidRoleUser.validate(),
      /is not a valid enum value/
    );
  });

  test('ParkingLot model enforces coordinates, overtime rules, and defaults', async () => {
    const lot = new ParkingLot({
      name: 'Crescat Car Park',
      address: '89 Galle Rd, Colombo 03',
      location: { type: 'Point', coordinates: [79.8495, 6.9178] },
      totalSpaces: 100,
      pricePerHour: 150,
      overtimeGracePeriodMinutes: 15,
      overtimeRateMultiplier: 1.5,
    });
    const err = await lot.validate();
    assert.strictEqual(err, undefined);
    assert.strictEqual(lot.overtimeGracePeriodMinutes, 15);
    assert.strictEqual(lot.overtimeRateMultiplier, 1.5);
    assert.ok(Array.isArray(lot.operatingDays));
    assert.strictEqual(lot.operatingDays.length, 7);

    // Multiplier below 1.0 should fail
    const invalidLot = new ParkingLot({
      name: 'Invalid Lot',
      address: 'Somewhere',
      location: { type: 'Point', coordinates: [79.8, 6.9] },
      totalSpaces: 50,
      pricePerHour: 100,
      overtimeRateMultiplier: 0.5,
    });
    await assert.rejects(
      async () => await invalidLot.validate(),
      /Overtime multiplier cannot be less than 1.0/
    );
  });

  test('ParkingSpace model enforces vehicleType and space uniqueness index definition', () => {
    const indexes = ParkingSpace.schema.indexes();
    const hasLotSpaceIndex = indexes.some(
      ([idx, opts]) => idx.parkingLot === 1 && idx.spaceNumber === 1 && opts.unique === true
    );
    assert.strictEqual(hasLotSpaceIndex, true, 'Unique compound index on parkingLot + spaceNumber must exist');

    const hasQueryIndex = indexes.some(
      ([idx]) => idx.parkingLot === 1 && idx.status === 1 && idx.vehicleType === 1
    );
    assert.strictEqual(hasQueryIndex, true, 'Compound query index on parkingLot + status + vehicleType must exist');
  });

  test('Reservation model validates decoupled statuses, hourlyRate snapshot, and extensionHistory', async () => {
    const resDoc = new Reservation({
      driver: new mongoose.Types.ObjectId(),
      parkingSpace: new mongoose.Types.ObjectId(),
      parkingLot: new mongoose.Types.ObjectId(),
      startTime: new Date('2026-10-10T10:00:00Z'),
      endTime: new Date('2026-10-10T12:00:00Z'),
      hourlyRate: 150,
      totalAmount: 300,
      status: 'pending',
      paymentStatus: 'unpaid',
      vehiclePlate: 'WP CAB-7829',
      vehicleModel: 'Toyota Prius',
      vehicleType: 'Car',
      overtimeMinutes: 0,
      overtimeAmount: 0,
      extensionHistory: [
        {
          previousEndTime: new Date('2026-10-10T12:00:00Z'),
          newEndTime: new Date('2026-10-10T14:00:00Z'),
          additionalHours: 2,
          additionalAmount: 300,
          paymentStatus: 'paid',
        },
      ],
    });

    const err = await resDoc.validate();
    assert.strictEqual(err, undefined);
    assert.strictEqual(resDoc.paymentStatus, 'unpaid');
    assert.strictEqual(resDoc.status, 'pending');
    assert.strictEqual(resDoc.hourlyRate, 150);
    assert.strictEqual(resDoc.vehiclePlate, 'WP CAB-7829');
    assert.strictEqual(resDoc.extensionHistory.length, 1);
  });

  test('Payment model validates paymentType and compound index definition', async () => {
    const payment = new Payment({
      reservation: new mongoose.Types.ObjectId(),
      driver: new mongoose.Types.ObjectId(),
      amount: 300,
      method: 'card',
      paymentType: 'booking',
      status: 'paid',
    });
    const err = await payment.validate();
    assert.strictEqual(err, undefined);
    assert.strictEqual(payment.paymentType, 'booking');

    const indexes = Payment.schema.indexes();
    const hasCompoundReservationPaymentType = indexes.some(
      ([idx, opts]) => idx.reservation === 1 && idx.paymentType === 1 && opts.unique === true
    );
    assert.strictEqual(hasCompoundReservationPaymentType, true, 'Unique compound index on reservation + paymentType must exist');
  });

  test('Attendance model enforces unique compound index on user and date', () => {
    const indexes = Attendance.schema.indexes();
    const hasUniqueUserDate = indexes.some(
      ([idx, opts]) => idx.user === 1 && idx.date === 1 && opts.unique === true
    );
    assert.strictEqual(hasUniqueUserDate, true, 'Unique compound index on user + date must exist in Attendance');
  });

  test('LeaveRequest and Notification models define necessary indexes', () => {
    const leaveIndexes = LeaveRequest.schema.indexes();
    const hasLeaveIndex = leaveIndexes.some(
      ([idx]) => idx.user === 1 && idx.status === 1 && idx.startDate === -1
    );
    assert.strictEqual(hasLeaveIndex, true, 'LeaveRequest query index must exist');

    const notifIndexes = Notification.schema.indexes();
    const hasNotifIndex = notifIndexes.some(
      ([idx]) => idx.user === 1 && idx.isUnread === 1 && idx.createdAt === -1
    );
    assert.strictEqual(hasNotifIndex, true, 'Notification query index must exist');
  });
});

suite('Reservation Extensions, Snapshots, and Conflict Prevention', () => {
  let mockReservation;
  let mockLot;
  let mockSpace;
  let savedReservation;

  const originalResFindById = Reservation.findById;
  const originalResFindOne = Reservation.findOne;
  const originalLotFindById = ParkingLot.findById;
  const originalSpaceFindById = ParkingSpace.findById;
  const originalResCreate = Reservation.create;
  const originalSpaceUpdate = ParkingSpace.findByIdAndUpdate;
  const originalLotUpdate = ParkingLot.findByIdAndUpdate;

  beforeEach(() => {
    mockReservation = null;
    savedReservation = null;

    mockLot = {
      _id: 'lot-1',
      name: 'Liberty Plaza',
      pricePerHour: 120,
      vehicleTariffs: { Car: 120, Bike: 60, SUV: 180, EV: 120 },
      overtimeGracePeriodMinutes: 15,
      overtimeRateMultiplier: 1.5,
    };

    mockSpace = {
      _id: 'space-1',
      parkingLot: 'lot-1',
      spaceNumber: 'A1',
      status: 'available',
      vehicleType: 'Car',
    };

    ParkingLot.findById = async () => mockLot;
    ParkingSpace.findById = async () => mockSpace;
    ParkingSpace.findByIdAndUpdate = async () => {};
    ParkingLot.findByIdAndUpdate = async () => {};
  });

  afterEach(() => {
    Reservation.findById = originalResFindById;
    Reservation.findOne = originalResFindOne;
    ParkingLot.findById = originalLotFindById;
    ParkingSpace.findById = originalSpaceFindById;
    Reservation.create = originalResCreate;
    ParkingSpace.findByIdAndUpdate = originalSpaceUpdate;
    ParkingLot.findByIdAndUpdate = originalLotUpdate;
  });

  test('createReservation snapshots hourlyRate and preserves vehiclePlate / vehicleModel', async () => {
    let createdDoc = null;
    Reservation.create = async (doc) => {
      createdDoc = doc;
      return { _id: 'res-new-1', ...doc };
    };
    Reservation.findOne = async () => null; // No overlap

    const req = {
      user: { _id: 'driver-1', role: 'driver' },
      body: {
        parkingSpaceId: 'space-1',
        startTime: new Date(Date.now() + 3600000).toISOString(),
        endTime: new Date(Date.now() + 7200000).toISOString(),
        vehicleType: 'Car',
        vehiclePlate: 'WP CAB-7829',
        vehicleModel: 'Toyota Prius',
      },
    };
    let responseData = null;
    const res = {
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        responseData = data;
        return this;
      },
    };

    await createReservation(req, res, () => {});
    assert.strictEqual(res.statusCode, 201);
    assert.strictEqual(createdDoc.hourlyRate, 120);
    assert.strictEqual(createdDoc.vehiclePlate, 'WP CAB-7829');
    assert.strictEqual(createdDoc.vehicleModel, 'Toyota Prius');
    assert.strictEqual(createdDoc.paymentStatus, 'unpaid');
  });

  test('extendReservation safely extends active reservation when no overlap exists', async () => {
    const driverId = 'driver-1';
    const currentEnd = new Date(Date.now() + 3600000);
    const existingRes = {
      _id: 'res-1',
      driver: { toString: () => driverId },
      parkingSpace: 'space-1',
      parkingLot: 'lot-1',
      status: 'active',
      hourlyRate: 120,
      totalAmount: 240,
      endTime: currentEnd,
      vehicleType: 'Car',
      extensionHistory: [],
      async save() {
        savedReservation = this;
      },
    };

    Reservation.findById = async () => existingRes;
    Reservation.findOne = async () => null; // No overlap

    const req = {
      user: { _id: driverId, role: 'driver' },
      params: { id: 'res-1' },
      body: { hours: 2 },
    };
    let responseData = null;
    const res = {
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        responseData = data;
        return this;
      },
    };

    await extendReservation(req, res, () => {});
    assert.strictEqual(responseData.message, 'Reservation extended successfully');
    assert.strictEqual(responseData.additionalAmount, 240);
    assert.strictEqual(existingRes.totalAmount, 480);
    assert.strictEqual(existingRes.extensionHistory.length, 1);
    assert.strictEqual(existingRes.extensionHistory[0].additionalHours, 2);
  });

  test('extendReservation rejects extension when conflicting reservation exists during requested period', async () => {
    const driverId = 'driver-1';
    const currentEnd = new Date(Date.now() + 3600000);
    const existingRes = {
      _id: 'res-1',
      driver: { toString: () => driverId },
      parkingSpace: 'space-1',
      parkingLot: 'lot-1',
      status: 'active',
      hourlyRate: 120,
      totalAmount: 240,
      endTime: currentEnd,
      vehicleType: 'Car',
      extensionHistory: [],
    };

    Reservation.findById = async () => existingRes;
    // Overlap exists:
    Reservation.findOne = async () => ({ _id: 'res-other' });

    const req = {
      user: { _id: driverId, role: 'driver' },
      params: { id: 'res-1' },
      body: { hours: 2 },
    };
    let responseData = null;
    const res = {
      statusCode: 200,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        responseData = data;
        return this;
      },
    };

    await extendReservation(req, res, () => {});
    assert.strictEqual(res.statusCode, 409);
    assert.match(responseData.message, /reserved for another driver/);
  });
});

suite('Overtime Calculation on Reservation Exit / Release', () => {
  const originalResFindById = Reservation.findById;
  const originalLotFindById = ParkingLot.findById;
  const originalSpaceUpdate = ParkingSpace.findByIdAndUpdate;
  const originalLotUpdate = ParkingLot.findByIdAndUpdate;
  const originalPaymentFindOne = Payment.findOne;

  afterEach(() => {
    Reservation.findById = originalResFindById;
    ParkingLot.findById = originalLotFindById;
    ParkingSpace.findById = originalSpaceUpdate;
    ParkingLot.findByIdAndUpdate = originalLotUpdate;
    Payment.findOne = originalPaymentFindOne;
  });

  test('completeReservation calculates overtime and stores completedBy when past grace period', async () => {
    const staffId = new mongoose.Types.ObjectId();
    const pastEndTime = new Date(Date.now() - 3600000); // 1 hour ago
    let saved = false;

    const resDoc = {
      _id: 'res-overdue',
      parkingSpace: 'space-1',
      parkingLot: 'lot-1',
      status: 'active',
      endTime: pastEndTime,
      hourlyRate: 100,
      overtimeMinutes: 0,
      overtimeAmount: 0,
      async save() {
        saved = true;
      },
    };

    Reservation.findById = async () => resDoc;
    ParkingLot.findById = async () => ({
      _id: 'lot-1',
      overtimeGracePeriodMinutes: 15,
      overtimeRateMultiplier: 1.5,
      pricePerHour: 100,
    });
    ParkingSpace.findByIdAndUpdate = async () => {};
    ParkingLot.findByIdAndUpdate = async () => {};

    const req = {
      user: { _id: staffId, role: 'staff' },
      params: { id: 'res-overdue' },
    };
    let responseData = null;
    const res = {
      json(data) {
        responseData = data;
      },
    };

    await completeReservation(req, res, () => {});
    assert.strictEqual(saved, true);
    assert.strictEqual(resDoc.status, 'completed');
    assert.strictEqual(resDoc.completedBy, staffId);
    assert.ok(resDoc.overtimeMinutes >= 55, 'Overtime minutes should be around 60');
    assert.ok(resDoc.overtimeAmount > 0, 'Overtime amount should be calculated with 1.5 multiplier');
  });
});
