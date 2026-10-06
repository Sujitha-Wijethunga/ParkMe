const jwt = require('jsonwebtoken');
const { body } = require('express-validator');
const Staff = require('../models/Staff');
const User = require('../models/User');

// Helper: generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

// @desc    Register a new staff member into the 'staff' table / collection
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res, next) => {
  try {
    let { name, email, password, phone, staffId } = req.body;

    // Check if email already registered in Staff table
    const existingStaffEmail = await Staff.findOne({ email: email.toLowerCase().trim() });
    if (existingStaffEmail) {
      return res.status(409).json({ message: 'Email is already registered' });
    }

    if (staffId && staffId.trim()) {
      staffId = staffId.trim().toUpperCase();
      const existingStaffId = await Staff.findOne({ staffId });
      if (existingStaffId) {
        return res.status(409).json({ message: 'Staff ID already in use' });
      }
    } else {
      // Auto-generate staffId if not provided (e.g., STF-8492)
      let unique = false;
      while (!unique) {
        const randomNum = Math.floor(1000 + Math.random() * 9000);
        staffId = `STF-${randomNum}`;
        const existingStaffId = await Staff.findOne({ staffId });
        if (!existingStaffId) {
          unique = true;
        }
      }
    }

    // Save into the dedicated 'staff' table (Staff model)
    const staff = await Staff.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      phone: phone ? phone.trim() : '',
      staffId,
      role: 'Parking Staff',
    });

    res.status(201).json({
      _id: staff._id,
      name: staff.name,
      email: staff.email,
      role: staff.role,
      staffId: staff.staffId,
      token: generateToken(staff._id),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Login staff user from 'staff' table
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res, next) => {
  try {
    const { staffId, password } = req.body;

    if (!staffId || !password) {
      return res.status(400).json({ message: 'Staff ID and password are required' });
    }

    const formattedStaffId = staffId.trim().toUpperCase();

    // Look up in Staff table first
    let user = await Staff.findOne({ staffId: formattedStaffId }).select('+password');

    // Fallback to User table if not found in Staff table
    if (!user) {
      user = await User.findOne({ staffId: formattedStaffId }).select('+password');
    }

    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: 'Invalid Staff ID or password' });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: 'Account deactivated' });
    }

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      staffId: user.staffId,
      token: generateToken(user._id),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get own profile
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
  res.json(req.user);
};

// @desc    Update own profile
// @route   PUT /api/auth/me
// @access  Private
const updateMe = async (req, res, next) => {
  try {
    const { name, email, phone } = req.body;
    const updates = {};
    if (name !== undefined) updates.name = name.trim();
    if (phone !== undefined) updates.phone = phone.trim();
    if (email !== undefined) updates.email = email.trim().toLowerCase();

    if (updates.email) {
      const duplicateStaff = await Staff.findOne({
        email: updates.email,
        _id: { $ne: req.user._id },
      });
      const duplicateUser = await User.findOne({
        email: updates.email,
        _id: { $ne: req.user._id },
      });
      if (duplicateStaff || duplicateUser) {
        return res.status(409).json({ message: 'Email is already in use' });
      }
    }

    let user = await Staff.findByIdAndUpdate(
      req.user._id,
      updates,
      { new: true, runValidators: true }
    );
    if (!user) {
      user = await User.findByIdAndUpdate(
        req.user._id,
        updates,
        { new: true, runValidators: true }
      );
    }
    res.json(user);
  } catch (error) {
    next(error);
  }
};

// @desc    Change own password
// @route   PUT /api/auth/change-password
// @access  Private
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    let user = await Staff.findById(req.user._id).select('+password');
    if (!user) {
      user = await User.findById(req.user._id).select('+password');
    }

    if (!user || !(await user.matchPassword(currentPassword))) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }

    user.password = newPassword;
    await user.save();

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    next(error);
  }
};

// Validation chains
const registerValidation = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
];

const loginValidation = [
  body('staffId').trim().notEmpty().withMessage('Staff ID is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

module.exports = {
  register,
  login,
  getMe,
  updateMe,
  changePassword,
  registerValidation,
  loginValidation,
};
