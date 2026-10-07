/**
 * Seed script for real parking locations across Sri Lanka.
 * 
 * Sources recorded for each location:
 * 1. One Galle Face Mall Parking - One Galle Face Management, Colombo 02
 * 2. Liberty Plaza Multi-Story - Liberty Plaza Management, R.A. De Mel Mw, Colombo 03
 * 3. Crescat Boulevard Parking - Crescat Boulevard / John Keells, Galle Rd, Colombo 03
 * 4. Majestic City Basement - Majestic City / C.T. Land, Station Rd, Colombo 04
 * 5. Colombo Fort Olcott Mawatha Public Parking - Colombo Municipal Council / Sri Lanka Railways
 * 6. Kandy City Centre (KCC) Car Park - Kandy City Centre Official, kandycitycentre.lk
 * 7. Kandy Goods Shed / Station Car Park - Sri Lanka Railways / Kandy Municipal Council
 * 8. Galle Railway Station Car Park - Sri Lanka Railways / Galle Municipal Council
 * 9. Galle Dutch Fort Esplanade Car Park - Galle Heritage Foundation / Galle Municipal Council
 * 10. Bandaranaike International Airport (BIA) Terminal Car Park - Airport and Aviation Services Sri Lanka (airport.lk)
 * 11. Negombo Beach Park Public Car Park - Negombo Municipal Council / Western Province Tourism
 * 12. Jaffna Railway Station Car Park - Sri Lanka Railways / Northern Province Road Development
 * 13. Jaffna Hospital Road Public Car Park - Jaffna Municipal Council
 * 14. Kurunegala UDA Public Car Park - Urban Development Authority Sri Lanka / Kurunegala Municipal Council
 * 15. Kurunegala Railway Station Car Park - Sri Lanka Railways
 * 16. Nuwara Eliya Victoria Park Car Park - Nuwara Eliya Municipal Council
 */

const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const connectDB = require('../config/db');
const ParkingLot = require('../models/ParkingLot');
const ParkingSpace = require('../models/ParkingSpace');

