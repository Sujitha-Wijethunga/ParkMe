/**
 * TEMPORARY SAMPLE DATA FOR DRIVER FLOW (UI Milestones)
 *
 * Note: These values are isolated sample data used to build and validate
 * the UI layout matching Milestone design specifications.
 * This mock data will be substituted with live backend API responses
 * (/api/parking-lots) in subsequent milestones.
 */

export interface ParkingLotCardItem {
  id: string;
  name: string;
  address: string;
  distance: string;
  status: 'Available' | 'Full' | 'Limited';
  availableSpaces: number;
  totalSpaces: number;
  isCovered: boolean;
  hasEVCharging: boolean;
  pricePerHour: number;
  imageUrl: string;
  mapPosition?: {
    topPercent: number; // percentage from top on illustrative map
    leftPercent: number; // percentage from left on illustrative map
  };
  // --- Fields added for Lot Details & Navigation ---
  amenities?: string[];    // e.g. ['CCTV Surveillance', 'EV Charging']
  openingHours?: string;   // e.g. 'Open 24 hours' or '06:00 – 22:00'
  parkingType?: string;    // e.g. 'Multi-story', 'Basement', 'Open-air'
  maxHeight?: string;      // Vehicle height clearance e.g. '2.1 m'
  operatorPhone?: string;  // Contact number for the parking operator
  entranceCoordinates?: {
    lat: number;
    lng: number;
  };
  entranceName?: string;
}

export interface MapPreviewMarker {
  id: string;
  price: string;
  topPercent: number; // percentage from top (0-100)
  leftPercent: number; // percentage from left (0-100)
}

export const DRIVER_FILTER_CHIPS = [
  'Nearest',
  'Cheapest',
  'Available Now',
  'Covered Parking',
] as const;

export type DriverFilterChip = typeof DRIVER_FILTER_CHIPS[number];

export const STATIC_MAP_MARKERS: MapPreviewMarker[] = [
  { id: 'm1', price: 'Rs.200', topPercent: 20, leftPercent: 12 },
  { id: 'm2', price: 'Rs.150', topPercent: 32, leftPercent: 48 },
  { id: 'm3', price: 'Rs.180', topPercent: 62, leftPercent: 66 },
];

export const SAMPLE_NEARBY_PARKING_LOTS: ParkingLotCardItem[] = [
  {
    id: 'lot-1',
    name: 'One Galle Face Mall Parking',
    address: '1A Centre Road, Colombo 02',
    distance: '0.4 km',
    status: 'Available',
    availableSpaces: 18,
    totalSpaces: 120,
    isCovered: true,
    hasEVCharging: true,
    pricePerHour: 150,
    imageUrl: 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=600&q=80',
    mapPosition: { topPercent: 30, leftPercent: 50 },
    amenities: ['CCTV Surveillance', 'EV Charging', 'Wheelchair Access', 'Security Guard', 'Covered Parking'],
    openingHours: 'Open 24 hours',
    parkingType: 'Multi-story',
    maxHeight: '2.2 m',
    operatorPhone: '+94 11 234 5678',
    entranceCoordinates: { lat: 6.9272, lng: 79.8462 },
    entranceName: 'Gate 01 — East Entrance (off Centre Rd / Justice Akbar Mawatha)',
  },
  {
    id: 'lot-2',
    name: 'Liberty Plaza Multi-Story',
    address: 'R.A. De Mel Mawatha, Colombo 03',
    distance: '0.9 km',
    status: 'Available',
    availableSpaces: 7,
    totalSpaces: 85,
    isCovered: true,
    hasEVCharging: false,
    pricePerHour: 120,
    imageUrl: 'https://images.unsplash.com/photo-1590674899484-d5640e854abe?auto=format&fit=crop&w=600&q=80',
    mapPosition: { topPercent: 20, leftPercent: 18 },
    amenities: ['CCTV Surveillance', 'Covered Parking', 'Security Guard'],
    openingHours: '07:00 – 22:00',
    parkingType: 'Multi-story',
    maxHeight: '2.0 m',
    operatorPhone: '+94 11 345 6789',
    entranceCoordinates: { lat: 6.9064, lng: 79.8522 },
    entranceName: 'R.A. De Mel Mawatha Ramp Entrance',
  },
  {
    id: 'lot-3',
    name: 'Crescat Boulevard Parking',
    address: '89 Galle Road, Colombo 03',
    distance: '1.2 km',
    status: 'Available',
    availableSpaces: 24,
    totalSpaces: 110,
    isCovered: true,
    hasEVCharging: true,
    pricePerHour: 160,
    imageUrl: 'https://images.unsplash.com/photo-1621929747188-0b4dc28498d2?auto=format&fit=crop&w=600&q=80',
    mapPosition: { topPercent: 55, leftPercent: 65 },
    amenities: ['CCTV Surveillance', 'EV Charging', 'Valet Parking', 'Covered Parking', 'Wheelchair Access'],
    openingHours: '06:00 – 23:00',
    parkingType: 'Basement',
    maxHeight: '2.1 m',
    operatorPhone: '+94 11 456 7890',
    entranceCoordinates: { lat: 6.9178, lng: 79.8495 },
    entranceName: 'Galle Road Vehicle Access Ramp',
  },
  {
    id: 'lot-4',
    name: 'Majestic City Basement',
    address: '10 Station Road, Colombo 04',
    distance: '2.1 km',
    status: 'Available',
    availableSpaces: 35,
    totalSpaces: 150,
    isCovered: true,
    hasEVCharging: false,
    pricePerHour: 100,
    imageUrl: 'https://images.unsplash.com/photo-1573348722427-f1d6819fdf98?auto=format&fit=crop&w=600&q=80',
    mapPosition: { topPercent: 44, leftPercent: 78 },
    amenities: ['CCTV Surveillance', 'Covered Parking', 'Motorcycle Bay'],
    openingHours: '08:00 – 21:00',
    parkingType: 'Basement',
    maxHeight: '1.9 m',
    operatorPhone: '+94 11 567 8901',
    entranceCoordinates: { lat: 6.8942, lng: 79.8550 },
    entranceName: 'Station Road Basement Gate',
  },
];
