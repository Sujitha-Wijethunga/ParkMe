const express = require('express');
const router = express.Router();
const {
  getAvailableSpaces,
  createWalkInEntry,
  getWalkInSession,
  getActiveWalkIns,
  checkoutWalkIn,
} = require('../controllers/walkInController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const walkInPhotoUpload = require('../middleware/walkInPhotoUpload');

router.get('/spaces', protect, authorize('staff', 'admin'), getAvailableSpaces);
router.post(
  '/entry',
  protect,
  authorize('staff', 'admin'),
  (req, res, next) => {
    walkInPhotoUpload.single('photo')(req, res, (err) => {
      if (err) {
        // If file upload fails or is not an image, log and proceed without blocking manual entry
        console.warn('Walk-in photo upload warning:', err.message);
      }
      next();
    });
  },
  createWalkInEntry
);
router.get('/session/:refOrId', protect, authorize('staff', 'admin'), getWalkInSession);
router.get('/active', protect, authorize('staff', 'admin'), getActiveWalkIns);
router.post('/checkout', protect, authorize('staff', 'admin'), checkoutWalkIn);

module.exports = router;
