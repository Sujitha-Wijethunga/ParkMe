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
    hourlyRate: {
      type: Number,
      min: [0, 'Hourly rate cannot be negative'],
    },
    vehicleType: {
      type: String,
      enum: ['Car', 'Bike', 'SUV', 'EV'],
      default: 'Car',
    },
    vehiclePlate: {
      type: String,
      trim: true,
      uppercase: true,
      default: '',
    },
    vehicleModel: {
      type: String,
      trim: true,
      default: '',
    },
    activatedAt: {
      type: Date,
    },
    status: {
      type: String,
      enum: ['pending', 'active', 'completed', 'cancelled'],
      default: 'pending',
    },
    paymentStatus: {
      type: String,
      enum: ['unpaid', 'paid', 'partially_paid', 'refunded'],
      default: 'unpaid',
    },
    totalAmount: {
      type: Number,
      required: [true, 'Total amount is required'],
      min: [0, 'Amount cannot be negative'],
    },
    overtimeMinutes: {
      type: Number,
      default: 0,
      min: [0, 'Overtime minutes cannot be negative'],
    },
    overtimeAmount: {
      type: Number,
      default: 0,
      min: [0, 'Overtime amount cannot be negative'],
    },
    extensionHistory: [
      {
        extendedAt: {
          type: Date,
          default: Date.now,
        },
        previousEndTime: {
          type: Date,
          required: true,
        },
        newEndTime: {
          type: Date,
          required: true,
        },
        additionalHours: {
          type: Number,
          required: true,
          min: 0.1,
        },
        additionalAmount: {
          type: Number,
          required: true,
          min: 0,
        },
        paymentStatus: {
          type: String,
          enum: ['pending', 'paid'],
          default: 'paid',
        },
      },
    ],
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
    completedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    completedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

// Indexes
// Overlap detection query index
reservationSchema.index({ parkingSpace: 1, startTime: 1, endTime: 1 });
// Driver booking history and active query index
reservationSchema.index({ driver: 1, status: 1, startTime: -1 });
// Lot and staff reservations query index
reservationSchema.index({ parkingLot: 1, status: 1, startTime: -1 });
// Overtime / session expiry query index
reservationSchema.index({ status: 1, endTime: 1 });

module.exports = mongoose.model('Reservation', reservationSchema);
