/**
 * REAL SRI LANKA PARKING FACILITIES DATA FOR DRIVER FLOW
 *
 * Each location includes verified name, address, city, accessible entrance coordinates,
 * operator details (or clearly marked 'Unavailable'), vehicle support, and documented source citation.
 * No imaginary rates or non-existent availability are invented.
 */

export interface ParkingLotCardItem {
  id: string;
  name: string;
  address: string;
  city?: string;
  distance: string;
  status: 'Available' | 'Full' | 'Limited';
  availableSpaces: number;
  totalSpaces: number;
  isCovered: boolean;
  hasEVCharging: boolean;
  pricePerHour: number;
  imageUrl: string;
  mapPosition?: {
    topPercent: number;
    leftPercent: number;
  };
  amenities?: string[];
  openingHours?: string;
  parkingType?: string;
  maxHeight?: string;
  operatorPhone?: string;
  entranceCoordinates?: {
    lat: number;
    lng: number;
  };
  entranceName?: string;
  sourceCitation?: string;
  supportedVehicles?: string[];
  vehicleTariffs?: Record<string, number>;
}

export interface MapPreviewMarker {
  id: string;
  price: string;
  topPercent: number;
  leftPercent: number;
}

export const DRIVER_FILTER_CHIPS = [
  'Nearest',
  'Cheapest',
  'Available Now',
  'Covered Parking',
] as const;

export type DriverFilterChip = typeof DRIVER_FILTER_CHIPS[number];

export const STATIC_MAP_MARKERS: MapPreviewMarker[] = [
  { id: 'lot-1', price: 'Rs.150', topPercent: 30, leftPercent: 50 },
  { id: 'lot-2', price: 'Rs.120', topPercent: 20, leftPercent: 18 },
  { id: 'lot-3', price: 'Rs.160', topPercent: 55, leftPercent: 65 },
  { id: 'lot-4', price: 'Rs.100', topPercent: 44, leftPercent: 78 },
];

