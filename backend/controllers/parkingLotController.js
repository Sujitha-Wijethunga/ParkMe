const ParkingLot = require('../models/ParkingLot');

// @desc    List / search parking lots
// @route   GET /api/parking-lots
// @access  Public
// @query   lat, lng, radius (metres), available (boolean)
const getParkingLots = async (req, res, next) => {
  try {
    const { lat, lng, radius, available } = req.query;
    let query = { isActive: true };

    // Geospatial filter if coordinates provided
    if (lat && lng) {
      query.location = {
        $near: {
          $geometry: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
          $maxDistance: radius ? parseInt(radius) : 5000, // default 5 km
        },
      };
    }

    if (available === 'true') {
      query.availableSpaces = { $gt: 0 };
    }

    const lots = await ParkingLot.find(query).populate('managedBy', 'name email');
    res.json(lots);
  } catch (error) {
    next(error);
  }
};

// @desc    Get single parking lot
// @route   GET /api/parking-lots/:id
// @access  Public
const getParkingLotById = async (req, res, next) => {
  try {
    const lot = await ParkingLot.findById(req.params.id).populate('managedBy', 'name email');
    if (!lot || !lot.isActive) {
      return res.status(404).json({ message: 'Parking lot not found' });
    }
    res.json(lot);
  } catch (error) {
    next(error);
  }
};

// @desc    Create a parking lot
// @route   POST /api/parking-lots
// @access  Admin
const createParkingLot = async (req, res, next) => {
  try {
    const lot = await ParkingLot.create(req.body);
    res.status(201).json(lot);
  } catch (error) {
    next(error);
  }
};

// @desc    Update a parking lot
// @route   PUT /api/parking-lots/:id
// @access  Admin / Staff
const updateParkingLot = async (req, res, next) => {
  try {
    const lot = await ParkingLot.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!lot) return res.status(404).json({ message: 'Parking lot not found' });
    res.json(lot);
  } catch (error) {
    next(error);
  }
};

// @desc    Deactivate a parking lot
// @route   DELETE /api/parking-lots/:id
// @access  Admin
const deleteParkingLot = async (req, res, next) => {
  try {
    const lot = await ParkingLot.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    if (!lot) return res.status(404).json({ message: 'Parking lot not found' });
    res.json({ message: 'Parking lot deactivated' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getParkingLots,
  getParkingLotById,
  createParkingLot,
  updateParkingLot,
  deleteParkingLot,
};
