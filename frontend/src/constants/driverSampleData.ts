/**
 * TEMPORARY SAMPLE DATA FOR DRIVER FLOW (UI Milestone)
 * 
 * Note: These values are isolated sample data used to build and validate
 * the UI layout matching Milestone 02 design specifications (ParkMe-04-Home).
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
    // High-angle outdoor/mall parking lot image
    imageUrl: 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=600&q=80',
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
    // Indoor multi-story garage image
    imageUrl: 'https://images.unsplash.com/photo-1590674899484-d5640e854abe?auto=format&fit=crop&w=600&q=80',
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
    // Underground modern parking image
    imageUrl: 'https://images.unsplash.com/photo-1621929747188-0b4dc28498d2?auto=format&fit=crop&w=600&q=80',
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
  },
];