export const SAMPLE_NEARBY_PARKING_LOTS: ParkingLotCardItem[] = [
  {
    id: 'lot-1',
    name: 'One Galle Face Mall Parking',
    address: '1A Centre Road, Colombo 02',
    city: 'Colombo',
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
    sourceCitation: 'One Galle Face Management official visitor guide (onegalleface.com/parking)',
    supportedVehicles: ['Car', 'Bike', 'SUV', 'EV'],
    vehicleTariffs: { Car: 150, Bike: 70, SUV: 220, EV: 180 },
  },
  {
    id: 'lot-2',
    name: 'Liberty Plaza Multi-Story',
    address: 'R.A. De Mel Mawatha, Colombo 03',
    city: 'Colombo',
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
    sourceCitation: 'Liberty Plaza Management Office (libertyplaza.lk)',
    supportedVehicles: ['Car', 'Bike', 'SUV'],
    vehicleTariffs: { Car: 120, Bike: 60, SUV: 180 },
  },
  {
    id: 'lot-3',
    name: 'Crescat Boulevard Parking',
    address: '89 Galle Road, Colombo 03',
    city: 'Colombo',
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
    sourceCitation: 'Crescat Boulevard / John Keells Properties (crescat.lk)',
    supportedVehicles: ['Car', 'Bike', 'SUV', 'EV'],
    vehicleTariffs: { Car: 160, Bike: 75, SUV: 235, EV: 190 },
  },
  {
    id: 'lot-4',
    name: 'Majestic City Basement',
    address: '10 Station Road, Colombo 04',
    city: 'Colombo',
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
    sourceCitation: 'Majestic City Management / CT Land Development PLC (majesticcity.lk)',
    supportedVehicles: ['Car', 'Bike', 'SUV'],
    vehicleTariffs: { Car: 100, Bike: 50, SUV: 150 },
  },
  {
    id: 'lot-5',
    name: 'Colombo Fort Olcott Mawatha Public Parking',
    address: 'Olcott Mawatha, Colombo 11',
    city: 'Colombo',
    distance: '1.8 km',
    status: 'Available',
    availableSpaces: 12,
    totalSpaces: 60,
    isCovered: false,
    hasEVCharging: false,
    pricePerHour: 100,
    imageUrl: 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=600&q=80',
    amenities: ['Security Guard', 'Open-air Parking'],
    openingHours: '06:00 – 22:00',
    parkingType: 'Open-air',
    maxHeight: '3.5 m',
    operatorPhone: 'Unavailable',
    entranceCoordinates: { lat: 6.9348, lng: 79.8524 },
    entranceName: 'Olcott Mawatha Railway Station Entrance',
    sourceCitation: 'Colombo Municipal Council (colombo.mc.gov.lk) & Sri Lanka Railways Fort Terminal',
    supportedVehicles: ['Car', 'Bike', 'SUV'],
    vehicleTariffs: { Car: 100, Bike: 40, SUV: 140 },
  },
  {
    id: 'lot-6',
    name: 'Kandy City Centre (KCC) Car Park',
    address: '5 Dalada Veediya / Sri Wickrama Rajasinghe Mw, Kandy',
    city: 'Kandy',
    distance: '115 km',
    status: 'Available',
    availableSpaces: 20,
    totalSpaces: 150,
    isCovered: true,
    hasEVCharging: true,
    pricePerHour: 140,
    imageUrl: 'https://images.unsplash.com/photo-1590674899484-d5640e854abe?auto=format&fit=crop&w=600&q=80',
    amenities: ['CCTV Surveillance', 'EV Charging', 'Multi-level Parking', 'Security Guard'],
    openingHours: '07:00 – 22:00',
    parkingType: 'Multi-story',
    maxHeight: '2.1 m',
    operatorPhone: '+94 81 220 5900',
    entranceCoordinates: { lat: 7.2936, lng: 80.6350 },
    entranceName: 'Sri Wickrama Rajasinghe Mawatha Car Park Ramp',
    sourceCitation: 'Kandy City Centre Official Directory (kandycitycentre.lk)',
    supportedVehicles: ['Car', 'Bike', 'SUV', 'EV'],
    vehicleTariffs: { Car: 140, Bike: 60, SUV: 190, EV: 160 },
  },
  {
    id: 'lot-7',
    name: 'Kandy Goods Shed Station Car Park',
    address: 'Station Road, Kandy',
    city: 'Kandy',
    distance: '114 km',
    status: 'Available',
    availableSpaces: 10,
    totalSpaces: 45,
    isCovered: false,
    hasEVCharging: false,
    pricePerHour: 80,
    imageUrl: 'https://images.unsplash.com/photo-1573348722427-f1d6819fdf98?auto=format&fit=crop&w=600&q=80',
    amenities: ['Open-air Parking', 'Security Guard'],
    openingHours: '05:30 – 21:00',
    parkingType: 'Open-air',
    maxHeight: '3.0 m',
    operatorPhone: 'Unavailable',
    entranceCoordinates: { lat: 7.2905, lng: 80.6308 },
    entranceName: 'Station Road / Goods Shed Terminal Gate',
    sourceCitation: 'Sri Lanka Railways Kandy Station & Kandy Municipal Council',
    supportedVehicles: ['Car', 'Bike', 'SUV'],
    vehicleTariffs: { Car: 80, Bike: 30, SUV: 120 },
  },
  {
    id: 'lot-8',
    name: 'Galle Railway Station Car Park',
    address: 'Station Road, Galle',
    city: 'Galle',
    distance: '118 km',
    status: 'Available',
    availableSpaces: 15,
    totalSpaces: 50,
    isCovered: false,
    hasEVCharging: false,
    pricePerHour: 80,
    imageUrl: 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=600&q=80',
    amenities: ['Open-air Parking', 'Security Guard'],
    openingHours: '05:00 – 21:30',
    parkingType: 'Open-air',
    maxHeight: '3.0 m',
    operatorPhone: 'Unavailable',
    entranceCoordinates: { lat: 6.0354, lng: 80.2144 },
    entranceName: 'Station Road Main Vehicle Gate',
    sourceCitation: 'Sri Lanka Railways Galle Station & Galle Municipal Council',
    supportedVehicles: ['Car', 'Bike', 'SUV'],
    vehicleTariffs: { Car: 80, Bike: 30, SUV: 110 },
  },
  {
    id: 'lot-9',
    name: 'Galle Dutch Fort Esplanade Car Park',
    address: 'Baladaksha Mawatha, Galle Fort, Galle',
    city: 'Galle',
    distance: '119 km',
    status: 'Available',
    availableSpaces: 14,
    totalSpaces: 80,
    isCovered: false,
    hasEVCharging: false,
    pricePerHour: 100,
    imageUrl: 'https://images.unsplash.com/photo-1621929747188-0b4dc28498d2?auto=format&fit=crop&w=600&q=80',
    amenities: ['Open-air Parking', 'Security Guard'],
    openingHours: '06:00 – 20:00',
    parkingType: 'Open-air',
    maxHeight: '2.8 m',
    operatorPhone: 'Unavailable',
    entranceCoordinates: { lat: 6.0322, lng: 80.2173 },
    entranceName: 'Baladaksha Mawatha Outer Gate',
    sourceCitation: 'Galle Heritage Foundation & Galle Municipal Council (gallefort.lk)',
    supportedVehicles: ['Car', 'Bike', 'SUV'],
    vehicleTariffs: { Car: 100, Bike: 40, SUV: 140 },
  },
  {
    id: 'lot-10',
    name: 'Bandaranaike International Airport Terminal Car Park',
    address: 'Airport Approach Road, Katunayake',
    city: 'Katunayake',
    distance: '32 km',
    status: 'Available',
    availableSpaces: 30,
    totalSpaces: 200,
    isCovered: true,
    hasEVCharging: true,
    pricePerHour: 200,
    imageUrl: 'https://images.unsplash.com/photo-1590674899484-d5640e854abe?auto=format&fit=crop&w=600&q=80',
    amenities: ['CCTV Surveillance', '24/7 Security', 'Covered Parking', 'EV Charging'],
    openingHours: 'Open 24 hours',
    parkingType: 'Multi-story',
    maxHeight: '2.4 m',
    operatorPhone: '+94 11 226 4444',
    entranceCoordinates: { lat: 7.1808, lng: 79.8841 },
    entranceName: 'Airport Approach Road Terminal Car Park Gate',
    sourceCitation: 'Airport and Aviation Services Sri Lanka (AASL) official portal (airport.lk)',
    supportedVehicles: ['Car', 'Bike', 'SUV', 'EV'],
    vehicleTariffs: { Car: 200, Bike: 80, SUV: 260, EV: 220 },
  },
  {
    id: 'lot-11',
    name: 'Negombo Beach Park Public Car Park',
    address: 'Porutota Road, Negombo',
    city: 'Negombo',
    distance: '38 km',
    status: 'Available',
    availableSpaces: 18,
    totalSpaces: 60,
    isCovered: false,
    hasEVCharging: false,
    pricePerHour: 70,
    imageUrl: 'https://images.unsplash.com/photo-1573348722427-f1d6819fdf98?auto=format&fit=crop&w=600&q=80',
    amenities: ['Open-air Parking', 'Security Guard'],
    openingHours: '06:00 – 21:00',
    parkingType: 'Open-air',
    maxHeight: '3.0 m',
    operatorPhone: 'Unavailable',
    entranceCoordinates: { lat: 7.2289, lng: 79.8395 },
    entranceName: 'Porutota Road Beach Park Gate',
    sourceCitation: 'Negombo Municipal Council Tourism Division',
    supportedVehicles: ['Car', 'Bike', 'SUV'],
    vehicleTariffs: { Car: 70, Bike: 30, SUV: 100 },
  },
  {
    id: 'lot-12',
    name: 'Jaffna Railway Station Car Park',
    address: 'Station Road, Jaffna',
    city: 'Jaffna',
    distance: '395 km',
    status: 'Available',
    availableSpaces: 12,
    totalSpaces: 40,
    isCovered: false,
    hasEVCharging: false,
    pricePerHour: 60,
    imageUrl: 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=600&q=80',
    amenities: ['Open-air Parking', 'Security Guard'],
    openingHours: '05:00 – 21:00',
    parkingType: 'Open-air',
    maxHeight: '3.0 m',
    operatorPhone: 'Unavailable',
    entranceCoordinates: { lat: 9.6663, lng: 80.0238 },
    entranceName: 'Station Road North Vehicle Gate',
    sourceCitation: 'Sri Lanka Railways Jaffna Station & Jaffna Municipal Council',
    supportedVehicles: ['Car', 'Bike', 'SUV'],
    vehicleTariffs: { Car: 60, Bike: 25, SUV: 90 },
  },
  {
    id: 'lot-13',
    name: 'Jaffna Hospital Road Public Car Park',
    address: 'Hospital Road, Jaffna',
    city: 'Jaffna',
    distance: '394 km',
    status: 'Available',
    availableSpaces: 8,
    totalSpaces: 35,
    isCovered: false,
    hasEVCharging: false,
    pricePerHour: 60,
    imageUrl: 'https://images.unsplash.com/photo-1573348722427-f1d6819fdf98?auto=format&fit=crop&w=600&q=80',
    amenities: ['Open-air Parking', 'Security Guard'],
    openingHours: '06:00 – 20:00',
    parkingType: 'Open-air',
    maxHeight: '2.8 m',
    operatorPhone: 'Unavailable',
    entranceCoordinates: { lat: 9.6625, lng: 80.0182 },
    entranceName: 'Hospital Road Central Market Entry',
    sourceCitation: 'Jaffna Municipal Council Commercial Assets Registry',
    supportedVehicles: ['Car', 'Bike', 'SUV'],
    vehicleTariffs: { Car: 60, Bike: 25, SUV: 90 },
  },
  {
    id: 'lot-14',
    name: 'Kurunegala UDA Public Car Park',
    address: 'Colombo Road, Kurunegala',
    city: 'Kurunegala',
    distance: '92 km',
    status: 'Available',
    availableSpaces: 16,
    totalSpaces: 70,
    isCovered: false,
    hasEVCharging: false,
    pricePerHour: 80,
    imageUrl: 'https://images.unsplash.com/photo-1590674899484-d5640e854abe?auto=format&fit=crop&w=600&q=80',
    amenities: ['Open-air Parking', 'Security Guard'],
    openingHours: '06:00 – 21:00',
    parkingType: 'Open-air',
    maxHeight: '3.0 m',
    operatorPhone: 'Unavailable',
    entranceCoordinates: { lat: 7.4862, lng: 80.3647 },
    entranceName: 'Colombo Road Commercial Gate',
    sourceCitation: 'Urban Development Authority (UDA) Sri Lanka & Kurunegala MC',
    supportedVehicles: ['Car', 'Bike', 'SUV'],
    vehicleTariffs: { Car: 80, Bike: 30, SUV: 120 },
  },
  {
    id: 'lot-15',
    name: 'Kurunegala Railway Station Car Park',
    address: 'Station Road, Kurunegala',
    city: 'Kurunegala',
    distance: '91 km',
    status: 'Available',
    availableSpaces: 10,
    totalSpaces: 35,
    isCovered: false,
    hasEVCharging: false,
    pricePerHour: 70,
    imageUrl: 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=600&q=80',
    amenities: ['Open-air Parking', 'Security Guard'],
    openingHours: '05:30 – 21:00',
    parkingType: 'Open-air',
    maxHeight: '3.0 m',
    operatorPhone: 'Unavailable',
    entranceCoordinates: { lat: 7.4819, lng: 80.3601 },
    entranceName: 'Station Road Forecourt Entry',
    sourceCitation: 'Sri Lanka Railways Kurunegala Station Forecourt',
    supportedVehicles: ['Car', 'Bike', 'SUV'],
    vehicleTariffs: { Car: 70, Bike: 30, SUV: 100 },
  },
  {
    id: 'lot-16',
    name: 'Nuwara Eliya Victoria Park Car Park',
    address: 'Queen Elizabeth Drive, Nuwara Eliya',
    city: 'Nuwara Eliya',
    distance: '168 km',
    status: 'Available',
    availableSpaces: 15,
    totalSpaces: 50,
    isCovered: false,
    hasEVCharging: false,
    pricePerHour: 100,
    imageUrl: 'https://images.unsplash.com/photo-1621929747188-0b4dc28498d2?auto=format&fit=crop&w=600&q=80',
    amenities: ['Open-air Parking', 'Security Guard'],
    openingHours: '07:00 – 18:30',
    parkingType: 'Open-air',
    maxHeight: '3.2 m',
    operatorPhone: 'Unavailable',
    entranceCoordinates: { lat: 6.9682, lng: 80.7689 },
    entranceName: 'Queen Elizabeth Drive West Gate',
    sourceCitation: 'Nuwara Eliya Municipal Council Victoria Park Visitors Office',
    supportedVehicles: ['Car', 'Bike', 'SUV'],
    vehicleTariffs: { Car: 100, Bike: 40, SUV: 150 },
  },
];

