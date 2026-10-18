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
  // Web platform resolution
  if (Platform.OS === 'web') {
    if (configuredApiUrl && !isLoopbackUrl(configuredApiUrl)) return configuredApiUrl;
    const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
    if (host && host !== 'parkme1-nine.vercel.app' && host !== 'parkme.lk') {
      return `http://${host}:5000`;
    }
    return configuredApiUrl || LIVE_BACKEND_URL;
  }

  // Development client connected to Metro on local machine
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    const metroHost = getHostName(Constants.expoConfig?.hostUri);
    if (metroHost && !isLoopbackUrl(`http://${metroHost}:5000`)) {
      return `http://${metroHost}:5000`;
    }
    if (configuredApiUrl && !isLoopbackUrl(configuredApiUrl) && !configuredApiUrl.includes('vercel.app')) {
      return configuredApiUrl;
    }
  }

  // Standalone installed APK or production builds default to the live HTTPS backend
  return configuredApiUrl || LIVE_BACKEND_URL;
};

export const API_BASE_URL = getApiBaseUrl();

export const getApiConnectionError = () =>
  `Could not reach the ParkMe backend at ${API_BASE_URL}. Please check your internet connection and verify that the backend service is active.`;

