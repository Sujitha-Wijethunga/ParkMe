/**
 * TEMPORARY SAMPLE SPACE DATA FOR DRIVER FLOW (UI Milestone — ParkMe-07-SelectSpace)
 *
 * Backend model reference (backend/models/ParkingSpace.js):
 *   - Persisted statuses: 'available' | 'occupied' | 'maintenance'
 *   - Types: 'standard' | 'disabled' | 'EV'
 *   - Fields: parkingLot (ref), spaceNumber, type, status, floor
 *
 * Design additions for the UI layer:
 *   - 'reserved' status is shown in the design (amber/clock icon) as a
 *     short-term hold state that is NOT yet in the backend model. It is
 *     represented here as a separate UI-only status for layout fidelity.
 *     When the backend is extended, 'reserved' will map to the backend
 *     reservation timer mechanism.
 *   - vehicleType on each space ('Car' | 'Bike' | 'SUV' | 'EV') drives
 *     the tariff displayed; it is not currently a backend field.
 *
 * Space counts per lot:
 *   lot-1 (One Galle Face Mall, 18 available / 120 total):
 *     This sample shows ONE ground floor (G) layout of 40 spaces
 *     (A1–A8, B1–B8, C1–C8, D1–D8, E1–E8) as a representative partial
 *     section. The real lot has 120 total spaces across multiple floors/sections.
 *     Available count in this sample section: 24 of 40 spaces shown.
 *     No lot values in driverSampleData.ts were changed to make this fit.
 *
 *   lot-2 (Liberty Plaza, 7 available / 85 total): single-floor sample layout.
 *   lot-3 (Crescat Boulevard, 24 available / 110 total): single-floor sample layout.
 *   lot-4 (Majestic City, 35 available / 150 total): single-floor sample layout.
 *
 * Vehicle type pricing multipliers (display only, not persisted):
 *   Car  → lot base rate (Rs. 150 for lot-1)
 *   Bike → 0.47× base  (Rs. 70 rounded for lot-1)
 *   SUV  → 1.47× base  (Rs. 220 rounded for lot-1)
 *   EV   → 1.20× base  (Rs. 180 rounded for lot-1)
 *
 * This data will be replaced by /api/parking-lots/:id/spaces responses.
 */

import { SAMPLE_NEARBY_PARKING_LOTS, resolveParkingLotItem, ParkingLotCardItem } from './driverSampleData';

/** Persisted space statuses matching backend enum. */
export type SpacePersistedStatus = 'available' | 'occupied' | 'maintenance';

/**
 * UI-only status that extends persisted statuses with a transient 'reserved'
 * state visible in the design. The UI never sets this — it only reads it from
 * sample data to render the amber indicator shown in the legend.
 */
export type SpaceUIStatus = SpacePersistedStatus | 'reserved';

/** Space type, matches backend enum plus display convenience. */
export type SpaceType = 'standard' | 'disabled' | 'EV';

/** Vehicle category shown in the vehicle-type selector. */
export type VehicleType = 'Car' | 'Bike' | 'SUV' | 'EV';

/**
 * A single parking space as returned by (or shaped like) the backend.
 * The `uiStatus` field is UI-layer only — it should not be sent to the backend.
 */
export interface SampleParkingSpace {
  /** Stable ID matching backend spaceNumber convention, e.g. 'A1', 'B3'. */
  id: string;
  /** Row label displayed in the grid header (e.g. 'A', 'B', 'C'). */
  row: string;
  /** Column number within the row (1-based). */
  col: number;
  /** Space type from backend model. */
  type: SpaceType;
  /**
   * UI status: 'available' | 'occupied' | 'maintenance' (matches backend) plus
   * 'reserved' (UI-only transient state; shown as amber in the design legend).
   */
  uiStatus: SpaceUIStatus;
  /** Whether the space is EV-charging capable (drives EV icon display). */
  isEV: boolean;
  /** Vehicle type compatibility ('Car' | 'Bike' | 'SUV' | 'EV' | 'any') */
  vehicleType?: VehicleType | 'any';
}

/** A floor layout within a lot — groups spaces by floor label. */
export interface LotFloor {
  /** Floor label as stored in the backend `floor` field, e.g. 'G', 'B1', 'L1'. */
  label: string;
  /** Human-readable floor name, e.g. 'Ground Floor'. */
  name: string;
  spaces: SampleParkingSpace[];
  /** Number of rows in the grid (used for rendering row labels A, B, C…). */
  rows: string[];
  /** Number of columns per row. */
  cols: number;
}

