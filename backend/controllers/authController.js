const jwt = require('jsonwebtoken');
const { body } = require('express-validator');
const Staff = require('../models/Staff');
const User = require('../models/User');
const { verifyGoogleIdToken } = require('../services/googleAuthService');

// Helper: generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

// @desc    Register a new staff member into the 'staff' table / collection
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res, next) => {
  try {
    let { name, email, password, phone, staffId, staffCode } = req.body;

    const requiredCode = (process.env.STAFF_REGISTRATION_CODE || 'PARKME-STAFF-2026').trim().toUpperCase();
    const providedCode = staffCode ? String(staffCode).trim().toUpperCase() : '';
    const normalizedRequired = requiredCode.replace(/[-_]/g, '');
    const normalizedProvided = providedCode.replace(/[-_]/g, '');

    if (!providedCode || normalizedProvided !== normalizedRequired) {
      return res.status(403).json({
        message: 'Valid facility staff authorization code is required to register a staff account.',
      });
    }

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
    const { staffId, identifier, email, password } = req.body;
    const loginId = String(identifier || staffId || email || '').trim();

    if (!loginId || !password) {
      return res.status(400).json({ message: 'Staff ID or email and password are required' });
    }

    const isEmail = loginId.includes('@');
    const lookup = isEmail
      ? { email: loginId.toLowerCase() }
      : { staffId: loginId.toUpperCase() };
    let user = await Staff.findOne(lookup).select('+password');

    // Fallback to User table if not found in Staff table
    if (!user) {
      user = await User.findOne(lookup).select('+password');
    }

    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: 'Invalid Staff ID/email or password' });
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
    const { name, email, phone, vehicles } = req.body;
    const updates = {};
    if (name !== undefined) updates.name = name.trim();
    if (phone !== undefined) updates.phone = phone.trim();
    if (email !== undefined) updates.email = email.trim().toLowerCase();
    if (vehicles !== undefined && Array.isArray(vehicles)) updates.vehicles = vehicles;

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

// @desc    Register a new driver
// @route   POST /api/auth/driver/register
// @access  Public
const driverRegister = async (req, res, next) => {
  try {
    const { name, email, password, phone } = req.body;

    const normalizedEmail = (email || '').toLowerCase().trim();
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({ message: 'An account with this email already exists' });
    }

    // Role is strictly set to driver on the server, ignoring any role passed in request
    const user = await User.create({
      name: (name || '').trim(),
      email: normalizedEmail,
      password,
      phone: (phone || '').trim(),
      role: 'driver',
    });

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      token: generateToken(user._id),
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'An account with this email already exists' });
    }
    next(error);
  }
};

// @desc    Login driver with email or phone
// @route   POST /api/auth/driver/login
// @access  Public
const driverLogin = async (req, res, next) => {
  try {
    const rawIdentifier = (req.body.identifier || req.body.email || req.body.phone || '').trim();
    const { password } = req.body;

    if (!rawIdentifier || !password) {
      return res.status(400).json({ message: 'Email/phone and password are required' });
    }

    const normalizedIdentifier = rawIdentifier.toLowerCase();
    const user = await User.findOne({
      $or: [
        { email: normalizedIdentifier },
        { phone: rawIdentifier },
      ],
    }).select('+password');

    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: 'Invalid email/phone or password' });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: 'Account deactivated' });
    }

    if (user.role !== 'driver') {
      return res.status(403).json({
        message: 'This portal is for drivers. Staff members should use Staff Login.',
      });
    }

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      token: generateToken(user._id),
    });
  } catch (error) {
    next(error);
  }
};

