const mongoose = require('mongoose');

const reservationSchema = new mongoose.Schema(
  {
    reference: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },
    driver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Driver reference is required'],
    },
    parkingSpace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ParkingSpace',
      required: [true, 'Parking space reference is required'],
    },
    parkingLot: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ParkingLot',
      required: [true, 'Parking lot reference is required'],
    },
    startTime: {
      type: Date,
      required: [true, 'Start time is required'],
    },
    endTime: {
      type: Date,
      required: [true, 'End time is required'],
    },
    actualEndTime: {
      type: Date,
    },
    finalAmount: {
      type: Number,
      min: [0, 'Final amount cannot be negative'],
    },
    status: {
      type: String,
      enum: ['pending', 'active', 'completed', 'cancelled'],
      default: 'pending',
    },
    totalAmount: {
      type: Number,
      required: [true, 'Total amount is required'],
      min: [0, 'Amount cannot be negative'],
    },
    cancellationReason: {
      type: String,
      trim: true,
    },
    cancellationNote: {
      type: String,
      trim: true,
      maxlength: [500, 'Cancellation details cannot exceed 500 characters'],
    },
    cancelledAt: {
      type: Date,
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    verifiedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

// Index used for overlap detection queries
reservationSchema.index({ parkingSpace: 1, startTime: 1, endTime: 1 });

module.exports = mongoose.model('Reservation', reservationSchema);
