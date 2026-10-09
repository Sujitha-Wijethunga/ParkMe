const ParkingSpace = require('../models/ParkingSpace');
const ParkingLot = require('../models/ParkingLot');
const Reservation = require('../models/Reservation');
const fs = require('fs/promises');
const path = require('path');

// @desc    List spaces in a lot
// @route   GET /api/parking-lots/:lotId/spaces
// @access  Public / Staff
const getSpaces = async (req, res, next) => {
  try {
    const { status, vehicleType } = req.query;
    let targetLotId = req.params.lotId || req.query.lotId;

    if (!targetLotId && req.user) {
      targetLotId = req.user.parkingLot || req.user.assignedLot;
    }

    if (req.user?.role === 'staff') {
      const staffLot = req.user.parkingLot || req.user.assignedLot;
      if (staffLot && targetLotId && staffLot.toString() !== targetLotId.toString()) {
        return res.status(403).json({
          message: 'Access denied: You are not authorized to view spaces for this parking lot',
        });
      }
      if (staffLot && !targetLotId) {
        targetLotId = staffLot;
      }
    }

    if (!targetLotId) {
      // Default to first active lot if no lot ID specified
      const firstLot = await ParkingLot.findOne({ isActive: true });
      if (firstLot) targetLotId = firstLot._id;
    }

    const query = { parkingLot: targetLotId };
    if (status) query.status = status;
    if (vehicleType && typeof vehicleType === 'string' && vehicleType.trim()) {
      query.$or = [
        { vehicleType: vehicleType.trim() },
        { vehicleType: 'any' },
        { vehicleType: { $exists: false } },
      ];
    }

    const spaces = await ParkingSpace.find(query).sort({ spaceNumber: 1 }).lean();

    // Attach live active & upcoming reservations so spaces reflect true status
    const now = new Date();
    const activeReservations = await Reservation.find({
      parkingLot: targetLotId,
      status: { $in: ['pending', 'active'] },
      endTime: { $gt: now },
    })
      .select('parkingSpace status startTime endTime reference vehiclePlate driver')
      .populate('driver', 'name')
      .lean();

    const resBySpaceId = {};
    activeReservations.forEach((r) => {
      const sId = (r.parkingSpace?._id || r.parkingSpace).toString();
      if (!resBySpaceId[sId] || r.status === 'active') {
        resBySpaceId[sId] = r;
      }
    });

    const enrichedSpaces = spaces.map((s) => {
      const activeRes = resBySpaceId[s._id.toString()];
      let effectiveStatus = s.status || 'available';
      if (s.status === 'occupied') {
        effectiveStatus = 'occupied';
      } else if (activeRes) {
        if (activeRes.status === 'active') {
          effectiveStatus = 'occupied';
        } else if (activeRes.status === 'pending') {
          effectiveStatus = 'reserved';
        }
      }
      return {
        ...s,
        effectiveStatus,
        activeReservation: activeRes || null,
      };
    });

    res.json(enrichedSpaces);
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
    const targetLotId = req.params.lotId || req.body.parkingLot || req.user?.parkingLot;
    if (!targetLotId) {
      const error = new Error('Parking lot ID is required.');
      error.statusCode = 400;
      throw error;
    }

    if (req.user?.role === 'staff') {
      const staffLot = req.user.parkingLot || req.user.assignedLot;
      if (staffLot && staffLot.toString() !== targetLotId.toString()) {
        const error = new Error('Access denied: You are not authorized to add spaces to this parking lot.');
        error.statusCode = 403;
        throw error;
      }
    }

    const lot = await ParkingLot.findById(targetLotId);
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

    const cleanFloor = (req.body.floor || '').trim();
    if (!cleanFloor) {
      const error = new Error('Floor or level is required (e.g. Ground Floor, Level 1).');
      error.statusCode = 400;
      throw error;
    }

    const validVehicleTypes = ['Car', 'Bike', 'SUV', 'EV', 'any'];
    const vehicleType = req.body.vehicleType ? req.body.vehicleType.trim() : 'Car';
    if (!validVehicleTypes.includes(vehicleType)) {
      const error = new Error('Vehicle type must be Car, Bike, SUV, EV, or any.');
      error.statusCode = 400;
      throw error;
    }

    const existingSpaces = await ParkingSpace.find({
      parkingLot: targetLotId,
      spaceNumber: { $in: spaceNumbers },
    }).select('spaceNumber').lean();
    if (existingSpaces.length > 0) {
      const error = new Error(`Space number ${existingSpaces[0].spaceNumber} already exists in this lot.`);
      error.statusCode = 409;
      throw error;
    }

    const imageUrl = req.file
      ? `/uploads/parking-spaces/${req.file.filename}`
      : (req.body.imageUrl || undefined);
    const createdSpaces = await ParkingSpace.insertMany(
      spaceNumbers.map((spaceNumber) => ({
        parkingLot: targetLotId,
        spaceNumber: spaceNumber.trim().toUpperCase(),
        floor: cleanFloor,
        type: req.body.type || (vehicleType === 'EV' ? 'EV' : 'standard'),
        vehicleType,
        status: req.body.status || 'available',
        imageUrl,
      }))
    );

    const [totalSpaces, availableSpaces] = await Promise.all([
      ParkingSpace.countDocuments({ parkingLot: targetLotId }),
      ParkingSpace.countDocuments({ parkingLot: targetLotId, status: 'available' }),
    ]);
    await ParkingLot.findByIdAndUpdate(targetLotId, {
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
    const targetLotId = req.params.lotId;
    if (req.user?.role === 'staff') {
      const staffLot = req.user.parkingLot || req.user.assignedLot;
      if (staffLot && targetLotId && staffLot.toString() !== targetLotId.toString()) {
        return res.status(403).json({
          message: 'Access denied: You are not authorized to manage spaces for this parking lot',
        });
      }
    }

    const allowedUpdates = {};
    for (const field of ['status', 'floor', 'type', 'imageUrl']) {
      if (req.body[field] !== undefined) allowedUpdates[field] = req.body[field];
    }
    if (req.file) {
      allowedUpdates.imageUrl = `/uploads/parking-spaces/${req.file.filename}`;
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
