const ParkingLot = require('../models/ParkingLot');

// @desc    List / search parking lots
// @route   GET /api/parking-lots
// @access  Public
// @query   lat, lng, radius (metres), available (boolean)
const getParkingLots = async (req, res, next) => {
  try {
    const { lat, lng, radius, available, search, city, vehicleType } = req.query;
    let query = { isActive: true };

    if (search && typeof search === 'string' && search.trim()) {
      const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const searchRegex = new RegExp(escaped, 'i');
      query.$or = [
        { name: searchRegex },
        { address: searchRegex },
        { city: searchRegex },
      ];
    }

    if (city && typeof city === 'string' && city.trim()) {
      const escapedCity = city.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const cityRegex = new RegExp(escapedCity, 'i');
      const cityCondition = {
        $or: [{ city: cityRegex }, { address: cityRegex }, { name: cityRegex }],
      };
      if (query.$or) {
        query.$and = [{ $or: query.$or }, cityCondition];
        delete query.$or;
      } else {
        query.$or = cityCondition.$or;
      }
    }

    if (vehicleType && typeof vehicleType === 'string' && vehicleType.trim()) {
      query.supportedVehicles = vehicleType.trim();
    }

    // Geospatial filter if coordinates provided
    if (lat && lng) {
      query.location = {
        $near: {
          $geometry: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
          $maxDistance: radius ? parseInt(radius) : 25000,
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

// @desc    Get autocomplete suggestions for driver search
// @route   GET /api/parking-lots/suggestions
// @access  Public
const getParkingLotSuggestions = async (req, res, next) => {
  try {
    const rawQuery = (req.query.q || req.query.query || '').trim();
    if (!rawQuery) {
      return res.json([]);
    }

    const escaped = rawQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, 'i');

    const lots = await ParkingLot.find({
      isActive: true,
      $or: [
        { name: regex },
        { address: regex },
        { city: regex },
        { entranceName: regex },
      ],
    })
      .select('_id name address city entranceName availableSpaces pricePerHour')
      .limit(8)
      .lean();

    const suggestions = lots.map((lot) => ({
      id: lot._id.toString(),
      name: lot.name,
      address: lot.address,
      city: lot.city || '',
      subtitle: lot.city ? `${lot.address}, ${lot.city}` : lot.address,
      availableSpaces: lot.availableSpaces,
      pricePerHour: lot.pricePerHour,
      type: 'lot',
    }));

    // Detect distinct matching cities
    const cityMatches = new Set();
    lots.forEach((l) => {
      if (l.city && regex.test(l.city)) {
        cityMatches.add(l.city.trim());
      }
    });

    cityMatches.forEach((cityName) => {
      if (!suggestions.some((s) => s.name.toLowerCase() === cityName.toLowerCase())) {
        suggestions.unshift({
          id: `city-${cityName.toLowerCase().replace(/\s+/g, '-')}`,
          name: cityName,
          address: `${cityName}, Sri Lanka`,
          city: cityName,
          subtitle: `City · Sri Lanka`,
          type: 'city',
        });
      }
    });

    res.json(suggestions.slice(0, 6));
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
    const lotData = { ...req.body };
    if (req.file) {
      lotData.imageUrl = `/uploads/parking-lots/${req.file.filename}`;
    }
    const lot = await ParkingLot.create(lotData);
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
    if (req.user && req.user.role === 'staff') {
      const staffLot = req.user.parkingLot || req.user.assignedLot;
      if (!staffLot || staffLot.toString() !== req.params.id.toString()) {
        return res.status(403).json({
          message: 'Access denied: You are not authorized to update this parking facility',
        });
      }
    }
    const updates = { ...req.body };
    if (req.file) {
      updates.imageUrl = `/uploads/parking-lots/${req.file.filename}`;
    }
    const lot = await ParkingLot.findByIdAndUpdate(req.params.id, updates, {
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

const routingService = require('../services/routingService');

// @desc    Find available parking within driving travel duration (e.g. 5 minutes / 300s)
// @route   GET /api/parking-lots/nearby-driving
// @access  Public
// @query   lat, lng, maxDuration (seconds, default 300), availableOnly (default true)
const getNearbyDrivingParking = async (req, res, next) => {
  try {
    const { lat, lng, maxDuration = 300, availableOnly = 'true' } = req.query;

    const parsedLat = parseFloat(lat);
    const parsedLng = parseFloat(lng);

    if (
      !Number.isFinite(parsedLat) ||
      !Number.isFinite(parsedLng) ||
      parsedLat < -90 ||
      parsedLat > 90 ||
      parsedLng < -180 ||
      parsedLng > 180
    ) {
      return res.status(400).json({
        message: 'Valid driver latitude (-90 to 90) and longitude (-180 to 180) are required.',
      });
    }

    const durationLimitSec = Math.min(Math.max(parseInt(maxDuration, 10) || 300, 30), 1800);
    // Reasonable geographic prefilter radius (approx 8km for 5m, 15km for 10m) to limit matrix size
    const prefilterRadiusMeters = durationLimitSec <= 300 ? 8000 : 15000;

    let query = { isActive: true };
    if (availableOnly === 'true') {
      query.availableSpaces = { $gt: 0 };
    }

    // Try geospatial prefilter first
    let candidates = [];
    try {
      candidates = await ParkingLot.find({
        ...query,
        location: {
          $near: {
            $geometry: { type: 'Point', coordinates: [parsedLng, parsedLat] },
            $maxDistance: prefilterRadiusMeters,
          },
        },
      }).limit(25);
    } catch {
      // Fallback if geospatial index not built or coordinates unindexed
      candidates = await ParkingLot.find(query).limit(50);
    }

    // Filter candidate lots for valid coordinate definitions and availability
    const validCandidates = candidates.filter((lot) => {
      const coords = lot.location && lot.location.coordinates;
      if (!Array.isArray(coords) || coords.length !== 2) return false;
      const [lLng, lLat] = coords;
      if (!Number.isFinite(lLng) || !Number.isFinite(lLat)) return false;
      if (lLng === 0 && lLat === 0) return false;
      if (availableOnly === 'true' && (lot.availableSpaces == null || lot.availableSpaces <= 0)) {
        return false;
      }
      return true;
    });

    if (validCandidates.length === 0) {
      return res.json({
        origin: { lat: parsedLat, lng: parsedLng },
        maxDurationSeconds: durationLimitSec,
        results: [],
        count: 0,
        provider: 'none',
        providerAttribution: '',
        isLiveTraffic: false,
        disclaimer: 'Current reported availability, not a guaranteed space or reservation.',
      });
    }

    // Build destinations array (using entrance coordinates if present, else center coordinates)
    const destinations = validCandidates.map((lot) => {
      if (
        lot.entranceLocation &&
        Array.isArray(lot.entranceLocation.coordinates) &&
        lot.entranceLocation.coordinates.length === 2 &&
        Number.isFinite(lot.entranceLocation.coordinates[0]) &&
        Number.isFinite(lot.entranceLocation.coordinates[1])
      ) {
        return lot.entranceLocation.coordinates;
      }
      return lot.location.coordinates;
    });

    // Request driving travel times from routing service (batched matrix)
    let matrixData;
    let isDistanceFallback = false;
    try {
      matrixData = await routingService.calculateDrivingTravelTimes({
        origin: [parsedLng, parsedLat],
        destinations,
      });
    } catch (routingErr) {
      console.warn('Driving routing service unavailable, using distance-based nearby fallback:', routingErr.message);
      isDistanceFallback = true;
      const fallbackResults = destinations.map((dest) => {
        const dist = routingService.calculateHaversineDistance([parsedLng, parsedLat], dest);
        return {
          durationSeconds: null,
          distanceMeters: dist,
        };
      });
      matrixData = {
        provider: 'distance',
        providerAttribution: 'Distance-based nearby search (live driving routing unavailable)',
        isLiveTraffic: false,
        results: fallbackResults,
      };
    }

    // Merge and filter by driving duration or distance
    const eligibleResults = [];

    for (let i = 0; i < validCandidates.length; i++) {
      const lot = validCandidates[i];
      const travel = matrixData.results[i];

      if (!travel) {
        continue;
      }

      const hasEntrance = Boolean(
        lot.entranceLocation &&
          Array.isArray(lot.entranceLocation.coordinates) &&
          lot.entranceLocation.coordinates.length === 2
      );

      const navCoords = hasEntrance
        ? {
            lng: lot.entranceLocation.coordinates[0],
            lat: lot.entranceLocation.coordinates[1],
          }
        : {
            lng: lot.location.coordinates[0],
            lat: lot.location.coordinates[1],
          };

      const distanceKm =
        travel.distanceMeters != null ? (travel.distanceMeters / 1000).toFixed(1) : null;

      if (isDistanceFallback) {
        // Distance fallback mode: never fabricate driving travel times
        eligibleResults.push({
          id: lot._id.toString(),
          name: lot.name,
          address: lot.address,
          coordinates: {
            lng: lot.location.coordinates[0],
            lat: lot.location.coordinates[1],
          },
          entranceCoordinates: hasEntrance
            ? {
                lng: lot.entranceLocation.coordinates[0],
                lat: lot.entranceLocation.coordinates[1],
              }
            : null,
          hasEntranceCoordinates: hasEntrance,
          navigationCoordinates: navCoords,
          navigationCoordinatesNote: hasEntrance
            ? 'Using designated parking entrance'
            : 'Using parking lot center (entrance coordinates not specified by operator)',
          availableSpaces: lot.availableSpaces,
          totalSpaces: lot.totalSpaces,
          pricePerHour: lot.pricePerHour,
          status: lot.availableSpaces > 5 ? 'Available' : 'Limited',
          amenities: lot.amenities || [],
          openTime: lot.openTime,
          closeTime: lot.closeTime,
          durationSeconds: null,
          durationMinutes: null,
          durationFormatted: distanceKm ? `${distanceKm} km away` : 'Near',
          distanceMeters: travel.distanceMeters,
          distanceFormatted: distanceKm ? `${distanceKm} km` : 'Near',
          isWithinFiveMinutes: false,
          isDistanceFallback: true,
          freshness: 'Live availability',
        });
      } else if (travel.durationSeconds != null && travel.durationSeconds <= durationLimitSec) {
        const durationMinutes = Math.max(1, Math.round(travel.durationSeconds / 60));

        eligibleResults.push({
          id: lot._id.toString(),
          name: lot.name,
          address: lot.address,
          coordinates: {
            lng: lot.location.coordinates[0],
            lat: lot.location.coordinates[1],
          },
          entranceCoordinates: hasEntrance
            ? {
                lng: lot.entranceLocation.coordinates[0],
                lat: lot.entranceLocation.coordinates[1],
              }
            : null,
          hasEntranceCoordinates: hasEntrance,
          navigationCoordinates: navCoords,
          navigationCoordinatesNote: hasEntrance
            ? 'Using designated parking entrance'
            : 'Using parking lot center (entrance coordinates not specified by operator)',
          availableSpaces: lot.availableSpaces,
          totalSpaces: lot.totalSpaces,
          pricePerHour: lot.pricePerHour,
          status: lot.availableSpaces > 5 ? 'Available' : 'Limited',
          amenities: lot.amenities || [],
          openTime: lot.openTime,
          closeTime: lot.closeTime,
          durationSeconds: travel.durationSeconds,
          durationMinutes,
          durationFormatted: `${durationMinutes} min`,
          distanceMeters: travel.distanceMeters,
          distanceFormatted: distanceKm ? `${distanceKm} km` : 'Near',
          isWithinFiveMinutes: travel.durationSeconds <= 300,
          isDistanceFallback: false,
          freshness: 'Live availability',
        });
      }
    }

    // Sort: primary by durationSeconds ascending (or distanceMeters in fallback), secondary by distanceMeters ascending
    eligibleResults.sort((a, b) => {
      if (!isDistanceFallback && a.durationSeconds !== b.durationSeconds) {
        return (a.durationSeconds || Infinity) - (b.durationSeconds || Infinity);
      }
      return (a.distanceMeters || 0) - (b.distanceMeters || 0);
    });

    res.json({
      origin: { lat: parsedLat, lng: parsedLng },
      maxDurationSeconds: durationLimitSec,
      results: eligibleResults,
      count: eligibleResults.length,
      provider: matrixData.provider,
      providerAttribution: matrixData.providerAttribution,
      isLiveTraffic: matrixData.isLiveTraffic,
      isDistanceFallback,
      disclaimer: 'Current reported availability, not a guaranteed space or reservation.',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Fast real-time availability check for a lot before launching navigation
// @route   GET /api/parking-lots/:id/availability
// @access  Public
const getParkingLotAvailability = async (req, res, next) => {
  try {
    const lot = await ParkingLot.findById(req.params.id);
    if (!lot || !lot.isActive) {
      return res.status(404).json({
        message: 'Parking lot not found or currently inactive',
        isAvailable: false,
      });
    }

    const hasEntrance = Boolean(
      lot.entranceLocation &&
        Array.isArray(lot.entranceLocation.coordinates) &&
        lot.entranceLocation.coordinates.length === 2
    );

    const isAvailable = typeof lot.availableSpaces === 'number' && lot.availableSpaces > 0;

    res.json({
      lotId: lot._id.toString(),
      name: lot.name,
      address: lot.address,
      availableSpaces: lot.availableSpaces,
      totalSpaces: lot.totalSpaces,
      pricePerHour: lot.pricePerHour,
      isAvailable,
      hasEntranceCoordinates: hasEntrance,
      navigationCoordinates: hasEntrance
        ? {
            lng: lot.entranceLocation.coordinates[0],
            lat: lot.entranceLocation.coordinates[1],
          }
        : {
            lng: lot.location.coordinates[0],
            lat: lot.location.coordinates[1],
          },
      navigationCoordinatesNote: hasEntrance
        ? 'Using designated parking entrance'
        : 'Using parking lot center (entrance coordinates not specified by operator)',
      lastChecked: new Date().toISOString(),
      disclaimer: 'Current reported availability, not a guaranteed space or reservation.',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getParkingLots,
  getParkingLotSuggestions,
  getParkingLotById,
  createParkingLot,
  updateParkingLot,
  deleteParkingLot,
  getNearbyDrivingParking,
  getParkingLotAvailability,
};

