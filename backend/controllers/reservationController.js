const Reservation = require('../models/Reservation');
const ParkingSpace = require('../models/ParkingSpace');
const ParkingLot = require('../models/ParkingLot');

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

// @desc    Create a reservation
// @route   POST /api/reservations
// @access  Driver
const createReservation = async (req, res, next) => {
  try {
    const { parkingSpaceId, startTime, endTime } = req.body;

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

    const overlap = await hasOverlap(parkingSpaceId, start, end);
    if (overlap) {
      return res.status(409).json({ message: 'This space is already reserved for the selected time' });
    }

    const lot = await ParkingLot.findById(space.parkingLot);
    const hours = (end - start) / (1000 * 60 * 60);
    const totalAmount = parseFloat((hours * lot.pricePerHour).toFixed(2));

    const reservation = await Reservation.create({
      driver: req.user._id,
      parkingSpace: parkingSpaceId,
      parkingLot: space.parkingLot,
      startTime: start,
      endTime: end,
      totalAmount,
    });

    // Mark space as occupied
    await ParkingSpace.findByIdAndUpdate(parkingSpaceId, { status: 'occupied' });
    await ParkingLot.findByIdAndUpdate(space.parkingLot, { $inc: { availableSpaces: -1 } });

    res.status(201).json(reservation);
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
      .populate('parkingLot', 'name address')
      .sort({ createdAt: -1 });
    res.json(reservations);
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
      .populate('parkingLot', 'name address');

    if (!reservation) return res.status(404).json({ message: 'Reservation not found' });

    // Drivers can only see their own
    if (
      req.user.role === 'driver' &&
      reservation.driver._id.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(reservation);
  } catch (error) {
    next(error);
  }
};

// @desc    Cancel own reservation
// @route   PUT /api/reservations/:id/cancel
// @access  Driver
const cancelReservation = async (req, res, next) => {
  try {
    const reservation = await Reservation.findById(req.params.id);
    if (!reservation) return res.status(404).json({ message: 'Reservation not found' });

    if (reservation.driver.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    if (reservation.status === 'completed' || reservation.status === 'cancelled') {
      return res.status(400).json({ message: `Cannot cancel a ${reservation.status} reservation` });
    }

    reservation.status = 'cancelled';
    reservation.cancellationReason = req.body.reason || '';
    reservation.cancelledAt = new Date();
    await reservation.save();

    // Release the parking space
    await ParkingSpace.findByIdAndUpdate(reservation.parkingSpace, { status: 'available' });
    await ParkingLot.findByIdAndUpdate(reservation.parkingLot, { $inc: { availableSpaces: 1 } });

    res.json({ message: 'Reservation cancelled', reservation });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark reservation as completed / release space
// @route   PUT /api/reservations/:id/complete
// @access  Staff / Admin
const completeReservation = async (req, res, next) => {
  try {
    const reservation = await Reservation.findById(req.params.id);
    if (!reservation) return res.status(404).json({ message: 'Reservation not found' });
    if (reservation.status !== 'active') {
      return res.status(400).json({ message: 'Only active reservations can be completed' });
    }

    reservation.status = 'completed';
    await reservation.save();

    await ParkingSpace.findByIdAndUpdate(reservation.parkingSpace, { status: 'available' });
    await ParkingLot.findByIdAndUpdate(reservation.parkingLot, { $inc: { availableSpaces: 1 } });

    res.json({ message: 'Reservation completed', reservation });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify driver arrival
// @route   PUT /api/reservations/:id/verify
// @access  Staff / Admin
const verifyReservation = async (req, res, next) => {
  try {
    const reservation = await Reservation.findById(req.params.id);
    if (!reservation) return res.status(404).json({ message: 'Reservation not found' });
    if (reservation.status !== 'pending') {
      return res.status(400).json({ message: 'Only pending reservations can be verified' });
    }

    reservation.status = 'active';
    reservation.verifiedBy = req.user._id;
    reservation.verifiedAt = new Date();
    await reservation.save();

    res.json({ message: 'Reservation verified and activated', reservation });
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

    res.json(reservations);
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
  verifyReservation,
  getAllReservations,
};
