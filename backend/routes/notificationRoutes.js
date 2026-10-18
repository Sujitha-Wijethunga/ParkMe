const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getNotifications, markAsRead, markAllAsRead, registerPushToken } = require('../controllers/notificationController');

router.use(protect);

router.get('/', getNotifications);
router.put('/read-all', markAllAsRead);
router.put('/:id/read', markAsRead);

// Register/update Expo push token for this user
router.post('/push-token', registerPushToken);

module.exports = router;
