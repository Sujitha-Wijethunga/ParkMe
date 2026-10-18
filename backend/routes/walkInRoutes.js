const express = require('express');
const router = express.Router();
const {
  getAvailableSpaces,
  createWalkInEntry,
  getWalkInSession,
  getActiveWalkIns,
  checkoutWalkIn,
  getShiftSummary,
  recognizePlate,
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
    if (req.is('json') || req.headers['content-type']?.includes('application/json')) {
      return next();
    }
    walkInPhotoUpload.single('photo')(req, res, (err) => {
      if (err) {
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

// Shift summary for cash reconciliation report
router.get('/shift-summary', protect, authorize('staff', 'admin'), getShiftSummary);

// Automatic License Plate Recognition (OCR) endpoint
router.post(
  '/recognize-plate',
  protect,
  authorize('staff', 'admin'),
  (req, res, next) => {
    if (req.is('json') || req.headers['content-type']?.includes('application/json')) {
      return next();
    }
    walkInPhotoUpload.single('photo')(req, res, (err) => {
      if (err) console.warn('Plate OCR upload warning:', err.message);
      next();
    });
  },
  recognizePlate
);

module.exports = router;
