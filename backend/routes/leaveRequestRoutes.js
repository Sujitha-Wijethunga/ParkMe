const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { getLeaveRequests, createLeaveRequest, createLeaveValidation } = require('../controllers/leaveRequestController');

router.use(protect);

router.get('/', getLeaveRequests);
router.post('/', createLeaveValidation, validate, createLeaveRequest);

module.exports = router;
