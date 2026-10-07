const assert = require('node:assert/strict');
const { afterEach, beforeEach, suite, test } = require('node:test');
const Reservation = require('../models/Reservation');
const ParkingSpace = require('../models/ParkingSpace');
const ParkingLot = require('../models/ParkingLot');
const Payment = require('../models/Payment');
const {
  requestCheckIn,
  cancelCheckIn,
  verifyReservation,
  requestCheckout,
  completeReservation,
  recordOvertimeCashPayment,
  lookupReservation,
} = require('../controllers/reservationController');

const originalMethods = {
  reservationFindById: Reservation.findById,
  reservationFindOne: Reservation.findOne,
  spaceFindById: ParkingSpace.findById,
  spaceFindByIdAndUpdate: ParkingSpace.findByIdAndUpdate,
  lotFindById: ParkingLot.findById,
  lotFindByIdAndUpdate: ParkingLot.findByIdAndUpdate,
  paymentFindOne: Payment.findOne,
  paymentCreate: Payment.create,
};

suite('Verified Active Parking & Overtime Suite', () => {
  let reservation;
  let parkingSpace;
  let parkingLot;
  let spaceUpdates;
  let lotUpdates;
  let createdPayments;

  beforeEach(() => {
    spaceUpdates = [];
    lotUpdates = [];
    createdPayments = [];

    parkingLot = {
      _id: 'lot-1',
      name: 'Colombo City Centre',
      pricePerHour: 150,
      managedBy: { toString: () => 'staff-1' },
    };

    parkingSpace = {
      _id: 'space-1',
      spaceNumber: 'A3',
      parkingLot: 'lot-1',
      status: 'available',
      save: async function () {
        return this;
      },
    };

    reservation = {
      _id: 'res-123',
      reference: 'PM-12345',
      driver: { toString: () => 'driver-1', name: 'Kasun' },
      parkingLot: 'lot-1',
      parkingSpace: 'space-1',
      vehiclePlate: 'WP CAB-1234',
      vehicleType: 'Car',
      startTime: new Date(Date.now() - 3600000), // 1 hour ago
      endTime: new Date(Date.now() + 3600000), // 1 hour from now
      status: 'pending',
      checkInStatus: 'none',
      checkoutStatus: 'none',
      overtimeGraceMinutes: 10,
      overtimeBillingRule: 'per_started_hour',
      overtimeRatePerHour: 150,
      totalAmount: 300,
      extensionHistory: [],
      save: async function () {
        return this;
      },
      populate: async function () {
        return this;
      },
    };

    Reservation.findById = (id) => {
      const q = {
        populate: () => q,
        then: (resolve) => {
          if (id === reservation._id || id === 'res-123') resolve(reservation);
          else resolve(null);
        },
      };
      return q;
    };

    Reservation.findOne = (query) => ({
      populate: () => ({
        populate: async () => {
          if (query._id === reservation._id || query.reference === reservation.reference) {
            return reservation;
          }
          return null;
        },
      }),
    });

    ParkingSpace.findById = async (id) => {
      if (id === parkingSpace._id) return parkingSpace;
      return null;
    };

    ParkingSpace.findByIdAndUpdate = async (...args) => {
      spaceUpdates.push(args);
      if (args[1]?.status) parkingSpace.status = args[1].status;
      return parkingSpace;
    };

    ParkingLot.findById = async (id) => {
      if (id === parkingLot._id) return parkingLot;
      return null;
    };

    ParkingLot.findByIdAndUpdate = async (...args) => {
      lotUpdates.push(args);
      return parkingLot;
    };

    Payment.findOne = () => ({
      select: async () => ({ method: 'card', status: 'completed' }),
    });

    Payment.create = async (...args) => {
      createdPayments.push(args);
      return args[0];
    };
  });

  afterEach(() => {
    Reservation.findById = originalMethods.reservationFindById;
    Reservation.findOne = originalMethods.reservationFindOne;
    ParkingSpace.findById = originalMethods.spaceFindById;
    ParkingSpace.findByIdAndUpdate = originalMethods.spaceFindByIdAndUpdate;
    ParkingLot.findById = originalMethods.lotFindById;
    ParkingLot.findByIdAndUpdate = originalMethods.lotFindByIdAndUpdate;
    Payment.findOne = originalMethods.paymentFindOne;
    Payment.create = originalMethods.paymentCreate;
  });

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

  // 1. Driver starts check-in → Pending → staff verifies → Active
  test('1. Driver starts check-in -> Pending (requested) -> staff verifies -> Active with space occupied', async () => {
    // Step A: Driver requests check-in
    const driverReq = {
      params: { id: 'res-123' },
      user: { _id: { toString: () => 'driver-1' }, role: 'driver' },
    };
    const driverRes = createMockRes();
    await requestCheckIn(driverReq, driverRes);

    assert.equal(driverRes.statusCode, 200);
    assert.equal(reservation.checkInStatus, 'requested');
    assert.equal(reservation.status, 'pending'); // NOT active yet!
    assert.equal(parkingSpace.status, 'available'); // Space is NOT occupied merely because driver tapped!

    // Step B: Staff verifies entry
    const staffReq = {
      params: { id: 'res-123' },
      user: { _id: { toString: () => 'staff-1' }, role: 'staff', assignedLot: 'lot-1' },
    };
    const staffRes = createMockRes();
    await verifyReservation(staffReq, staffRes, (err) => { throw err; });

    assert.equal(staffRes.statusCode, 200);
    assert.equal(reservation.status, 'active');
    assert.equal(reservation.checkInStatus, 'confirmed');
    assert.ok(reservation.checkedInAt instanceof Date);
    assert.equal(reservation.checkedInBy.toString(), 'staff-1');
    assert.equal(parkingSpace.status, 'occupied');
  });

  // 2. Staff verifies entry without a driver request → Active
  test('2. Staff verifies entry without prior driver request -> Active with space occupied', async () => {
    reservation.checkInStatus = 'none';
    const staffReq = {
      params: { id: 'res-123' },
      user: { _id: { toString: () => 'staff-1' }, role: 'staff', assignedLot: 'lot-1' },
    };
    const staffRes = createMockRes();
    await verifyReservation(staffReq, staffRes, (err) => { throw err; });

    assert.equal(staffRes.statusCode, 200);
    assert.equal(reservation.status, 'active');
    assert.equal(reservation.checkInStatus, 'confirmed');
    assert.ok(reservation.checkedInAt instanceof Date);
    assert.equal(parkingSpace.status, 'occupied');
  });

  // 3. Duplicate scans and taps do not create duplicate records
  test('3. Repeated driver check-in taps and repeated staff scans are idempotent and reject duplicates', async () => {
    reservation.checkInStatus = 'requested';
    const driverReq = {
      params: { id: 'res-123' },
      user: { _id: { toString: () => 'driver-1' }, role: 'driver' },
    };
    const driverRes = createMockRes();
    await requestCheckIn(driverReq, driverRes, (err) => { throw err; });
    assert.equal(driverRes.statusCode, 200);
    assert.equal(reservation.checkInStatus, 'requested');

    // Activate reservation
    reservation.status = 'active';
    reservation.checkInStatus = 'confirmed';
    const originalCheckedInAt = new Date(Date.now() - 5000);
    reservation.checkedInAt = originalCheckedInAt;

    // Staff attempts second scan on already active reservation
    const staffReq = {
      params: { id: 'res-123' },
      user: { _id: { toString: () => 'staff-1' }, role: 'staff', assignedLot: 'lot-1' },
    };
    const staffRes = createMockRes();
    await verifyReservation(staffReq, staffRes, (err) => { throw err; });

    assert.equal(staffRes.statusCode, 400);
    assert.match(staffRes.body.message, /already active/i);
    assert.equal(reservation.checkedInAt, originalCheckedInAt);
  });

  // 4. Unauthorized staff and drivers cannot change another booking
  test('4. Unauthorized staff (wrong lot) and unauthorized driver cannot alter booking', async () => {
    // Driver 2 trying to check in Driver 1's booking
    const rogueDriverReq = {
      params: { id: 'res-123' },
      user: { _id: { toString: () => 'driver-rogue' }, role: 'driver' },
    };
    const rogueDriverRes = createMockRes();
    await requestCheckIn(rogueDriverReq, rogueDriverRes, (err) => { throw err; });
    assert.equal(rogueDriverRes.statusCode, 403);

    // Staff assigned to lot-999 trying to verify booking at lot-1
    const rogueStaffReq = {
      params: { id: 'res-123' },
      user: { _id: { toString: () => 'staff-2' }, role: 'staff', assignedLot: 'lot-999' },
    };
    const rogueStaffRes = createMockRes();
    await verifyReservation(rogueStaffReq, rogueStaffRes, (err) => { throw err; });
    assert.equal(rogueStaffRes.statusCode, 403);
    assert.match(rogueStaffRes.body.message, /access denied|not assigned|not authorized/i);
  });

  // 5. Overdue booking remains physically occupied until verified exit
  test('5. Overdue booking stays physically occupied and does NOT free slot automatically', async () => {
    reservation.status = 'active';
    reservation.checkedInAt = new Date(Date.now() - 4 * 3600000);
    reservation.endTime = new Date(Date.now() - 2 * 3600000); // Ended 2 hours ago!
    parkingSpace.status = 'occupied';

    // Driver presses release
    const driverReq = {
      params: { id: 'res-123' },
      user: { _id: { toString: () => 'driver-1' }, role: 'driver' },
    };
    const driverRes = createMockRes();
    await requestCheckout(driverReq, driverRes);

    assert.equal(driverRes.statusCode, 200);
    assert.equal(reservation.checkoutStatus, 'requested');
    assert.equal(reservation.status, 'active');
    assert.equal(parkingSpace.status, 'occupied'); // MUST NOT BE FREED YET!
  });

  // 6. Checkout within grace produces zero overtime
  test('6. Checkout within 10-minute grace period produces zero overtime charge', async () => {
    reservation.status = 'active';
    reservation.checkedInAt = new Date(Date.now() - 2 * 3600000);
    // Paid end time was 5 minutes ago (within 10 min grace)
    reservation.endTime = new Date(Date.now() - 5 * 60000);
    reservation.overtimeGraceMinutes = 10;
    reservation.overtimeRatePerHour = 150;

    const staffReq = {
      params: { id: 'res-123' },
      body: {},
      user: { _id: { toString: () => 'staff-1' }, role: 'staff', assignedLot: 'lot-1' },
    };
    const staffRes = createMockRes();
    await completeReservation(staffReq, staffRes);

    assert.equal(staffRes.statusCode, 200);
    assert.equal(reservation.status, 'completed');
    assert.equal(reservation.overtimeAmount, 0);
    assert.equal(reservation.unpaidOvertimeAmount, 0);
    assert.equal(parkingSpace.status, 'available');
  });

  // 7. Checkout beyond grace produces the correct charge (per started hour)
  test('7. Checkout beyond grace produces exact integer charge per started hour (35m overdue -> Rs. 150)', async () => {
    reservation.status = 'active';
    reservation.checkedInAt = new Date(Date.now() - 2 * 3600000);
    // End time was 35 minutes ago: 10-min grace exceeded -> 1 started hour at Rs. 150
    reservation.endTime = new Date(Date.now() - 35 * 60000);
    reservation.overtimeGraceMinutes = 10;
    reservation.overtimeRatePerHour = 150;

    const staffReq = {
      params: { id: 'res-123' },
      body: { recordPayment: true, paymentMethod: 'cash' },
      user: { _id: { toString: () => 'staff-1' }, role: 'staff', assignedLot: 'lot-1' },
    };
    const staffRes = createMockRes();
    await completeReservation(staffReq, staffRes);

    assert.equal(staffRes.statusCode, 200);
    assert.equal(reservation.status, 'completed');
    assert.equal(reservation.overtimeAmount, 150);
    assert.equal(reservation.unpaidOvertimeAmount, 0); // Paid cash
    assert.equal(reservation.overtimePaymentStatus, 'paid');
    assert.equal(parkingSpace.status, 'available');
    assert.equal(createdPayments.length, 1);
    assert.equal(createdPayments[0][0].amount, 150);
  });

  // 8. Approved extension prevents double billing
  test('8. Approved booking extension extends paid window and prevents double billing', async () => {
    reservation.status = 'active';
    reservation.checkedInAt = new Date(Date.now() - 3 * 3600000);
    // Originally booked end was 45 min ago, but extension granted 1 extra hour, so paid end is 15 min in future!
    reservation.endTime = new Date(Date.now() + 15 * 60000);
    reservation.extensionHistory = [
      { extensionHours: 1, extensionFee: 150, paidAt: new Date() },
    ];
    reservation.overtimeRatePerHour = 150;

    const staffReq = {
      params: { id: 'res-123' },
      body: {},
      user: { _id: { toString: () => 'staff-1' }, role: 'staff', assignedLot: 'lot-1' },
    };
    const staffRes = createMockRes();
    await completeReservation(staffReq, staffRes);

    assert.equal(staffRes.statusCode, 200);
    assert.equal(reservation.status, 'completed');
    assert.equal(reservation.overtimeAmount, 0); // Zero overtime because extension covered it!
  });

  // 9. Driver requests release → staff verifies exit → slot becomes free
  test('9. Driver requests release -> staff verifies exit -> slot freed and checkedOutAt saved', async () => {
    reservation.status = 'active';
    parkingSpace.status = 'occupied';

    // Step A: Driver requests release
    const driverReq = {
      params: { id: 'res-123' },
      user: { _id: { toString: () => 'driver-1' }, role: 'driver' },
    };
    const driverRes = createMockRes();
    await requestCheckout(driverReq, driverRes);
    assert.equal(driverRes.statusCode, 200);
    assert.equal(reservation.checkoutStatus, 'requested');
    assert.equal(parkingSpace.status, 'occupied'); // Still occupied!

    // Step B: Staff verifies exit
    const staffReq = {
      params: { id: 'res-123' },
      body: {},
      user: { _id: { toString: () => 'staff-1' }, role: 'staff', assignedLot: 'lot-1' },
    };
    const staffRes = createMockRes();
    await completeReservation(staffReq, staffRes);

    assert.equal(staffRes.statusCode, 200);
    assert.equal(reservation.status, 'completed');
    assert.equal(reservation.checkoutStatus, 'confirmed');
    assert.ok(reservation.checkedOutAt instanceof Date);
    assert.equal(reservation.checkedOutBy.toString(), 'staff-1');
    assert.equal(parkingSpace.status, 'available'); // Now freed!
  });

  // 10. Unpaid overtime remains pending after slot is freed
  test('10. If overtime is unpaid at exit, slot is still freed but balance remains pending', async () => {
    reservation.status = 'active';
    // 70 minutes overdue -> 2 started hours = Rs. 300
    reservation.endTime = new Date(Date.now() - 70 * 60000);
    reservation.overtimeRatePerHour = 150;

    const staffReq = {
      params: { id: 'res-123' },
      body: { recordPayment: false }, // Driver didn't pay cash yet
      user: { _id: { toString: () => 'staff-1' }, role: 'staff', assignedLot: 'lot-1' },
    };
    const staffRes = createMockRes();
    await completeReservation(staffReq, staffRes);

    assert.equal(staffRes.statusCode, 200);
    assert.equal(reservation.status, 'completed');
    assert.equal(parkingSpace.status, 'available'); // Slot is freed!
    assert.equal(reservation.overtimeAmount, 300);
    assert.equal(reservation.unpaidOvertimeAmount, 300);
    assert.equal(reservation.overtimePaymentStatus, 'pending');
  });

  // 11. Only authorized staff can record a cash payment
  test('11. Only authorized staff can record cash payment for pending overtime', async () => {
    reservation.status = 'completed';
    reservation.unpaidOvertimeAmount = 300;
    reservation.overtimePaymentStatus = 'pending';

    // Driver attempts to record cash payment -> Rejected
    const driverReq = {
      params: { id: 'res-123' },
      body: { paymentMethod: 'cash' },
      user: { _id: { toString: () => 'driver-1' }, role: 'driver' },
    };
    const driverRes = createMockRes();
    await recordOvertimeCashPayment(driverReq, driverRes);
    assert.equal(driverRes.statusCode, 403);

    // Authorized staff records cash payment -> Succeeded
    const staffReq = {
      params: { id: 'res-123' },
      body: { paymentMethod: 'cash' },
      user: { _id: { toString: () => 'staff-1' }, role: 'staff', assignedLot: 'lot-1' },
    };
    const staffRes = createMockRes();
    await recordOvertimeCashPayment(staffReq, staffRes);

    assert.equal(staffRes.statusCode, 200);
    assert.equal(reservation.unpaidOvertimeAmount, 0);
    assert.equal(reservation.overtimePaymentStatus, 'paid');
    assert.equal(reservation.overtimePaymentMethod, 'cash');
    assert.ok(reservation.overtimePaidAt instanceof Date);
    assert.equal(createdPayments.length, 1);
  });
});
