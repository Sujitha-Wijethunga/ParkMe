const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    icon: {
      type: String,
      default: '🔔',
    },
    color: {
      type: String,
      default: '#DBEAFE',
    },
    isUnread: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Fast query index for user notifications feed and badge count
notificationSchema.index({ user: 1, isUnread: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
