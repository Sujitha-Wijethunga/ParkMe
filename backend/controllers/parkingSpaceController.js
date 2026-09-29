const ParkingSpace = require('../models/ParkingSpace');
const ParkingLot = require('../models/ParkingLot');

// @desc    List spaces in a lot
// @route   GET /api/parking-lots/:lotId/spaces
// @access  Public
const getSpaces = async (req, res, next) => {
  try {
    const { status } = req.query;
    const query = { parkingLot: req.params.lotId };
    if (status) query.status = status;

    const spaces = await ParkingSpace.find(query);
    res.json(spaces);
  } catch (error) {
    next(error);
  }
};

// @desc    Get a single space
// @route   GET /api/parking-lots/:lotId/spaces/:id
// @access  Public
const getSpaceById = async (req, res, next) => {
  try {
    const space = await ParkingSpace.findOne({
      _id: req.params.id,
      parkingLot: req.params.lotId,
    });
    if (!space) return res.status(404).json({ message: 'Parking space not found' });
    res.json(space);
  } catch (error) {
    next(error);
  }
};

// @desc    Add a space to a lot
// @route   POST /api/parking-lots/:lotId/spaces
// @access  Admin / Staff
const createSpace = async (req, res, next) => {
  try {
    const lot = await ParkingLot.findById(req.params.lotId);
    if (!lot) return res.status(404).json({ message: 'Parking lot not found' });

    const space = await ParkingSpace.create({
      ...req.body,
      parkingLot: req.params.lotId,
    });

    // Update available space count on the lot
    if (space.status === 'available') {
      await ParkingLot.findByIdAndUpdate(req.params.lotId, {
        $inc: { availableSpaces: 1 },
      });
    }

    res.status(201).json(space);
  } catch (error) {
    next(error);
  }
};

// @desc    Update a space
// @route   PUT /api/parking-lots/:lotId/spaces/:id
// @access  Admin / Staff
const updateSpace = async (req, res, next) => {
  try {
    const space = await ParkingSpace.findOneAndUpdate(
      { _id: req.params.id, parkingLot: req.params.lotId },
      req.body,
      { new: true, runValidators: true }
    );
    if (!space) return res.status(404).json({ message: 'Parking space not found' });
    res.json(space);
  } catch (error) {
    next(error);
  }
};

// @desc    Remove a space
// @route   DELETE /api/parking-lots/:lotId/spaces/:id
// @access  Admin
const deleteSpace = async (req, res, next) => {
  try {
    const space = await ParkingSpace.findOneAndDelete({
      _id: req.params.id,
      parkingLot: req.params.lotId,
    });
    if (!space) return res.status(404).json({ message: 'Parking space not found' });
    res.json({ message: 'Parking space removed' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getSpaces, getSpaceById, createSpace, updateSpace, deleteSpace };
