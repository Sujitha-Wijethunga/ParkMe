import Constants from 'expo-constants';
import { DriverUser } from './storage';

/**
 * Resolves the backend base URL dynamically:
 * 1. Checks EXPO_PUBLIC_API_URL environment variable.
 * 2. If not defined, extracts Metro bundler host IP (e.g. 192.168.x.x) for physical-device / LAN support.
 * 3. Falls back to localhost for Web / Simulator.
 */
export function getApiBaseUrl(): string {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL.replace(/\/+$/, '').replace(/\/api$/, '');
  }

  // Derive host IP from Expo Constants when running in Expo Go / development client
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const host = hostUri.split(':')[0];
    if (host) {
      return `http://${host}:5000`;
    }
  }

  return 'http://localhost:5000';
}

const DEFAULT_TIMEOUT_MS = 10000;

export interface AuthResponse {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'driver';
  token: string;
}

export interface ApiError {
  message: string;
  errors?: { field: string; message: string }[];
  status?: number;
  isNetworkError?: boolean;
}

/**
 * Performs a fetch with a finite timeout.
 */
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } catch (error: any) {
    if (error.name === 'AbortError') {
      const err: ApiError = {
        message: 'Network request timed out. Please check your connection and try again.',
        isNetworkError: true,
      };
      throw err;
    }
    const err: ApiError = {
      message: error.message || 'Unable to connect to ParkMe server. Please verify your network.',
      isNetworkError: true,
    };
    throw err;
  } finally {
    clearTimeout(id);
  }
}

/**
 * Driver Login with email or mobile phone.
 */
export async function loginDriver(identifier: string, password: string): Promise<AuthResponse> {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}/api/auth/driver/login`;

  const response = await fetchWithTimeout(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: identifier.trim(), password }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const err: ApiError = {
      message: data.message || 'Login failed. Please check your credentials.',
      errors: data.errors,
      status: response.status,
    };
    throw err;
  }

  return data as AuthResponse;
}

/**
 * Driver Sign Up.
 * Confirm password is for frontend validation only and is not transmitted.
 */
export async function registerDriver(payload: {
  name: string;
  email: string;
  phone: string;
  password: string;
}): Promise<AuthResponse> {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}/api/auth/driver/register`;

  const response = await fetchWithTimeout(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: payload.name.trim(),
      email: payload.email.trim(),
      phone: payload.phone.trim(),
      password: payload.password,
    }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const err: ApiError = {
      message: data.message || 'Registration failed. Please check your inputs.',
      errors: data.errors,
      status: response.status,
    };
    throw err;
  }

  return data as AuthResponse;
}

/**
 * Retrieves the current authenticated user profile using a stored JWT token.
 */
export async function getCurrentUser(token: string): Promise<DriverUser> {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}/api/auth/me`;

  const response = await fetchWithTimeout(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const err: ApiError = {
      message: data.message || 'Session expired or invalid.',
      status: response.status,
    };
    throw err;
  }

  if (data.role !== 'driver') {
    const err: ApiError = {
      message: 'Active session is not a driver account.',
      status: 403,
    };
    throw err;
  }

  return data as DriverUser;
}

export interface GoogleAuthResponse extends AuthResponse {
  authProvider?: string;
}

/**
 * Authenticates with ParkMe backend using a verified Google ID token.
 */
export async function authWithGoogle(idToken: string): Promise<GoogleAuthResponse> {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}/api/auth/google`;

  const response = await fetchWithTimeout(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const err: ApiError & { code?: string } = {
      message: data.message || 'Google authentication failed. Please try again.',
      errors: data.errors,
      status: response.status,
      code: data.code,
    };
    throw err;
  }

  return data as GoogleAuthResponse;
}

