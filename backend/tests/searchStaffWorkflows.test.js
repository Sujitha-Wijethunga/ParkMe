const assert = require('node:assert/strict');
const { afterEach, beforeEach, suite, test } = require('node:test');

const ParkingLot = require('../models/ParkingLot');
const ParkingSpace = require('../models/ParkingSpace');
const Reservation = require('../models/Reservation');
const User = require('../models/User');

const { getParkingLotSuggestions } = require('../controllers/parkingLotController');
const { driverRegister, googleAuth, updateMe } = require('../controllers/authController');
const { getSpaces, createSpace } = require('../controllers/parkingSpaceController');
const {
  getAllReservations,
  lookupReservation,
  verifyReservation,
} = require('../controllers/reservationController');

suite('Search and Staff Workflows Test Suite', () => {
  function createMockRes() {
    return {
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
  }

  // ─────────────────────────────────────────────────────────────
  // 1. DRIVER SEARCH SUGGESTIONS
  // ─────────────────────────────────────────────────────────────
  suite('1. Driver Search Suggestions', () => {
    const originalFind = ParkingLot.find;

    afterEach(() => {
      ParkingLot.find = originalFind;
    });

    test('returns empty suggestions for empty or whitespace-only query', async () => {
      const req = { query: { q: '   ' } };
      const res = createMockRes();
      await getParkingLotSuggestions(req, res, () => {});

      assert.equal(res.statusCode, 200);
      assert.deepEqual(res.body, []);
    });

    test('returns trimmed, case-insensitive suggestions with lots, cities, and addresses', async () => {
      const mockLots = [
        {
          _id: 'lot-1',
          name: 'One Galle Face Mall Parking',
          city: 'Colombo',
          address: '1A Centre Road, Colombo 02',
          landmarks: ['Galle Face Green'],
          availableSpaces: 14,
          totalSpaces: 40,
          pricePerHour: 150,
        },
        {
          _id: 'lot-2',
          name: 'Colombo City Centre',
          city: 'Colombo',
          address: 'Sir James Pieris Mawatha',
          landmarks: ['Beira Lake'],
          availableSpaces: 8,
          totalSpaces: 30,
          pricePerHour: 200,
        },
      ];

      ParkingLot.find = (filter) => ({
        select: () => ({
          limit: () => ({
            lean: async () => mockLots,
          }),
        }),
      });

      const req = { query: { q: '  colombo  ', limit: '5' } };
      const res = createMockRes();
      await getParkingLotSuggestions(req, res, () => {});

      assert.equal(res.statusCode, 200);
      assert.ok(Array.isArray(res.body));
      assert.equal(res.body.length, 3); // 2 lots + 1 city group
      const lotSuggestion = res.body.find((s) => s.type === 'lot');
      assert.ok(lotSuggestion);
      assert.equal(lotSuggestion.id, 'lot-1');
      assert.equal(lotSuggestion.name, 'One Galle Face Mall Parking');
      assert.ok(lotSuggestion.subtitle.includes('Colombo'));
      const citySuggestion = res.body.find((s) => s.type === 'city');
      assert.ok(citySuggestion);
      assert.equal(citySuggestion.name, 'Colombo');
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 2. PUBLIC ATTEMPTS TO CREATE OR PROMOTE STAFF/ADMIN
  // ─────────────────────────────────────────────────────────────
  suite('2. Public Staff/Admin Escalation Rejection', () => {
    test('public driver register rejects role="staff" with 400', async () => {
      const req = {
        body: {
          name: 'Attacker',
          email: 'attacker@evil.com',
          phone: '0771234567',
          password: 'Password123!',
          role: 'staff',
        },
      };
      const res = createMockRes();
      await driverRegister(req, res, () => {});

      assert.equal(res.statusCode, 400);
      assert.ok(res.body.message.includes('Public registration cannot create staff or admin accounts'));
    });

    test('public driver register rejects staffCode or isAdmin with 400', async () => {
      const req = {
        body: {
          name: 'Attacker',
          email: 'attacker@evil.com',
          phone: '0771234567',
          password: 'Password123!',
          isAdmin: true,
        },
      };
      const res = createMockRes();
      await driverRegister(req, res, () => {});

      assert.equal(res.statusCode, 400);
      assert.ok(res.body.message.includes('Privileged credentials and fields are not permitted'));
    });

    test('googleAuth rejects non-driver role submissions with 400', async () => {
      const req = {
        body: {
          idToken: 'mock-token',
          role: 'admin',
        },
      };
      const res = createMockRes();
      await googleAuth(req, res, () => {});

      assert.equal(res.statusCode, 400);
      assert.ok(res.body.message.includes('Google authentication only creates driver accounts'));
    });

    test('updateMe rejects role or privileged field escalation with 400', async () => {
      const req = {
        user: { _id: 'user-1', role: 'driver' },
        body: {
          role: 'staff',
          staffId: 'STF-9999',
        },
      };
      const res = createMockRes();
      await updateMe(req, res, () => {});

      assert.equal(res.statusCode, 400);
      assert.ok(res.body.message.includes('Modifying privileged fields'));
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 3. STAFF PERMISSIONS AND LOT ISOLATION
  // ─────────────────────────────────────────────────────────────
  suite('3. Staff Permissions & Lot Isolation', () => {
    test('staff member cannot view spaces for another lot (403 Forbidden)', async () => {
      const req = {
        user: { _id: 'staff-1', role: 'staff', parkingLot: 'lot-allowed' },
        params: { lotId: 'lot-forbidden' },
        query: {},
      };
      const res = createMockRes();
      await getSpaces(req, res, () => {});

      assert.equal(res.statusCode, 403);
      assert.ok(res.body.message.includes('not authorized to view spaces for this parking lot'));
    });

    test('staff member cannot create spaces for another lot (403 Forbidden)', async () => {
      const req = {
        user: { _id: 'staff-1', role: 'staff', parkingLot: 'lot-allowed' },
        params: { lotId: 'lot-forbidden' },
        body: {
          spaceNumbers: ['A1'],
          floor: 'Ground Floor',
          vehicleType: 'Car',
        },
      };
      const res = createMockRes();
      let errorThrown = null;
      await createSpace(req, res, (err) => {
        errorThrown = err;
      });

      assert.ok(errorThrown);
      assert.equal(errorThrown.statusCode, 403);
      assert.ok(errorThrown.message.includes('not authorized to add spaces'));
    });

    test('staff member cannot query reservations for another lot (403 Forbidden)', async () => {
      const req = {
        user: { _id: 'staff-1', role: 'staff', parkingLot: 'lot-allowed' },
        query: { lotId: 'lot-forbidden' },
      };
      const res = createMockRes();
      await getAllReservations(req, res, () => {});

      assert.equal(res.statusCode, 403);
      assert.ok(res.body.message.includes('not authorized to view reservations for this parking lot'));
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 4. SPACE CREATION & DUPLICATE REJECTION
  // ─────────────────────────────────────────────────────────────
  suite('4. Space Creation & Duplicate Rejection', () => {
    const originalLotFindById = ParkingLot.findById;
    const originalLotFindByIdAndUpdate = ParkingLot.findByIdAndUpdate;
    const originalSpaceFind = ParkingSpace.find;
    const originalSpaceCount = ParkingSpace.countDocuments;
    const originalSpaceInsertMany = ParkingSpace.insertMany;

    afterEach(() => {
      ParkingLot.findById = originalLotFindById;
      ParkingLot.findByIdAndUpdate = originalLotFindByIdAndUpdate;
      ParkingSpace.find = originalSpaceFind;
      ParkingSpace.countDocuments = originalSpaceCount;
      ParkingSpace.insertMany = originalSpaceInsertMany;
    });

    test('rejects duplicate space numbers within the same lot with 409 Conflict', async () => {
      ParkingLot.findById = async () => ({ _id: 'lot-1', name: 'Mall Lot' });
      ParkingSpace.find = () => ({
        select: () => ({
          lean: async () => [{ spaceNumber: 'A1' }], // A1 already exists!
        }),
      });

      const req = {
        user: { _id: 'staff-1', role: 'staff', parkingLot: 'lot-1' },
        params: { lotId: 'lot-1' },
        body: {
          spaceNumbers: ['A1', 'A2'],
          floor: 'Ground Floor',
          vehicleType: 'Car',
        },
      };
      const res = createMockRes();
      let errorThrown = null;
      await createSpace(req, res, (err) => {
        errorThrown = err;
      });

      assert.ok(errorThrown);
      assert.equal(errorThrown.statusCode, 409);
      assert.ok(errorThrown.message.includes('already exists in this lot'));
    });

    test('creates new spaces with vehicleType and updates lot capacity', async () => {
      ParkingLot.findById = async () => ({ _id: 'lot-1', name: 'Mall Lot' });
      ParkingSpace.find = () => ({
        select: () => ({
          lean: async () => [], // No duplicates
        }),
      });
      ParkingSpace.insertMany = async (records) => records.map((r, i) => ({ ...r, _id: `space-${i}` }));
      ParkingSpace.countDocuments = async () => 10;
      let capacityUpdated = false;
      ParkingLot.findByIdAndUpdate = async (id, update) => {
        if (update.$set?.totalSpaces === 10) capacityUpdated = true;
        return {};
      };

      const req = {
        user: { _id: 'staff-1', role: 'staff', parkingLot: 'lot-1' },
        params: { lotId: 'lot-1' },
        body: {
          spaceNumbers: ['B10'],
          floor: 'Level 2',
          vehicleType: 'EV',
        },
      };
      const res = createMockRes();
      await createSpace(req, res, () => {});

      assert.equal(res.statusCode, 201);
      assert.equal(res.body.length, 1);
      assert.equal(res.body[0].spaceNumber, 'B10');
      assert.equal(res.body[0].vehicleType, 'EV');
      assert.equal(res.body[0].type, 'EV');
      assert.equal(capacityUpdated, true);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 5. DRIVER BOOKINGS → STAFF RESERVATIONS
  // ─────────────────────────────────────────────────────────────
  suite('5. Driver Bookings in Staff Reservation List', () => {
    const originalReservationFind = Reservation.find;

    afterEach(() => {
      Reservation.find = originalReservationFind;
    });

    test('staff reservations query restricts to staff assigned lot and returns driver bookings', async () => {
      let executedQuery = null;
      const mockReservations = [
        {
          _id: 'res-1',
          reference: 'PE-84213',
          parkingLot: { _id: 'lot-1', name: 'One Galle Face' },
          parkingSpace: { _id: 'sp-1', spaceNumber: 'A3', floor: 'Ground Floor' },
          driver: { _id: 'dr-1', name: 'Kasun Dias', phone: '0771234567' },
          vehiclePlate: 'WP CAB-4921',
          status: 'pending',
          startTime: new Date(),
          endTime: new Date(Date.now() + 3600000),
          totalAmount: 320,
        },
      ];

      Reservation.find = (q) => {
        executedQuery = q;
        return {
          populate: () => ({
            populate: () => ({
              populate: () => ({
                sort: async () => mockReservations,
              }),
            }),
          }),
        };
      };

      const req = {
        user: { _id: 'staff-1', role: 'staff', parkingLot: 'lot-1' },
        query: {},
      };
      const res = createMockRes();
      await getAllReservations(req, res, () => {});

      assert.equal(res.statusCode, 200);
      assert.equal(executedQuery.parkingLot, 'lot-1');
      assert.equal(res.body.length, 1);
      assert.equal(res.body[0].reference, 'PE-84213');
      assert.equal(res.body[0].parkingSpace.spaceNumber, 'A3');
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 6. FUNCTIONAL VERIFY PAGE & DUPLICATE CHECKS
  // ─────────────────────────────────────────────────────────────
  suite('6. Verification & Idempotency', () => {
    const originalFindOne = Reservation.findOne;
    const originalFindById = Reservation.findById;
    const originalSpaceUpdate = ParkingSpace.findByIdAndUpdate;

    afterEach(() => {
      Reservation.findOne = originalFindOne;
      Reservation.findById = originalFindById;
      ParkingSpace.findByIdAndUpdate = originalSpaceUpdate;
    });

    test('lookupReservation finds by reference for authorized staff', async () => {
      const mockResRecord = {
        _id: 'res-999',
        reference: 'PE-84213',
        parkingLot: { _id: 'lot-1', name: 'One Galle Face' },
        parkingSpace: { spaceNumber: 'A3' },
        driver: { name: 'Kasun Dias' },
        vehiclePlate: 'WP CAB-4921',
        status: 'pending',
        startTime: new Date(),
        endTime: new Date(Date.now() + 3600000),
      };

      Reservation.findOne = () => ({
        populate: () => ({
          populate: () => ({
            populate: async () => mockResRecord,
          }),
        }),
      });

      const req = {
        user: { _id: 'staff-1', role: 'staff', parkingLot: 'lot-1' },
        query: { query: 'PE-84213' },
      };
      const res = createMockRes();
      await lookupReservation(req, res, () => {});

      assert.equal(res.statusCode, 200);
      assert.equal(res.body.reference, 'PE-84213');
    });

    test('lookupReservation rejects when reservation belongs to another lot (403)', async () => {
      const mockResRecord = {
        _id: 'res-wrong-lot',
        reference: 'PE-99999',
        parkingLot: { _id: 'lot-other', name: 'Other Mall' },
      };

      Reservation.findOne = () => ({
        populate: () => ({
          populate: () => ({
            populate: async () => mockResRecord,
          }),
        }),
      });

      const req = {
        user: { _id: 'staff-1', role: 'staff', parkingLot: 'lot-1' },
        query: { query: 'PE-99999' },
      };
      const res = createMockRes();
      await lookupReservation(req, res, () => {});

      assert.equal(res.statusCode, 403);
      assert.equal(res.body.lotMismatch, true);
    });

    test('verifyReservation confirms entry, marks space occupied, and rejects duplicate scans', async () => {
      let spaceMarkedOccupied = false;
      const resRecord = {
        _id: 'res-101',
        parkingLot: { _id: 'lot-1' },
        parkingSpace: { _id: 'sp-101', spaceNumber: 'A3' },
        driver: { name: 'Kasun' },
        status: 'pending',
        checkInStatus: 'none',
        save: async function () {
          return this;
        },
      };

      Reservation.findById = () => ({
        populate: () => ({
          populate: () => ({
            populate: async () => resRecord,
          }),
        }),
      });

      ParkingSpace.findByIdAndUpdate = async (id, update) => {
        if (id === 'sp-101' && update.status === 'occupied') {
          spaceMarkedOccupied = true;
        }
      };

      // 1st Verification: Success
      const req1 = {
        user: { _id: 'staff-1', role: 'staff', parkingLot: 'lot-1' },
        params: { id: 'res-101' },
      };
      const res1 = createMockRes();
      await verifyReservation(req1, res1, () => {});

      assert.equal(res1.statusCode, 200);
      assert.equal(resRecord.status, 'active');
      assert.equal(resRecord.checkInStatus, 'confirmed');
      assert.ok(resRecord.verifiedAt);
      assert.equal(spaceMarkedOccupied, true);

      // 2nd Verification (duplicate scan): Rejected with 400
      const req2 = {
        user: { _id: 'staff-1', role: 'staff', parkingLot: 'lot-1' },
        params: { id: 'res-101' },
      };
      const res2 = createMockRes();
      await verifyReservation(req2, res2, () => {});

      assert.equal(res2.statusCode, 400);
      assert.equal(res2.body.message, 'Reservation is already active');
    });
  });
});
