import { getApiBaseUrl } from './parkingService';
import { SAMPLE_NEARBY_PARKING_LOTS } from '../constants/driverSampleData';
import { BookingDetails } from '../constants/bookingTypes';
import { getDriverBookingData, saveDriverBookingData } from './storage';

export type ReservationStatus = 'pending' | 'active' | 'completed' | 'cancelled';

export interface ReservationLocation {
  _id: string;
  name?: string;
  address?: string;
  pricePerHour?: number;
}

export interface ReservationSpace {
  _id: string;
  spaceNumber?: string;
  floor?: string;
}

export interface DriverReservation {
  _id: string;
  parkingLot: ReservationLocation | string;
  parkingSpace: ReservationSpace | string;
  startTime: string;
  endTime: string;
  status: ReservationStatus;
  totalAmount: number;
  cancellationReason?: string;
  cancelledAt?: string;
  createdAt?: string;
  verifiedAt?: string;
}

export function isWithinScheduledWindow(
  reservation: Pick<DriverReservation, 'status' | 'startTime' | 'endTime'>,
  now = Date.now()
): boolean {
  return (
    reservation.status === 'pending' &&
    new Date(reservation.startTime).getTime() <= now &&
    now < new Date(reservation.endTime).getTime()
  );
}

export interface MyReservationsResult {
  reservations: DriverReservation[];
  warning: string | null;
}

export interface ConfirmedBookingInput {
  userId: string;
  booking: BookingDetails;
  startTime: Date;
}

const REQUEST_TIMEOUT_MS = 10000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isReservationStatus(value: unknown): value is ReservationStatus {
  return value === 'pending' || value === 'active' || value === 'completed' || value === 'cancelled';
}

function isDriverReservation(value: unknown): value is DriverReservation {
  if (!isRecord(value)) return false;

  const isPopulatedValue = (related: unknown, fields: string[]) =>
    typeof related === 'string' ||
    (isRecord(related) &&
      typeof related._id === 'string' &&
      fields.every((field) =>
        related[field] === undefined ||
        typeof related[field] === 'string' ||
        (field === 'pricePerHour' && typeof related[field] === 'number' && Number.isFinite(related[field]))
      ));

  return (
    typeof value._id === 'string' &&
    value._id.length > 0 &&
    typeof value.startTime === 'string' &&
    !Number.isNaN(Date.parse(value.startTime)) &&
    typeof value.endTime === 'string' &&
    !Number.isNaN(Date.parse(value.endTime)) &&
    isReservationStatus(value.status) &&
    typeof value.totalAmount === 'number' &&
    Number.isFinite(value.totalAmount) &&
    value.totalAmount >= 0 &&
    (value.verifiedAt === undefined ||
      (typeof value.verifiedAt === 'string' && !Number.isNaN(Date.parse(value.verifiedAt)))) &&
    isPopulatedValue(value.parkingLot, ['name', 'address']) &&
    isPopulatedValue(value.parkingSpace, ['spaceNumber', 'floor'])
  );
}

