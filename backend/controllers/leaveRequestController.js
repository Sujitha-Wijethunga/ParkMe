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

const updateLeaveRequest = async (req, res, next) => {
  try {
    const leaveRequest = await LeaveRequest.findOne({
      _id: req.params.id,
      user: req.user._id,
      status: 'Pending',
    });
    if (!leaveRequest) {
      return res.status(404).json({ message: 'Pending leave request not found' });
    }

    const start = new Date(req.body.startDate ?? leaveRequest.startDate);
    const end = new Date(req.body.endDate ?? leaveRequest.endDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
      return res.status(400).json({ message: 'Leave end date must be on or after the start date' });
    }

    leaveRequest.type = req.body.type ?? leaveRequest.type;
    leaveRequest.startDate = start;
    leaveRequest.endDate = end;
    leaveRequest.days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
    leaveRequest.reason = req.body.reason?.trim() ?? leaveRequest.reason;
    await leaveRequest.save();
    res.json(leaveRequest);
  } catch (error) {
    next(error);
  }
};

const deleteLeaveRequest = async (req, res, next) => {
  try {
    const leaveRequest = await LeaveRequest.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id,
      status: 'Pending',
    });
    if (!leaveRequest) {
      return res.status(404).json({ message: 'Pending leave request not found' });
    }
    res.json({ message: 'Leave request withdrawn' });
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
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
      return res.status(400).json({ message: 'Leave end date must be on or after the start date' });
    }
    const diffTime = end - start;
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
  updateLeaveRequest,
  deleteLeaveRequest,
  createLeaveValidation,
};
