const Payment = require('../models/Payment');
const Reservation = require('../models/Reservation');

// @desc    Create payment for a reservation
// @route   POST /api/payments
// @access  Driver
const createPayment = async (req, res, next) => {
  try {
    const { reservationId, method } = req.body;

    const reservation = await Reservation.findById(reservationId);
    if (!reservation) return res.status(404).json({ message: 'Reservation not found' });

    if (reservation.driver.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const existing = await Payment.findOne({ reservation: reservationId });
    if (existing) {
      return res.status(409).json({ message: 'Payment already exists for this reservation' });
    }

    const payment = await Payment.create({
      reservation: reservationId,
      driver: req.user._id,
      amount: reservation.totalAmount,
      method,
      status: 'paid',
      paidAt: new Date(),
    });

    res.status(201).json(payment);
  } catch (error) {
    next(error);
  }
};

// @desc    Get own payment history
// @route   GET /api/payments/my
// @access  Driver
const getMyPayments = async (req, res, next) => {
  try {
    const payments = await Payment.find({ driver: req.user._id })
      .populate('reservation', 'startTime endTime totalAmount status')
      .sort({ createdAt: -1 });
    res.json(payments);
  } catch (error) {
    next(error);
  }
};

// @desc    Get payment by ID
// @route   GET /api/payments/:id
// @access  Driver (own) / Staff / Admin
const getPaymentById = async (req, res, next) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate('reservation')
      .populate('driver', 'name email');

    if (!payment) return res.status(404).json({ message: 'Payment not found' });

    if (
      req.user.role === 'driver' &&
      payment.driver._id.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(payment);
  } catch (error) {
    next(error);
  }
};

// @desc    Issue a refund
// @route   PUT /api/payments/:id/refund
// @access  Admin
const refundPayment = async (req, res, next) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) return res.status(404).json({ message: 'Payment not found' });
    if (payment.status !== 'paid') {
      return res.status(400).json({ message: 'Only paid payments can be refunded' });
    }

    payment.status = 'refunded';
    await payment.save();

    res.json({ message: 'Payment refunded', payment });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all payments
// @route   GET /api/payments
// @access  Admin
const getAllPayments = async (req, res, next) => {
  try {
    const payments = await Payment.find()
      .populate('driver', 'name email')
      .populate('reservation', 'startTime endTime totalAmount')
      .sort({ createdAt: -1 });
    res.json(payments);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createPayment,
  getMyPayments,
  getPaymentById,
  refundPayment,
  getAllPayments,
};
