/**
 * ParkMe - Secure Administrator Staff Provisioning CLI
 *
 * Usage:
 *   node scripts/provisionStaff.js --name "Jane Doe" --email "jane@parkme.lk" --password "Password123" --staffId "STF-2001" --lot "One Galle Face Mall"
 *
 * Environment variables:
 *   MONGO_URI (required)
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Staff = require('../models/Staff');
const ParkingLot = require('../models/ParkingLot');

async function provisionStaff() {
  const args = process.argv.slice(2);
  const getArg = (flag) => {
    const idx = args.indexOf(flag);
    return idx !== -1 && args[idx + 1] ? args[idx + 1] : null;
  };

  const name = getArg('--name') || 'Authorized Staff';
  const email = getArg('--email');
  const password = getArg('--password') || 'ParkMeStaff@2026';
  const staffIdInput = getArg('--staffId');
  const lotQuery = getArg('--lot');

  if (!email) {
    console.error('Error: --email is required.');
    console.log('Example: node scripts/provisionStaff.js --email "attendant1@parkme.lk" --name "Kasun Perera" --staffId "STF-3001"');
    process.exit(1);
  }

  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('Error: MONGO_URI environment variable is missing.');
    process.exit(1);
  }

  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB database.');

  try {
    const existing = await Staff.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      console.error(`Staff account already exists with email: ${email}`);
      process.exit(1);
    }

    let assignedLotId = null;
    if (lotQuery) {
      const lot = await ParkingLot.findOne({
        name: new RegExp(lotQuery.trim(), 'i'),
      });
      if (lot) {
        assignedLotId = lot._id;
        console.log(`Assigned to parking lot: "${lot.name}" (${lot._id})`);
      } else {
        console.warn(`Warning: Parking lot matching "${lotQuery}" was not found.`);
      }
    }

    let staffId = staffIdInput ? staffIdInput.trim().toUpperCase() : null;
    if (!staffId) {
      const randomNum = Math.floor(1000 + Math.random() * 9000);
      staffId = `STF-${randomNum}`;
    }

    const staff = await Staff.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      staffId,
      role: 'Parking Staff',
      parkingLot: assignedLotId,
      isActive: true,
    });

    console.log('\n Staff Account Successfully Provisioned:');
    console.log(`- Staff ID:   ${staff.staffId}`);
    console.log(`- Name:       ${staff.name}`);
    console.log(`- Email:      ${staff.email}`);
    console.log(`- Role:       ${staff.role}`);
    console.log(`- Lot ID:     ${staff.parkingLot || 'All assigned'}`);
    console.log('\nThis account can now log in securely via the Staff Login Portal.');
  } finally {
    await mongoose.disconnect();
  }
}

provisionStaff().catch((err) => {
  console.error('Provisioning failed:', err);
  process.exit(1);
});
