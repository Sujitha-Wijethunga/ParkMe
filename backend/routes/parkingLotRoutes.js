const express = require('express');
const router = express.Router();
const {
  getParkingLots,
  getParkingLotSuggestions,
  getParkingLotById,
  createParkingLot,
  updateParkingLot,
  deleteParkingLot,
  getNearbyDrivingParking,
  getParkingLotAvailability,
} = require('../controllers/parkingLotController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const uploadParkingLotImage = require('../middleware/parkingLotUpload');

router.get('/', getParkingLots);
router.get('/suggestions', getParkingLotSuggestions);
router.get('/nearby-driving', getNearbyDrivingParking);
router.get('/:id/availability', getParkingLotAvailability);
router.get('/:id', getParkingLotById);
router.post('/', protect, authorize('admin', 'staff'), uploadParkingLotImage.single('image'), createParkingLot);
router.put('/:id', protect, authorize('admin', 'staff'), uploadParkingLotImage.single('image'), updateParkingLot);
router.delete('/:id', protect, authorize('admin'), deleteParkingLot);

module.exports = router;
