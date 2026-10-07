const express = require('express');
const router = express.Router({ mergeParams: true }); // access :lotId from parent
const {
  getSpaces,
  getSpaceById,
  createSpace,
  updateSpace,
  deleteSpace,
} = require('../controllers/parkingSpaceController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const uploadParkingSpaceImage = require('../middleware/parkingSpaceUpload');

router.get('/', getSpaces);
router.get('/:id', getSpaceById);
router.post('/', protect, authorize('admin', 'staff'), uploadParkingSpaceImage.single('image'), createSpace);
router.put('/:id', protect, authorize('admin', 'staff'), uploadParkingSpaceImage.single('image'), updateSpace);
router.delete('/:id', protect, authorize('admin', 'staff'), deleteSpace);

module.exports = router;
