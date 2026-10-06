import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  ImageStyle,
  StyleProp,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { DriverColors } from '../constants/colors';

interface ParkingLotImageProps {
  source?: { uri?: string } | null;
  uri?: string | null;
  altName?: string;
  style?: StyleProp<ImageStyle>;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'center';
  parkingType?: string;
  isCovered?: boolean;
  accessibilityLabel?: string;
}

/**
 * ParkingLotImage
 *
 * Professional parking venue image component that:
 * 1. Gracefully renders parking location photography.
 * 2. Displays a subtle activity indicator while loading.
 * 3. Gracefully catches load errors (or missing URIs) and displays a clean,
 *    authentic parking facility fallback with the "🅿️" emblem and facility type.
 * 4. Strictly avoids fabricating logos or misrepresenting stock images as official venue logos.
 */
export default function ParkingLotImage({
  source,
  uri,
  altName,
  style,
  resizeMode = 'cover',
  parkingType = 'Parking Facility',
  isCovered = false,
  accessibilityLabel,
}: ParkingLotImageProps) {
  const imageUri = uri || source?.uri;
  const [isLoading, setIsLoading] = useState<boolean>(Boolean(imageUri));
  const [hasError, setHasError] = useState<boolean>(!imageUri);

  const resolvedLabel = accessibilityLabel || altName || 'Parking facility image';

  if (hasError || !imageUri) {
    return (
      <View style={[styles.fallbackContainer, style]} accessibilityLabel={`${resolvedLabel} (Facility image placeholder)`}>
        <View style={styles.fallbackIconBadge}>
          <Text style={styles.fallbackIconText}>🅿️</Text>
        </View>
        <Text style={styles.fallbackTypeText} numberOfLines={1}>
          {isCovered ? 'Covered Parking' : (altName || parkingType)}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.wrapper, style]}>
      <Image
        source={{ uri: imageUri }}
        style={[StyleSheet.absoluteFill, style]}
        resizeMode={resizeMode}
        onLoadStart={() => setIsLoading(true)}
        onLoadEnd={() => setIsLoading(false)}
        onError={() => {
          setIsLoading(false);
          setHasError(true);
        }}
        accessibilityLabel={resolvedLabel}
      />
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="small" color={DriverColors.brandPrimary} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    overflow: 'hidden',
    backgroundColor: '#F1F5F9',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackContainer: {
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    padding: 8,
  },
  fallbackIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  fallbackIconText: {
    fontSize: 20,
  },
  fallbackTypeText: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    textAlign: 'center',
  },
});