/** Complete space layout for one parking lot across all floors. */
export interface LotSpaceLayout {
  lotId: string;
  /** Tariffs keyed by vehicle type (display-only; not persisted). */
  tariffs: Record<VehicleType, number>;
  floors: LotFloor[];
}

/* ── Helpers ──────────────────────────────────────────────────────────────── */

function sp(
  id: string,
  row: string,
  col: number,
  uiStatus: SpaceUIStatus,
  type: SpaceType = 'standard',
  vehicleType: VehicleType | 'any' = 'any'
): SampleParkingSpace {
  const isEV = type === 'EV' || vehicleType === 'EV';
  return { id, row, col, type, uiStatus, isEV, vehicleType };
}

/* ────────────────────────────────────────────────────────────────────────────
 * LOT-1 — One Galle Face Mall Parking (Rs. 150/hr base)
 *
 * Ground floor partial section (40 spaces, 5 rows × 8 cols).
 * Represents ONE section of a 120-space multi-floor car park.
 * Status breakdown: 24 available, 8 occupied, 4 reserved, 2 maintenance,
 * 2 vacant slots (E7–E8 shown as disabled/empty in design).
 * ────────────────────────────────────────────────────────────────────────── */
const LOT1_GROUND: LotFloor = {
  label: 'G',
  name: 'Ground Floor',
  rows: ['A', 'B', 'C', 'D', 'E'],
  cols: 8,
  spaces: [
    // Row A
    sp('A1', 'A', 1, 'occupied'),
    sp('A2', 'A', 2, 'available'),
    sp('A3', 'A', 3, 'available'),
    sp('A4', 'A', 4, 'available'),
    sp('A5', 'A', 5, 'reserved'),
    sp('A6', 'A', 6, 'available'),
    sp('A7', 'A', 7, 'occupied'),
    sp('A8', 'A', 8, 'available'),
    // Row B
    sp('B1', 'B', 1, 'available'),
    sp('B2', 'B', 2, 'available'),
    sp('B3', 'B', 3, 'available'),
    sp('B4', 'B', 4, 'occupied'),
    sp('B5', 'B', 5, 'available'),
    sp('B6', 'B', 6, 'available'),
    sp('B7', 'B', 7, 'available'),
    sp('B8', 'B', 8, 'occupied'),
    // Row C
    sp('C1', 'C', 1, 'available'),
    sp('C2', 'C', 2, 'occupied'),
    sp('C3', 'C', 3, 'available'),
    sp('C4', 'C', 4, 'available'),
    sp('C5', 'C', 5, 'available'),
    sp('C6', 'C', 6, 'reserved'),
    sp('C7', 'C', 7, 'available'),
    sp('C8', 'C', 8, 'occupied'),
    // Row D
    sp('D1', 'D', 1, 'available'),
    sp('D2', 'D', 2, 'available'),
    sp('D3', 'D', 3, 'reserved'),
    sp('D4', 'D', 4, 'occupied'),
    sp('D5', 'D', 5, 'available'),
    sp('D6', 'D', 6, 'available'),
    sp('D7', 'D', 7, 'available'),
    sp('D8', 'D', 8, 'available'),
    // Row E — EV spaces (cols 1-6), empty slots (E7, E8 — maintenance/no space)
    sp('E1', 'E', 1, 'available', 'EV'),
    sp('E2', 'E', 2, 'available', 'EV'),
    sp('E3', 'E', 3, 'available', 'EV'),
    sp('E4', 'E', 4, 'occupied',  'EV'),
    sp('E5', 'E', 5, 'available', 'EV'),
    sp('E6', 'E', 6, 'reserved',  'EV'),
    sp('E7', 'E', 7, 'maintenance', 'EV'),
    sp('E8', 'E', 8, 'maintenance', 'EV'),
  ],
};

