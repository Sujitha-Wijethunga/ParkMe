/**
 * Booking draft types for the Driver Booking Summary screen
 * (ParkMe-08-BookingSummary milestone).
 *
 * ── Pricing rules ────────────────────────────────────────────────────────────
 * The backend reservationController.js computes:
 *   totalAmount = parseFloat(((endTime - startTime) / 3600000 * pricePerHour).toFixed(2))
 *
 * Rules observed from the backend:
 *   - Pro-rata hourly billing (fractional hours are charged proportionally).
 *   - No rounding to whole hours.
 *   - No taxes, discounts, or daily tariff caps defined in the backend.
 *
 * The design (ParkMe-08-BookingSummary) shows a "Service Fee (Rs. 20) –
 * Guaranteed spot lock fee". This fee is NOT present in the backend
 * Reservation or Payment models. It is shown in the UI as a display-only
 * estimate to match the design; it will need a corresponding backend field
 * before it can be collected. The breakdown is clearly labelled "Estimate".
 *
 * ── Duration model ────────────────────────────────────────────────────────────
 * Rather than free start/end time entry (which requires a native date-time
 * picker or additional Expo dependency), this milestone uses:
 *   - A fixed arrival time (defaulting to the next full hour, ≥ 30 min ahead)
 *     shown with date and time.
 *   - An integer duration in hours (1–12) controlled by +/− steppers.
 *   - End time is computed as arrivalTime + durationHours.
 *
 * This matches the design's ARRIVAL + DURATION layout and avoids adding
 * @react-native-community/datetimepicker (a native module requiring a
 * dev build). If a date picker is added later, the BookingDraft type accepts
 * arbitrary Date objects for startTime and endTime.
 *
 * ── Vehicle information ───────────────────────────────────────────────────────
 * The design shows a vehicle plate and model ("WP CAB-7829 (Prius)") with a
 * "Change" link. For this milestone the vehicle information is stored in the
 * draft as plain text fields (plate number + model). The backend Reservation
 * model does not yet persist vehicle info; this is noted in the type.
 */

import { VehicleType } from './parkingSpaceData';

/** Service fee shown in the UI price breakdown. Backend does not persist this yet. */
export const BOOKING_SERVICE_FEE_RS = 20;

/**
 * Minimum number of minutes from now before the arrival time is allowed.
 * Matches the backend rule: start time must be in the future.
 */
export const BOOKING_MIN_ADVANCE_MINUTES = 30;

/** Minimum and maximum bookable duration in whole hours. */
export const BOOKING_MIN_DURATION_HRS = 1;
export const BOOKING_MAX_DURATION_HRS = 12;
export const VEHICLE_PLATE_PATTERN = /^[A-Z]{2,3}\d{3,4}$/;

/**
 * A mutable booking draft. All fields start unset or at defaults.
 * This is what the BookingSummaryScreen manages locally.
 * It is NOT sent to the backend in this milestone.
 */
export interface BookingDraft {
  /** Stable lot ID (from SpaceSelectionResult). */
  lotId: string;
  /** Space label, e.g. 'A3' (from SpaceSelectionResult). */
  spaceId: string;
  /** Floor label, e.g. 'G' (from SpaceSelectionResult). */
  floor: string;
  /** Vehicle category chosen in SelectSpaceScreen. */
  vehicleType: VehicleType;
  /** Hourly rate for the selected vehicle type (Rs/hr). */
  tariffPerHour: number;
  /** Desired arrival time (must be in the future at submission). */
  arrivalTime: Date;
  /** Duration the driver wants to park, in whole hours (1–12). */
  durationHours: number;
  /**
   * Vehicle registration plate, e.g. 'WP7829'.
   * Not currently persisted by the backend Reservation model.
   */
  vehiclePlate: string;
  /**
   * Vehicle model/description, e.g. 'Toyota Prius'.
   * Not currently persisted by the backend Reservation model.
   */
  vehicleModel: string;
}

/**
 * Derived price breakdown from a draft.
 * All amounts are display-only estimates until the backend creates the reservation.
 */
export interface BookingPriceBreakdown {
  /** Computed end time = arrivalTime + durationHours. */
  endTime: Date;
  /** Parking fee = tariffPerHour × durationHours (pro-rata, no rounding). */
  parkingFeeRs: number;
  /**
   * UI-only service fee shown in the design.
   * Not in the backend model yet; clearly labelled as an estimate.
   */
  serviceFeeRs: number;
  /** Total estimate = parkingFeeRs + serviceFeeRs. */
  totalRs: number;
}

