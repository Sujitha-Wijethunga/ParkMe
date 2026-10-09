const crypto = require('crypto');
const mongoose = require('mongoose');
const WalkInSession = require('../models/WalkInSession');
const ParkingSpace = require('../models/ParkingSpace');
const ParkingLot = require('../models/ParkingLot');
const Reservation = require('../models/Reservation');
const Payment = require('../models/Payment');

/**
 * Normalizes vehicle registration plates:
 * Trims, removes multiple spaces, uppercase.
 */
function normalizePlate(plate) {
  if (!plate) return '';
  return String(plate).trim().replace(/\s+/g, ' ').toUpperCase();
}

/**
 * Calculates billing breakdown based on the documented rule:
 * "Each started hour × saved hourly rate, plus a one-time service charge."
 */
function calculateWalkInCharges(session, asOfDate = new Date()) {
  const entry = new Date(session.entryTime);
  const exit = session.status === 'completed' && session.exitTime ? new Date(session.exitTime) : new Date(asOfDate);
  const durationMs = Math.max(0, exit.getTime() - entry.getTime());
  const durationMinutes = Math.max(1, Math.ceil(durationMs / 60000));
  const startedHours = Math.max(1, Math.ceil(durationMinutes / 60));
  const hourlyRate = session.hourlyRate ?? 120;
  const serviceCharge = session.serviceCharge ?? 50;
  const parkingCharge = startedHours * hourlyRate;
  const totalAmount = parkingCharge + serviceCharge;
  const amountPaid = session.amountPaid || 0;
  const balanceDue = Math.max(0, totalAmount - amountPaid);

  return {
    entryTime: entry.toISOString(),
    exitTime: exit.toISOString(),
    durationMinutes,
    startedHours,
    hourlyRate,
    serviceCharge,
    parkingCharge,
    totalAmount,
    amountPaid,
    balanceDue,
    billingRule: session.billingRule || 'per_started_hour',
    isEstimated: session.status === 'active',
  };
}

