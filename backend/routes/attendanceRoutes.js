const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getAttendance, checkIn, checkOut } = require('../controllers/attendanceController');

router.use(protect);

router.get('/', getAttendance);
router.post('/check-in', checkIn);
router.put('/check-out', checkOut);

module.exports = router;
