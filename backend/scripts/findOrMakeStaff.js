const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const connectDB = require('../config/db');
const User = require('../models/User');
const ParkingLot = require('../models/ParkingLot');
const bcrypt = require('bcryptjs');

async function main() {
  await connectDB();
  let staff = await User.findOne({ role: 'staff' });
  const lot = await ParkingLot.findOne({ isActive: true });

  if (!staff) {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash('Password123!', salt);
    staff = await User.create({
      name: 'Kavishka Perera',
      email: 'staff@parkme.com',
      password: hash,
      role: 'staff',
      staffId: 'STF-4091',
      parkingLot: lot ? lot._id : null,
    });
    console.log('Created test staff:', staff.email);
  } else {
    staff.password = 'Password123!';
    if (lot && !staff.parkingLot) staff.parkingLot = lot._id;
    await staff.save();
    console.log('Updated test staff:', staff.email, staff.staffId);
  }
  process.exit(0);
}

main().catch(console.error);
