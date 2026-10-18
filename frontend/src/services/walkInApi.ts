import { API_BASE_URL, getApiBaseUrl, LIVE_BACKEND_URL } from '../constants/api';
import { appendImageToFormData } from '../utils/imageUpload';

export interface WalkInSpaceItem {
  _id: string;
  spaceNumber: string;
  floor?: string;
  type?: string;
  vehicleType?: string;
  status: string;
}

export interface WalkInTariffCalculation {
  entryTime: string;
  exitTime?: string;
  durationMinutes: number;
  startedHours: number;
  hourlyRate: number;
  serviceCharge: number;
  parkingCharge: number;
  totalAmount: number;
  amountPaid: number;
  balanceDue: number;
  billingRule: string;
  isEstimated: boolean;
}

export interface WalkInReceiptData {
  reference: string;
  locationName: string;
  locationAddress: string;
  vehiclePlate: string;
  vehicleType: string;
  spaceNumber: string;
  floor: string;
  entryTime: string;
  hourlyRate: number;
  serviceCharge: number;
  billingRuleDescription: string;
  qrPayload: string;
}

export interface WalkInSessionData {
  _id: string;
  reference: string;
  parkingLot: {
    _id: string;
    name: string;
    address: string;
    city?: string;
    pricePerHour?: number;
    vehicleTariffs?: Record<string, number>;
    serviceCharge?: number;
  } | string;
  parkingSpace: {
    _id: string;
    spaceNumber: string;
    floor?: string;
    type?: string;
  } | string;
  spaceNumber: string;
  floor: string;
  vehiclePlate: string;
  vehicleType: 'Car' | 'Bike' | 'SUV' | 'EV';
  vehiclePhotoUrl?: string;
  customerName?: string;
  customerPhone?: string;
  entryTime: string;
  exitTime?: string;
  enteredBy?: { _id: string; name: string } | string;
  checkedOutBy?: { _id: string; name: string } | string;
  hourlyRate: number;
  billingRule: string;
  serviceCharge: number;
  currency: string;
  status: 'active' | 'completed' | 'cancelled';
  paymentStatus: 'unpaid' | 'paid' | 'partially_paid';
  amountPaid: number;
  finalAmount?: number;
  outstandingBalance?: number;
  createdAt: string;
  updatedAt: string;
}

export interface WalkInEntryInput {
  parkingLotId?: string;
  vehiclePlate: string;
  vehicleType: 'Car' | 'Bike' | 'SUV' | 'EV';
  parkingSpaceId: string;
  floor?: string;
  customerName?: string;
  customerPhone?: string;
  photoUri?: string;
  photoBase64?: string;
  idempotencyKey?: string;
}

export interface WalkInCheckoutInput {
  reference?: string;
  sessionId?: string;
  amountPaid?: number;
  paymentMethod?: string;
  confirmDeparture?: boolean;
}

const REQUEST_TIMEOUT_MS = 15000;

