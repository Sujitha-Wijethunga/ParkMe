/**
 * Role-based authorization middleware factory.
 * Usage: authorize('admin') or authorize('staff', 'admin')
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authorized' });
    }
    const role = String(req.user.role || '').trim().toLowerCase();
    const isStaffRecord = req.user.constructor?.modelName === 'Staff';
    const userRole = isStaffRecord || role === 'parking staff' ? 'staff' : role;
    if (!roles.includes(userRole)) {
      return res.status(403).json({
        message: `Access denied. Required role: ${roles.join(' or ')}`,
      });
    }
    next();
  };
};

module.exports = { authorize };
