const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    reservation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Reservation',
    },
    walkInSession: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'WalkInSession',
    },
    driver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    paymentType: {
      type: String,
      enum: ['booking', 'extension', 'overtime'],
      default: 'booking',
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0, 'Amount cannot be negative'],
    },
    method: {
      type: String,
      enum: ['card', 'cash', 'wallet'],
      required: [true, 'Payment method is required'],
    },
    status: {
      type: String,
      enum: ['pending', 'paid', 'refunded', 'failed'],
      default: 'pending',
    },
    transactionId: {
      type: String,
      trim: true,
    },
    paidAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

// Indexes
// Allow at most one payment per type (booking / extension / overtime) per reservation
paymentSchema.index({ reservation: 1, paymentType: 1 }, { unique: true, sparse: true });
paymentSchema.index({ walkInSession: 1, paymentType: 1 }, { unique: true, sparse: true });
// Driver payment history
paymentSchema.index({ driver: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model('Payment', paymentSchema);
