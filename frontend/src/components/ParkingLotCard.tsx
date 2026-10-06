import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { DriverColors } from '../constants/colors';
import { ParkingLotCardItem } from '../constants/driverSampleData';
import ParkingLotImage from './ParkingLotImage';

interface ParkingLotCardProps {
  lot: ParkingLotCardItem;
  onPress?: (lotId: string) => void;
  isSelected?: boolean;
}

/**
 * Shared Parking Lot Card Component
 * Reusable across Driver Home Screen and Search Results Screen.
 */
export default function ParkingLotCard({
  lot,
  onPress,
  isSelected = false,
}: ParkingLotCardProps) {
  return (
    <TouchableOpacity
      style={[
        styles.card,
        isSelected && styles.cardSelected,
      ]}
      activeOpacity={0.88}
      onPress={() => onPress && onPress(lot.id)}
      accessibilityRole="button"
      accessibilityLabel={`${lot.name}, ${lot.distance}, Rs. ${lot.pricePerHour} per hour, ${lot.availableSpaces} spaces available`}
    >
      <View style={styles.contentRow}>
        {/* Left Thumbnail Image with EV Badge */}
        <View style={styles.imageContainer}>
          <ParkingLotImage
            source={{ uri: lot.imageUrl }}
            style={styles.image}
            resizeMode="cover"
            parkingType={lot.parkingType}
            isCovered={lot.isCovered}
            accessibilityLabel={`${lot.name} photo`}
          />
          {lot.hasEVCharging && (
            <View style={styles.evBadge}>
              <Text style={styles.evBadgeIcon}>⚡</Text>
            </View>
          )}
        </View>

        {/* Right Details Column */}
        <View style={styles.infoColumn}>
          {/* Status & Distance Row */}
          <View style={styles.statusRow}>
            <View style={styles.availableBadge}>
              <Text style={styles.checkIcon}>✓</Text>
              <Text style={styles.availableBadgeText}>{lot.status}</Text>
            </View>
            <View style={styles.distanceContainer}>
              <Text style={styles.distanceIcon}>📍</Text>
              <Text style={styles.distanceText}>{lot.distance}</Text>
            </View>
          </View>

          {/* Lot Name & Address */}
          <Text style={styles.nameText} numberOfLines={1}>
            {lot.name}
          </Text>
          <Text style={styles.addressText} numberOfLines={1}>
            {lot.address}
          </Text>

          {/* Bottom Stats: Capacity & Pricing */}
          <View style={styles.bottomRow}>
            <View style={styles.capacityRow}>
              <Text style={styles.remainingSpacesText}>
                <Text style={styles.remainingSpacesBold}>{lot.availableSpaces}</Text>
                /{lot.totalSpaces} left
              </Text>
              {lot.isCovered && (
                <View style={styles.coveredBadge}>
                  <Text style={styles.coveredBadgeText}>Covered</Text>
                </View>
              )}
            </View>

            {/* Hourly Rate */}
            <Text style={styles.priceContainer}>
              <Text style={styles.priceBold}>Rs. {lot.pricePerHour}</Text>
              <Text style={styles.priceUnit}>/hr</Text>
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: DriverColors.surface,
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: DriverColors.cardBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 2,
    marginBottom: 10,
  },
  cardSelected: {
    borderColor: DriverColors.orangePrimary,
    borderWidth: 2,
    backgroundColor: '#FFFAF6',
  },
  contentRow: {
    flexDirection: 'row',
  },
  imageContainer: {
    width: 96,
    height: 96,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#E2E8F0',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  evBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: DriverColors.navyDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  evBadgeIcon: {
    fontSize: 11,
    color: '#FFFFFF',
  },
  infoColumn: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'space-between',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  availableBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: DriverColors.greenBadgeBg,
    borderColor: DriverColors.greenBadgeBorder,
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 12,
  },
  checkIcon: {
    fontSize: 10,
    color: DriverColors.greenBadgeText,
    fontWeight: '800',
    marginRight: 3,
  },
  availableBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: DriverColors.greenBadgeText,
  },
  distanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  distanceIcon: {
    fontSize: 11,
    marginRight: 2,
  },
  distanceText: {
    fontSize: 12,
    fontWeight: '600',
    color: DriverColors.textSecondary,
  },
  nameText: {
    fontSize: 15,
    fontWeight: '800',
    color: DriverColors.navyHeading,
    marginTop: 3,
  },
  addressText: {
    fontSize: 12,
    color: DriverColors.textSecondary,
    marginTop: 1,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  capacityRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  remainingSpacesText: {
    fontSize: 12,
    color: DriverColors.textSecondary,
  },
  remainingSpacesBold: {
    fontSize: 13,
    fontWeight: '800',
    color: DriverColors.navyHeading,
  },
  coveredBadge: {
    backgroundColor: DriverColors.coveredBadgeBg,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
    marginLeft: 6,
  },
  coveredBadgeText: {
    fontSize: 10.5,
    color: DriverColors.coveredBadgeText,
    fontWeight: '600',
  },
  priceContainer: {
    fontSize: 12,
  },
  priceBold: {
    fontSize: 15,
    fontWeight: '800',
    color: DriverColors.navyHeading,
  },
  priceUnit: {
    fontSize: 11.5,
    color: DriverColors.textSecondary,
  },
});
