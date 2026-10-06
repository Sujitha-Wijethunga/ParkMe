import Constants from 'expo-constants';
import { Platform } from 'react-native';

const configuredApiUrl = process.env.EXPO_PUBLIC_API_URL?.trim().replace(/\/+$/, '');

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

const getApiBaseUrl = () => {
  if (Platform.OS === 'web') {
    if (configuredApiUrl) return configuredApiUrl;
    const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
    return `http://${host}:5000`;
  }

  if (configuredApiUrl && !isLoopbackUrl(configuredApiUrl)) return configuredApiUrl;
  const metroHost = getHostName(Constants.expoConfig?.hostUri);
  if (metroHost) return `http://${metroHost}:5000`;

  return configuredApiUrl || 'http://192.168.1.33:5000';
};

export const API_BASE_URL = getApiBaseUrl();

export const getApiConnectionError = () =>
  `Could not reach the backend at ${API_BASE_URL}. Make sure the backend is running and your phone and computer are connected to the same Wi-Fi.`;