const LOT1_B1: LotFloor = {
  label: 'B1',
  name: 'Basement 1',
  rows: ['A', 'B', 'C', 'D'],
  cols: 8,
  spaces: [
    sp('A1', 'A', 1, 'available'), sp('A2', 'A', 2, 'occupied'),  sp('A3', 'A', 3, 'available'), sp('A4', 'A', 4, 'available'),
    sp('A5', 'A', 5, 'available'), sp('A6', 'A', 6, 'reserved'),  sp('A7', 'A', 7, 'available'), sp('A8', 'A', 8, 'occupied'),
    sp('B1', 'B', 1, 'available'), sp('B2', 'B', 2, 'available'), sp('B3', 'B', 3, 'occupied'),  sp('B4', 'B', 4, 'available'),
    sp('B5', 'B', 5, 'available'), sp('B6', 'B', 6, 'available'), sp('B7', 'B', 7, 'occupied'),  sp('B8', 'B', 8, 'available'),
    sp('C1', 'C', 1, 'available'), sp('C2', 'C', 2, 'available'), sp('C3', 'C', 3, 'available'), sp('C4', 'C', 4, 'occupied'),
    sp('C5', 'C', 5, 'reserved'),  sp('C6', 'C', 6, 'available'), sp('C7', 'C', 7, 'available'), sp('C8', 'C', 8, 'available'),
    sp('D1', 'D', 1, 'occupied'),  sp('D2', 'D', 2, 'available'), sp('D3', 'D', 3, 'available'), sp('D4', 'D', 4, 'available'),
    sp('D5', 'D', 5, 'available'), sp('D6', 'D', 6, 'available'), sp('D7', 'D', 7, 'reserved'),  sp('D8', 'D', 8, 'available'),
  ],
};

const LOT1_L1: LotFloor = {
  label: 'L1',
  name: 'Level 1',
  rows: ['A', 'B', 'C', 'D'],
  cols: 8,
  spaces: [
    sp('A1', 'A', 1, 'available'), sp('A2', 'A', 2, 'available'), sp('A3', 'A', 3, 'occupied'),  sp('A4', 'A', 4, 'available'),
    sp('A5', 'A', 5, 'available'), sp('A6', 'A', 6, 'available'), sp('A7', 'A', 7, 'reserved'),  sp('A8', 'A', 8, 'available'),
    sp('B1', 'B', 1, 'occupied'),  sp('B2', 'B', 2, 'available'), sp('B3', 'B', 3, 'available'), sp('B4', 'B', 4, 'available'),
    sp('B5', 'B', 5, 'available'), sp('B6', 'B', 6, 'occupied'),  sp('B7', 'B', 7, 'available'), sp('B8', 'B', 8, 'available'),
    sp('C1', 'C', 1, 'available'), sp('C2', 'C', 2, 'reserved'),  sp('C3', 'C', 3, 'available'), sp('C4', 'C', 4, 'available'),
    sp('C5', 'C', 5, 'occupied'),  sp('C6', 'C', 6, 'available'), sp('C7', 'C', 7, 'available'), sp('C8', 'C', 8, 'available'),
    sp('D1', 'D', 1, 'available'), sp('D2', 'D', 2, 'available'), sp('D3', 'D', 3, 'available'), sp('D4', 'D', 4, 'occupied'),
    sp('D5', 'D', 5, 'available'), sp('D6', 'D', 6, 'available'), sp('D7', 'D', 7, 'available'), sp('D8', 'D', 8, 'reserved'),
  ],
};

const LOT1_L2: LotFloor = {
  label: 'L2',
  name: 'Level 2',
  rows: ['A', 'B', 'C', 'D'],
  cols: 8,
  spaces: [
    sp('A1', 'A', 1, 'available'), sp('A2', 'A', 2, 'available'), sp('A3', 'A', 3, 'available'), sp('A4', 'A', 4, 'available'),
    sp('A5', 'A', 5, 'available'), sp('A6', 'A', 6, 'available'), sp('A7', 'A', 7, 'available'), sp('A8', 'A', 8, 'reserved'),
    sp('B1', 'B', 1, 'available'), sp('B2', 'B', 2, 'available'), sp('B3', 'B', 3, 'available'), sp('B4', 'B', 4, 'available'),
    sp('B5', 'B', 5, 'occupied'),  sp('B6', 'B', 6, 'available'), sp('B7', 'B', 7, 'available'), sp('B8', 'B', 8, 'available'),
    sp('C1', 'C', 1, 'available'), sp('C2', 'C', 2, 'available'), sp('C3', 'C', 3, 'available'), sp('C4', 'C', 4, 'available'),
    sp('C5', 'C', 5, 'available'), sp('C6', 'C', 6, 'available'), sp('C7', 'C', 7, 'occupied'),  sp('C8', 'C', 8, 'available'),
    sp('D1', 'D', 1, 'available'), sp('D2', 'D', 2, 'available'), sp('D3', 'D', 3, 'available'), sp('D4', 'D', 4, 'available'),
    sp('D5', 'D', 5, 'available'), sp('D6', 'D', 6, 'available'), sp('D7', 'D', 7, 'available'), sp('D8', 'D', 8, 'available'),
  ],
};

/* ────────────────────────────────────────────────────────────────────────────
 * LOT-2 — Liberty Plaza Multi-Story (Rs. 120/hr base, no EV)
 * Single floor sample, 7 available / 30 shown (partial section of 85 total).
 * ────────────────────────────────────────────────────────────────────────── */
