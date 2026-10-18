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

async function resolveStaffLotId(user) {
  if (!user) return null;
  if (user.parkingLot || user.assignedLot) {
    return (user.parkingLot || user.assignedLot).toString();
  }
  const lot = await ParkingLot.findOne({ managedBy: user._id, isActive: true });
  if (lot) return lot._id.toString();
  return null;
}

// @desc    Get compatible available spaces in staff's assigned lot (excluding reservations & active walk-ins)
// @route   GET /api/walk-in/spaces
// @access  Staff / Admin
const getAvailableSpaces = async (req, res, next) => {
  try {
    let targetLotId = req.query.lotId;

    if (req.user && req.user.role === 'staff') {
      const staffLot = await resolveStaffLotId(req.user);
      if (!staffLot) {
        return res.status(403).json({ message: 'Staff member is not assigned to any parking location' });
      }
      if (req.query.lotId && staffLot.toString() !== req.query.lotId.toString()) {
        return res.status(403).json({ message: 'Access denied: You are not authorized for this parking location' });
      }
      targetLotId = staffLot;
    } else if (!targetLotId && req.user) {
      targetLotId = req.user.parkingLot || req.user.assignedLot;
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
    targetLotId = req.body.parkingLotId;

    if (req.user && req.user.role === 'staff') {
      const staffLot = await resolveStaffLotId(req.user);
      if (!staffLot) {
        return res.status(403).json({ message: 'Staff member is not assigned to any parking location' });
      }
      if (req.body.parkingLotId && staffLot.toString() !== req.body.parkingLotId.toString()) {
        return res.status(403).json({ message: 'Access denied: You cannot assign slots in another parking location' });
      }
      targetLotId = staffLot;
    } else if (!targetLotId && req.user) {
      targetLotId = req.user.parkingLot || req.user.assignedLot;
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

    // 7. Resolve photo URL if uploaded (file upload or in-memory base64)
    let vehiclePhotoUrl = '';
    if (req.file) {
      vehiclePhotoUrl = `/uploads/walk-in-plates/${req.file.filename}`;
    } else if (req.body.imageBase64) {
      try {
        const fs = require('fs');
        const path = require('path');
        const os = require('os');
        const { randomUUID } = require('crypto');
        const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
        const uploadDir = isServerless
          ? path.join(os.tmpdir(), 'uploads', 'walk-in-plates')
          : path.join(__dirname, '..', 'uploads', 'walk-in-plates');
        fs.mkdirSync(uploadDir, { recursive: true });

        const filename = `plate-${randomUUID()}.jpg`;
        const filePath = path.join(uploadDir, filename);
        const base64Data = req.body.imageBase64.replace(/^data:image\/\w+;base64,/, '');
        fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));
        vehiclePhotoUrl = `/uploads/walk-in-plates/${filename}`;
      } catch (imgErr) {
        console.warn('Failed to save base64 vehicle photo:', imgErr.message);
      }
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

    // Emit real-time space update via Socket.io
    try {
      const io = req.app?.get?.('io');
      if (io) {
        io.to(`lot_${targetLotId}`).emit('space_update', {
          spaceId: space._id,
          status: 'occupied',
          lotId: targetLotId,
          spaceNumber: space.spaceNumber,
        });
        ParkingLot.findById(targetLotId).select('availableSpaces').then((lotDoc) => {
          if (lotDoc) {
            io.to(`lot_${targetLotId}`).emit('lot_count_update', {
              lotId: targetLotId,
              availableSpaces: lotDoc.availableSpaces,
            });
          }
        }).catch(() => {});
      }
    } catch (_) {}

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
      const staffLot = await resolveStaffLotId(req.user);
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
    let targetLotId = req.query.lotId;

    if (req.user && req.user.role === 'staff') {
      const staffLot = await resolveStaffLotId(req.user);
      if (!staffLot) {
        return res.status(403).json({ message: 'Staff member is not assigned to any parking location' });
      }
      targetLotId = staffLot;
    } else if (!targetLotId && req.user) {
      targetLotId = req.user.parkingLot || req.user.assignedLot;
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
      const staffLot = await resolveStaffLotId(req.user);
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

      // Emit real-time space release via Socket.io
      try {
        const io = req.app?.get?.('io');
        if (io) {
          const sessionLotId = session.parkingLot?._id || session.parkingLot;
          io.to(`lot_${sessionLotId}`).emit('space_update', {
            spaceId: session.parkingSpace,
            status: 'available',
            lotId: sessionLotId,
            spaceNumber: session.spaceNumber,
          });
          ParkingLot.findById(sessionLotId).select('availableSpaces').then((lotDoc) => {
            if (lotDoc) {
              io.to(`lot_${sessionLotId}`).emit('lot_count_update', {
                lotId: sessionLotId,
                availableSpaces: lotDoc.availableSpaces,
              });
            }
          }).catch(() => {});
        }
      } catch (_) {}
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


// @desc    Get daily shift cash reconciliation summary for the authenticated staff
// @route   GET /api/walk-in/shift-summary
// @access  Staff / Admin
const getShiftSummary = async (req, res, next) => {
  try {
    const isStaff =
      req.user &&
      (req.user.role === 'staff' ||
        String(req.user.role).toLowerCase() === 'parking staff' ||
        req.user.constructor?.modelName === 'Staff');

    // Determine the lot to summarize
    let targetLotId = req.query.lotId;
    if (isStaff && !targetLotId) {
      targetLotId = await resolveStaffLotId(req.user);
    }
    if (!targetLotId) {
      const defaultLot = await ParkingLot.findOne({ isActive: true });
      if (defaultLot) targetLotId = defaultLot._id;
    }

    // Date range: today (or custom date via query)
    const dateStr = req.query.date; // optional YYYY-MM-DD
    const targetDate = dateStr ? new Date(dateStr) : new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const query = {
      createdAt: { $gte: startOfDay, $lte: endOfDay },
    };
    if (targetLotId) query.parkingLot = targetLotId;

    // Filter by staff member if enteredBy is present
    if (isStaff && req.user?._id) {
      query.enteredBy = req.user._id;
    }

    const sessions = await WalkInSession.find(query)
      .populate('parkingLot', 'name address city')
      .populate('parkingSpace', 'spaceNumber floor')
      .lean();

    // Compute summary
    let totalCashCollected = 0;
    let totalSessions = sessions.length;
    let completedSessions = 0;
    let activeSessions = 0;
    let overtimeCount = 0; // sessions > 3 hours

    const vehicleBreakdown = { Car: 0, Bike: 0, SUV: 0, EV: 0 };
    const sessionDetails = [];

    for (const session of sessions) {
      const calc = calculateWalkInCharges(session);
      const durationHours = calc.startedHours;

      if (session.status === 'completed') {
        completedSessions++;
        totalCashCollected += session.amountPaid || 0;
      } else if (session.status === 'active') {
        activeSessions++;
      }

      if (durationHours > 3) overtimeCount++;

      if (vehicleBreakdown[session.vehicleType] !== undefined) {
        vehicleBreakdown[session.vehicleType]++;
      }

      sessionDetails.push({
        reference: session.reference,
        vehiclePlate: session.vehiclePlate,
        vehicleType: session.vehicleType,
        spaceNumber: session.spaceNumber,
        floor: session.floor,
        entryTime: session.entryTime,
        exitTime: session.exitTime,
        status: session.status,
        paymentStatus: session.paymentStatus,
        amountPaid: session.amountPaid || 0,
        totalAmount: calc.totalAmount,
        durationHours: calc.startedHours,
        durationMinutes: calc.durationMinutes,
      });
    }

    let lotInfo = { name: 'One Galle Face Mall — Ground Floor', address: 'Colombo 02' };
    if (sessions.length > 0 && sessions[0].parkingLot) {
      lotInfo = sessions[0].parkingLot;
    } else if (targetLotId) {
      const foundLot = await ParkingLot.findById(targetLotId).select('name address city');
      if (foundLot) lotInfo = foundLot;
    }

    res.json({
      date: targetDate.toISOString().split('T')[0],
      staffId: req.user?.staffId || req.user?._id,
      staffName: req.user?.name || 'Staff',
      lot: lotInfo,
      summary: {
        totalSessions,
        completedSessions,
        activeSessions,
        overtimeCount,
        totalCashCollected,
        vehicleBreakdown,
      },
      sessions: sessionDetails,
    });
  } catch (error) {
    next(error);
  }
};

const SRI_LANKA_PROVINCES = ['WP', 'CP', 'SP', 'NW', 'NP', 'NC', 'UP', 'SG', 'EP'];

// Helper to clean OCR digit substitutions (e.g. O, U, D, Q -> 0, I, l -> 1, S -> 5, T, J, ", ' -> 7, etc.)
function cleanDigitPart(s) {
  return String(s || '')
    .replace(/[OoDQUG]/g, '0')
    .replace(/[Il|!]/g, '1')
    .replace(/Z/g, '2')
    .replace(/S/g, '5')
    .replace(/[TJ"']/g, '7')
    .replace(/B/g, '8');
}

// Helper to clean OCR letter substitutions (e.g. 0 -> O, 1 -> I, 5 -> S, etc.)
function cleanLetterPart(s) {
  return String(s || '')
    .replace(/0/g, 'O')
    .replace(/1/g, 'I')
    .replace(/5/g, 'S')
    .replace(/8/g, 'B');
}

// Extract all valid license plate candidates from OCR text
function extractAllPlateCandidates(text) {
  if (!text) return [];
  const raw = text.toUpperCase();
  const candidates = [];

  // 1. Provincial: ONLY valid Sri Lankan province codes + 2-3 letters + EXACTLY 4 digits
  const provPattern = '(?:' + SRI_LANKA_PROVINCES.join('|') + ')';
  const provRegex = new RegExp('\\b(' + provPattern + ')[\\s\\n\\-_]+([A-Z0-9]{2,3})[\\s\\n\\-_]*([A-Z0-9"\\\']{4})\\b', 'g');
  let pMatch;
  while ((pMatch = provRegex.exec(raw)) !== null) {
    const prov = pMatch[1];
    const letters = cleanLetterPart(pMatch[2]);
    const digits = cleanDigitPart(pMatch[3]);
    if (/^[A-Z]{2,3}$/.test(letters) && /^\d{4}$/.test(digits)) {
      candidates.push({ plate: `${prov} ${letters}-${digits}`, prov, letters, digits });
    }
  }

  // 2. Standard: 2-3 English letters + EXACTLY 4 digits (e.g. "BKA 0577", "CAB 4921", "BKAGSTT")
  const stdRegex = /\b([A-Z0-9]{2,3})[\s\n\-_]*([A-Z0-9"']{4})\b/g;
  let sMatch;
  while ((sMatch = stdRegex.exec(raw)) !== null) {
    const letters = cleanLetterPart(sMatch[1]);
    const digits = cleanDigitPart(sMatch[2]);
    if (/^[A-Z]{2,3}$/.test(letters) && /^\d{4}$/.test(digits)) {
      candidates.push({ plate: `${letters}-${digits}`, letters, digits });
    }
  }

  // 3. Vintage: 2-3 digits + 4 digits: e.g. "250-1234", "19-4321"
  const vintRegex = /\b(\d{2,3})[\s\n\-_]*(\d{4})\b/g;
  let vMatch;
  while ((vMatch = vintRegex.exec(raw)) !== null) {
    candidates.push({ plate: `${vMatch[1]}-${vMatch[2]}`, digits: vMatch[2], isVintage: true });
  }

  // 4. Condensed fallback (when spaces are inconsistent): 2-3 letters + 4 digits
  const condensed = raw.replace(/[^A-Z0-9"']/g, '');
  const condMatch = condensed.match(/([A-Z]{2,3})([0-9A-Z"']{4})/);
  if (condMatch) {
    const letters = cleanLetterPart(condMatch[1]);
    const digits = cleanDigitPart(condMatch[2]);
    if (/^[A-Z]{2,3}$/.test(letters) && /^\d{4}$/.test(digits)) {
      candidates.push({ plate: `${letters}-${digits}`, letters, digits });
    }
  }

  return candidates;
}

// Select the highest-confidence plate candidate
function rankAndSelectPlate(candidates) {
  if (!candidates || candidates.length === 0) return null;

  let bestPlate = null;
  let highestScore = -999;

  for (const c of candidates) {
    let score = 0;

    // Must have 4 digits
    if (c.digits && c.digits.length === 4) score += 30;

    // Valid Sri Lankan province
    if (c.prov && SRI_LANKA_PROVINCES.includes(c.prov)) score += 20;

    // Known vehicle series:
    // Motorcycle: Starts with B (e.g. BKA, BA, BB) or M
    if (c.letters && /^B[A-Z]{1,2}$/.test(c.letters)) score += 25;
    // Car: Starts with C (e.g. CAB, CAC), K, P, etc.
    else if (c.letters && /^[CPKWDGHJLMNQRSTUVYZ][A-Z]{1,2}$/.test(c.letters)) score += 15;

    // Penalize non-plate noise words
    if (['PEE', 'SEE', 'THE', 'AND', 'FOR', 'NOT', 'OFF', 'ALL'].includes(c.letters)) score -= 40;

    if (score > highestScore) {
      highestScore = score;
      bestPlate = c.plate;
    }
  }

  return bestPlate;
}

let ocrWorker = null;
const getOcrWorker = async () => {
  if (!ocrWorker) {
    const { createWorker } = require('tesseract.js');
    ocrWorker = await createWorker('eng');
  }
  return ocrWorker;
};

// @desc    Recognize license plate from photo using server OCR (Tesseract + Sharp)
// @route   POST /api/walk-in/recognize-plate
// @access  Staff / Admin
const recognizePlate = async (req, res, next) => {
  try {
    let imageSource = null;
    if (req.file) {
      imageSource = req.file.path;
    } else if (req.body?.imageBase64) {
      const base64Data = req.body.imageBase64.replace(/^data:image\/\w+;base64,/, '');
      imageSource = Buffer.from(base64Data, 'base64');
    }

    if (!imageSource) {
      return res.status(400).json({ message: 'No image provided for plate recognition' });
    }

    try {
      const fs = require('fs');
      const path = require('path');
      const logDir = path.join(__dirname, '..', 'uploads');
      if (Buffer.isBuffer(imageSource)) {
        fs.writeFileSync(path.join(logDir, 'last_ocr.png'), imageSource);
      } else if (typeof imageSource === 'string' && fs.existsSync(imageSource)) {
        fs.copyFileSync(imageSource, path.join(logDir, 'last_ocr.png'));
      }
    } catch (saveErr) {
      console.warn('[OCR Save Error]:', saveErr.message);
    }

    const worker = await getOcrWorker();
    const sharp = require('sharp');
    const allCandidates = [];
    let combinedRawText = '';

    // Pass 1: Standard OCR with upscaling for crisp character edges
    try {
      const upscaledBuf = await sharp(imageSource)
        .resize({ width: 1200, withoutEnlargement: false })
        .toBuffer();
      const res1 = await worker.recognize(upscaledBuf);
      const text1 = res1?.data?.text || '';
      combinedRawText += text1;
      allCandidates.push(...extractAllPlateCandidates(text1));
    } catch (pass1Err) {
      console.warn('[OCR Pass 1 Error]:', pass1Err.message);
    }

    // Pass 2: Inverted & normalized OCR via Sharp (crucial for black-background motorcycle & vintage plates)
    try {
      const invertedBuf = await sharp(imageSource)
        .resize({ width: 1200, withoutEnlargement: false })
        .removeAlpha()
        .grayscale()
        .negate({ alpha: false })
        .normalize()
        .toBuffer();

      const res2 = await worker.recognize(invertedBuf);
      const text2 = res2?.data?.text || '';
      combinedRawText += '\n' + text2;
      allCandidates.push(...extractAllPlateCandidates(text2));
    } catch (sharpErr) {
      console.warn('[OCR Sharp Preprocessing Error]:', sharpErr.message);
    }

    // Select the best candidate across both passes
    const detectedPlate = rankAndSelectPlate(allCandidates);

    // Auto-suggest vehicle type if plate starts with Sri Lankan motorcycle/bike series
    let suggestedVehicleType = null;
    if (detectedPlate) {
      const upper = detectedPlate.toUpperCase();
      if (/^[A-Z]{0,3}\s*B[A-Z]{1,2}-\d{4}/.test(upper) || /^[A-Z]{0,3}\s*M[A-Z]{1,2}-\d{4}/.test(upper)) {
        suggestedVehicleType = 'Bike';
      }
    }

    res.json({
      success: true,
      plate: detectedPlate || '',
      suggestedVehicleType,
      rawText: combinedRawText.trim(),
    });
  } catch (error) {
    console.error('[OCR Error]:', error);
    res.status(500).json({ message: 'OCR recognition failed', error: error.message });
  }
};

module.exports = {
  getAvailableSpaces,
  createWalkInEntry,
  getWalkInSession,
  getActiveWalkIns,
  checkoutWalkIn,
  getShiftSummary,
  calculateWalkInCharges,
  normalizePlate,
  recognizePlate,
};