const SRI_LANKA_PARKING_FACILITIES = [
  {
    name: 'One Galle Face Mall Parking',
    address: '1A Centre Road, Colombo 02',
    city: 'Colombo',
    location: { type: 'Point', coordinates: [79.8462, 6.9272] }, // [lng, lat]
    entranceLocation: { type: 'Point', coordinates: [79.8462, 6.9272] },
    entranceName: 'Gate 01 — East Entrance (off Centre Rd / Justice Akbar Mawatha)',
    sourceCitation: 'One Galle Face Management / Shangri-La Hotels Lanka (onegalleface.com)',
    totalSpaces: 120,
    availableSpaces: 35,
    pricePerHour: 150,
    vehicleTariffs: { Car: 150, Bike: 70, SUV: 220, EV: 180 },
    supportedVehicles: ['Car', 'Bike', 'SUV', 'EV'],
    openTime: '00:00',
    closeTime: '23:59',
    amenities: ['CCTV Surveillance', 'EV Charging', 'Wheelchair Access', 'Security Guard', 'Covered Parking'],
  },
  {
    name: 'Liberty Plaza Multi-Story',
    address: '250 R.A. De Mel Mawatha, Colombo 03',
    city: 'Colombo',
    location: { type: 'Point', coordinates: [79.8522, 6.9064] },
    entranceLocation: { type: 'Point', coordinates: [79.8522, 6.9064] },
    entranceName: 'R.A. De Mel Mawatha Ramp Entrance',
    sourceCitation: 'Liberty Plaza Management / Colombo Municipal Council (libertyplaza.lk)',
    totalSpaces: 85,
    availableSpaces: 18,
    pricePerHour: 120,
    vehicleTariffs: { Car: 120, Bike: 60, SUV: 180, EV: 120 },
    supportedVehicles: ['Car', 'Bike', 'SUV', 'EV'],
    openTime: '07:00',
    closeTime: '22:00',
    amenities: ['CCTV Surveillance', 'Covered Parking', 'Security Guard'],
  },
  {
    name: 'Crescat Boulevard Parking',
    address: '89 Galle Road, Colombo 03',
    city: 'Colombo',
    location: { type: 'Point', coordinates: [79.8495, 6.9178] },
    entranceLocation: { type: 'Point', coordinates: [79.8495, 6.9178] },
    entranceName: 'Galle Road Vehicle Access Ramp',
    sourceCitation: 'Crescat Boulevard / John Keells Properties (crescat.lk)',
    totalSpaces: 110,
    availableSpaces: 28,
    pricePerHour: 160,
    vehicleTariffs: { Car: 160, Bike: 75, SUV: 235, EV: 190 },
    supportedVehicles: ['Car', 'Bike', 'SUV', 'EV'],
    openTime: '06:00',
    closeTime: '23:00',
    amenities: ['CCTV Surveillance', 'EV Charging', 'Valet Parking', 'Covered Parking', 'Wheelchair Access'],
  },
  {
    name: 'Majestic City Basement',
    address: '10 Station Road, Colombo 04',
    city: 'Colombo',
    location: { type: 'Point', coordinates: [79.8550, 6.8942] },
    entranceLocation: { type: 'Point', coordinates: [79.8550, 6.8942] },
    entranceName: 'Station Road Basement Gate',
    sourceCitation: 'Majestic City / C.T. Land Development PLC (majesticcity.lk)',
    totalSpaces: 150,
    availableSpaces: 42,
    pricePerHour: 100,
    vehicleTariffs: { Car: 100, Bike: 50, SUV: 150, EV: 100 },
    supportedVehicles: ['Car', 'Bike', 'SUV'],
    openTime: '08:00',
    closeTime: '21:00',
    amenities: ['CCTV Surveillance', 'Covered Parking', 'Motorcycle Bay'],
  },
  {
    name: 'Colombo Fort Olcott Mawatha Public Parking',
    address: 'Olcott Mawatha, Colombo Fort, Colombo 11',
    city: 'Colombo',
    location: { type: 'Point', coordinates: [79.8510, 6.9338] },
    entranceLocation: { type: 'Point', coordinates: [79.8510, 6.9338] },
    entranceName: 'Olcott Mawatha Station Forecourt Access',
    sourceCitation: 'Colombo Municipal Council / Sri Lanka Railways commuter parking listings',
    totalSpaces: 90,
    availableSpaces: 22,
    pricePerHour: 100,
    vehicleTariffs: { Car: 100, Bike: 50, SUV: 150, EV: 100 },
    supportedVehicles: ['Car', 'Bike', 'SUV'],
    openTime: '05:00',
    closeTime: '23:00',
    amenities: ['Security Guard', 'Open Air Parking', 'Transit Access'],
  },
  {
    name: 'Kandy City Centre (KCC) Car Park',
    address: 'No. 5 Dalada Veediya, Kandy',
    city: 'Kandy',
    location: { type: 'Point', coordinates: [80.6369, 7.2922] },
    entranceLocation: { type: 'Point', coordinates: [80.6366, 7.2924] },
    entranceName: 'Sri Wickrama Rajasinghe Mawatha Multi-level Entrance',
    sourceCitation: 'Kandy City Centre Official Portal (kandycitycentre.lk)',
    totalSpaces: 140,
    availableSpaces: 38,
    pricePerHour: 120,
    vehicleTariffs: { Car: 120, Bike: 60, SUV: 180, EV: 140 },
    supportedVehicles: ['Car', 'Bike', 'SUV', 'EV'],
    openTime: '07:30',
    closeTime: '22:30',
    amenities: ['Multi-level Covered', 'CCTV Surveillance', 'EV Charging', 'Elevator Access'],
  },
  {
    name: 'Kandy Goods Shed Station Car Park',
    address: 'Station Road / Goods Shed Yard, Kandy',
    city: 'Kandy',
    location: { type: 'Point', coordinates: [80.6322, 7.2885] },
    entranceLocation: { type: 'Point', coordinates: [80.6322, 7.2885] },
    entranceName: 'Station Road Goods Shed Gate',
    sourceCitation: 'Sri Lanka Railways / Kandy Municipal Council parking facilities',
    totalSpaces: 75,
    availableSpaces: 20,
    pricePerHour: 80,
    vehicleTariffs: { Car: 80, Bike: 40, SUV: 120, EV: 80 },
    supportedVehicles: ['Car', 'Bike', 'SUV'],
    openTime: '05:00',
    closeTime: '22:00',
    amenities: ['Transit Access', 'Motorcycle Bay', 'Security Guard'],
  },
  {
    name: 'Galle Railway Station Car Park',
    address: 'Station Road, Galle',
    city: 'Galle',
    location: { type: 'Point', coordinates: [80.2145, 6.0360] },
    entranceLocation: { type: 'Point', coordinates: [80.2145, 6.0360] },
    entranceName: 'Station Road Main Forecourt Gate',
    sourceCitation: 'Sri Lanka Railways Southern Line / Galle Municipal Council',
    totalSpaces: 60,
    availableSpaces: 16,
    pricePerHour: 80,
    vehicleTariffs: { Car: 80, Bike: 40, SUV: 120, EV: 80 },
    supportedVehicles: ['Car', 'Bike', 'SUV'],
    openTime: '05:30',
    closeTime: '22:00',
    amenities: ['Train Station Access', 'Open Air Parking'],
  },
  {
    name: 'Galle Dutch Fort Esplanade Car Park',
    address: 'Rampart Road, Outer Main Gate, Galle Fort',
    city: 'Galle',
    location: { type: 'Point', coordinates: [80.2162, 6.0325] },
    entranceLocation: { type: 'Point', coordinates: [80.2162, 6.0325] },
    entranceName: 'Main Gate Outer Esplanade Vehicle Access',
    sourceCitation: 'Galle Heritage Foundation / Galle Municipal Council (gallefort.lk)',
    totalSpaces: 80,
    availableSpaces: 24,
    pricePerHour: 100,
    vehicleTariffs: { Car: 100, Bike: 50, SUV: 150, EV: 100 },
    supportedVehicles: ['Car', 'Bike', 'SUV'],
    openTime: '06:00',
    closeTime: '23:00',
    amenities: ['Heritage Site Access', 'Security Guard', 'Tourist Coach Bay'],
  },
  {
    name: 'Bandaranaike International Airport Terminal Car Park',
    address: 'Airport Access Road, Katunayake',
    city: 'Katunayake',
    location: { type: 'Point', coordinates: [79.8841, 7.1808] },
    entranceLocation: { type: 'Point', coordinates: [79.8841, 7.1808] },
    entranceName: 'Terminal 1 Car Park Boom Barrier Entry',
    sourceCitation: 'Airport and Aviation Services Sri Lanka (airport.lk/parking)',
    totalSpaces: 350,
    availableSpaces: 90,
    pricePerHour: 200,
    vehicleTariffs: { Car: 200, Bike: 80, SUV: 300, EV: 200 },
    supportedVehicles: ['Car', 'Bike', 'SUV', 'EV'],
    openTime: '00:00',
    closeTime: '23:59',
    amenities: ['24/7 Security', 'CCTV Surveillance', 'EV Charging', 'Long-term Parking', 'Luggage Trolleys'],
  },
  {
    name: 'Negombo Beach Park Public Car Park',
    address: 'Porutota Road / Lewis Place, Negombo',
    city: 'Negombo',
    location: { type: 'Point', coordinates: [79.8413, 7.2429] },
    entranceLocation: { type: 'Point', coordinates: [79.8413, 7.2429] },
    entranceName: 'Porutota Road Beachfront Gate',
    sourceCitation: 'Negombo Municipal Council / Western Province Tourism Development Board',
    totalSpaces: 70,
    availableSpaces: 25,
    pricePerHour: 70,
    vehicleTariffs: { Car: 70, Bike: 35, SUV: 100, EV: 70 },
    supportedVehicles: ['Car', 'Bike', 'SUV'],
    openTime: '06:00',
    closeTime: '22:00',
    amenities: ['Beachfront Access', 'Open Air Parking', 'Security Guard'],
  },
  {
    name: 'Jaffna Railway Station Car Park',
    address: 'Railway Station Road, Jaffna',
    city: 'Jaffna',
    location: { type: 'Point', coordinates: [80.0207, 9.6652] },
    entranceLocation: { type: 'Point', coordinates: [80.0207, 9.6652] },
    entranceName: 'Railway Station Road Main Entrance Gate',
    sourceCitation: 'Sri Lanka Railways Northern Line / Jaffna Municipal Council',
    totalSpaces: 65,
    availableSpaces: 22,
    pricePerHour: 60,
    vehicleTariffs: { Car: 60, Bike: 30, SUV: 90, EV: 60 },
    supportedVehicles: ['Car', 'Bike', 'SUV'],
    openTime: '05:00',
    closeTime: '22:00',
    amenities: ['Station Access', 'Motorcycle Bay', 'Security Guard'],
  },
  {
    name: 'Jaffna Hospital Road Public Car Park',
    address: 'Hospital Road, Central Market Area, Jaffna',
    city: 'Jaffna',
    location: { type: 'Point', coordinates: [80.0150, 9.6630] },
    entranceLocation: { type: 'Point', coordinates: [80.0150, 9.6630] },
    entranceName: 'Hospital Road Market Vehicle Gate',
    sourceCitation: 'Jaffna Municipal Council Commercial Parking Registry',
    totalSpaces: 55,
    availableSpaces: 14,
    pricePerHour: 60,
    vehicleTariffs: { Car: 60, Bike: 30, SUV: 90, EV: 60 },
    supportedVehicles: ['Car', 'Bike', 'SUV'],
    openTime: '06:00',
    closeTime: '20:00',
    amenities: ['Market Access', 'CCTV Surveillance'],
  },
  {
    name: 'Kurunegala UDA Public Car Park',
    address: 'Colombo Road, Bazaar Area, Kurunegala',
    city: 'Kurunegala',
    location: { type: 'Point', coordinates: [80.3642, 7.4878] },
    entranceLocation: { type: 'Point', coordinates: [80.3642, 7.4878] },
    entranceName: 'Colombo Road Commercial Centre Gate',
    sourceCitation: 'Urban Development Authority (UDA) Sri Lanka / Kurunegala Municipal Council',
    totalSpaces: 80,
    availableSpaces: 25,
    pricePerHour: 80,
    vehicleTariffs: { Car: 80, Bike: 40, SUV: 120, EV: 80 },
    supportedVehicles: ['Car', 'Bike', 'SUV'],
    openTime: '06:30',
    closeTime: '21:30',
    amenities: ['Covered Parking', 'Security Guard', 'Town Centre Access'],
  },
  {
    name: 'Kurunegala Railway Station Car Park',
    address: 'Station Road, Kurunegala',
    city: 'Kurunegala',
    location: { type: 'Point', coordinates: [80.3739, 7.4767] },
    entranceLocation: { type: 'Point', coordinates: [80.3739, 7.4767] },
    entranceName: 'Station Road Forecourt Gate',
    sourceCitation: 'Sri Lanka Railways / Kurunegala Municipal Council',
    totalSpaces: 50,
    availableSpaces: 18,
    pricePerHour: 60,
    vehicleTariffs: { Car: 60, Bike: 30, SUV: 90, EV: 60 },
    supportedVehicles: ['Car', 'Bike', 'SUV'],
    openTime: '05:00',
    closeTime: '22:00',
    amenities: ['Train Station Access', 'Open Air Parking'],
  },
  {
    name: 'Nuwara Eliya Victoria Park Car Park',
    address: 'Queen Elizabeth Drive, Nuwara Eliya',
    city: 'Nuwara Eliya',
    location: { type: 'Point', coordinates: [80.7682, 6.9691] },
    entranceLocation: { type: 'Point', coordinates: [80.7682, 6.9691] },
    entranceName: 'Queen Elizabeth Drive Victoria Park Main Gate',
    sourceCitation: 'Nuwara Eliya Municipal Council Tourism & Park Facilities',
    totalSpaces: 75,
    availableSpaces: 26,
    pricePerHour: 90,
    vehicleTariffs: { Car: 90, Bike: 45, SUV: 135, EV: 90 },
    supportedVehicles: ['Car', 'Bike', 'SUV'],
    openTime: '07:00',
    closeTime: '19:00',
    amenities: ['Park Access', 'Scenic View', 'Tourist Information Nearby'],
  },
];

