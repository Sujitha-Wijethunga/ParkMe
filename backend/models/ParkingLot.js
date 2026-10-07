const mongoose = require('mongoose');

const parkingLotSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Parking lot name is required'],
      trim: true,
    },
    address: {
      type: String,
      required: [true, 'Address is required'],
      trim: true,
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: [true, 'Coordinates are required'],
      },
    },
    entranceLocation: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [longitude, latitude] optional entrance coordinates
      },
    },
    totalSpaces: {
      type: Number,
      required: [true, 'Total spaces count is required'],
      min: [1, 'Must have at least 1 space'],
    },
    availableSpaces: {
      type: Number,
      default: 0,
    },
    pricePerHour: {
      type: Number,
      required: [true, 'Price per hour is required'],
      min: [0, 'Price cannot be negative'],
    },
    openTime: {
      type: String,
      default: '00:00',
    },
    closeTime: {
      type: String,
      default: '23:59',
    },
    amenities: {
      type: [String],
      default: [],
    },
    city: {
      type: String,
      trim: true,
      default: '',
    },
    entranceName: {
      type: String,
      trim: true,
    },
    sourceCitation: {
      type: String,
      trim: true,
    },
    supportedVehicles: {
      type: [String],
      enum: ['Car', 'Bike', 'SUV', 'EV'],
      default: ['Car', 'Bike', 'SUV', 'EV'],
    },
    vehicleTariffs: {
      Car: { type: Number, min: 0 },
      Bike: { type: Number, min: 0 },
      SUV: { type: Number, min: 0 },
      EV: { type: Number, min: 0 },
    },
    managedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    overtimeGracePeriodMinutes: {
      type: Number,
      default: 15,
      min: [0, 'Grace period cannot be negative'],
    },
    overtimeRateMultiplier: {
      type: Number,
      default: 1.5,
      min: [1.0, 'Overtime multiplier cannot be less than 1.0'],
    },
    contactPhone: {
      type: String,
      trim: true,
      default: '',
    },
    operatingDays: {
      type: [String],
      default: [
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday',
        'Sunday',
      ],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Geospatial index for proximity searches
parkingLotSchema.index({ location: '2dsphere' });
parkingLotSchema.index({ city: 1, isActive: 1 });
parkingLotSchema.index({ isActive: 1, availableSpaces: 1 });

module.exports = mongoose.model('ParkingLot', parkingLotSchema);
