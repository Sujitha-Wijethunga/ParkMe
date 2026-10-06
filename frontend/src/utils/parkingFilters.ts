import { ParkingLotCardItem, DriverFilterChip } from '../constants/driverSampleData';

/**
 * Parses numeric distance in kilometers from a string like "0.4 km", "1.2 km", or "800 m".
 * Defaults to Number.MAX_VALUE if invalid so items without valid distance appear last.
 */
export function parseDistanceKm(distanceStr: string): number {
  if (!distanceStr) return Number.MAX_VALUE;
  const trimmed = distanceStr.trim().toLowerCase();

  // If in meters (e.g., "800 m")
  if (trimmed.endsWith('m') && !trimmed.endsWith('km')) {
    const num = parseFloat(trimmed.replace('m', '').trim());
    return isNaN(num) ? Number.MAX_VALUE : num / 1000;
  }

  // If in kilometers (e.g., "0.4 km" or "0.4km")
  const num = parseFloat(trimmed.replace('km', '').trim());
  return isNaN(num) ? Number.MAX_VALUE : num;
}

/**
 * Pure search and filter function for parking lots.
 * Separates business logic from the UI components.
 * 
 * Rules:
 * - Search query is trimmed and checked against both lot name and address (case-insensitive).
 * - "Nearest": sorts by parsed distance in ascending order.
 * - "Cheapest": sorts by pricePerHour in ascending order.
 * - "Available Now": filters for lots with availableSpaces > 0, then sorts by availability/distance.
 * - "Covered Parking": filters for lots with isCovered === true.
 * - Search and active category filters work together seamlessly.
 */
export function filterAndSortParkingLots(
  lots: ParkingLotCardItem[],
  query: string,
  activeFilter: DriverFilterChip = 'Nearest'
): ParkingLotCardItem[] {
  const normalizedQuery = query.trim().toLowerCase();

  // 1. Filter by search query (name or address)
  let result = lots.filter((lot) => {
    if (!normalizedQuery) return true;
    const matchesName = lot.name.toLowerCase().includes(normalizedQuery);
    const matchesAddress = lot.address.toLowerCase().includes(normalizedQuery);
    return matchesName || matchesAddress;
  });

  // 2. Apply category filters (filtering)
  if (activeFilter === 'Available Now') {
    result = result.filter((lot) => lot.availableSpaces > 0);
  } else if (activeFilter === 'Covered Parking') {
    result = result.filter((lot) => lot.isCovered);
  }

  // 3. Apply category sorting
  const sortedResult = [...result];

  if (activeFilter === 'Nearest') {
    sortedResult.sort((a, b) => parseDistanceKm(a.distance) - parseDistanceKm(b.distance));
  } else if (activeFilter === 'Cheapest') {
    sortedResult.sort((a, b) => a.pricePerHour - b.pricePerHour);
  } else if (activeFilter === 'Available Now') {
    // Primary sort: most spaces available; secondary: nearest
    sortedResult.sort((a, b) => {
      if (b.availableSpaces !== a.availableSpaces) {
        return b.availableSpaces - a.availableSpaces;
      }
      return parseDistanceKm(a.distance) - parseDistanceKm(b.distance);
    });
  } else if (activeFilter === 'Covered Parking') {
    // Sort covered parking by nearest distance
    sortedResult.sort((a, b) => parseDistanceKm(a.distance) - parseDistanceKm(b.distance));
  }

  return sortedResult;
}
