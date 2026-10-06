const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const {
  getLeaveRequests,
  createLeaveRequest,
  updateLeaveRequest,
  deleteLeaveRequest,
  createLeaveValidation,
} = require('../controllers/leaveRequestController');

router.use(protect);

router.get('/', getLeaveRequests);
router.post('/', createLeaveValidation, validate, createLeaveRequest);
router.put('/:id', updateLeaveRequest);
router.delete('/:id', deleteLeaveRequest);

module.exports = router;
