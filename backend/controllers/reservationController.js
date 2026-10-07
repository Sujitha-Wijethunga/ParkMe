const mongoose = require('mongoose');
const Reservation = require('../models/Reservation');
const Payment = require('../models/Payment');
const ParkingSpace = require('../models/ParkingSpace');
const ParkingLot = require('../models/ParkingLot');
const crypto = require('crypto');

// Helper: check for overlapping reservations
const hasOverlap = async (parkingSpaceId, startTime, endTime, excludeId = null) => {
  const query = {
    parkingSpace: parkingSpaceId,
    status: { $in: ['pending', 'active'] },
    $or: [{ startTime: { $lt: endTime }, endTime: { $gt: startTime } }],
  };
  if (excludeId) query._id = { $ne: excludeId };
  return await Reservation.findOne(query);
};

// Helper: attach dynamic overdue state and estimated overtime without mutating DB
const attachOvertimeEstimate = (reservationDoc) => {
  if (!reservationDoc) return null;
  const data = typeof reservationDoc.toObject === 'function' ? reservationDoc.toObject() : { ...reservationDoc };
  const now = Date.now();
  const endTimeMs = new Date(data.endTime).getTime();
  const isOverdue = data.status === 'active' && now > endTimeMs;
  let estimatedOvertimeMinutes = 0;
  let estimatedOvertimeAmount = 0;
  const graceMinutes = data.overtimeGraceMinutes ?? 10;
  const rate = data.overtimeRatePerHour || data.hourlyRate || 150;

  if (isOverdue) {
    const diffMs = now - endTimeMs;
    const diffMinutes = Math.ceil(diffMs / 60000);
    if (diffMinutes > graceMinutes) {
      estimatedOvertimeMinutes = diffMinutes;
      const startedHours = Math.ceil(diffMinutes / 60);
      estimatedOvertimeAmount = Math.round(startedHours * rate);
    }
  }

  return {
    ...data,
    isOverdue,
    estimatedOvertimeMinutes,
    estimatedOvertimeAmount,
    overtimeGraceMinutes: graceMinutes,
    overtimeBillingRule: data.overtimeBillingRule || 'per_started_hour',
    overtimeRatePerHour: rate,
  };
};

