const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getNotifications, markAsRead, markAllAsRead } = require('../controllers/notificationController');

router.use(protect);

router.get('/', getNotifications);
router.put('/read-all', markAllAsRead);
router.put('/:id/read', markAsRead);

module.exports = router;