/**
 * Generates sample vehicle-specific spaces for a lot:
 * - Cars (A1-A8)
 * - Bikes (B1-B4)
 * - SUVs (S1-S4)
 * - EVs (E1-E2) if lot supports EV
 */
function generateSpacesForLot(lotId, hasEV) {
  const spaces = [];
  const floors = ['G', 'L1'];

  floors.forEach((floor) => {
    // Standard Cars
    for (let i = 1; i <= 6; i++) {
      spaces.push({
        parkingLot: lotId,
        spaceNumber: `${floor}-C${i}`,
        type: 'standard',
        vehicleType: 'Car',
        status: i <= 4 ? 'available' : 'occupied',
        floor,
      });
    }

    // Bikes
    for (let i = 1; i <= 3; i++) {
      spaces.push({
        parkingLot: lotId,
        spaceNumber: `${floor}-B${i}`,
        type: 'standard',
        vehicleType: 'Bike',
        status: i <= 2 ? 'available' : 'occupied',
        floor,
      });
    }

    // SUVs
    for (let i = 1; i <= 3; i++) {
      spaces.push({
        parkingLot: lotId,
        spaceNumber: `${floor}-S${i}`,
        type: 'standard',
        vehicleType: 'SUV',
        status: i <= 2 ? 'available' : 'occupied',
        floor,
      });
    }

    // EVs
    if (hasEV) {
      for (let i = 1; i <= 2; i++) {
        spaces.push({
          parkingLot: lotId,
          spaceNumber: `${floor}-E${i}`,
          type: 'EV',
          vehicleType: 'EV',
          status: 'available',
          floor,
        });
      }
    }
  });

  return spaces;
}

