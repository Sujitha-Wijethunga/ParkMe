const LeaveRequest = require('../models/LeaveRequest');
const { body } = require('express-validator');

// @desc    Get leave requests for logged-in user
// @route   GET /api/leave-requests
// @access  Private
const getLeaveRequests = async (req, res, next) => {
  try {
    const leaveRequests = await LeaveRequest.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json(leaveRequests);
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new leave request
// @route   POST /api/leave-requests
// @access  Private
const createLeaveRequest = async (req, res, next) => {
  try {
    const { type, startDate, endDate, reason } = req.body;

    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // inclusive

    const leaveRequest = await LeaveRequest.create({
      user: req.user._id,
      type,
      startDate: start,
      endDate: end,
      days,
      reason,
      status: 'Pending'
    });

    res.status(201).json(leaveRequest);
  } catch (error) {
    next(error);
  }
};

const createLeaveValidation = [
  body('type').notEmpty().withMessage('Leave type is required'),
  body('startDate').isISO8601().toDate().withMessage('Valid start date is required'),
  body('endDate').isISO8601().toDate().withMessage('Valid end date is required'),
  body('reason').notEmpty().withMessage('Reason is required'),
];

module.exports = {
  getLeaveRequests,
  createLeaveRequest,
  createLeaveValidation,
};
