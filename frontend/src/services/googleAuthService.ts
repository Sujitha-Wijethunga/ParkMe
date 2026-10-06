import { Alert, Platform } from 'react-native';
import Constants from 'expo-constants';
import {
  GoogleSignin,
  statusCodes,
  isErrorWithCode,
  isSuccessResponse,
  isCancelledResponse,
} from '@react-native-google-signin/google-signin';

export interface GoogleAuthResult {
  success: boolean;
  idToken?: string;
  cancelled?: boolean;
  error?: string;
  isAccountCollision?: boolean;
}

let isConfigured = false;

/**
 * Initializes and configures GoogleSignin.
 *
 * Rules:
 * - Scopes: only basic identity scopes ('openid', 'email', 'profile').
 * - offlineAccess: false (no offline access or unnecessary scopes requested).
 * - Web Client ID is required for Google ID token issuance.
 */
export function configureGoogleSignIn(): void {
  if (isConfigured) return;

  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '';
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '';

  try {
    GoogleSignin.configure({
      webClientId: webClientId.trim() || undefined,
      iosClientId: iosClientId.trim() || undefined,
      scopes: ['openid', 'email', 'profile'],
      offlineAccess: false,
    });
    isConfigured = true;
  } catch (err: any) {
    console.warn('[googleAuthService.configure] Configuration error:', err?.message || err);
  }
}

/**
 * Detects whether the app is currently running inside standard Expo Go,
 * where custom native modules cannot execute without a development build.
 */
export function isRunningInExpoGo(): boolean {
  return Constants.appOwnership === 'expo';
}

/**
 * Initiates the native Google Sign-In flow.
 *
 * Handles:
 * - Expo Go native limitation detection with clear instructions.
 * - Missing/outdated Google Play Services on Android.
 * - User cancellation.
 * - In-progress operation debounce.
 * - Extraction of verified Google ID token.
 */
export async function promptNativeGoogleSignIn(): Promise<GoogleAuthResult> {
  // Check for Expo Go runtime limitation
  if (isRunningInExpoGo()) {
    const message =
      'Google Sign-In uses native Google Play / iOS identity services, which are not bundled into Expo Go.\n\n' +
      'To test Google Sign-In on a device, create an Expo Development Build:\n' +
      '• Local: npx expo run:android\n' +
      '• Cloud: eas build --profile development --platform android';

    Alert.alert('Development Build Required', message, [{ text: 'OK', style: 'default' }]);
    return {
      success: false,
      error: 'Expo Go does not include the native Google Sign-In module. A development build is required.',
    };
  }

  try {
    configureGoogleSignIn();

    // Check Google Play Services on Android
    if (Platform.OS === 'android') {
      try {
        await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      } catch (playServicesErr: any) {
        if (isErrorWithCode(playServicesErr) && playServicesErr.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
          Alert.alert(
            'Google Play Services Unavailable',
            'Google Play Services are missing or need to be updated on your device to sign in with Google.',
            [{ text: 'OK', style: 'default' }]
          );
          return {
            success: false,
            error: 'Google Play Services are not available on this device.',
          };
        }
        throw playServicesErr;
      }
    }

    // Launch Google Sign-In account picker
    const response = await GoogleSignin.signIn();

    if (isCancelledResponse(response)) {
      return { success: false, cancelled: true };
    }

    if (isSuccessResponse(response)) {
      const idToken = response.data?.idToken;

      if (!idToken) {
        Alert.alert(
          'Google Sign-In Error',
          'Google did not return an ID token. Please verify that the Web Client ID is configured in EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID.',
          [{ text: 'OK', style: 'default' }]
        );
        return {
          success: false,
          error: 'Missing Google ID token in response. Web Client ID may not be configured.',
        };
      }

      return { success: true, idToken };
    }

    return { success: false, cancelled: true };
  } catch (error: any) {
    if (isErrorWithCode(error)) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        return { success: false, cancelled: true };
      }

      if (error.code === statusCodes.IN_PROGRESS) {
        return { success: false, error: 'Sign in is already in progress.' };
      }

      if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        Alert.alert(
          'Google Play Services Error',
          'Google Play Services are not available or out of date.',
          [{ text: 'OK', style: 'default' }]
        );
        return { success: false, error: 'Google Play Services not available.' };
      }
    }

    // Native module not linked / missing in current binary
    const errorMsg = error?.message || String(error);
    if (
      errorMsg.includes('TurboModuleRegistry') ||
      errorMsg.includes('null') ||
      errorMsg.includes('RNGoogleSignin') ||
      errorMsg.includes('not linked')
    ) {
      Alert.alert(
        'Native Module Required',
        'Native Google Sign-In is not installed in the currently running binary. Please start the app using a development build (npx expo run:android).',
        [{ text: 'OK', style: 'default' }]
      );
      return {
        success: false,
        error: 'Native Google Sign-In module is not bundled in the current runtime.',
      };
    }

    console.warn('[promptNativeGoogleSignIn] Unexpected error:', error);
    Alert.alert(
      'Google Sign-In Failed',
      error?.message || 'An error occurred while connecting to Google. Please try again.',
      [{ text: 'OK', style: 'default' }]
    );
    return { success: false, error: error?.message || 'Google sign-in failed' };
  }
}

/**
 * Signs out of Google native session.
 */
export async function signOutOfGoogle(): Promise<void> {
  try {
    if (!isRunningInExpoGo()) {
      await GoogleSignin.signOut();
    }
  } catch {
    // Ignore sign-out errors on app cleanup
  }
}