async function reservationRequest<T>(path: string, token: string, method = 'GET'): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${getApiBaseUrl().replace(/\/+$/, '')}/api/reservations${path}`, {
      method,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      ...(method === 'PUT' ? { body: JSON.stringify({}) } : {}),
    });
    const data = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(data?.message || `Unable to load booking information (${response.status}).`);
    }

    return data as T;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('The booking request timed out. Please check your connection and try again.');
    }
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Unable to load booking information. Please try again.');
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function getMyReservations(
  token: string,
  userId: string
): Promise<MyReservationsResult> {
  const localReservations = await readLocalReservations(userId);
  if (!token) return { reservations: localReservations, warning: null };

  try {
    const reservations = await reservationRequest<unknown>('/my', token);
    if (!Array.isArray(reservations)) {
      throw new Error('The server returned bookings in an unexpected format.');
    }
    if (!reservations.every(isDriverReservation)) {
      throw new Error('The server returned a booking with incomplete or unsupported information.');
    }
    return {
      reservations: mergeReservations(reservations, localReservations),
      warning: null,
    };
  } catch (error) {
    if (localReservations.length === 0) throw error;
    return {
      reservations: localReservations,
      warning: error instanceof Error ? error.message : 'Could not refresh server bookings.',
    };
  }
}

async function readLocalReservations(userId: string): Promise<DriverReservation[]> {
  const saved = await getDriverBookingData(userId);
  if (!saved) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(saved);
  } catch {
    throw new Error('Saved booking data is invalid. Please contact support.');
  }
  if (!Array.isArray(parsed) || !parsed.every(isDriverReservation)) {
    throw new Error('Saved booking data is incomplete. Please contact support.');
  }
  return parsed;
}

function mergeReservations(
  serverReservations: DriverReservation[],
  localReservations: DriverReservation[]
): DriverReservation[] {
  const byId = new Map<string, DriverReservation>();
  for (const reservation of localReservations) byId.set(reservation._id, reservation);
  for (const reservation of serverReservations) byId.set(reservation._id, reservation);
  return [...byId.values()].sort(
    (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
  );
}

export async function saveConfirmedBooking(input: ConfirmedBookingInput): Promise<DriverReservation> {
  const { userId, booking, startTime } = input;
  if (!userId) throw new Error('Sign in is required to save a booking.');
  if (Number.isNaN(startTime.getTime())) throw new Error('The booking start time is invalid.');

  const lot = SAMPLE_NEARBY_PARKING_LOTS.find((item) => item.id === booking.lotId);
  if (!lot) throw new Error('The selected parking location is no longer available.');

  const endTime = new Date(startTime.getTime() + booking.hours * 60 * 60 * 1000);
  const now = Date.now();
  const reservation: DriverReservation = {
    _id: `local-${now}-${Math.random().toString(36).slice(2, 8)}`,
    parkingLot: { _id: booking.lotId, name: lot.name, address: lot.address },
    parkingSpace: { _id: booking.spaceId, spaceNumber: booking.spaceId, floor: booking.floor },
    startTime: startTime.toISOString(),
    endTime: endTime.toISOString(),
    status: 'pending',
    totalAmount: booking.total,
    createdAt: new Date(now).toISOString(),
  };

  const reservations = await readLocalReservations(userId);
  await saveDriverBookingData(userId, JSON.stringify([reservation, ...reservations]));
  return reservation;
}

export async function getReservationById(
  token: string,
  userId: string,
  reservationId: string
): Promise<DriverReservation> {
  if (!reservationId) {
    throw new Error('A booking ID is required to view booking details.');
  }

  if (reservationId.startsWith('local-')) {
    const reservation = (await readLocalReservations(userId)).find((item) => item._id === reservationId);
    if (!reservation) throw new Error('This saved booking could not be found.');
    return reservation;
  }
  if (!token) throw new Error('Please sign in to view booking details.');

  const reservation = await reservationRequest<unknown>(`/${encodeURIComponent(reservationId)}`, token);
  if (!isDriverReservation(reservation)) {
    throw new Error('The server returned booking details in an unexpected format.');
  }
  return reservation;
}

export async function cancelReservation(
  token: string,
  userId: string,
  reservationId: string
): Promise<void> {
  if (!reservationId) {
    throw new Error('A booking ID is required to cancel a booking.');
  }

  if (reservationId.startsWith('local-')) {
    const reservations = await readLocalReservations(userId);
    const reservation = reservations.find((item) => item._id === reservationId);
    if (!reservation) throw new Error('This saved booking could not be found.');
    if (reservation.status !== 'pending') throw new Error('Only upcoming bookings can be cancelled.');
    await saveDriverBookingData(
      userId,
      JSON.stringify(reservations.map((item) =>
        item._id === reservationId ? { ...item, status: 'cancelled' as const, cancelledAt: new Date().toISOString() } : item
      ))
    );
    return;
  }
  if (!token) throw new Error('Please sign in to manage your bookings.');

  await reservationRequest<{ message: string }>(
    `/${encodeURIComponent(reservationId)}/cancel`,
    token,
    'PUT'
  );
}

export async function releaseActiveReservation(token: string, reservationId: string): Promise<void> {
  if (!token) throw new Error('Please sign in to release your parking space.');
  if (!reservationId || reservationId.startsWith('local-')) {
    throw new Error('Only a server-confirmed active session can release a parking space.');
  }

  await reservationRequest<{ message: string }>(
    `/${encodeURIComponent(reservationId)}/release`,
    token,
    'PUT'
  );
}
