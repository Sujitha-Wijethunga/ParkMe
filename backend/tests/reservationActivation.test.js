const assert = require('node:assert/strict');
const { afterEach, beforeEach, suite, test } = require('node:test');
const Reservation = require('../models/Reservation');
const { activateReservation } = require('../controllers/reservationController');

const originalFindById = Reservation.findById;

suite('Driver manual reservation activation', () => {
  let reservation;
  let saved;

  beforeEach(() => {
    saved = false;
    reservation = {
      _id: 'res-activate-1',
      driver: { toString: () => 'driver-123' },
      status: 'pending',
      activatedAt: null,
      save: async function () {
        saved = true;
        return this;
      },
    };
    Reservation.findById = async () => reservation;
  });

  afterEach(() => {
    Reservation.findById = originalFindById;
  });

  async function callActivate(driverId = 'driver-123', params = { id: 'res-activate-1' }) {
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
    await activateReservation(
      { params, user: { _id: { toString: () => driverId }, role: 'driver' } },
      res,
      (err) => { nextError = err; }
    );
    if (nextError) throw nextError;
    return res;
  }

  test('successfully activates pending reservation for authorized driver', async () => {
    const res = await callActivate();
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.message, 'Parking session activated');
    assert.equal(reservation.status, 'active');
    assert.ok(reservation.activatedAt instanceof Date);
    assert.equal(saved, true);
  });

  test('rejects activation if driver does not own reservation', async () => {
    const res = await callActivate('other-driver');
    assert.equal(res.statusCode, 403);
    assert.equal(res.body.message, 'Access denied');
    assert.equal(saved, false);
  });

  test('idempotently handles already active reservation without duplicate activation or error', async () => {
    reservation.status = 'active';
    reservation.activatedAt = new Date('2026-10-07T10:00:00Z');
    const res = await callActivate();
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.alreadyActive, true);
    assert.equal(saved, false);
  });

  test('rejects activation for completed or cancelled reservation', async () => {
    reservation.status = 'completed';
    const res = await callActivate();
    assert.equal(res.statusCode, 400);
    assert.match(res.body.message, /Cannot activate reservation in "completed"/);
    assert.equal(saved, false);
  });

  test('returns 404 if reservation does not exist', async () => {
    Reservation.findById = async () => null;
    const res = await callActivate();
    assert.equal(res.statusCode, 404);
    assert.equal(res.body.message, 'Reservation not found');
  });
});
