const User = require('../models/User');

// @desc    Get all users
// @route   GET /api/users
// @access  Admin
const getAllUsers = async (req, res, next) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (error) {
    next(error);
  }
};

// @desc    Change a user's role
// @route   PUT /api/users/:id/role
// @access  Admin
const changeRole = async (req, res, next) => {
  try {
    const { role } = req.body;
    const validRoles = ['driver', 'staff', 'admin'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true }
    );
    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json(user);
  } catch (error) {
    next(error);
  }
};

// @desc    Deactivate a user
// @route   DELETE /api/users/:id
// @access  Admin
const deactivateUser = async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json({ message: 'User deactivated successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAllUsers, changeRole, deactivateUser };
