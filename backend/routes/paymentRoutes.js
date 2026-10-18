const express = require('express');
const router = express.Router();
const {
  createPayment,
  getMyPayments,
  getPaymentById,
  refundPayment,
  getAllPayments,
  getPayHereParams,
  handlePayHereNotify,
} = require('../controllers/paymentController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');

router.post('/payhere-params', protect, getPayHereParams);
router.post('/payhere-notify', handlePayHereNotify);
router.post('/', protect, authorize('driver'), createPayment);
router.get('/my', protect, authorize('driver'), getMyPayments);
router.get('/', protect, authorize('admin'), getAllPayments);
router.get('/:id', protect, getPaymentById);
router.put('/:id/refund', protect, authorize('admin'), refundPayment);

module.exports = router;
