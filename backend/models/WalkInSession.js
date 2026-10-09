const mongoose = require('mongoose');

const walkInSessionSchema = new mongoose.Schema(
  {
    reference: {
      type: String,
      unique: true,
      required: [true, 'Reference is required'],
      trim: true,
      uppercase: true,
    },
    parkingLot: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ParkingLot',
      required: [true, 'Parking lot reference is required'],
    },
    parkingSpace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ParkingSpace',
      required: [true, 'Parking space reference is required'],
    },
    spaceNumber: {
      type: String,
      required: [true, 'Space number is required'],
      trim: true,
    },
    floor: {
      type: String,
      trim: true,
      default: 'G',
    },
    vehiclePlate: {
      type: String,
      required: [true, 'Vehicle plate number is required'],
      trim: true,
      uppercase: true,
    },
    vehicleType: {
      type: String,
      enum: ['Car', 'Bike', 'SUV', 'EV'],
      default: 'Car',
      required: [true, 'Vehicle type is required'],
    },
    vehiclePhotoUrl: {
      type: String,
      trim: true,
    },
    customerName: {
      type: String,
      trim: true,
      default: '',
    },
    customerPhone: {
      type: String,
      trim: true,
      default: '',
    },
    entryTime: {
      type: Date,
      required: [true, 'Entry time is required'],
      default: Date.now,
    },
    exitTime: {
      type: Date,
    },
    enteredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Staff member who recorded entry is required'],
    },
    checkedOutBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    hourlyRate: {
      type: Number,
      required: [true, 'Snapshot hourly rate is required'],
      min: [0, 'Hourly rate cannot be negative'],
    },
    billingRule: {
      type: String,
      default: 'per_started_hour',
      trim: true,
    },
    serviceCharge: {
      type: Number,
      default: 50,
      min: [0, 'Service charge cannot be negative'],
    },
    currency: {
      type: String,
      default: 'Rs.',
      trim: true,
    },
    status: {
      type: String,
      enum: ['active', 'completed', 'cancelled'],
      default: 'active',
    },
    paymentStatus: {
      type: String,
      enum: ['unpaid', 'paid', 'partially_paid'],
      default: 'unpaid',
    },
    amountPaid: {
      type: Number,
      default: 0,
      min: [0, 'Amount paid cannot be negative'],
    },
    finalAmount: {
      type: Number,
      min: [0, 'Final amount cannot be negative'],
    },
    outstandingBalance: {
      type: Number,
      default: 0,
      min: [0, 'Outstanding balance cannot be negative'],
    },
    payments: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Payment',
      },
    ],
    idempotencyKey: {
      type: String,
      sparse: true,
      unique: true,
      trim: true,
    },
  },
  { timestamps: true }
);

// Indexes
walkInSessionSchema.index({ reference: 1 }, { unique: true });
walkInSessionSchema.index({ parkingLot: 1, status: 1 });
walkInSessionSchema.index({ vehiclePlate: 1, status: 1 });
walkInSessionSchema.index({ parkingSpace: 1, status: 1 });

module.exports = mongoose.model('WalkInSession', walkInSessionSchema);
