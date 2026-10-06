const express = require('express');
const router = express.Router();
const { getAllUsers, changeRole, deactivateUser } = require('../controllers/userController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');

router.get('/', protect, authorize('admin'), getAllUsers);
router.put('/:id/role', protect, authorize('admin'), changeRole);
router.delete('/:id', protect, authorize('admin'), deactivateUser);

module.exports = router;
