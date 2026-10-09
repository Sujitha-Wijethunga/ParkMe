const assert = require('node:assert/strict');
const { afterEach, beforeEach, suite, test } = require('node:test');
const WalkInSession = require('../models/WalkInSession');
const ParkingSpace = require('../models/ParkingSpace');
const ParkingLot = require('../models/ParkingLot');
const Reservation = require('../models/Reservation');
const Payment = require('../models/Payment');
const {
  getAvailableSpaces,
  createWalkInEntry,
  getWalkInSession,
  getActiveWalkIns,
  checkoutWalkIn,
  calculateWalkInCharges,
  normalizePlate,
} = require('../controllers/walkInController');

const originalMethods = {
  walkInFind: WalkInSession.find,
  walkInFindOne: WalkInSession.findOne,
  walkInFindById: WalkInSession.findById,
  walkInCreate: WalkInSession.create,
  spaceFind: ParkingSpace.find,
  spaceFindOne: ParkingSpace.findOne,
  spaceFindById: ParkingSpace.findById,
  spaceFindOneAndUpdate: ParkingSpace.findOneAndUpdate,
  spaceFindByIdAndUpdate: ParkingSpace.findByIdAndUpdate,
  lotFindOne: ParkingLot.findOne,
  lotFindById: ParkingLot.findById,
  lotFindByIdAndUpdate: ParkingLot.findByIdAndUpdate,
  reservationFind: Reservation.find,
  reservationFindOne: Reservation.findOne,
  paymentCreate: Payment.create,
};

