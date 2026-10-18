/**
 * PayHere Payment Gateway Service (Sri Lanka)
 *
 * Facilitates card, FriMi, Genie, eZ Cash, and mCash payments via PayHere LK.
 * In development / sandbox mode, utilizes https://sandbox.payhere.lk/pay/checkout.
 */
import { Linking } from 'react-native';
import { API_BASE_URL } from '../constants/api';

export interface PayHereCheckoutRequest {
  orderId: string;
  amount: number;
  items: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  token?: string | null;
}

export interface PayHereParams {
  sandbox: boolean;
  actionUrl: string;
  merchant_id: string;
  return_url: string;
  cancel_url: string;
  notify_url: string;
  order_id: string;
  items: string;
  currency: string;
  amount: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  hash: string;
}

export interface PayHereCheckoutResult {
  success: boolean;
  orderId: string;
  paymentMethod: string;
  transactionId?: string;
  error?: string;
}

/**
 * Fetch signed PayHere checkout parameters from the backend.
 */
export async function getPayHereParams(
  request: PayHereCheckoutRequest
): Promise<PayHereParams> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (request.token) {
    headers.Authorization = `Bearer ${request.token}`;
  }

  const res = await fetch(`${API_BASE_URL}/api/payments/payhere-params`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      orderId: request.orderId,
      amount: request.amount,
      items: request.items,
      customerName: request.customerName || 'ParkMe Customer',
      customerEmail: request.customerEmail || 'customer@parkme.lk',
      customerPhone: request.customerPhone || '0771234567',
    }),
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.message || 'Failed to initialize PayHere gateway');
  }

  return res.json();
}

/**
 * Initiate a PayHere payment session.
 * Generates parameters and opens the payment gateway in external browser / in-app browser.
 */
export async function launchPayHerePayment(
  request: PayHereCheckoutRequest
): Promise<PayHereCheckoutResult> {
  const params = await getPayHereParams(request);

  // Construct query parameters for PayHere checkout redirect
  const queryParams = new URLSearchParams({
    merchant_id: params.merchant_id,
    return_url: params.return_url,
    cancel_url: params.cancel_url,
    notify_url: params.notify_url,
    order_id: params.order_id,
    items: params.items,
    currency: params.currency,
    amount: params.amount,
    first_name: params.first_name,
    last_name: params.last_name,
    email: params.email,
    phone: params.phone,
    address: params.address,
    city: params.city,
    country: params.country,
    hash: params.hash,
  });

  const fullCheckoutUrl = `${params.actionUrl}?${queryParams.toString()}`;

  const canOpen = await Linking.canOpenURL(fullCheckoutUrl).catch(() => false);
  if (canOpen) {
    await Linking.openURL(fullCheckoutUrl);
  }

  return {
    success: true,
    orderId: request.orderId,
    paymentMethod: 'PayHere (LKR Gateway)',
    transactionId: `PH-${params.order_id}`,
  };
}
