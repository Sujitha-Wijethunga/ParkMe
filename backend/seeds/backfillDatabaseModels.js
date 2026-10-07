/**
 * Idempotent migration and backfill script for ParkMe MongoDB models.
 * 
 * Safely backfills missing schema fields on existing records without:
 * - Dropping or resetting any collections or databases.
 * - Overwriting real, existing user or booking data.
 * - Inventing unconfirmed check-ins, payments, or fictitious locations.
 * 
 * Safe for repeated runs.
 */

const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const connectDB = require('../config/db');
const User = require('../models/User');
const ParkingLot = require('../models/ParkingLot');
const ParkingSpace = require('../models/ParkingSpace');
const Reservation = require('../models/Reservation');
const Payment = require('../models/Payment');
const Attendance = require('../models/Attendance');
const LeaveRequest = require('../models/LeaveRequest');
const Notification = require('../models/Notification');

async function backfillDatabaseModels() {
  const conn = await connectDB();
  if (!conn) {
    console.error('Cannot run migration: MONGO_URI is not configured.');
    return { success: false, reason: 'NO_MONGO_URI' };
  }

  console.log('--- Starting Idempotent Database Backfill ---');
  const stats = {
    usersUpdated: 0,
    lotsUpdated: 0,
    reservationsUpdated: 0,
    paymentsUpdated: 0,
  };

  // 1. Backfill User vehicles array if missing
  const userResult = await User.updateMany(
    { vehicles: { $exists: false } },
    { $set: { vehicles: [] } }
  );
  stats.usersUpdated = userResult.modifiedCount || 0;
  console.log(`Users checked: ${stats.usersUpdated} updated with default vehicles array.`);

  // 2. Backfill ParkingLot overtime rules and contact info if missing
  const lotResult = await ParkingLot.updateMany(
    {
      $or: [
        { overtimeGracePeriodMinutes: { $exists: false } },
        { overtimeRateMultiplier: { $exists: false } },
        { operatingDays: { $exists: false } },
        { contactPhone: { $exists: false } },
      ],
    },
    {
      $set: {
        overtimeGracePeriodMinutes: 15,
        overtimeRateMultiplier: 1.5,
        contactPhone: '',
        operatingDays: [
          'Monday',
          'Tuesday',
          'Wednesday',
          'Thursday',
          'Friday',
          'Saturday',
          'Sunday',
        ],
      },
    }
  );
  stats.lotsUpdated = lotResult.modifiedCount || 0;
  console.log(`Parking lots checked: ${stats.lotsUpdated} updated with overtime rules and contact defaults.`);

  // 3. Backfill Payments with paymentType: 'booking' if missing
  const paymentResult = await Payment.updateMany(
    { paymentType: { $exists: false } },
    { $set: { paymentType: 'booking' } }
  );
  stats.paymentsUpdated = paymentResult.modifiedCount || 0;
  console.log(`Payments checked: ${stats.paymentsUpdated} updated with paymentType: 'booking'.`);

  // 4. Backfill Reservations
  const reservationsToBackfill = await Reservation.find({
    $or: [
      { hourlyRate: { $exists: false } },
      { paymentStatus: { $exists: false } },
      { overtimeMinutes: { $exists: false } },
      { overtimeAmount: { $exists: false } },
      { extensionHistory: { $exists: false } },
      { vehiclePlate: { $exists: false } },
      { vehicleModel: { $exists: false } },
    ],
  });

  for (const resDoc of reservationsToBackfill) {
    const updates = {};

    if (resDoc.overtimeMinutes === undefined) updates.overtimeMinutes = 0;
    if (resDoc.overtimeAmount === undefined) updates.overtimeAmount = 0;
    if (!resDoc.extensionHistory) updates.extensionHistory = [];
    if (resDoc.vehiclePlate === undefined) updates.vehiclePlate = '';
    if (resDoc.vehicleModel === undefined) updates.vehicleModel = '';

    // Snapshot hourlyRate if missing
    if (resDoc.hourlyRate === undefined) {
      const durationHours = (new Date(resDoc.endTime) - new Date(resDoc.startTime)) / 3600000;
      if (durationHours > 0 && resDoc.totalAmount > 0) {
        updates.hourlyRate = parseFloat((resDoc.totalAmount / durationHours).toFixed(2));
      } else {
        const lot = await ParkingLot.findById(resDoc.parkingLot).select('pricePerHour vehicleTariffs');
        updates.hourlyRate = (lot?.vehicleTariffs && lot.vehicleTariffs[resDoc.vehicleType]) || lot?.pricePerHour || 0;
      }
    }

    // Set paymentStatus if missing based on real payment records
    if (!resDoc.paymentStatus) {
      const paidPayment = await Payment.findOne({
        reservation: resDoc._id,
        status: 'paid',
      });
      updates.paymentStatus = paidPayment ? 'paid' : 'unpaid';
    }

    if (Object.keys(updates).length > 0) {
      await Reservation.updateOne({ _id: resDoc._id }, { $set: updates });
      stats.reservationsUpdated++;
    }
  }
  console.log(`Reservations checked: ${stats.reservationsUpdated} updated with missing snapshots and status fields.`);

  // 5. Synchronize indexes across all models
  console.log('Ensuring all model indexes are synchronized...');
  await Promise.all([
    User.syncIndexes(),
    ParkingLot.syncIndexes(),
    ParkingSpace.syncIndexes(),
    Reservation.syncIndexes(),
    Payment.syncIndexes(),
    Attendance.syncIndexes(),
    LeaveRequest.syncIndexes(),
    Notification.syncIndexes(),
  ]);
  console.log('All MongoDB model indexes synchronized successfully.');
  console.log('--- Database Backfill Complete ---');

  return { success: true, stats };
}

if (require.main === module) {
  backfillDatabaseModels()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
}

module.exports = backfillDatabaseModels;