suite('Walk-In Parking Workflow Suite', () => {
  let createdPayments;
  let spaceUpdates;
  let lotUpdates;
  let mockLot;
  let mockSpaces;
  let mockSessions;

  beforeEach(() => {
    createdPayments = [];
    spaceUpdates = [];
    lotUpdates = [];
    mockSessions = [];

    mockLot = {
      _id: 'lot-colombo-1',
      name: 'Colombo City Centre Car Park',
      address: '137 Sir James Pieris Mawatha',
      pricePerHour: 150,
      serviceCharge: 50,
      vehicleTariffs: { Car: 150, Bike: 60, SUV: 200, EV: 180 },
      availableSpaces: 20,
    };

    mockSpaces = [
      { _id: 'space-car-1', spaceNumber: 'A1', floor: 'G', parkingLot: 'lot-colombo-1', status: 'available', vehicleType: 'Car' },
      { _id: 'space-bike-1', spaceNumber: 'B1', floor: 'G', parkingLot: 'lot-colombo-1', status: 'available', vehicleType: 'Bike' },
      { _id: 'space-suv-1', spaceNumber: 'S1', floor: '1', parkingLot: 'lot-colombo-1', status: 'available', vehicleType: 'SUV' },
      { _id: 'space-ev-1', spaceNumber: 'E1', floor: '1', parkingLot: 'lot-colombo-1', status: 'available', vehicleType: 'EV' },
      { _id: 'space-occupied-1', spaceNumber: 'C1', floor: 'G', parkingLot: 'lot-colombo-1', status: 'occupied', vehicleType: 'Car' },
    ];

    ParkingLot.findById = async (id) => (String(id) === 'lot-colombo-1' ? mockLot : null);
    ParkingLot.findOne = async () => mockLot;
    ParkingLot.findById = (id) => {
      const match = String(id) === 'lot-colombo-1' ? mockLot : null;
      const q = {
        select: () => q,
        lean: () => Promise.resolve(match),
        then: (onResolve) => Promise.resolve(match).then(onResolve),
      };
      return q;
    };
    ParkingLot.findOne = async () => mockLot;
    ParkingLot.findByIdAndUpdate = async (id, update) => {
      lotUpdates.push({ id, update });
      return mockLot;
    };

    ParkingSpace.find = (query) => {
      const filtered = mockSpaces.filter((s) => s.status === 'available' && (!query?.parkingLot || s.parkingLot === query.parkingLot));
      const q = {
        sort: () => Promise.resolve(filtered),
        then: (onResolve) => Promise.resolve(filtered).then(onResolve),
      };
      return q;
    };

    ParkingSpace.findById = async (id) => mockSpaces.find((s) => s._id === id) || null;
    ParkingSpace.findOne = async (query) => {
      return mockSpaces.find((s) => {
        if (query._id && s._id !== query._id) return false;
        if (query.parkingLot && s.parkingLot !== query.parkingLot) return false;
        if (query.spaceNumber && s.spaceNumber !== query.spaceNumber) return false;
        if (query.status && s.status !== query.status) return false;
        return true;
      }) || null;
    };

    ParkingSpace.findOneAndUpdate = async (filter, update) => {
      const space = mockSpaces.find((s) => s._id === filter._id && s.status === filter.status);
      if (!space) return null;
      Object.assign(space, update);
      spaceUpdates.push({ id: space._id, update });
      return { ...space };
    };

    ParkingSpace.findByIdAndUpdate = async (id, update) => {
      const space = mockSpaces.find((s) => s._id === id);
      if (space) Object.assign(space, update);
      spaceUpdates.push({ id, update });
      return space;
    };

    Reservation.find = () => {
      const q = {
        select: () => q,
        lean: () => Promise.resolve([]),
        then: (onResolve) => Promise.resolve([]).then(onResolve),
      };
      return q;
    };
    Reservation.findOne = async () => null;

    WalkInSession.find = (query) => {
      const filtered = mockSessions.filter((s) => {
        if (query?.status && s.status !== query.status) return false;
        if (query?.parkingLot && s.parkingLot !== query.parkingLot) return false;
        return true;
      });
      const q = {
        populate: () => q,
        sort: () => q,
        limit: () => Promise.resolve(filtered),
        select: () => q,
        lean: () => Promise.resolve(filtered),
        then: (onResolve) => Promise.resolve(filtered).then(onResolve),
      };
      return q;
    };

    function matchWithPopulate(item) {
      if (!item) return null;
      item.populate = function () {
        return this;
      };
      item.toObject = function () {
        return { ...this };
      };
      return item;
    }

    WalkInSession.findOne = async (query) => {
      if (query.reference) {
        const regex = query.reference instanceof RegExp ? query.reference : new RegExp(`^${query.reference}$`, 'i');
        const match = mockSessions.find((s) => regex.test(s.reference));
        if (match) return matchWithPopulate(match);
      }
      if (query.vehiclePlate) {
        const match = mockSessions.find((s) => s.vehiclePlate === query.vehiclePlate && s.status === query.status);
        return match ? matchWithPopulate(match) : null;
      }
      if (query.idempotencyKey) {
        const match = mockSessions.find((s) => s.idempotencyKey === query.idempotencyKey);
        if (match) return matchWithPopulate(match);
      }
      return null;
    };

    WalkInSession.findById = async (id) => {
      const match = mockSessions.find((s) => s._id === id);
      return match ? matchWithPopulate(match) : null;
    };

    WalkInSession.create = async (doc) => {
      const session = {
        _id: `wi-${mockSessions.length + 1}`,
        ...doc,
        payments: [],
        save: async function () {
          return this;
        },
      };
      matchWithPopulate(session);
      mockSessions.push(session);
      return session;
    };

    Payment.create = async (doc) => {
      const payment = { _id: `pay-${createdPayments.length + 1}`, ...doc };
      createdPayments.push(payment);
      return payment;
    };
  });

  afterEach(() => {
    Object.keys(originalMethods).forEach((k) => {
      if (k.startsWith('walkIn')) WalkInSession[k.replace('walkIn', '').toLowerCase()] = originalMethods[k];
      if (k.startsWith('space')) ParkingSpace[k.replace('space', '').toLowerCase()] = originalMethods[k];
      if (k.startsWith('lot')) ParkingLot[k.replace('lot', '').toLowerCase()] = originalMethods[k];
      if (k.startsWith('reservation')) Reservation[k.replace('reservation', '').toLowerCase()] = originalMethods[k];
      if (k.startsWith('payment')) Payment[k.replace('payment', '').toLowerCase()] = originalMethods[k];
    });
    WalkInSession.find = originalMethods.walkInFind;
    WalkInSession.findOne = originalMethods.walkInFindOne;
    WalkInSession.findById = originalMethods.walkInFindById;
    WalkInSession.create = originalMethods.walkInCreate;
    ParkingSpace.find = originalMethods.spaceFind;
    ParkingSpace.findOne = originalMethods.spaceFindOne;
    ParkingSpace.findById = originalMethods.spaceFindById;
    ParkingSpace.findOneAndUpdate = originalMethods.spaceFindOneAndUpdate;
    ParkingSpace.findByIdAndUpdate = originalMethods.spaceFindByIdAndUpdate;
    ParkingLot.findOne = originalMethods.lotFindOne;
    ParkingLot.findById = originalMethods.lotFindById;
    ParkingLot.findByIdAndUpdate = originalMethods.lotFindByIdAndUpdate;
    Reservation.find = originalMethods.reservationFind;
    Reservation.findOne = originalMethods.reservationFindOne;
    Payment.create = originalMethods.paymentCreate;
  });

  function mockResponse() {
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
    return res;
  }

  // 1. Walk-in entry without driver account
  test('1. Creates walk-in entry without a driver account and snapshots tariffs', async () => {
    const req = {
      user: { _id: 'staff-1', role: 'staff', parkingLot: 'lot-colombo-1' },
      body: {
        parkingLotId: 'lot-colombo-1',
        vehiclePlate: 'wp cab-4921',
        vehicleType: 'Car',
        parkingSpaceId: 'space-car-1',
        customerName: 'Saman Perera',
        customerPhone: '0771234567',
      },
    };
    const res = mockResponse();

    await createWalkInEntry(req, res, () => {});

    assert.equal(res.statusCode, 201);
    assert.ok(res.body.session);
    assert.equal(res.body.session.vehiclePlate, 'WP CAB-4921'); // Normalized
    assert.equal(res.body.session.spaceNumber, 'A1');
    assert.equal(res.body.session.hourlyRate, 150); // Snapshot
    assert.equal(res.body.session.serviceCharge, 50); // Snapshot
    assert.equal(res.body.session.status, 'active');
    assert.equal(res.body.session.paymentStatus, 'unpaid');
    assert.ok(res.body.receipt.reference.startsWith('PM-WI-'));
    assert.equal(spaceUpdates.length, 1);
    assert.equal(spaceUpdates[0].update.status, 'occupied');
  });

  // 2. Vehicle-compatible slot selection
  test('2. Rejects slot assignment if vehicle type is incompatible with space', async () => {
    const req = {
      user: { _id: 'staff-1', role: 'staff', parkingLot: 'lot-colombo-1' },
      body: {
        parkingLotId: 'lot-colombo-1',
        vehiclePlate: 'WP SUV-9999',
        vehicleType: 'SUV',
        parkingSpaceId: 'space-bike-1', // Bike space
      },
    };
    const res = mockResponse();

    await createWalkInEntry(req, res, () => {});

    assert.equal(res.statusCode, 409);
    assert.match(res.body.message, /designated for Bike/);
  });

  // 3. Walk-in/reservation allocation conflicts
  test('3. Excludes spaces that have upcoming app reservations', async () => {
    // Mock upcoming reservation on space-car-1
    Reservation.find = () => {
      const reserved = [{ parkingSpace: 'space-car-1' }];
      const q = {
        select: () => q,
        lean: () => Promise.resolve(reserved),
        then: (onResolve) => Promise.resolve(reserved).then(onResolve),
      };
      return q;
    };

    const req = {
      user: { _id: 'staff-1', role: 'staff', parkingLot: 'lot-colombo-1' },
      query: { vehicleType: 'Car' },
    };
    const res = mockResponse();

    await getAvailableSpaces(req, res, () => {});

    assert.equal(res.statusCode, 200);
    // space-car-1 must NOT be in available spaces
    const availableIds = res.body.spaces.map((s) => s._id);
    assert.ok(!availableIds.includes('space-car-1'));
  });

  // 4. Concurrent assignment of the same slot
  test('4. Atomic slot lock fails safely if slot was just taken concurrently', async () => {
    // Force findOneAndUpdate to return null (slot already taken)
    ParkingSpace.findOneAndUpdate = async () => null;

    const req = {
      user: { _id: 'staff-1', role: 'staff', parkingLot: 'lot-colombo-1' },
      body: {
        parkingLotId: 'lot-colombo-1',
        vehiclePlate: 'WP CAR-1111',
        vehicleType: 'Car',
        parkingSpaceId: 'space-car-1',
      },
    };
    const res = mockResponse();

    await createWalkInEntry(req, res, () => {});

    assert.equal(res.statusCode, 409);
    assert.match(res.body.message, /just assigned to another vehicle/);
  });

  // 5. Duplicate active vehicle plate rejection
  test('5. Rejects entry if vehicle already has an active walk-in session', async () => {
    mockSessions.push({
      _id: 'wi-existing',
      reference: 'PM-WI-OLD01',
      vehiclePlate: 'WP CAB-4921',
      spaceNumber: 'A1',
      status: 'active',
    });

    const req = {
      user: { _id: 'staff-1', role: 'staff', parkingLot: 'lot-colombo-1' },
      body: {
        parkingLotId: 'lot-colombo-1',
        vehiclePlate: 'WP CAB-4921',
        vehicleType: 'Car',
        parkingSpaceId: 'space-car-1',
      },
    };
    const res = mockResponse();

    await createWalkInEntry(req, res, () => {});

    assert.equal(res.statusCode, 409);
    assert.match(res.body.message, /already has an active parking session/);
  });

  // 6. Idempotency key handling
  test('6. Replaying with identical idempotencyKey returns existing session without double allocation', async () => {
    const existing = {
      _id: 'wi-idemp-1',
      reference: 'PM-WI-IDEMP',
      idempotencyKey: 'idemp-key-123',
      vehiclePlate: 'WP AAA-1111',
      spaceNumber: 'A1',
      status: 'active',
      hourlyRate: 150,
      serviceCharge: 50,
      entryTime: new Date(),
    };
    mockSessions.push(existing);

    const req = {
      user: { _id: 'staff-1', role: 'staff', parkingLot: 'lot-colombo-1' },
      body: {
        parkingLotId: 'lot-colombo-1',
        vehiclePlate: 'WP AAA-1111',
        vehicleType: 'Car',
        parkingSpaceId: 'space-car-1',
        idempotencyKey: 'idemp-key-123',
      },
    };
    const res = mockResponse();

    await createWalkInEntry(req, res, () => {});

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.isIdempotentReplay, true);
    assert.equal(res.body.session.reference, 'PM-WI-IDEMP');
  });

  // 7. Tariff snapshot preservation and billing rule calculation
  test('7. Calculates charges exactly as: Each started hour × saved rate + one-time service charge', () => {
    const session = {
      entryTime: new Date(Date.now() - 75 * 60 * 1000), // 1 hour 15 mins ago -> 2 started hours
      hourlyRate: 150,
      serviceCharge: 50,
      amountPaid: 0,
      status: 'active',
    };

    const calc = calculateWalkInCharges(session);

    assert.equal(calc.startedHours, 2);
    assert.equal(calc.parkingCharge, 300); // 2 * 150
    assert.equal(calc.serviceCharge, 50);
    assert.equal(calc.totalAmount, 350); // 300 + 50
    assert.equal(calc.balanceDue, 350);
    assert.equal(calc.isEstimated, true);
  });

  // 8. Staff location restriction on session query
  test('8. Rejects staff access to a receipt from another parking lot (403 Forbidden)', async () => {
    mockSessions.push({
      _id: 'wi-other-lot',
      reference: 'PM-WI-OTHER',
      parkingLot: 'lot-other-kandy',
      status: 'active',
      entryTime: new Date(),
      hourlyRate: 100,
    });

    const req = {
      user: { _id: 'staff-1', role: 'staff', parkingLot: 'lot-colombo-1' },
      params: { refOrId: 'PM-WI-OTHER' },
    };
    const res = mockResponse();

    await getWalkInSession(req, res, () => {});

    assert.equal(res.statusCode, 403);
    assert.match(res.body.message, /different parking facility/);
  });

  // 9. Authorized cash payment and checkout with space release
  test('9. Full cash payment at checkout releases space and marks session completed', async () => {
    const session = {
      _id: 'wi-pay-test',
      reference: 'PM-WI-PAY01',
      parkingLot: 'lot-colombo-1',
      parkingSpace: 'space-car-1',
      spaceNumber: 'A1',
      status: 'active',
      entryTime: new Date(Date.now() - 30 * 60 * 1000), // 30m -> 1 started hour
      hourlyRate: 150,
      serviceCharge: 50,
      amountPaid: 0,
      payments: [],
      save: async function () {
        return this;
      },
    };
    mockSessions.push(session);

    const req = {
      user: { _id: 'staff-1', role: 'staff', parkingLot: 'lot-colombo-1' },
      body: {
        reference: 'PM-WI-PAY01',
        amountPaid: 200, // 1 hr (150) + service (50) = 200
        paymentMethod: 'cash',
        confirmDeparture: true,
      },
    };
    const res = mockResponse();

    await checkoutWalkIn(req, res, () => {});

    assert.equal(res.statusCode, 200);
    assert.equal(session.status, 'completed');
    assert.equal(session.paymentStatus, 'paid');
    assert.equal(session.amountPaid, 200);
    assert.equal(session.outstandingBalance, 0);
    assert.equal(createdPayments.length, 1);
    assert.equal(createdPayments[0].method, 'cash');
    assert.equal(createdPayments[0].amount, 200);

    // Slot freed
    const spaceRelease = spaceUpdates.find((u) => u.id === 'space-car-1' && u.update.status === 'available');
    assert.ok(spaceRelease);
  });

  // 10. Departure confirmed with unpaid balance retains balance separately
  test('10. Confirmed departure with partial payment retains outstanding balance', async () => {
    const session = {
      _id: 'wi-partial-test',
      reference: 'PM-WI-PARTIAL',
      parkingLot: 'lot-colombo-1',
      parkingSpace: 'space-car-1',
      spaceNumber: 'A1',
      status: 'active',
      entryTime: new Date(Date.now() - 30 * 60 * 1000), // 1 started hour: 150 + 50 = 200
      hourlyRate: 150,
      serviceCharge: 50,
      amountPaid: 0,
      payments: [],
      save: async function () {
        return this;
      },
    };
    mockSessions.push(session);

    const req = {
      user: { _id: 'staff-1', role: 'staff', parkingLot: 'lot-colombo-1' },
      body: {
        reference: 'PM-WI-PARTIAL',
        amountPaid: 100, // Driver only paid 100 out of 200
        paymentMethod: 'cash',
        confirmDeparture: true,
      },
    };
    const res = mockResponse();

    await checkoutWalkIn(req, res, () => {});

    assert.equal(res.statusCode, 200);
    assert.equal(session.status, 'completed');
    assert.equal(session.paymentStatus, 'partially_paid');
    assert.equal(session.amountPaid, 100);
    assert.equal(session.outstandingBalance, 100); // 200 - 100 = 100 retained
  });

  // 11. Repeated checkout rejection (idempotent guard)
  test('11. Rejects repeated checkout on already completed session with 409 Conflict', async () => {
    const completedSession = {
      _id: 'wi-done-test',
      reference: 'PM-WI-ALREADY-DONE',
      parkingLot: 'lot-colombo-1',
      parkingSpace: 'space-car-1',
      status: 'completed',
      exitTime: new Date(Date.now() - 10 * 60 * 1000),
      finalAmount: 200,
      amountPaid: 200,
      outstandingBalance: 0,
      save: async function () {
        return this;
      },
    };
    mockSessions.push(completedSession);

    const req = {
      user: { _id: 'staff-1', role: 'staff', parkingLot: 'lot-colombo-1' },
      body: {
        reference: 'PM-WI-ALREADY-DONE',
        amountPaid: 200,
        confirmDeparture: true,
      },
    };
    const res = mockResponse();

    await checkoutWalkIn(req, res, () => {});

    assert.equal(res.statusCode, 409);
    assert.equal(res.body.isAlreadyCompleted, true);
  });
});
