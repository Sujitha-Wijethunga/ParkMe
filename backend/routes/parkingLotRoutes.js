const express = require('express');
const router = express.Router();
const {
  getParkingLots,
  getParkingLotById,
  createParkingLot,
  updateParkingLot,
  deleteParkingLot,
} = require('../controllers/parkingLotController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');

router.get('/', getParkingLots);
router.get('/:id', getParkingLotById);
router.post('/', protect, authorize('admin'), createParkingLot);
router.put('/:id', protect, authorize('admin', 'staff'), updateParkingLot);
router.delete('/:id', protect, authorize('admin'), deleteParkingLot);

module.exports = router;
