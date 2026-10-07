const ParkingSpace = require('../models/ParkingSpace');
const ParkingLot = require('../models/ParkingLot');
const fs = require('fs/promises');
const path = require('path');

// @desc    List spaces in a lot
// @route   GET /api/parking-lots/:lotId/spaces
// @access  Public
const getSpaces = async (req, res, next) => {
  try {
    const { status, vehicleType } = req.query;
    const query = { parkingLot: req.params.lotId };
    if (status) query.status = status;
    if (vehicleType && typeof vehicleType === 'string' && vehicleType.trim()) {
      query.$or = [
        { vehicleType: vehicleType.trim() },
        { vehicleType: 'any' },
        { vehicleType: { $exists: false } },
      ];
    }

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
    if (!req.file) {
      const error = new Error('A parking-space image is required. Choose a JPEG, PNG, or WebP image.');
      error.statusCode = 400;
      throw error;
    }

    const lot = await ParkingLot.findById(req.params.lotId);
    if (!lot) {
      const error = new Error('Parking lot not found');
      error.statusCode = 404;
      throw error;
    }

    let spaceNumbers;
    if (req.body.spaceNumbers !== undefined) {
      try {
        spaceNumbers = typeof req.body.spaceNumbers === 'string'
          ? JSON.parse(req.body.spaceNumbers)
          : req.body.spaceNumbers;
      } catch {
        const error = new Error('Space numbers must be a JSON array.');
        error.statusCode = 400;
        throw error;
      }
    } else {
      spaceNumbers = [req.body.spaceNumber];
    }

    if (
      !Array.isArray(spaceNumbers)
      || spaceNumbers.length < 1
      || spaceNumbers.length > 100
      || spaceNumbers.some((spaceNumber) => typeof spaceNumber !== 'string' || !spaceNumber.trim() || spaceNumber.length > 50)
      || new Set(spaceNumbers).size !== spaceNumbers.length
    ) {
      const error = new Error('Provide 1 to 100 unique, non-empty space numbers.');
      error.statusCode = 400;
      throw error;
    }

    const existingSpaces = await ParkingSpace.find({
      parkingLot: req.params.lotId,
      spaceNumber: { $in: spaceNumbers },
    }).select('spaceNumber').lean();
    if (existingSpaces.length > 0) {
      const error = new Error(`Space number ${existingSpaces[0].spaceNumber} already exists in this lot.`);
      error.statusCode = 409;
      throw error;
    }

    const imageUrl = req.file ? `/uploads/parking-spaces/${req.file.filename}` : undefined;
    const createdSpaces = await ParkingSpace.insertMany(
      spaceNumbers.map((spaceNumber) => ({
        parkingLot: req.params.lotId,
        spaceNumber: spaceNumber.trim(),
        floor: req.body.floor,
        type: req.body.type || 'standard',
        status: req.body.status || 'available',
        imageUrl,
      }))
    );

    const [totalSpaces, availableSpaces] = await Promise.all([
      ParkingSpace.countDocuments({ parkingLot: req.params.lotId }),
      ParkingSpace.countDocuments({ parkingLot: req.params.lotId, status: 'available' }),
    ]);
    await ParkingLot.findByIdAndUpdate(req.params.lotId, {
      $set: { totalSpaces, availableSpaces },
    });
    res.status(201).json(req.body.spaceNumbers !== undefined ? createdSpaces : createdSpaces[0]);
  } catch (error) {
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (cleanupError) {
        console.error('Failed to remove uploaded image after space creation failed:', cleanupError);
      }
    }
    next(error);
  }
};

// @desc    Update a space
// @route   PUT /api/parking-lots/:lotId/spaces/:id
// @access  Admin / Staff
const updateSpace = async (req, res, next) => {
  try {
    const allowedUpdates = {};
    for (const field of ['status', 'floor', 'type']) {
      if (req.body[field] !== undefined) allowedUpdates[field] = req.body[field];
    }
    const space = await ParkingSpace.findOneAndUpdate(
      { _id: req.params.id, parkingLot: req.params.lotId },
      allowedUpdates,
      { new: true, runValidators: true }
    );
    if (!space) return res.status(404).json({ message: 'Parking space not found' });
    if (allowedUpdates.status !== undefined) {
      const availableSpaces = await ParkingSpace.countDocuments({
        parkingLot: req.params.lotId,
        status: 'available',
      });
      await ParkingLot.findByIdAndUpdate(req.params.lotId, { $set: { availableSpaces } });
    }
    res.json(space);
  } catch (error) {
    next(error);
  }
};

// @desc    Remove a space
// @route   DELETE /api/parking-lots/:lotId/spaces/:id
// @access  Admin / Staff
const deleteSpace = async (req, res, next) => {
  try {
    const space = await ParkingSpace.findOneAndDelete({
      _id: req.params.id,
      parkingLot: req.params.lotId,
    });
    if (!space) return res.status(404).json({ message: 'Parking space not found' });

    const [totalSpaces, availableSpaces] = await Promise.all([
      ParkingSpace.countDocuments({ parkingLot: req.params.lotId }),
      ParkingSpace.countDocuments({ parkingLot: req.params.lotId, status: 'available' }),
    ]);
    await ParkingLot.findByIdAndUpdate(req.params.lotId, {
      $set: { totalSpaces, availableSpaces },
    });

    const imageStillUsed = space.imageUrl
      ? await ParkingSpace.exists({ imageUrl: space.imageUrl })
      : true;
    if (!imageStillUsed && space.imageUrl?.startsWith('/uploads/parking-spaces/')) {
      const imagePath = path.join(
        __dirname,
        '..',
        'uploads',
        'parking-spaces',
        path.basename(space.imageUrl)
      );
      try {
        await fs.unlink(imagePath);
      } catch (error) {
        if (error.code !== 'ENOENT') {
          console.error('Failed to remove deleted parking-space image:', error);
        }
      }
    }

    res.json({ message: 'Parking space removed' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getSpaces, getSpaceById, createSpace, updateSpace, deleteSpace };
