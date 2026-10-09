const express = require('express');
const router = express.Router();
const {
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
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const { validate } = require('../middleware/validate');
const uploadAvatar = require('../middleware/avatarUpload');

// Staff auth routes: Public registration is removed. Only authenticated administrators may provision staff accounts.
router.post('/register', protect, authorize('admin'), ...registerValidation, validate, register);
router.post('/staff/provision', protect, authorize('admin'), ...registerValidation, validate, register);
router.post('/login', ...loginValidation, validate, login);

// Driver auth routes
router.post('/driver/register', ...driverRegisterValidation, validate, driverRegister);
router.post('/driver/login', ...driverLoginValidation, validate, driverLogin);
router.post('/google', ...googleAuthValidation, validate, googleAuth);

// Current user profile routes
router.get('/me', protect, getMe);
router.put('/me', protect, uploadAvatar.single('avatar'), updateMe);
router.put('/change-password', protect, changePassword);

module.exports = router;