/** Validation result for a booking draft. */
export interface BookingValidationResult {
  isValid: boolean;
  /** Field-level error messages; keys match draft field names or 'general'. */
  errors: Partial<Record<keyof BookingDraft | 'general', string>>;
}

/**
 * Typed payload passed to the future payment/reservation step.
 * Carries the validated draft and computed price, ready for the
 * POST /api/reservations body once authentication is implemented.
 */
export interface ConfirmedBookingPayload {
  draft: BookingDraft;
  price: BookingPriceBreakdown;
  /** ISO string for startTime — the serialization format expected by the backend. */
  startTimeISO: string;
  /** ISO string for endTime. */
  endTimeISO: string;
}

/* ── Pure helper functions ────────────────────────────────────────────────── */

/**
 * Compute the price breakdown from a draft.
 * Uses the same formula as the backend: hours × pricePerHour, no rounding.
 */
export function computeBreakdown(draft: BookingDraft): BookingPriceBreakdown {
  const endTime = new Date(draft.arrivalTime.getTime() + draft.durationHours * 60 * 60 * 1000);
  const parkingFeeRs = parseFloat((draft.durationHours * draft.tariffPerHour).toFixed(2));
  const serviceFeeRs = BOOKING_SERVICE_FEE_RS;
  const totalRs = parseFloat((parkingFeeRs + serviceFeeRs).toFixed(2));
  return { endTime, parkingFeeRs, serviceFeeRs, totalRs };
}

/**
 * Validate a booking draft.
 * Mirrors the backend validation rules from reservationController.js.
 */
export function validateDraft(draft: BookingDraft): BookingValidationResult {
  const errors: Partial<Record<keyof BookingDraft | 'general', string>> = {};
  const now = new Date();
  const minArrival = new Date(now.getTime() + BOOKING_MIN_ADVANCE_MINUTES * 60 * 1000);

  if (!draft.lotId) {
    errors.lotId = 'No parking lot selected.';
  }
  if (!draft.spaceId) {
    errors.spaceId = 'No space selected.';
  }
  if (draft.arrivalTime <= minArrival) {
    errors.arrivalTime = `Arrival must be at least ${BOOKING_MIN_ADVANCE_MINUTES} minutes in the future.`;
  }
  if (draft.durationHours < BOOKING_MIN_DURATION_HRS || draft.durationHours > BOOKING_MAX_DURATION_HRS) {
    errors.durationHours = `Duration must be between ${BOOKING_MIN_DURATION_HRS} and ${BOOKING_MAX_DURATION_HRS} hours.`;
  }
  const vehiclePlate = draft.vehiclePlate.trim().toUpperCase();
  if (!vehiclePlate) {
    errors.vehiclePlate = 'Vehicle number is required.';
  } else if (!VEHICLE_PLATE_PATTERN.test(vehiclePlate)) {
    errors.vehiclePlate = 'Enter 2–3 English letters followed by 3–4 numbers (e.g. WP7829).';
  }
  if (!draft.vehicleModel.trim()) {
    errors.vehicleModel = 'Vehicle model is required.';
  }

  return { isValid: Object.keys(errors).length === 0, errors };
}

/**
 * Return the next full hour at least BOOKING_MIN_ADVANCE_MINUTES from now.
 * e.g. if it is 09:40, returns 10:00.
 */
export function defaultArrivalTime(): Date {
  const now = new Date();
  const minArrival = new Date(now.getTime() + BOOKING_MIN_ADVANCE_MINUTES * 60 * 1000);
  // Round up to the next full hour
  const nextHour = new Date(minArrival);
  if (nextHour.getMinutes() > 0 || nextHour.getSeconds() > 0) {
    nextHour.setHours(nextHour.getHours() + 1, 0, 0, 0);
  }
  return nextHour;
}

/** Format a Date as "Today, DD MMM" or "Tomorrow, DD MMM" or "DD MMM YYYY". */
export function formatArrivalDate(date: Date): string {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const dayStr = `${date.getDate()} ${months[date.getMonth()]}`;

  if (sameDay(date, today)) return `Today, ${dayStr}`;
  if (sameDay(date, tomorrow)) return `Tomorrow, ${dayStr}`;
  return `${dayStr} ${date.getFullYear()}`;
}

/** Format a Date as "HH:MM AM/PM". */
export function formatTime12(date: Date): string {
  const h = date.getHours();
  const m = date.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
}