async function authFetch<T>(
  endpoint: string,
  token: string,
  options: RequestInit = {}
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const baseUrl = (getApiBaseUrl() || API_BASE_URL).replace(/\/+$/, '');
    const url = `${baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers as Record<string, string>),
    };

    let response: Response;
    try {
      response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers,
      });
    } catch (networkErr) {
      if (baseUrl !== LIVE_BACKEND_URL) {
        response = await fetch(`${LIVE_BACKEND_URL.replace(/\/+$/, '')}${endpoint}`, {
          ...options,
          signal: controller.signal,
          headers,
        });
      } else {
        throw networkErr;
      }
    }

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(data?.message || `Request failed with status ${response.status}`);
    }

    return data as T;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Connection timed out. Please check your network and try again.');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Fetch compatible available spaces for the staff member's assigned lot.
 */
export async function getAvailableWalkInSpaces(
  token: string,
  lotId?: string,
  vehicleType?: string
): Promise<{ spaces: WalkInSpaceItem[]; count: number; parkingLot: any }> {
  const query = new URLSearchParams();
  if (lotId) query.set('lotId', lotId);
  if (vehicleType) query.set('vehicleType', vehicleType);

  const endpoint = `/api/walk-in/spaces${query.toString() ? `?${query.toString()}` : ''}`;
  return authFetch<{ spaces: WalkInSpaceItem[]; count: number; parkingLot: any }>(endpoint, token);
}

/**
 * Create a new walk-in parking session.
 */
export async function createWalkInEntry(
  token: string,
  input: WalkInEntryInput
): Promise<{
  session: WalkInSessionData;
  calculation: WalkInTariffCalculation;
  receipt: WalkInReceiptData;
}> {
  const payload = {
    ...input,
    imageBase64: input.photoBase64,
  };

  return authFetch<{
    session: WalkInSessionData;
    calculation: WalkInTariffCalculation;
    receipt: WalkInReceiptData;
  }>('/api/walk-in/entry', token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

/**
 * Look up a walk-in session by receipt reference or ID with live billing breakdown.
 */
export async function getWalkInSession(
  token: string,
  refOrId: string
): Promise<{
  session: WalkInSessionData;
  calculation: WalkInTariffCalculation;
}> {
  return authFetch<{
    session: WalkInSessionData;
    calculation: WalkInTariffCalculation;
  }>(`/api/walk-in/session/${encodeURIComponent(refOrId.trim())}`, token);
}

/**
 * List active walk-ins for staff's assigned lot (lost receipt lookup).
 */
export async function getActiveWalkIns(
  token: string,
  lotId?: string,
  search?: string
): Promise<(WalkInSessionData & { calculation: WalkInTariffCalculation })[]> {
  const query = new URLSearchParams();
  if (lotId) query.set('lotId', lotId);
  if (search) query.set('search', search);

  const endpoint = `/api/walk-in/active${query.toString() ? `?${query.toString()}` : ''}`;
  return authFetch<(WalkInSessionData & { calculation: WalkInTariffCalculation })[]>(endpoint, token);
}

/**
 * Checkout a walk-in parking session, record cash payment, and release slot.
 */
export async function checkoutWalkIn(
  token: string,
  input: WalkInCheckoutInput
): Promise<{
  message: string;
  session: WalkInSessionData;
  payment?: any;
  calculation: WalkInTariffCalculation;
}> {
  return authFetch<{
    message: string;
    session: WalkInSessionData;
    payment?: any;
    calculation: WalkInTariffCalculation;
  }>('/api/walk-in/checkout', token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
}

export interface ShiftSummarySessionDetail {
  reference: string;
  vehiclePlate: string;
  vehicleType: string;
  spaceNumber: string;
  floor: string;
  entryTime: string;
  exitTime?: string;
  status: string;
  paymentStatus: string;
  amountPaid: number;
  totalAmount: number;
  durationHours: number;
  durationMinutes: number;
}

export interface ShiftSummaryData {
  date: string;
  staffId: string;
  staffName: string;
  lot: { _id?: string; name: string; address?: string; city?: string };
  summary: {
    totalSessions: number;
    completedSessions: number;
    activeSessions: number;
    overtimeCount: number;
    totalCashCollected: number;
    vehicleBreakdown: { Car: number; Bike: number; SUV: number; EV: number };
  };
  sessions: ShiftSummarySessionDetail[];
}

/**
 * Fetch daily shift cash reconciliation summary.
 */
export async function getShiftSummary(
  token: string,
  date?: string,
  lotId?: string
): Promise<ShiftSummaryData> {
  const query = new URLSearchParams();
  if (date) query.set('date', date);
  if (lotId) query.set('lotId', lotId);
  const endpoint = `/api/walk-in/shift-summary${query.toString() ? `?${query.toString()}` : ''}`;
  return authFetch<ShiftSummaryData>(endpoint, token);
}

/**
 * Automatically recognize vehicle license plate from an image via OCR.
 */
export async function recognizePlateFromImage(
  token: string,
  imageUri: string,
  base64?: string
): Promise<{ success: boolean; plate?: string; suggestedVehicleType?: string; rawText?: string }> {
  const baseUrl = (getApiBaseUrl() || API_BASE_URL).replace(/\/+$/, '');
  const url = `${baseUrl}/api/walk-in/recognize-plate`;

  let requestBody: any;
  let requestHeaders: Record<string, string> = {
    Authorization: `Bearer ${token}`,
  };

  if (base64) {
    requestHeaders['Content-Type'] = 'application/json';
    requestBody = JSON.stringify({ imageBase64: base64 });
  } else {
    const formData = new FormData();
    await appendImageToFormData(formData, 'photo', imageUri);
    requestBody = formData;
  }

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: requestHeaders,
      body: requestBody,
    });
  } catch (networkErr) {
    if (baseUrl !== LIVE_BACKEND_URL) {
      res = await fetch(`${LIVE_BACKEND_URL.replace(/\/+$/, '')}/api/walk-in/recognize-plate`, {
        method: 'POST',
        headers: requestHeaders,
        body: requestBody,
      });
    } else {
      throw networkErr;
    }
  }

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.message || 'Plate recognition request failed');
  }

  return res.json();
}
