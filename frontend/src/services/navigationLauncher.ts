import { Linking, Platform, Alert } from 'react-native';

export interface LaunchNavigationParams {
  originLat: number;
  originLng: number;
  destLat: number;
  destLng: number;
  lotName: string;
  hasEntranceCoordinates?: boolean;
}

/**
 * Builds the platform-specific turn-by-turn driving navigation URL.
 *
 * - Android: Native Google Maps Turn-by-Turn intent: `google.navigation:q=lat,lng&mode=d`
 * - iOS: Native Apple Maps driving directions: `maps://?saddr=lat,lng&daddr=lat,lng&dirflg=d`
 * - Fallback / Web: Universal Google Maps directions URL
 */
export function getPlatformNavigationUrls(params: LaunchNavigationParams) {
  const { originLat, originLng, destLat, destLng } = params;

  const fallbackWebUrl = `https://www.google.com/maps/dir/?api=1&origin=${originLat},${originLng}&destination=${destLat},${destLng}&travelmode=driving`;

  let nativeAppUrl = fallbackWebUrl;

  if (Platform.OS === 'android') {
    nativeAppUrl = `google.navigation:q=${destLat},${destLng}&mode=d`;
  } else if (Platform.OS === 'ios') {
    nativeAppUrl = `maps://?saddr=${originLat},${originLng}&daddr=${destLat},${destLng}&dirflg=d`;
  }

  return {
    nativeAppUrl,
    fallbackWebUrl,
  };
}

/**
 * Launches turn-by-turn driving directions in the device's installed navigation app,
 * falling back to the web browser if the native app cannot be opened.
 *
 * @param params Navigation coordinates and lot details
 * @returns boolean True if navigation was successfully opened
 */
export async function launchDrivingNavigation(
  params: LaunchNavigationParams
): Promise<boolean> {
  const { nativeAppUrl, fallbackWebUrl } = getPlatformNavigationUrls(params);

  try {
    if (Platform.OS !== 'web') {
      const canOpenNative = await Linking.canOpenURL(nativeAppUrl).catch(() => false);
      if (canOpenNative) {
        await Linking.openURL(nativeAppUrl);
        return true;
      }
    }

    // Try fallback web directions URL
    const canOpenWeb = await Linking.canOpenURL(fallbackWebUrl).catch(() => false);
    if (canOpenWeb) {
      await Linking.openURL(fallbackWebUrl);
      return true;
    }

    // If both fail:
    Alert.alert(
      'Unable to Open Navigation',
      'No compatible maps application or web browser was found on your device to open driving directions.',
      [{ text: 'OK', style: 'default' }]
    );
    return false;
  } catch (err: any) {
    console.warn('Navigation launch error:', err);

    // Final attempt with web fallback
    try {
      await Linking.openURL(fallbackWebUrl);
      return true;
    } catch {
      Alert.alert(
        'Navigation Error',
        `Could not launch directions to ${params.lotName}. Please ensure a map application is installed.`,
        [{ text: 'OK', style: 'default' }]
      );
      return false;
    }
  }
}
