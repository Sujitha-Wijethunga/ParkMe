const jwt = require('jsonwebtoken');
const Staff = require('../models/Staff');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer ')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Search in Staff table first, then User table
    req.user = (await Staff.findById(decoded.id).select('-password')) || (await User.findById(decoded.id).select('-password'));

    if (!req.user || !req.user.isActive) {
      return res.status(401).json({ message: 'Not authorized, user not found or deactivated' });
    }

    next();
  } catch (error) {
    return res.status(401).json({ message: 'Not authorized, token invalid or expired' });
  }
};

module.exports = { protect };
