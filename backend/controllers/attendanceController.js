const Attendance = require('../models/Attendance');

// @desc    Get attendance history for logged-in user
// @route   GET /api/attendance
// @access  Private
const getAttendance = async (req, res, next) => {
  try {
    const attendance = await Attendance.find({ user: req.user._id }).sort({ date: -1 });
    res.json(attendance);
  } catch (error) {
    next(error);
  }
};

// @desc    Check-in user for today
// @route   POST /api/attendance/check-in
// @access  Private
const checkIn = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existing = await Attendance.findOne({
      user: req.user._id,
      date: { $gte: today, $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000) }
    });

    if (existing) {
      return res.status(400).json({ message: 'Already checked in for today' });
    }

    // Determine status (e.g. late if after 8:30 AM)
    const currentHour = new Date().getHours();
    const currentMin = new Date().getMinutes();
    const isLate = (currentHour > 8) || (currentHour === 8 && currentMin > 30);
    
    const checkInTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const attendance = await Attendance.create({
      user: req.user._id,
      date: today,
      checkIn: checkInTime,
      status: isLate ? 'Late' : 'Present'
    });

    res.status(201).json(attendance);
  } catch (error) {
    next(error);
  }
};

// @desc    Check-out user for today
// @route   PUT /api/attendance/check-out
// @access  Private
const checkOut = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendance = await Attendance.findOne({
      user: req.user._id,
      date: { $gte: today, $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000) }
    });

    if (!attendance) {
      return res.status(404).json({ message: 'No check-in record found for today' });
    }

    if (attendance.checkOut) {
      return res.status(400).json({ message: 'Already checked out for today' });
    }

    attendance.checkOut = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    await attendance.save();

    res.json(attendance);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAttendance,
  checkIn,
  checkOut,
};