// Validation chains
const registerValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 80 })
    .withMessage('Name must be between 2 and 80 characters')
    .matches(/^[\p{L}\p{M}]+(?:[ .'-][\p{L}\p{M}]+)*$/u)
    .withMessage('Name contains invalid characters'),
  body('email').trim().isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('phone')
    .trim()
    .notEmpty()
    .withMessage('Phone number is required')
    .custom((value) => {
      const digits = value.replace(/\D/g, '');
      return digits.length >= 9 && digits.length <= 12 && /^\+?[0-9][0-9\s()-]*$/.test(value);
    })
    .withMessage('Phone number must be valid and contain 9 to 12 digits'),
  body('staffId')
    .optional({ checkFalsy: true })
    .trim()
    .matches(/^[A-Z0-9-]{3,20}$/i)
    .withMessage('Staff ID must be 3 to 20 characters and use only letters, numbers, or hyphens'),
  body('staffCode')
    .trim()
    .notEmpty()
    .withMessage('Staff authorization code is required to register a staff account'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/)
    .withMessage('Password must include at least one uppercase letter')
    .matches(/[0-9]/)
    .withMessage('Password must include at least one number'),
];

const loginValidation = [
  body().custom((value, { req }) => {
    const loginId = req.body.identifier || req.body.staffId || req.body.email;
    if (!loginId || !String(loginId).trim()) {
      throw new Error('Staff ID or email is required');
    }
    return true;
  }),
  body('password').notEmpty().withMessage('Password is required'),
];

const driverRegisterValidation = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('phone').trim().notEmpty().withMessage('Phone number is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
];

const driverLoginValidation = [
  body().custom((value, { req }) => {
    const identifier = req.body.identifier || req.body.email || req.body.phone;
    if (!identifier || !String(identifier).trim()) {
      throw new Error('Email or mobile phone is required');
    }
    return true;
  }),
  body('password').notEmpty().withMessage('Password is required'),
];

// @desc    Authenticate driver with verified Google ID token
// @route   POST /api/auth/google
// @access  Public
const googleAuth = async (req, res, next) => {
  try {
    const { idToken } = req.body;
    if (!idToken || !String(idToken).trim()) {
      return res.status(400).json({ message: 'Google ID token is required' });
    }

    // Cryptographically verify token and extract trusted claims from Google
    const googleUser = await verifyGoogleIdToken(idToken);

    // 1. Primary lookup by stable Google subject identifier (sub)
    let user = await User.findOne({ googleId: googleUser.sub });

    if (user) {
      if (!user.isActive) {
        return res.status(403).json({ message: 'Account deactivated' });
      }

      if (user.role !== 'driver') {
        return res.status(403).json({
          message: 'This portal is for drivers. Staff members should use Staff Login.',
        });
      }

      return res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone || '',
        role: user.role,
        authProvider: user.authProvider || 'google',
        token: generateToken(user._id),
      });
    }

    // 2. Not found by googleId: Check if email already belongs to an existing account
    const existingByEmail = await User.findOne({ email: googleUser.email });
    if (existingByEmail) {
      // Do NOT silently link accounts:
      // An account with password or other credentials already exists.
      return res.status(409).json({
        code: 'ACCOUNT_COLLISION',
        message:
          'An account with this email already exists using password login. Please sign in with your email and password.',
      });
    }

    // 3. New user: register as driver strictly enforced by the server
    try {
      user = await User.create({
        name: googleUser.name,
        email: googleUser.email,
        googleId: googleUser.sub,
        authProvider: 'google',
        role: 'driver',
        isActive: true,
      });
    } catch (createErr) {
      // Handle concurrent first sign-in race condition
      if (createErr.code === 11000) {
        user = await User.findOne({ googleId: googleUser.sub });
        if (user) {
          if (!user.isActive) {
            return res.status(403).json({ message: 'Account deactivated' });
          }
          if (user.role !== 'driver') {
            return res.status(403).json({
              message: 'This portal is for drivers. Staff members should use Staff Login.',
            });
          }
          return res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            phone: user.phone || '',
            role: user.role,
            authProvider: user.authProvider || 'google',
            token: generateToken(user._id),
          });
        }
        return res.status(409).json({
          code: 'ACCOUNT_COLLISION',
          message:
            'An account with this email already exists. Please sign in with your password.',
        });
      }
      throw createErr;
    }

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone || '',
      role: user.role,
      authProvider: user.authProvider,
      token: generateToken(user._id),
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ message: error.message });
    }
    next(error);
  }
};

const googleAuthValidation = [
  body('idToken').trim().notEmpty().withMessage('Google ID token is required'),
];

module.exports = {
  register,
  login,
  driverRegister,
  driverLogin,
  googleAuth,
  getMe,
  updateMe,
  changePassword,
  registerValidation,
  loginValidation,
  driverRegisterValidation,
  driverLoginValidation,
  googleAuthValidation,
};
