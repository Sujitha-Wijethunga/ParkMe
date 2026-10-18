const crypto = require('crypto');
const Payment = require('../models/Payment');
const Reservation = require('../models/Reservation');

// @desc    Create payment for a reservation
// @route   POST /api/payments
// @access  Driver
const createPayment = async (req, res, next) => {
  try {
    const { reservationId, method, paymentType = 'booking', amount } = req.body;

    const reservation = await Reservation.findById(reservationId);
    if (!reservation) return res.status(404).json({ message: 'Reservation not found' });

    if (reservation.driver.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const existing = await Payment.findOne({ reservation: reservationId, paymentType });
    if (existing) {
      return res.status(409).json({ message: `Payment (${paymentType}) already exists for this reservation` });
    }

    const paymentAmount = amount !== undefined && Number.isFinite(Number(amount)) && Number(amount) > 0
      ? Number(amount)
      : reservation.totalAmount;

    const payment = await Payment.create({
      reservation: reservationId,
      driver: req.user._id,
      amount: paymentAmount,
      paymentType,
      method,
      status: 'paid',
      paidAt: new Date(),
    });

    reservation.paymentStatus = 'paid';
    await reservation.save();

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

// @desc    Generate PayHere checkout parameters & hash
// @route   POST /api/payments/payhere-params
// @access  Driver / Staff
const getPayHereParams = async (req, res, next) => {
  try {
    const {
      orderId,
      amount,
      items,
      currency = 'LKR',
      customerName = 'Driver',
      customerEmail = 'driver@parkme.lk',
      customerPhone = '0771234567',
    } = req.body;

    const merchantId = process.env.PAYHERE_MERCHANT_ID || '1211149';
    const merchantSecret = process.env.PAYHERE_MERCHANT_SECRET || '4O41pI1O2q1k4n4l4k3';
    const formattedAmount = Number(amount || 0).toFixed(2);

    const hashedSecret = crypto
      .createHash('md5')
      .update(merchantSecret)
      .digest('hex')
      .toUpperCase();

    const hashString = `${merchantId}${orderId}${formattedAmount}${currency}${hashedSecret}`;
    const hash = crypto
      .createHash('md5')
      .update(hashString)
      .digest('hex')
      .toUpperCase();

    const isSandbox = process.env.PAYHERE_SANDBOX !== 'false';
    const actionUrl = isSandbox
      ? 'https://sandbox.payhere.lk/pay/checkout'
      : 'https://www.payhere.lk/pay/checkout';

    res.json({
      sandbox: isSandbox,
      actionUrl,
      merchant_id: merchantId,
      return_url: 'https://parkme.lk/payment/success',
      cancel_url: 'https://parkme.lk/payment/cancel',
      notify_url: `${req.protocol}://${req.get('host')}/api/payments/payhere-notify`,
      order_id: orderId,
      items: items || 'ParkMe Parking Reservation',
      currency,
      amount: formattedAmount,
      first_name: customerName.split(' ')[0] || 'ParkMe',
      last_name: customerName.split(' ').slice(1).join(' ') || 'User',
      email: customerEmail,
      phone: customerPhone,
      address: 'Colombo, Sri Lanka',
      city: 'Colombo',
      country: 'Sri Lanka',
      hash,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    PayHere Instant Payment Notification (IPN) webhook
// @route   POST /api/payments/payhere-notify
// @access  Public
const handlePayHereNotify = async (req, res, next) => {
  try {
    const {
      merchant_id,
      order_id,
      payment_id,
      payhere_amount,
      payhere_currency,
      status_code,
      md5sig,
    } = req.body;

    const merchantSecret = process.env.PAYHERE_MERCHANT_SECRET || '4O41pI1O2q1k4n4l4k3';
    const hashedSecret = crypto
      .createHash('md5')
      .update(merchantSecret)
      .digest('hex')
      .toUpperCase();

    const localMd5 = crypto
      .createHash('md5')
      .update(`${merchant_id}${order_id}${payhere_amount}${payhere_currency}${status_code}${hashedSecret}`)
      .digest('hex')
      .toUpperCase();

    if (localMd5 === md5sig && (status_code === '2' || status_code === 2)) {
      await Payment.findOneAndUpdate(
        { transactionId: order_id },
        { status: 'paid', paidAt: new Date() }
      );
    }

    res.status(200).send('OK');
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
  getPayHereParams,
  handlePayHereNotify,
};