// @desc    Get compatible available spaces in staff's assigned lot (excluding reservations & active walk-ins)
// @route   GET /api/walk-in/spaces
// @access  Staff / Admin
const getAvailableSpaces = async (req, res, next) => {
  try {
    let targetLotId = req.query.lotId || (req.user && (req.user.parkingLot || req.user.assignedLot));

    if (req.user && req.user.role === 'staff') {
      const staffLot = req.user.parkingLot || req.user.assignedLot;
      if (!staffLot) {
        return res.status(403).json({ message: 'Staff member is not assigned to any parking location' });
      }
      if (req.query.lotId && staffLot.toString() !== req.query.lotId.toString()) {
        return res.status(403).json({ message: 'Access denied: You are not authorized for this parking location' });
      }
      targetLotId = staffLot;
    }

    if (!targetLotId) {
      const firstLot = await ParkingLot.findOne({ isActive: true });
      if (firstLot) targetLotId = firstLot._id;
    }

    if (!targetLotId) {
      return res.status(404).json({ message: 'No active parking lot found' });
    }

    const { vehicleType } = req.query;
    const spaceQuery = {
      parkingLot: targetLotId,
      status: 'available',
    };

    if (vehicleType && typeof vehicleType === 'string' && vehicleType.trim()) {
      spaceQuery.$or = [
        { vehicleType: vehicleType.trim() },
        { vehicleType: 'any' },
        { vehicleType: { $exists: false } },
      ];
    }

    const spaceQueryExec = ParkingSpace.find(spaceQuery);
    const candidateSpaces = (spaceQueryExec && typeof spaceQueryExec.sort === 'function')
      ? await spaceQueryExec.sort({ spaceNumber: 1 })
      : await spaceQueryExec;

    // Find upcoming and active reservations for this lot
    const now = new Date();
    let reservedSpaceIds = new Set();
    try {
      const resQuery = Reservation.find({
        parkingLot: targetLotId,
        status: { $in: ['pending', 'active'] },
        endTime: { $gt: now },
      });
      const resDocs = (resQuery && typeof resQuery.select === 'function')
        ? (typeof resQuery.select('parkingSpace').lean === 'function' ? await resQuery.select('parkingSpace').lean() : await resQuery.select('parkingSpace'))
        : await resQuery;
      if (Array.isArray(resDocs)) {
        reservedSpaceIds = new Set(resDocs.map((r) => (r.parkingSpace?._id || r.parkingSpace).toString()));
      }
    } catch (_) {}

    // Find active walk-in sessions in this lot
    let activeWalkInSpaceIds = new Set();
    try {
      const wiQuery = WalkInSession.find({
        parkingLot: targetLotId,
        status: 'active',
      });
      const wiDocs = (wiQuery && typeof wiQuery.select === 'function')
        ? (typeof wiQuery.select('parkingSpace').lean === 'function' ? await wiQuery.select('parkingSpace').lean() : await wiQuery.select('parkingSpace'))
        : await wiQuery;
      if (Array.isArray(wiDocs)) {
        activeWalkInSpaceIds = new Set(wiDocs.map((w) => (w.parkingSpace?._id || w.parkingSpace).toString()));
      }
    } catch (_) {}

    // Filter candidate spaces to only truly free spaces
    const candidateList = Array.isArray(candidateSpaces) ? candidateSpaces : [];
    const availableSpaces = candidateList.filter((space) => {
      const sId = (space._id || space.id).toString();
      return !reservedSpaceIds.has(sId) && !activeWalkInSpaceIds.has(sId);
    });

    let lot = null;
    try {
      const lotQuery = ParkingLot.findById(targetLotId);
      if (lotQuery && typeof lotQuery.select === 'function') {
        const sel = lotQuery.select('name address pricePerHour vehicleTariffs serviceCharge');
        lot = typeof sel.lean === 'function' ? await sel.lean() : await sel;
      } else {
        lot = await lotQuery;
      }
    } catch (_) {}

    res.json({
      parkingLot: lot,
      count: availableSpaces.length,
      spaces: availableSpaces,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Register a new walk-in vehicle entry and allocate a slot
// @route   POST /api/walk-in/entry
// @access  Staff / Admin
const createWalkInEntry = async (req, res, next) => {
  let allocatedSpaceId = null;
  let targetLotId = null;

  try {
    targetLotId = req.body.parkingLotId || (req.user && (req.user.parkingLot || req.user.assignedLot));

    if (req.user && req.user.role === 'staff') {
      const staffLot = req.user.parkingLot || req.user.assignedLot;
      if (!staffLot) {
        return res.status(403).json({ message: 'Staff member is not assigned to any parking location' });
      }
      if (req.body.parkingLotId && staffLot.toString() !== req.body.parkingLotId.toString()) {
        return res.status(403).json({ message: 'Access denied: You cannot assign slots in another parking location' });
      }
      targetLotId = staffLot;
    }

    if (!targetLotId) {
      return res.status(400).json({ message: 'Parking lot reference is required' });
    }

    // 1. Idempotency check FIRST (prevents duplicate submission & replay conflict)
    if (req.body.idempotencyKey) {
      let existingKeyQuery = WalkInSession.findOne({
        idempotencyKey: req.body.idempotencyKey,
      });
      if (existingKeyQuery && typeof existingKeyQuery.populate === 'function') {
        existingKeyQuery = existingKeyQuery
          .populate('parkingLot', 'name address city pricePerHour')
          .populate('parkingSpace', 'spaceNumber floor');
      }
      const existingKeySession = await existingKeyQuery;
      if (existingKeySession) {
        const calculation = calculateWalkInCharges(existingKeySession);
        return res.status(200).json({ session: existingKeySession, calculation, isIdempotentReplay: true });
      }
    }

    // 2. Validate & normalize plate
    const rawPlate = req.body.vehiclePlate || req.body.plateNumber;
    if (!rawPlate || !String(rawPlate).trim()) {
      return res.status(400).json({ message: 'Vehicle plate number is required' });
    }

    const normalizedPlate = normalizePlate(rawPlate);
    if (!/^[A-Z0-9 -]{2,16}$/.test(normalizedPlate)) {
      return res.status(400).json({ message: 'Invalid vehicle plate number format. Use alphanumeric characters and hyphens.' });
    }

    // 3. Prevent duplicate active walk-in sessions for the same vehicle
    const existingActive = await WalkInSession.findOne({
      vehiclePlate: normalizedPlate,
      status: 'active',
    });
    if (existingActive) {
      return res.status(409).json({
        message: `Vehicle ${normalizedPlate} already has an active parking session (Reference: ${existingActive.reference}, Slot: ${existingActive.spaceNumber})`,
      });
    }

    // 4. Validate vehicle type
    const vehicleType = req.body.vehicleType || 'Car';
    const validTypes = ['Car', 'Bike', 'SUV', 'EV'];
    if (!validTypes.includes(vehicleType)) {
      return res.status(400).json({ message: 'Invalid vehicle type specified. Supported types: Car, Bike, SUV, EV' });
    }

    // 5. Validate & allocate parking space atomically
    const parkingSpaceId = req.body.parkingSpaceId;
    if (!parkingSpaceId) {
      return res.status(400).json({ message: 'Please select an available parking space' });
    }

    let space = null;
    try {
      space = await ParkingSpace.findById(parkingSpaceId);
    } catch (_) {
      space = null;
    }

    if (!space) {
      space = await ParkingSpace.findOne({
        parkingLot: targetLotId,
        spaceNumber: parkingSpaceId,
      });
    }

    if (!space) {
      return res.status(404).json({ message: 'Parking space not found in this facility' });
    }

    if (space.status !== 'available') {
      return res.status(409).json({ message: `Space ${space.spaceNumber} is no longer available` });
    }

    // Check vehicle compatibility
    if (space.vehicleType && space.vehicleType !== 'any' && space.vehicleType !== vehicleType) {
      return res.status(409).json({
        message: `Space ${space.spaceNumber} is designated for ${space.vehicleType} vehicles only.`,
      });
    }

    // Check reservation conflict
    const now = new Date();
    const hasReservation = await Reservation.findOne({
      parkingSpace: space._id,
      status: { $in: ['pending', 'active'] },
      endTime: { $gt: now },
    });
    if (hasReservation) {
      return res.status(409).json({
        message: `Space ${space.spaceNumber} has an upcoming reservation and cannot be allocated for walk-in parking.`,
      });
    }

    // Atomic allocation
    const lockedSpace = await ParkingSpace.findOneAndUpdate(
      { _id: space._id, status: 'available' },
      { status: 'occupied' },
      { new: true }
    );
    if (!lockedSpace) {
      return res.status(409).json({
        message: `Space ${space.spaceNumber} was just assigned to another vehicle. Please select another slot.`,
      });
    }
    allocatedSpaceId = space._id;

    // Decrement lot availableSpaces
    await ParkingLot.findByIdAndUpdate(targetLotId, { $inc: { availableSpaces: -1 } });

    // 6. Snapshot current tariff
    const lot = await ParkingLot.findById(targetLotId);
    const hourlyRate =
      (lot && lot.vehicleTariffs && lot.vehicleTariffs[vehicleType]) ||
      (lot && lot.pricePerHour) ||
      120;
    const serviceCharge = (lot && lot.serviceCharge !== undefined) ? lot.serviceCharge : 50;

    // 7. Resolve photo URL if uploaded
    let vehiclePhotoUrl = '';
    if (req.file) {
      vehiclePhotoUrl = `/uploads/walk-in-plates/${req.file.filename}`;
    } else if (req.body.vehiclePhotoUrl) {
      vehiclePhotoUrl = String(req.body.vehiclePhotoUrl).trim();
    }

    // 8. Generate unique reference and create session
    const reference = `PM-WI-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const entryTime = new Date();

    const session = await WalkInSession.create({
      reference,
      parkingLot: targetLotId,
      parkingSpace: space._id,
      spaceNumber: space.spaceNumber,
      floor: space.floor || req.body.floor || 'G',
      vehiclePlate: normalizedPlate,
      vehicleType,
      vehiclePhotoUrl,
      customerName: req.body.customerName ? String(req.body.customerName).trim() : '',
      customerPhone: req.body.customerPhone ? String(req.body.customerPhone).trim() : '',
      entryTime,
      enteredBy: req.user._id,
      hourlyRate,
      billingRule: 'per_started_hour',
      serviceCharge,
      currency: 'Rs.',
      status: 'active',
      paymentStatus: 'unpaid',
      amountPaid: 0,
      idempotencyKey: req.body.idempotencyKey || undefined,
    });

    let populatedSession = session;
    try {
      const q = WalkInSession.findById(session._id);
      if (q && typeof q.populate === 'function') {
        populatedSession = (await q
          .populate('parkingLot', 'name address city pricePerHour')
          .populate('parkingSpace', 'spaceNumber floor type')
          .populate('enteredBy', 'name')) || session;
      }
    } catch (_) {
      populatedSession = session;
    }

    const calculation = calculateWalkInCharges(session, entryTime);

    res.status(201).json({
      message: 'Walk-in parking entry recorded successfully',
      session: populatedSession,
      calculation,
      receipt: {
        reference: session.reference,
        locationName: lot ? lot.name : 'Parking Facility',
        locationAddress: lot ? lot.address : '',
        vehiclePlate: normalizedPlate,
        vehicleType,
        spaceNumber: space.spaceNumber,
        floor: space.floor || 'G',
        entryTime: entryTime.toISOString(),
        hourlyRate,
        serviceCharge,
        billingRuleDescription: `Each started hour × Rs. ${hourlyRate} + Rs. ${serviceCharge} one-time service charge`,
        qrPayload: session.reference,
      },
    });
  } catch (error) {
    // Rollback space allocation if session creation failed
    if (allocatedSpaceId && targetLotId) {
      await ParkingSpace.findByIdAndUpdate(allocatedSpaceId, { status: 'available' }).catch(() => {});
      await ParkingLot.findByIdAndUpdate(targetLotId, { $inc: { availableSpaces: 1 } }).catch(() => {});
    }
    next(error);
  }
};

// @desc    Get walk-in session details and current estimated / finalized bill
// @route   GET /api/walk-in/session/:refOrId
// @access  Staff / Admin
const getWalkInSession = async (req, res, next) => {
  try {
    const { refOrId } = req.params;
    if (!refOrId) {
      return res.status(400).json({ message: 'Receipt reference or session ID is required' });
    }

    let session = null;
    let query = WalkInSession.findOne({
      reference: new RegExp(`^${refOrId.trim()}$`, 'i'),
    });
    if (query && typeof query.populate === 'function') {
      query = query
        .populate('parkingLot', 'name address city pricePerHour vehicleTariffs serviceCharge')
        .populate('parkingSpace', 'spaceNumber floor type')
        .populate('enteredBy', 'name email')
        .populate('checkedOutBy', 'name email')
        .populate('payments');
    }
    session = await query;

    if (!session) {
      try {
        let idQuery = WalkInSession.findById(refOrId);
        if (idQuery && typeof idQuery.populate === 'function') {
          idQuery = idQuery
            .populate('parkingLot', 'name address city pricePerHour vehicleTariffs serviceCharge')
            .populate('parkingSpace', 'spaceNumber floor type')
            .populate('enteredBy', 'name email')
            .populate('checkedOutBy', 'name email')
            .populate('payments');
        }
        session = await idQuery;
      } catch (_) {
        session = null;
      }
    }

    if (!session) {
      return res.status(404).json({ message: 'Walk-in parking receipt or session not found' });
    }

    // Verify staff location
    if (req.user && req.user.role === 'staff') {
      const staffLot = req.user.parkingLot || req.user.assignedLot;
      const sessionLotId = session.parkingLot?._id || session.parkingLot;
      if (staffLot && sessionLotId.toString() !== staffLot.toString()) {
        return res.status(403).json({
          message: 'Access denied: This receipt belongs to a different parking facility',
        });
      }
    }

    const calculation = calculateWalkInCharges(session);

    res.json({
      session,
      calculation,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    List active walk-in sessions in staff's assigned lot (lost receipt lookup)
// @route   GET /api/walk-in/active
// @access  Staff / Admin
const getActiveWalkIns = async (req, res, next) => {
  try {
    let targetLotId = req.query.lotId || (req.user && (req.user.parkingLot || req.user.assignedLot));

    if (req.user && req.user.role === 'staff') {
      const staffLot = req.user.parkingLot || req.user.assignedLot;
      if (!staffLot) {
        return res.status(403).json({ message: 'Staff member is not assigned to any parking location' });
      }
      targetLotId = staffLot;
    }

    const query = {
      status: 'active',
    };
    if (targetLotId) {
      query.parkingLot = targetLotId;
    }

    const { search } = req.query;
    if (search && String(search).trim()) {
      const q = String(search).trim();
      query.$or = [
        { vehiclePlate: { $regex: q, $options: 'i' } },
        { reference: { $regex: q, $options: 'i' } },
        { spaceNumber: { $regex: q, $options: 'i' } },
        { customerName: { $regex: q, $options: 'i' } },
      ];
    }

    let sessionsQuery = WalkInSession.find(query);
    if (sessionsQuery && typeof sessionsQuery.populate === 'function') {
      sessionsQuery = sessionsQuery
        .populate('parkingLot', 'name address')
        .populate('parkingSpace', 'spaceNumber floor')
        .populate('enteredBy', 'name');
    }
    if (sessionsQuery && typeof sessionsQuery.sort === 'function') {
      sessionsQuery = sessionsQuery.sort({ entryTime: -1 });
    }
    if (sessionsQuery && typeof sessionsQuery.limit === 'function') {
      sessionsQuery = sessionsQuery.limit(50);
    }
    const sessions = (await sessionsQuery) || [];

    const sessionList = Array.isArray(sessions) ? sessions : [];
    const enriched = sessionList.map((s) => ({
      ...(typeof s.toObject === 'function' ? s.toObject() : s),
      calculation: calculateWalkInCharges(s),
    }));

    res.json(enriched);
  } catch (error) {
    next(error);
  }
};

// @desc    Checkout a walk-in parking session, record cash payment, and release slot
// @route   POST /api/walk-in/checkout
// @access  Staff / Admin
const checkoutWalkIn = async (req, res, next) => {
  try {
    const {
      reference,
      sessionId,
      amountPaid = 0,
      paymentMethod = 'cash',
      confirmDeparture = true,
    } = req.body;

    const identifier = reference || sessionId;
    if (!identifier) {
      return res.status(400).json({ message: 'Receipt reference or session ID is required' });
    }

    let session = await WalkInSession.findOne({
      reference: new RegExp(`^${String(identifier).trim()}$`, 'i'),
    });

    if (!session) {
      try {
        session = await WalkInSession.findById(identifier);
      } catch (_) {
        session = null;
      }
    }

    if (!session) {
      return res.status(404).json({ message: 'Walk-in parking receipt not found' });
    }

    // Verify staff location
    if (req.user && req.user.role === 'staff') {
      const staffLot = req.user.parkingLot || req.user.assignedLot;
      const sessionLotId = session.parkingLot?._id || session.parkingLot;
      if (staffLot && sessionLotId.toString() !== staffLot.toString()) {
        return res.status(403).json({
          message: 'Access denied: This receipt belongs to a different parking facility',
        });
      }
    }

    // Idempotent completion check: If already completed, cannot recalculate or charge again
    if (session.status === 'completed') {
      return res.status(409).json({
        message: 'This parking session has already been completed and departed.',
        session,
        isAlreadyCompleted: true,
      });
    }

    const serverNow = new Date();
    const calculation = calculateWalkInCharges(session, serverNow);
    const finalAmount = calculation.totalAmount;
    const paymentAmount = Math.max(0, parseFloat(amountPaid) || 0);

    let recordedPayment = null;
    if (paymentAmount > 0) {
      recordedPayment = await Payment.create({
        walkInSession: session._id,
        recordedBy: req.user._id,
        paymentType: 'booking',
        amount: paymentAmount,
        method: paymentMethod === 'cash' ? 'cash' : 'cash',
        status: 'paid',
        transactionId: `TXN-WI-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
        paidAt: serverNow,
      });
      if (Array.isArray(session.payments)) {
        session.payments.push(recordedPayment._id);
      }
      session.amountPaid = (session.amountPaid || 0) + paymentAmount;
    }

    if (confirmDeparture) {
      session.status = 'completed';
      session.exitTime = serverNow;
      session.checkedOutBy = req.user._id;
      session.finalAmount = finalAmount;
      session.outstandingBalance = Math.max(0, finalAmount - session.amountPaid);
      session.paymentStatus =
        session.outstandingBalance === 0
          ? 'paid'
          : session.amountPaid > 0
          ? 'partially_paid'
          : 'unpaid';

      // Release slot back to available
      await ParkingSpace.findByIdAndUpdate(session.parkingSpace, { status: 'available' });
      await ParkingLot.findByIdAndUpdate(session.parkingLot, { $inc: { availableSpaces: 1 } });
    }

    if (typeof session.save === 'function') {
      await session.save();
    }

    let finalizedSession = session;
    try {
      const q = WalkInSession.findById(session._id);
      if (q && typeof q.populate === 'function') {
        finalizedSession = (await q
          .populate('parkingLot', 'name address city pricePerHour')
          .populate('parkingSpace', 'spaceNumber floor type')
          .populate('enteredBy', 'name')
          .populate('checkedOutBy', 'name')
          .populate('payments')) || session;
      }
    } catch (_) {
      finalizedSession = session;
    }

    res.json({
      message: confirmDeparture ? 'Departure confirmed and space released' : 'Payment recorded successfully',
      session: finalizedSession,
      payment: recordedPayment,
      calculation: {
        ...calculation,
        finalAmount: session.finalAmount,
        amountPaid: session.amountPaid,
        outstandingBalance: session.outstandingBalance,
        isEstimated: false,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAvailableSpaces,
  createWalkInEntry,
  getWalkInSession,
  getActiveWalkIns,
  checkoutWalkIn,
  calculateWalkInCharges,
  normalizePlate,
};
