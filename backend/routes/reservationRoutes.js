const express = require('express');
const router = express.Router();
const {
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
} = require('../controllers/reservationController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');

router.post('/', protect, authorize('driver'), createReservation);
router.get('/my', protect, authorize('driver'), getMyReservations);
router.get('/', protect, authorize('admin', 'staff'), getAllReservations);
router.get('/:id', protect, getReservationById);
router.put('/:id/activate', protect, authorize('driver'), activateReservation);
router.put('/:id/extend', protect, authorize('driver'), extendReservation);
router.put('/:id/cancel', protect, authorize('driver'), cancelReservation);
router.put('/:id/verify', protect, authorize('admin', 'staff'), verifyReservation);
router.put('/:id/complete', protect, authorize('admin', 'staff'), completeReservation);
router.put('/:id/release', protect, authorize('driver'), releaseReservation);

module.exports = router;
