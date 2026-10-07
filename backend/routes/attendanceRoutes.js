const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const { getAttendance, checkIn, checkOut } = require('../controllers/attendanceController');

router.use(protect, authorize('admin', 'staff'));

router.get('/', getAttendance);
router.post('/check-in', checkIn);
router.put('/check-out', checkOut);

module.exports = router;