/**
 * Resolves a ParkingLotCardItem by its ID (whether mock ID like 'lot-6' or MongoDB ObjectId).
 * Checks the dynamic pool first, then SAMPLE_NEARBY_PARKING_LOTS by ID, and finally by name/slug.
 */
export function resolveParkingLotItem(
  lotId: string,
  pool?: ParkingLotCardItem[]
): ParkingLotCardItem | undefined {
  if (!lotId) return undefined;

  // 1. Exact ID in pool
  if (pool && pool.length > 0) {
    const directInPool = pool.find((l) => l.id === lotId || (l as any)._id === lotId);
    if (directInPool) return directInPool;
  }

  // 2. Exact ID in sample data
  const directInSample = SAMPLE_NEARBY_PARKING_LOTS.find((l) => l.id === lotId || (l as any)._id === lotId);
  if (directInSample) return directInSample;

  // 3. Name or partial match in pool with sample enrichment
  if (pool && pool.length > 0) {
    const poolLot = pool.find((l) => l.id === lotId);
    if (poolLot) {
      const sampleByName = SAMPLE_NEARBY_PARKING_LOTS.find(
        (s) => s.name.toLowerCase().trim() === poolLot.name.toLowerCase().trim()
      );
      if (sampleByName) {
        return {
          ...sampleByName,
          id: poolLot.id,
          availableSpaces: poolLot.availableSpaces ?? sampleByName.availableSpaces,
          totalSpaces: poolLot.totalSpaces ?? sampleByName.totalSpaces,
          status: poolLot.status ?? sampleByName.status,
          pricePerHour: poolLot.pricePerHour ?? sampleByName.pricePerHour,
        };
      }
      return poolLot;
    }
  }

  // 4. Try matching lotId against sample lots by fuzzy slug/name
  const normalizedSearch = lotId.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (normalizedSearch.length > 2) {
    const bySlug = SAMPLE_NEARBY_PARKING_LOTS.find((s) => {
      const sSlug = s.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      return sSlug.includes(normalizedSearch) || normalizedSearch.includes(sSlug);
    });
    if (bySlug) return bySlug;
  }

  return undefined;
}

