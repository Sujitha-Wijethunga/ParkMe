import { API_BASE_URL } from '../constants/api';

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
    const url = `${API_BASE_URL.replace(/\/+$/, '')}${endpoint}`;
    const headers: Record<string, string> = {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers as Record<string, string>),
    };

    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers,
    });

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
  if (input.photoUri) {
    const formData = new FormData();
    if (input.parkingLotId) formData.append('parkingLotId', input.parkingLotId);
    formData.append('vehiclePlate', input.vehiclePlate);
    formData.append('vehicleType', input.vehicleType);
    formData.append('parkingSpaceId', input.parkingSpaceId);
    if (input.floor) formData.append('floor', input.floor);
    if (input.customerName) formData.append('customerName', input.customerName);
    if (input.customerPhone) formData.append('customerPhone', input.customerPhone);
    if (input.idempotencyKey) formData.append('idempotencyKey', input.idempotencyKey);

    const filename = input.photoUri.split('/').pop() || 'plate.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1].toLowerCase()}` : 'image/jpeg';

    formData.append('photo', {
      uri: input.photoUri,
      name: filename,
      type,
    } as any);

    return authFetch<{
      session: WalkInSessionData;
      calculation: WalkInTariffCalculation;
      receipt: WalkInReceiptData;
    }>('/api/walk-in/entry', token, {
      method: 'POST',
      body: formData,
    });
  }

  return authFetch<{
    session: WalkInSessionData;
    calculation: WalkInTariffCalculation;
    receipt: WalkInReceiptData;
  }>('/api/walk-in/entry', token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
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
): Promise<Array<WalkInSessionData & { calculation: WalkInTariffCalculation }>> {
  const query = new URLSearchParams();
  if (lotId) query.set('lotId', lotId);
  if (search) query.set('search', search);

  const endpoint = `/api/walk-in/active${query.toString() ? `?${query.toString()}` : ''}`;
  return authFetch<Array<WalkInSessionData & { calculation: WalkInTariffCalculation }>>(endpoint, token);
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