const LOT2_G: LotFloor = {
  label: 'G',
  name: 'Ground Floor',
  rows: ['A', 'B', 'C'],
  cols: 8,
  spaces: [
    sp('A1', 'A', 1, 'occupied'),  sp('A2', 'A', 2, 'occupied'),  sp('A3', 'A', 3, 'available'), sp('A4', 'A', 4, 'occupied'),
    sp('A5', 'A', 5, 'reserved'),  sp('A6', 'A', 6, 'occupied'),  sp('A7', 'A', 7, 'available'), sp('A8', 'A', 8, 'occupied'),
    sp('B1', 'B', 1, 'occupied'),  sp('B2', 'B', 2, 'available'), sp('B3', 'B', 3, 'occupied'),  sp('B4', 'B', 4, 'occupied'),
    sp('B5', 'B', 5, 'available'), sp('B6', 'B', 6, 'occupied'),  sp('B7', 'B', 7, 'reserved'),  sp('B8', 'B', 8, 'occupied'),
    sp('C1', 'C', 1, 'occupied'),  sp('C2', 'C', 2, 'occupied'),  sp('C3', 'C', 3, 'available'), sp('C4', 'C', 4, 'occupied'),
    sp('C5', 'C', 5, 'occupied'),  sp('C6', 'C', 6, 'available'), sp('C7', 'C', 7, 'occupied'),  sp('C8', 'C', 8, 'available'),
  ],
};

/* ────────────────────────────────────────────────────────────────────────────
 * LOT-3 — Crescat Boulevard Parking (Rs. 160/hr base, has EV)
 * Single floor sample.
 * ────────────────────────────────────────────────────────────────────────── */
const LOT3_G: LotFloor = {
  label: 'G',
  name: 'Ground Floor',
  rows: ['A', 'B', 'C', 'D'],
  cols: 8,
  spaces: [
    sp('A1', 'A', 1, 'available'), sp('A2', 'A', 2, 'available'), sp('A3', 'A', 3, 'occupied'),  sp('A4', 'A', 4, 'available'),
    sp('A5', 'A', 5, 'available'), sp('A6', 'A', 6, 'reserved'),  sp('A7', 'A', 7, 'available'), sp('A8', 'A', 8, 'available'),
    sp('B1', 'B', 1, 'available'), sp('B2', 'B', 2, 'occupied'),  sp('B3', 'B', 3, 'available'), sp('B4', 'B', 4, 'available'),
    sp('B5', 'B', 5, 'available'), sp('B6', 'B', 6, 'available'), sp('B7', 'B', 7, 'available'), sp('B8', 'B', 8, 'reserved'),
    sp('C1', 'C', 1, 'available'), sp('C2', 'C', 2, 'available'), sp('C3', 'C', 3, 'available'), sp('C4', 'C', 4, 'occupied'),
    sp('C5', 'C', 5, 'available'), sp('C6', 'C', 6, 'available'), sp('C7', 'C', 7, 'available'), sp('C8', 'C', 8, 'available'),
    sp('D1', 'D', 1, 'available', 'EV'), sp('D2', 'D', 2, 'available', 'EV'), sp('D3', 'D', 3, 'occupied', 'EV'), sp('D4', 'D', 4, 'available', 'EV'),
    sp('D5', 'D', 5, 'available', 'EV'), sp('D6', 'D', 6, 'reserved', 'EV'),  sp('D7', 'D', 7, 'maintenance', 'EV'),  sp('D8', 'D', 8, 'maintenance', 'EV'),
  ],
};

/* ────────────────────────────────────────────────────────────────────────────
 * LOT-4 — Majestic City Basement (Rs. 100/hr base, no EV)
 * Single floor sample.
 * ────────────────────────────────────────────────────────────────────────── */
