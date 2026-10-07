import Constants from 'expo-constants';
import { Platform } from 'react-native';

export const LIVE_BACKEND_URL = 'https://parkme1-nine.vercel.app';

const configuredApiUrl = process.env.EXPO_PUBLIC_API_URL?.trim().replace(/\/+$/, '').replace(/\/api$/, '');

const getHostName = (hostUri?: string | null) => {
  if (!hostUri) return undefined;
  try {
    return new URL(hostUri.includes('://') ? hostUri : `http://${hostUri}`).hostname;
  } catch {
    return undefined;
  }
};

const isLoopbackUrl = (url?: string) => {
  if (!url) return false;
  try {
    const hostname = new URL(url).hostname;
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
  } catch {
    return false;
  }
};

export const getApiBaseUrl = (): string => {
  // If an HTTPS live URL is explicitly configured, always prioritize it
  if (configuredApiUrl && configuredApiUrl.startsWith('https://')) {
    return configuredApiUrl;
  }

  // Web platform resolution
  if (Platform.OS === 'web') {
    if (configuredApiUrl) return configuredApiUrl;
    const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
    if (host === 'localhost' || host === '127.0.0.1') {
      return 'http://localhost:5000';
    }
    return LIVE_BACKEND_URL;
  }

  // Development client connected to Metro on local machine
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    if (configuredApiUrl && !isLoopbackUrl(configuredApiUrl)) {
      return configuredApiUrl;
    }
    const metroHost = getHostName(Constants.expoConfig?.hostUri);
    if (metroHost) return `http://${metroHost}:5000`;
  }

  // Standalone installed APK or production builds default to the live HTTPS backend
  return configuredApiUrl || LIVE_BACKEND_URL;
};

export const API_BASE_URL = getApiBaseUrl();

export const getApiConnectionError = () =>
  `Could not reach the ParkMe backend at ${API_BASE_URL}. Please check your internet connection and verify that the backend service is active.`;

