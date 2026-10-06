import { Linking, Platform, Alert, Share } from 'react-native';

export interface LaunchNavigationParams {
  originLat?: number;
  originLng?: number;
  destLat: number;
  destLng: number;
  lotName?: string;
  hasEntranceCoordinates?: boolean;
}

/**
 * Validates that latitude and longitude are valid numeric geographic coordinates.
 * Excludes NaN, infinite, out-of-range, and uninitialized (0, 0) coordinates.
 */
export function isValidCoordinate(lat?: number | null, lng?: number | null): boolean {
  if (typeof lat !== 'number' || typeof lng !== 'number') return false;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return false;
  if (lat === 0 && lng === 0) return false;
  return true;
}

/**
 * Constructs the canonical Google Maps universal driving directions URL.
 * Omission of origin allows Google Maps to automatically route from the device's live GPS position.
 *
 * Format:
 * https://www.google.com/maps/dir/?api=1&destination=LAT,LNG&travelmode=driving&dir_action=navigate
 */
export function buildGoogleMapsUniversalUrl(destLat: number, destLng: number): string {
  if (!isValidCoordinate(destLat, destLng)) {
    throw new Error(`Invalid navigation destination coordinates: lat=${destLat}, lng=${destLng}`);
  }
  return `https://www.google.com/maps/dir/?api=1&destination=${destLat},${destLng}&travelmode=driving&dir_action=navigate`;
}

/**
 * Shares or copies the directions URL using the native system share dialog.
 */
export async function shareDirectionsUrl(url: string, lotName?: string): Promise<boolean> {
  try {
    await Share.share({
      title: `Driving Directions to ${lotName || 'Parking Lot'}`,
      message: url,
      url: url,
    });
    return true;
  } catch (err: any) {
    console.warn('[Navigation] Share link error:', err?.message || err);
    return false;
  }
}

/**
 * Legacy URL resolver preserved for backwards compatibility.
 */
export function getPlatformNavigationUrls(params: LaunchNavigationParams) {
  const { originLat, originLng, destLat, destLng } = params;
  const fallbackWebUrl = buildGoogleMapsUniversalUrl(destLat, destLng);

  let nativeAppUrl = fallbackWebUrl;
  if (Platform.OS === 'android') {
    nativeAppUrl = `google.navigation:q=${destLat},${destLng}&mode=d`;
  } else if (Platform.OS === 'ios' && originLat !== undefined && originLng !== undefined) {
    nativeAppUrl = `maps://?saddr=${originLat},${originLng}&daddr=${destLat},${destLng}&dirflg=d`;
  }

  return { nativeAppUrl, fallbackWebUrl };
}

/**
 * Launches turn-by-turn driving directions to the destination coordinates.
 *
 * Direct Approach:
 * 1. Validates destination coordinates before attempting to build or open the URL.
 * 2. Attempts direct Linking.openURL(universalUrl) without a Linking.canOpenURL() gate.
 *    (Avoids Linking.canOpenURL() which causes false negative failures on Android 11+ / API 30+).
 * 3. On actual rejection, attempts native intent fallback and provides a user-friendly
 *    dialog with a "Copy / Share Link" fallback option.
 *
 * @param params Destination coordinates and optional lot name
 * @returns Object with success status, url, and optional error message
 */
export async function launchDrivingNavigation(
  params: LaunchNavigationParams
): Promise<{ success: boolean; url: string; error?: string }> {
  const { destLat, destLng, lotName } = params;

  // 1. Strict coordinate validation: never substitute or guess coordinates
  if (!isValidCoordinate(destLat, destLng)) {
    console.warn('[Navigation] Launch aborted: Destination coordinates are missing or invalid.');
    Alert.alert(
      'Navigation Unavailable',
      'The destination coordinates for this parking lot are invalid or missing.',
      [{ text: 'OK', style: 'default' }]
    );
    return { success: false, url: '', error: 'Invalid destination coordinates' };
  }

  // 2. Build the universal directions URL
  const universalUrl = buildGoogleMapsUniversalUrl(destLat, destLng);
  console.log('[Navigation] Opening Google Maps directions URL:', universalUrl);

  // 3. Attempt direct Linking.openURL without canOpenURL() gate
  try {
    await Linking.openURL(universalUrl);
    return { success: true, url: universalUrl };
  } catch (openErr: any) {
    const errorMsg = openErr?.message || String(openErr);
    console.warn('[Navigation] Linking.openURL failed for universal URL:', errorMsg);

    // 4. On Android, attempt native intent fallback if universal URL fails
    if (Platform.OS === 'android') {
      const androidAppIntent = `google.navigation:q=${destLat},${destLng}&mode=d`;
      try {
        console.log('[Navigation] Attempting Android native intent fallback:', androidAppIntent);
        await Linking.openURL(androidAppIntent);
        return { success: true, url: androidAppIntent };
      } catch (intentErr: any) {
        console.warn('[Navigation] Android native intent fallback also failed:', intentErr?.message || intentErr);
      }
    }

    // 5. Catch actual rejection and provide fallback that lets user copy or share the directions URL
    Alert.alert(
      'Unable to Open Navigation',
      `Could not automatically launch navigation directions${lotName ? ` to ${lotName}` : ''}.\n\nError: ${errorMsg}\n\nWould you like to copy or share the directions link?`,
      [
        {
          text: 'Copy / Share Link',
          onPress: () => {
            void shareDirectionsUrl(universalUrl, lotName);
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );

    return { success: false, url: universalUrl, error: errorMsg };
  }
}