const LOT4_G: LotFloor = {
  label: 'G',
  name: 'Ground Floor',
  rows: ['A', 'B', 'C', 'D'],
  cols: 8,
  spaces: [
    sp('A1', 'A', 1, 'available'), sp('A2', 'A', 2, 'available'), sp('A3', 'A', 3, 'available'), sp('A4', 'A', 4, 'available'),
    sp('A5', 'A', 5, 'reserved'),  sp('A6', 'A', 6, 'available'), sp('A7', 'A', 7, 'available'), sp('A8', 'A', 8, 'available'),
    sp('B1', 'B', 1, 'occupied'),  sp('B2', 'B', 2, 'available'), sp('B3', 'B', 3, 'available'), sp('B4', 'B', 4, 'available'),
    sp('B5', 'B', 5, 'available'), sp('B6', 'B', 6, 'available'), sp('B7', 'B', 7, 'available'), sp('B8', 'B', 8, 'available'),
    sp('C1', 'C', 1, 'available'), sp('C2', 'C', 2, 'available'), sp('C3', 'C', 3, 'available'), sp('C4', 'C', 4, 'occupied'),
    sp('C5', 'C', 5, 'available'), sp('C6', 'C', 6, 'available'), sp('C7', 'C', 7, 'available'), sp('C8', 'C', 8, 'available'),
    sp('D1', 'D', 1, 'available'), sp('D2', 'D', 2, 'available'), sp('D3', 'D', 3, 'available'), sp('D4', 'D', 4, 'available'),
    sp('D5', 'D', 5, 'available'), sp('D6', 'D', 6, 'available'), sp('D7', 'D', 7, 'available'), sp('D8', 'D', 8, 'available'),
  ],
};

/* ── Assembled layouts ──────────────────────────────────────────────────── */

export const SAMPLE_LOT_SPACE_LAYOUTS: LotSpaceLayout[] = [
  {
    lotId: 'lot-1',
    tariffs: { Car: 150, Bike: 70, SUV: 220, EV: 180 },
    floors: [LOT1_B1, LOT1_GROUND, LOT1_L1, LOT1_L2],
  },
  {
    lotId: 'lot-2',
    tariffs: { Car: 120, Bike: 60, SUV: 180, EV: 120 },
    floors: [LOT2_G],
  },
  {
    lotId: 'lot-3',
    tariffs: { Car: 160, Bike: 75, SUV: 235, EV: 190 },
    floors: [LOT3_G],
  },
  {
    lotId: 'lot-4',
    tariffs: { Car: 100, Bike: 50, SUV: 150, EV: 100 },
    floors: [LOT4_G],
  },
];

/**
 * Look up the space layout for a given lot ID.
 * Returns a static layout or dynamically creates a vehicle-designated layout based on lot metadata.
 */
export function getSpaceLayoutForLot(
  lotId: string,
  lotOrPool?: ParkingLotCardItem | ParkingLotCardItem[]
): LotSpaceLayout | undefined {
  const existing = SAMPLE_LOT_SPACE_LAYOUTS.find((l) => l.lotId === lotId);
  if (existing) return existing;

  const pool = Array.isArray(lotOrPool) ? lotOrPool : undefined;
  const singleLot = !Array.isArray(lotOrPool) ? lotOrPool : undefined;
  const lot = singleLot || resolveParkingLotItem(lotId, pool);

  const hourlyRate = lot?.pricePerHour ?? 120;
  const tariffs: Record<VehicleType, number> = {
    Car: lot?.vehicleTariffs?.Car ?? hourlyRate,
    Bike: lot?.vehicleTariffs?.Bike ?? Math.round(hourlyRate * 0.45),
    SUV: lot?.vehicleTariffs?.SUV ?? Math.round(hourlyRate * 1.4),
    EV: lot?.vehicleTariffs?.EV ?? Math.round(hourlyRate * 1.2),
  };

  const rows = ['A', 'B', 'C', 'D'];
  const cols = 6;
  const spaces: SampleParkingSpace[] = [];

  // Row A: Bikes & EVs
  for (let c = 1; c <= cols; c++) {
    const isEvSpace = c >= 4;
    spaces.push(
      sp(
        `A${c}`,
        'A',
        c,
        c % 5 === 0 ? 'occupied' : 'available',
        isEvSpace ? 'EV' : 'standard',
        isEvSpace ? 'EV' : 'Bike'
      )
    );
  }
  // Row B: Standard Cars
  for (let c = 1; c <= cols; c++) {
    spaces.push(
      sp(`B${c}`, 'B', c, c === 2 ? 'occupied' : 'available', 'standard', 'Car')
    );
  }
  // Row C: Standard Cars
  for (let c = 1; c <= cols; c++) {
    spaces.push(
      sp(`C${c}`, 'C', c, c === 3 ? 'occupied' : 'available', 'standard', 'Car')
    );
  }
  // Row D: SUVs
  for (let c = 1; c <= cols; c++) {
    spaces.push(
      sp(`D${c}`, 'D', c, c === 4 ? 'occupied' : 'available', 'standard', 'SUV')
    );
  }

  const generatedFloor: LotFloor = {
    label: 'G',
    name: 'Ground Floor',
    rows,
    cols,
    spaces,
  };

  return {
    lotId,
    tariffs,
    floors: [generatedFloor],
  };
}
