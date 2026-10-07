const mongoose = require('mongoose');

const parkingSpaceSchema = new mongoose.Schema(
  {
    parkingLot: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ParkingLot',
      required: [true, 'Parking lot reference is required'],
    },
    spaceNumber: {
      type: String,
      required: [true, 'Space number is required'],
      trim: true,
    },
    type: {
      type: String,
      enum: ['standard', 'disabled', 'EV'],
      default: 'standard',
    },
    vehicleType: {
      type: String,
      enum: ['Car', 'Bike', 'SUV', 'EV', 'any'],
      default: 'Car',
    },
    status: {
      type: String,
      enum: ['available', 'occupied', 'maintenance'],
      default: 'available',
    },
    floor: {
      type: String,
      trim: true,
    },
    imageUrl: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

// Each space number must be unique within a parking lot
parkingSpaceSchema.index({ parkingLot: 1, spaceNumber: 1 }, { unique: true });
parkingSpaceSchema.index({ parkingLot: 1, status: 1, vehicleType: 1 });

module.exports = mongoose.model('ParkingSpace', parkingSpaceSchema);