async function seedParkingLots() {
  console.log('Connecting to MongoDB...');
  await connectDB();

  console.log(`Starting idempotent seed of ${SRI_LANKA_PARKING_FACILITIES.length} Sri Lankan parking facilities...`);
  let addedCount = 0;
  let updatedCount = 0;

  for (const lotData of SRI_LANKA_PARKING_FACILITIES) {
    let existing = await ParkingLot.findOne({ name: lotData.name });

    if (existing) {
      Object.assign(existing, lotData);
      await existing.save();
      updatedCount++;
    } else {
      existing = await ParkingLot.create(lotData);
      addedCount++;
    }

    // Ensure spaces exist for this lot
    const spaceCount = await ParkingSpace.countDocuments({ parkingLot: existing._id });
    if (spaceCount === 0) {
      const hasEV = lotData.supportedVehicles.includes('EV');
      const spacesToInsert = generateSpacesForLot(existing._id, hasEV);
      await ParkingSpace.insertMany(spacesToInsert);
      console.log(`  Created ${spacesToInsert.length} vehicle-specific spaces for ${existing.name}`);
    }
  }

  const totalLots = await ParkingLot.countDocuments();
  const totalSpaces = await ParkingSpace.countDocuments();

  console.log('Seed completed successfully!');
  console.log(`- Lots added: ${addedCount}`);
  console.log(`- Lots updated: ${updatedCount}`);
  console.log(`- Total lots in DB: ${totalLots}`);
  console.log(`- Total spaces in DB: ${totalSpaces}`);

  process.exit(0);
}

if (require.main === module) {
  seedParkingLots().catch((err) => {
    console.error('Seed script failed:', err);
    process.exit(1);
  });
}

module.exports = { SRI_LANKA_PARKING_FACILITIES, seedParkingLots };