// @desc    Create a reservation
// @route   POST /api/reservations
// @access  Driver
const createReservation = async (req, res, next) => {
  try {
    const { parkingSpaceId, startTime, endTime, vehicleType, vehiclePlate, vehicleModel } = req.body;

    const start = new Date(startTime);
    const end = new Date(endTime);

    if (start <= new Date()) {
      return res.status(400).json({ message: 'Start time must be in the future' });
    }
    if (end <= start) {
      return res.status(400).json({ message: 'End time must be after start time' });
    }

    const space = await ParkingSpace.findById(parkingSpaceId);
    if (!space) return res.status(404).json({ message: 'Parking space not found' });
    if (space.status !== 'available') {
      return res.status(409).json({ message: 'Parking space is not available' });
    }

    // Vehicle-specific space compatibility check
    if (vehicleType) {
      const validTypes = ['Car', 'Bike', 'SUV', 'EV'];
      if (!validTypes.includes(vehicleType)) {
        return res.status(400).json({ message: 'Invalid vehicle type specified.' });
      }
      if (
        space.vehicleType &&
        space.vehicleType !== 'any' &&
        space.vehicleType !== vehicleType
      ) {
        return res.status(409).json({
          message: `This space is designated for ${space.vehicleType} vehicles only.`,
        });
      }
    }

    const overlap = await hasOverlap(parkingSpaceId, start, end);
    if (overlap) {
      return res.status(409).json({ message: 'This space is already reserved for the selected time' });
    }

    const lot = await ParkingLot.findById(space.parkingLot);
    const chosenVehicle = vehicleType || space.vehicleType || 'Car';
    const ratePerHour = (lot.vehicleTariffs && lot.vehicleTariffs[chosenVehicle]) || lot.pricePerHour;
    const hours = (end - start) / (1000 * 60 * 60);
    const totalAmount = parseFloat((hours * ratePerHour).toFixed(2));

    const reservation = await Reservation.create({
      reference: `PM-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
      driver: req.user._id,
      parkingSpace: parkingSpaceId,
      parkingLot: space.parkingLot,
      vehicleType: chosenVehicle,
      vehiclePlate: vehiclePlate ? String(vehiclePlate).trim().toUpperCase() : '',
      vehicleModel: vehicleModel ? String(vehicleModel).trim() : '',
      hourlyRate: ratePerHour,
      overtimeGraceMinutes: 10,
      overtimeBillingRule: 'per_started_hour',
      overtimeRatePerHour: ratePerHour,
      checkInStatus: 'none',
      checkoutStatus: 'none',
      paymentStatus: 'unpaid',
      startTime: start,
      endTime: end,
      totalAmount,
    });

    // Mark space as occupied
    await ParkingSpace.findByIdAndUpdate(parkingSpaceId, { status: 'occupied' });
    await ParkingLot.findByIdAndUpdate(space.parkingLot, { $inc: { availableSpaces: -1 } });

    res.status(201).json(attachOvertimeEstimate(reservation));
  } catch (error) {
    next(error);
  }
};

// @desc    Get own reservations
// @route   GET /api/reservations/my
// @access  Driver
const getMyReservations = async (req, res, next) => {
  try {
    const reservations = await Reservation.find({ driver: req.user._id })
      .populate('parkingSpace', 'spaceNumber floor type')
      .populate('parkingLot', 'name address pricePerHour')
      .sort({ createdAt: -1 });
    const payments = reservations.length
      ? await Payment.find({
          reservation: { $in: reservations.map((reservation) => reservation._id) },
          driver: req.user._id,
          status: 'paid',
        }).select('reservation method')
      : [];
    const paymentMethods = new Map(
      payments.map((payment) => [payment.reservation.toString(), payment.method])
    );
    res.json(reservations.map((reservation) => {
      const data = attachOvertimeEstimate(reservation);
      return {
        ...data,
        paymentMethod: paymentMethods.get(data._id.toString()),
      };
    }));
  } catch (error) {
    next(error);
  }
};

// @desc    Get reservation by ID
// @route   GET /api/reservations/:id
// @access  Driver (own) / Staff / Admin
const getReservationById = async (req, res, next) => {
  try {
    const reservation = await Reservation.findById(req.params.id)
      .populate('driver', 'name email phone')
      .populate('parkingSpace', 'spaceNumber floor type')
      .populate('parkingLot', 'name address pricePerHour');

    if (!reservation) return res.status(404).json({ message: 'Reservation not found' });

    // Drivers can only see their own
    if (
      req.user.role === 'driver' &&
      reservation.driver._id.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(attachOvertimeEstimate(reservation));
  } catch (error) {
    next(error);
  }
};

// @desc    Cancel own reservation
// @route   PUT /api/reservations/:id/cancel
// @access  Driver
const cancelReservation = async (req, res, next) => {
  try {
    const { reason, note } = req.body || {};
    const validReasons = [
      'Change of plans / Schedule changed',
      'Found alternative parking spot',
      'Vehicle breakdown or issue',
      'Booked wrong location, date, or time',
      'Other reason',
    ];
    if (!validReasons.includes(reason)) {
      return res.status(400).json({ message: 'Select a valid cancellation reason.' });
    }
    if (note !== undefined && (typeof note !== 'string' || note.trim().length > 500)) {
      return res.status(400).json({ message: 'Cancellation details must be 500 characters or fewer.' });
    }
    if (reason !== 'Other reason' && note?.trim()) {
      return res.status(400).json({ message: 'Additional details are only accepted for Other reason.' });
    }

    const existingReservation = await Reservation.findById(req.params.id);
    if (!existingReservation) return res.status(404).json({ message: 'Reservation not found' });
    if (existingReservation.driver.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    if (
      existingReservation.status !== 'pending' ||
      new Date(existingReservation.startTime).getTime() <= Date.now()
    ) {
      return res.status(400).json({ message: 'Only future upcoming reservations can be cancelled.' });
    }

    const reservation = await Reservation.findOneAndUpdate(
      {
        _id: existingReservation._id,
        driver: req.user._id,
        status: 'pending',
        startTime: { $gt: new Date() },
      },
      {
        $set: {
          status: 'cancelled',
          cancellationReason: reason,
          cancellationNote: reason === 'Other reason' ? (note || '').trim() : '',
          cancelledAt: new Date(),
        },
      },
      { new: true, runValidators: true }
    );
    if (!reservation) {
      return res.status(400).json({ message: 'This reservation is no longer eligible for cancellation.' });
    }

    // Release the parking space
    await ParkingSpace.findByIdAndUpdate(reservation.parkingSpace, { status: 'available' });
    await ParkingLot.findByIdAndUpdate(reservation.parkingLot, { $inc: { availableSpaces: 1 } });

    res.json({ message: 'Reservation cancelled', reservation });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark reservation as completed / staff verifies vehicle exit
// @route   PUT /api/reservations/:id/complete
// @access  Staff / Admin
const completeReservation = async (req, res, next) => {
  try {
    const reservation = await Reservation.findById(req.params.id);
    if (!reservation) return res.status(404).json({ message: 'Reservation not found' });

    // Check staff lot authorization
    const staffLot = req.user?.parkingLot || req.user?.assignedLot;
    if (req.user?.role === 'staff' && staffLot) {
      const assignedLotId = staffLot.toString();
      const resLotId = (reservation.parkingLot?._id || reservation.parkingLot).toString();
      if (assignedLotId !== resLotId) {
        return res.status(403).json({ message: 'Access denied: You are not assigned to this parking lot' });
      }
    }

    if (reservation.status !== 'active') {
      return res.status(400).json({ message: 'Only active reservations can be completed' });
    }

    const now = new Date();
    const endTimeMs = new Date(reservation.endTime).getTime();
    const graceMinutes = reservation.overtimeGraceMinutes ?? 10;
    const rate = reservation.overtimeRatePerHour || reservation.hourlyRate || 150;
    let overtimeMinutes = 0;
    let overtimeAmount = 0;

    // Check overtime past booked end time (which includes approved extensions to prevent double billing)
    if (now.getTime() > endTimeMs) {
      const diffMs = now.getTime() - endTimeMs;
      const diffMinutes = Math.ceil(diffMs / 60000);
      if (diffMinutes > graceMinutes) {
        overtimeMinutes = diffMinutes;
        const startedHours = Math.ceil(diffMinutes / 60);
        overtimeAmount = Math.round(startedHours * rate);
      }
    }

    reservation.status = 'completed';
    reservation.checkoutStatus = 'confirmed';
    reservation.checkedOutAt = now;
    reservation.checkedOutBy = req.user._id;
    reservation.completedBy = req.user._id;
    reservation.completedAt = now;
    if (!reservation.actualEndTime) {
      reservation.actualEndTime = now;
    }
    reservation.overtimeMinutes = overtimeMinutes;
    reservation.overtimeAmount = overtimeAmount;
    reservation.finalAmount = (reservation.totalAmount || 0) + overtimeAmount;

    const { paymentMethod, recordPayment } = req.body || {};
    if (overtimeAmount > 0) {
      if (paymentMethod === 'cash' || recordPayment === true) {
        reservation.unpaidOvertimeAmount = 0;
        reservation.overtimePaymentStatus = 'paid';
        reservation.overtimePaidAt = now;
        reservation.overtimePaymentMethod = 'cash';
        await Payment.create({
          reservation: reservation._id,
          user: reservation.driver,
          amount: overtimeAmount,
          method: 'cash',
          status: 'paid',
          paidAt: now,
        });
      } else {
        reservation.unpaidOvertimeAmount = overtimeAmount;
        reservation.overtimePaymentStatus = 'pending';
      }
    } else {
      reservation.unpaidOvertimeAmount = 0;
      reservation.overtimePaymentStatus = 'none';
    }

    await reservation.save();

    await ParkingSpace.findByIdAndUpdate(reservation.parkingSpace, { status: 'available' });
    await ParkingLot.findByIdAndUpdate(reservation.parkingLot, { $inc: { availableSpaces: 1 } });

    res.json({
      message: 'Reservation completed and exit confirmed',
      reservation: attachOvertimeEstimate(reservation),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Driver initiates check-in request ("Start Active Parking")
// @route   PUT /api/reservations/:id/checkin-request
// @access  Driver (own reservation)
const requestCheckIn = async (req, res, next) => {
  try {
    const reservation = await Reservation.findById(req.params.id);
    if (!reservation) return res.status(404).json({ message: 'Reservation not found' });
    if (reservation.driver.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (reservation.status === 'active') {
      return res.json({
        message: 'Reservation is already active',
        reservation: attachOvertimeEstimate(reservation),
        alreadyActive: true,
      });
    }

    if (reservation.status !== 'pending') {
      return res.status(400).json({
        message: `Cannot start active parking for reservation in "${reservation.status}" status.`,
      });
    }

    // Idempotent: prevent duplicate requests on repeated taps
    if (reservation.checkInStatus === 'requested') {
      return res.json({
        message: 'Waiting for entry confirmation',
        reservation: attachOvertimeEstimate(reservation),
        alreadyRequested: true,
      });
    }

    reservation.checkInStatus = 'requested';
    reservation.checkInRequestedAt = new Date();
    await reservation.save();

    res.json({
      message: 'Check-in request submitted. Waiting for entry confirmation.',
      reservation: attachOvertimeEstimate(reservation),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Driver cancels pending check-in request before staff verification
// @route   PUT /api/reservations/:id/cancel-checkin
// @access  Driver (own reservation)
const cancelCheckIn = async (req, res, next) => {
  try {
    const reservation = await Reservation.findById(req.params.id);
    if (!reservation) return res.status(404).json({ message: 'Reservation not found' });
    if (reservation.driver.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (reservation.status !== 'pending' || reservation.checkInStatus !== 'requested') {
      return res.status(400).json({
        message: 'No pending check-in request to cancel.',
      });
    }

    reservation.checkInStatus = 'none';
    reservation.checkInRequestedAt = null;
    await reservation.save();

    res.json({
      message: 'Check-in request cancelled.',
      reservation: attachOvertimeEstimate(reservation),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Driver requests checkout / release parking
// @route   PUT /api/reservations/:id/checkout-request
// @access  Driver (own reservation)
const requestCheckout = async (req, res, next) => {
  try {
    const reservation = await Reservation.findById(req.params.id);
    if (!reservation) return res.status(404).json({ message: 'Reservation not found' });
    if (reservation.driver.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (reservation.status !== 'active') {
      return res.status(400).json({ message: 'Only active reservations can request checkout.' });
    }

    // Idempotent: prevent duplicate requests
    if (reservation.checkoutStatus === 'requested') {
      return res.json({
        message: 'Checkout request already submitted. Waiting for staff exit confirmation.',
        reservation: attachOvertimeEstimate(reservation),
        alreadyRequested: true,
      });
    }

    reservation.checkoutStatus = 'requested';
    reservation.checkoutRequestedAt = new Date();
    await reservation.save();

    // Note: Space remains occupied until staff verifies exit!
    res.json({
      message: 'Checkout requested. Waiting for staff exit confirmation.',
      reservation: attachOvertimeEstimate(reservation),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Record cash payment for unpaid overtime
// @route   POST /api/reservations/:id/pay-overtime
// @access  Staff / Admin
const recordOvertimeCashPayment = async (req, res, next) => {
  try {
    const reservation = await Reservation.findById(req.params.id);
    if (!reservation) return res.status(404).json({ message: 'Reservation not found' });

    // Only staff / admin can record cash payments
    if (req.user && req.user.role !== 'staff' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only authorized staff can record cash payments.' });
    }

    // Check staff lot authorization
    const staffLot = req.user?.parkingLot || req.user?.assignedLot;
    if (req.user?.role === 'staff' && staffLot) {
      const assignedLotId = staffLot.toString();
      const resLotId = (reservation.parkingLot?._id || reservation.parkingLot).toString();
      if (assignedLotId !== resLotId) {
        return res.status(403).json({ message: 'Access denied: You are not assigned to this parking lot' });
      }
    }

    if (!reservation.unpaidOvertimeAmount || reservation.unpaidOvertimeAmount <= 0) {
      return res.status(400).json({ message: 'No unpaid overtime amount pending for this reservation.' });
    }

    const now = new Date();
    const amountPaid = reservation.unpaidOvertimeAmount;
    reservation.unpaidOvertimeAmount = 0;
    reservation.overtimePaymentStatus = 'paid';
    reservation.overtimePaidAt = now;
    reservation.overtimePaymentMethod = 'cash';
    await reservation.save();

    const payment = await Payment.create({
      reservation: reservation._id,
      user: reservation.driver,
      amount: amountPaid,
      method: 'cash',
      status: 'paid',
      paidAt: now,
    });

    res.json({
      message: 'Cash payment recorded successfully.',
      reservation: attachOvertimeEstimate(reservation),
      payment,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Lookup reservation by reference, QR, ID, or plate for staff scanning
// @route   GET /api/reservations/lookup
// @access  Staff / Admin
const lookupReservation = async (req, res, next) => {
  try {
    const { query } = req.query;
    if (!query || !query.trim()) {
      return res.status(400).json({ message: 'Search query is required' });
    }

    const cleanQuery = query.trim();
    const queryRegex = new RegExp(`^${cleanQuery}$`, 'i');

    const searchCriteria = [
      { reference: queryRegex },
      { vehiclePlate: queryRegex },
    ];

    if (mongoose.Types.ObjectId.isValid(cleanQuery)) {
      searchCriteria.push({ _id: cleanQuery });
    }

    const reservation = await Reservation.findOne({ $or: searchCriteria })
      .populate('driver', 'name email phone')
      .populate('parkingSpace', 'spaceNumber floor type status')
      .populate('parkingLot', 'name address pricePerHour');

    if (!reservation) {
      return res.status(404).json({ message: 'Reservation not found matching query' });
    }

    // Lot authorization check
    if (req.user?.role === 'staff' && req.user.parkingLot) {
      const assignedLotId = req.user.parkingLot.toString();
      const resLotId = (reservation.parkingLot?._id || reservation.parkingLot).toString();
      if (assignedLotId !== resLotId) {
        return res.status(403).json({
          message: 'Access denied: Reservation belongs to a different parking lot',
          reservation: attachOvertimeEstimate(reservation),
          lotMismatch: true,
        });
      }
    }

    res.json(attachOvertimeEstimate(reservation));
  } catch (error) {
    next(error);
  }
};

// @desc    Release a current reservation by its driver (Legacy endpoint preserved)
// @route   PUT /api/reservations/:id/release
// @access  Driver (own active reservation or started pending reservation)
const releaseReservation = async (req, res, next) => {
  try {
    const reservation = await Reservation.findById(req.params.id);
    if (!reservation) return res.status(404).json({ message: 'Reservation not found' });
    if (reservation.driver.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    const actualStartTime = reservation.verifiedAt || reservation.startTime;
    const actualEndTime = new Date();
    const isActive = reservation.status === 'active';
    const isStartedPending =
      reservation.status === 'pending' &&
      new Date(reservation.startTime) <= actualEndTime &&
      actualEndTime < new Date(reservation.endTime);
    if (!isActive && !isStartedPending) {
      return res.status(400).json({ message: 'Only a current active parking session can be released' });
    }

    const parkingLot = await ParkingLot.findById(reservation.parkingLot);
    const ratePerHour = reservation.hourlyRate || parkingLot?.pricePerHour;
    if (!Number.isFinite(ratePerHour) || ratePerHour <= 0) {
      return res.status(400).json({ message: 'Parking rate is unavailable; the session cannot be finalized.' });
    }

    const durationMs = actualEndTime.getTime() - new Date(actualStartTime).getTime();
    if (!Number.isFinite(durationMs) || durationMs < 0) {
      return res.status(400).json({ message: 'The session start time is invalid; the session cannot be finalized.' });
    }

    // Check overtime past scheduled end time
    if (actualEndTime > new Date(reservation.endTime)) {
      const overtimeMs = actualEndTime.getTime() - new Date(reservation.endTime).getTime();
      const gracePeriodMs = (reservation.overtimeGraceMinutes ?? parkingLot?.overtimeGracePeriodMinutes ?? 10) * 60000;
      if (overtimeMs > gracePeriodMs) {
        const overtimeMinutes = Math.round(overtimeMs / 60000);
        const startedHours = Math.ceil(overtimeMinutes / 60);
        reservation.overtimeMinutes = overtimeMinutes;
        reservation.overtimeAmount = Math.round(startedHours * ratePerHour);
      }
    }

    const payment = await Payment.findOne({ reservation: reservation._id, status: 'paid' }).select('method');
    reservation.actualEndTime = actualEndTime;
    reservation.finalAmount = Number(((ratePerHour * durationMs) / 3600000).toFixed(2));
    reservation.status = 'completed';
    reservation.checkoutStatus = 'confirmed';
    reservation.checkedOutAt = actualEndTime;
    await reservation.save();

    await ParkingSpace.findByIdAndUpdate(reservation.parkingSpace, { status: 'available' });
    await ParkingLot.findByIdAndUpdate(reservation.parkingLot, { $inc: { availableSpaces: 1 } });

    res.json({
      message: 'Parking space released',
      reservation: attachOvertimeEstimate(reservation),
      paymentMethod: payment?.method || null,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Extend an active or pending reservation
// @route   PUT /api/reservations/:id/extend
// @access  Driver (own reservation)
const extendReservation = async (req, res, next) => {
  try {
    const { hours } = req.body;
    const additionalHours = parseFloat(hours);
    if (!Number.isFinite(additionalHours) || additionalHours <= 0 || additionalHours > 12) {
      return res.status(400).json({ message: 'Extension duration must be between 1 and 12 hours.' });
    }

    const reservation = await Reservation.findById(req.params.id);
    if (!reservation) return res.status(404).json({ message: 'Reservation not found' });
    if (reservation.driver.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    if (!['pending', 'active'].includes(reservation.status)) {
      return res.status(400).json({ message: `Cannot extend reservation with status "${reservation.status}".` });
    }

    const currentEndTime = new Date(reservation.endTime);
    const newEndTime = new Date(currentEndTime.getTime() + additionalHours * 3600000);

    // Overlap conflict detection for extension window
    const overlap = await hasOverlap(reservation.parkingSpace, currentEndTime, newEndTime, reservation._id);
    if (overlap) {
      return res.status(409).json({
        message: 'This space is reserved for another driver during the requested extension time.',
      });
    }

    const lot = await ParkingLot.findById(reservation.parkingLot);
    const rate = reservation.hourlyRate || (lot?.vehicleTariffs && lot.vehicleTariffs[reservation.vehicleType]) || lot?.pricePerHour || 0;
    const additionalAmount = Number((additionalHours * rate).toFixed(2));

    reservation.endTime = newEndTime;
    reservation.totalAmount = Number((reservation.totalAmount + additionalAmount).toFixed(2));
    reservation.extensionHistory.push({
      extendedAt: new Date(),
      previousEndTime: currentEndTime,
      newEndTime: newEndTime,
      additionalHours,
      additionalAmount,
      paymentStatus: 'paid',
    });

    await reservation.save();

    res.json({
      message: 'Reservation extended successfully',
      reservation: attachOvertimeEstimate(reservation),
      additionalAmount,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify driver arrival / entry by Staff
// @route   PUT /api/reservations/:id/verify
// @access  Staff / Admin
const verifyReservation = async (req, res, next) => {
  try {
    const reservation = await Reservation.findById(req.params.id)
      .populate('parkingLot')
      .populate('parkingSpace')
      .populate('driver', 'name email phone');
    if (!reservation) return res.status(404).json({ message: 'Reservation not found' });

    // Check staff lot authorization
    const staffLot = req.user?.parkingLot || req.user?.assignedLot;
    if (req.user?.role === 'staff' && staffLot) {
      const assignedLotId = staffLot.toString();
      const resLotId = (reservation.parkingLot?._id || reservation.parkingLot).toString();
      if (assignedLotId !== resLotId) {
        return res.status(403).json({ message: 'Access denied: You are not assigned to this parking lot' });
      }
    }

    if (reservation.status === 'active') {
      return res.status(400).json({ message: 'Reservation is already active' });
    }
    if (reservation.status !== 'pending') {
      return res.status(400).json({ message: 'Only pending reservations can be verified' });
    }

    const now = new Date();
    reservation.status = 'active';
    reservation.checkInStatus = 'confirmed';
    reservation.checkedInAt = now;
    reservation.checkedInBy = req.user._id;
    reservation.verifiedBy = req.user._id;
    reservation.verifiedAt = now;
    await reservation.save();

    // Mark space occupied atomically
    const spaceId = reservation.parkingSpace?._id || reservation.parkingSpace;
    if (spaceId) {
      await ParkingSpace.findByIdAndUpdate(spaceId, { status: 'occupied' });
    }

    res.json({
      message: 'Reservation verified and activated',
      reservation: attachOvertimeEstimate(reservation),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all reservations
// @route   GET /api/reservations
// @access  Admin / Staff
const getAllReservations = async (req, res, next) => {
  try {
    const { status, lotId } = req.query;
    const query = {};
    if (status) query.status = status;
    if (lotId) query.parkingLot = lotId;

    const reservations = await Reservation.find(query)
      .populate('driver', 'name email')
      .populate('parkingSpace', 'spaceNumber')
      .populate('parkingLot', 'name')
      .sort({ createdAt: -1 });

    res.json(reservations.map((r) => attachOvertimeEstimate(r)));
  } catch (error) {
    next(error);
  }
};

// @desc    Driver manually activates upcoming reservation (Legacy endpoint preserved)
// @route   PUT /api/reservations/:id/activate
// @access  Driver (own reservation)
const activateReservation = async (req, res, next) => {
  try {
    const reservation = await Reservation.findById(req.params.id);
    if (!reservation) {
      return res.status(404).json({ message: 'Reservation not found' });
    }
    if (reservation.driver.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    if (reservation.status === 'active') {
      return res.json({
        message: 'Reservation is already active',
        reservation: attachOvertimeEstimate(reservation),
        alreadyActive: true,
      });
    }
    if (reservation.status !== 'pending') {
      return res.status(400).json({
        message: `Cannot activate reservation in "${reservation.status}" status. Only upcoming reservations can be activated.`,
      });
    }

    const now = new Date();
    reservation.status = 'active';
    reservation.activatedAt = now;
    reservation.checkInStatus = 'confirmed';
    reservation.checkedInAt = now;
    await reservation.save();

    res.json({
      message: 'Parking session activated',
      reservation: attachOvertimeEstimate(reservation),
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createReservation,
  getMyReservations,
  getReservationById,
  cancelReservation,
  completeReservation,
  releaseReservation,
  extendReservation,
  verifyReservation,
  activateReservation,
  getAllReservations,
  requestCheckIn,
  cancelCheckIn,
  requestCheckout,
  recordOvertimeCashPayment,
  lookupReservation,
  attachOvertimeEstimate,
};
