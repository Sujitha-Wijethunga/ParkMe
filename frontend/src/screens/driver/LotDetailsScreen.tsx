import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DriverColors } from '../../constants/colors';
import {
  ParkingLotCardItem,
  SAMPLE_NEARBY_PARKING_LOTS,
} from '../../constants/driverSampleData';
import ParkingLotImage from '../../components/ParkingLotImage';
import { getCurrentDriverLocation } from '../../services/locationService';
import { checkLotAvailability } from '../../services/parkingService';
import { launchDrivingNavigation } from '../../services/navigationLauncher';

interface LotDetailsScreenProps {
  /** Stable lot ID passed from the card that was tapped. */
  lotId: string;
  /** Navigate back to the originating screen (Home or Search Results). */
  onBack: () => void;
  /**
   * Navigate forward to space selection for this lot.
   * Replaces the milestone placeholder; wired in ParkMe-07-SelectSpace.
   */
  onSelectSpace: (lotId: string) => void;
}

const LOT_SAMPLE_COORDINATES: Record<string, { lat: number; lng: number }> = {
  'lot-1': { lat: 6.9271, lng: 79.8456 }, // One Galle Face
  'lot-2': { lat: 6.9065, lng: 79.8519 }, // Liberty Plaza
  'lot-3': { lat: 6.9175, lng: 79.8492 }, // Crescat Boulevard
  'lot-4': { lat: 6.8940, lng: 79.8548 }, // Majestic City
};

const AMENITY_ICONS: Record<string, string> = {
  'CCTV Surveillance': '📷',
  'EV Charging': '⚡',
  'Wheelchair Access': '♿',
  'Security Guard': '👮',
  'Covered Parking': '🏛️',
  'Valet Parking': '🤵',
  'Motorcycle Bay': '🏍️',
  'Well-lit': '💡',
  Accessible: '♿',
  CCTV: '📷',
};

/**
 * Driver Parking Lot Details Screen  (ParkMe-06-LotDetails)
 *
 * Shows details for the selected parking lot based on lotId.
 * Data is sourced from SAMPLE_NEARBY_PARKING_LOTS; no backend call is made.
 * Ratings and live occupancy counts are intentionally excluded – they are
 * not present in the current sample data and must not be fabricated.
 *
 * The "Reserve a Space" CTA is a placeholder that will be wired to the
 * Select Space milestone in the next sprint.
 */
export default function LotDetailsScreen({ lotId, onBack, onSelectSpace }: LotDetailsScreenProps) {
  const insets = useSafeAreaInsets();
  const [isNavigating, setIsNavigating] = useState(false);
  const [bottomBarHeight, setBottomBarHeight] = useState(0);

  // Dynamic safe-area paddings
  const bottomBarPaddingBottom =
    Math.max(insets.bottom, Platform.OS === 'ios' ? 14 : 8) + (insets.bottom > 0 ? 4 : 2);
  const topBarPaddingTop =
    Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) : 0) + 8;
  const heroHeight = 260 + (insets.top > 24 ? insets.top - 24 : 0);

  // Resolve the lot from the shared sample data by stable ID
  const lot: ParkingLotCardItem | undefined = SAMPLE_NEARBY_PARKING_LOTS.find(
    (l) => l.id === lotId
  );

  // ── Guard: unknown or missing lot ──────────────────────────────────────────
  if (!lot) {
    return (
      <View
        style={[
          styles.errorContainer,
          {
            paddingTop: Math.max(
              insets.top,
              Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) : 0
            ),
            paddingBottom: insets.bottom,
          },
        ]}
      >
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <View style={styles.errorInner}>
          <Text style={styles.errorEmoji}>🚧</Text>
          <Text style={styles.errorTitle}>Parking lot not found</Text>
          <Text style={styles.errorSubtitle}>
            The lot you selected could not be loaded.{'\n'}Please go back and try again.
          </Text>
          <TouchableOpacity style={styles.errorBackBtn} activeOpacity={0.8} onPress={onBack}>
            <Text style={styles.errorBackText}>← Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Derived values from sample data (no invented data)
  const availabilityPct = lot.totalSpaces > 0
    ? Math.round((lot.availableSpaces / lot.totalSpaces) * 100)
    : 0;
  const dailyRateEstimate = lot.pricePerHour * 6; // display-only estimate (6 hr cap convention)
  const lotCoords = lot.entranceCoordinates || LOT_SAMPLE_COORDINATES[lot.id];

  const handleReserve = () => {
    onSelectSpace(lot.id);
  };

  const handleNavigate = async () => {
    setIsNavigating(true);
    try {
      // 1. Verify availability
      const check = await checkLotAvailability(lot.id).catch(() => null);
      if (check && (!check.isAvailable || check.availableSpaces <= 0)) {
        Alert.alert(
          'Parking Lot Full',
          `Unfortunately, ${lot.name} currently has no reported available spaces. Please select another parking lot.`,
          [{ text: 'OK' }]
        );
        setIsNavigating(false);
        return;
      }

      // 2. Obtain current GPS location
      const coords = await getCurrentDriverLocation(8000);

      // 3. Resolve destination coordinates
      const dest =
        check?.navigationCoordinates ||
        LOT_SAMPLE_COORDINATES[lot.id] || { lat: 6.9271, lng: 79.8456 };
      const hasEntrance = Boolean(check?.hasEntranceCoordinates);

      await launchDrivingNavigation({
        originLat: coords.latitude,
        originLng: coords.longitude,
        destLat: dest.lat,
        destLng: dest.lng,
        lotName: lot.name,
        hasEntranceCoordinates: hasEntrance,
      });
    } catch (err: any) {
      Alert.alert('Navigation Error', err?.message || 'Could not launch turn-by-turn navigation.');
    } finally {
      setIsNavigating(false);
    }
  };

  return (
    <View style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* ── Scrollable body ─────────────────────────────────────────────────── */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingBottom:
              (bottomBarHeight > 0 ? bottomBarHeight : 100 + insets.bottom) + 16,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. Hero Image + Gradient Overlay ──────────────────────────────── */}
        <View style={[styles.heroContainer, { height: heroHeight }]}>
          <ParkingLotImage
            uri={lot.imageUrl}
            style={[styles.heroImage, { height: heroHeight }]}
            altName={lot.name}
          />
          {/* Dark gradient overlay */}
          <View style={styles.heroOverlay} />

          {/* Top action buttons */}
          <View
            style={[
              styles.heroTopBar,
              { paddingTop: topBarPaddingTop },
            ]}
          >
            <TouchableOpacity
              style={styles.heroBtn}
              activeOpacity={0.8}
              onPress={onBack}
              accessibilityLabel="Go back"
              accessibilityRole="button"
            >
              <Text style={styles.heroBtnText}>←</Text>
            </TouchableOpacity>

            <View style={styles.heroRightBtns}>
              <TouchableOpacity
                style={styles.heroBtn}
                activeOpacity={0.8}
                accessibilityLabel="Share this lot"
              >
                <Text style={styles.heroBtnText}>↗</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.heroBtn}
                activeOpacity={0.8}
                accessibilityLabel="Save to favourites"
              >
                <Text style={styles.heroBtnText}>♡</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Hero title block */}
          <View style={styles.heroTitleBlock}>
            <Text style={styles.heroLotName}>{lot.name}</Text>
            <View style={styles.heroAddressRow}>
              <Text style={styles.heroAddressIcon}>📍</Text>
              <Text style={styles.heroAddress}>{lot.address}, Sri Lanka</Text>
            </View>
          </View>
        </View>

        {/* 2. Quick Stats Row ─────────────────────────────────────────────── */}
        <View style={styles.statsRow}>
          {/* Distance */}
          <View style={styles.statCell}>
            <Text style={styles.statIcon}>📐</Text>
            <Text style={styles.statPrimary}>{lot.distance}</Text>
            <Text style={styles.statSecondary}>from you</Text>
          </View>

          <View style={styles.statDivider} />

          {/* Opening Hours */}
          <View style={styles.statCell}>
            <Text style={styles.statIcon}>🕐</Text>
            <Text style={[styles.statPrimary, styles.statGreen]}>
              {lot.openingHours ?? 'Hours N/A'}
            </Text>
            <Text style={styles.statSecondary}>
              {lot.parkingType ?? 'Parking'}
            </Text>
          </View>

          <View style={styles.statDivider} />

          {/* Max height */}
          <View style={styles.statCell}>
            <Text style={styles.statIcon}>🚗</Text>
            <Text style={styles.statPrimary}>{lot.maxHeight ?? '—'}</Text>
            <Text style={styles.statSecondary}>max height</Text>
          </View>
        </View>

        {/* 3. Current Availability ────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>CURRENT AVAILABILITY</Text>

          <View style={styles.availabilityRow}>
            <View style={styles.availBadgeRow}>
              <View style={[
                styles.statusBadge,
                lot.status === 'Available' && styles.statusBadgeGreen,
                lot.status === 'Full' && styles.statusBadgeRed,
                lot.status === 'Limited' && styles.statusBadgeOrange,
              ]}>
                <Text style={[
                  styles.statusBadgeText,
                  lot.status === 'Available' && styles.statusBadgeTextGreen,
                  lot.status === 'Full' && styles.statusBadgeTextRed,
                  lot.status === 'Limited' && styles.statusBadgeTextOrange,
                ]}>
                  {lot.status === 'Available' ? '✓ ' : lot.status === 'Full' ? '✕ ' : '⚠ '}
                  {lot.status}
                </Text>
              </View>
              <Text style={styles.availSpacesText}>
                <Text style={styles.availSpacesBold}>{lot.availableSpaces}</Text>
                {' '}of{' '}
                <Text style={styles.availSpacesBold}>{lot.totalSpaces}</Text>
                {' '}spots free
              </Text>
            </View>

            <View style={styles.availPctColumn}>
              <Text style={styles.availPctText}>{availabilityPct}% free</Text>
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${availabilityPct}%` },
                    lot.status === 'Full' && styles.progressFillRed,
                    lot.status === 'Limited' && styles.progressFillOrange,
                  ]}
                />
              </View>
            </View>
          </View>
        </View>

        {/* 4. Pricing ─────────────────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>PRICING</Text>

          <View style={styles.pricingCard}>
            {/* Hourly rate row */}
            <View style={styles.pricingRow}>
              <View style={styles.pricingLeft}>
                <Text style={styles.pricingIcon}>🕐</Text>
                <View>
                  <Text style={styles.pricingTitle}>Hourly Rate</Text>
                  <Text style={styles.pricingSubtitle}>Billed per hour started</Text>
                </View>
              </View>
              <Text style={styles.pricingAmount}>
                <Text style={styles.pricingAmountBold}>Rs. {lot.pricePerHour}</Text>
                <Text style={styles.pricingUnit}> / hr</Text>
              </Text>
            </View>

            <View style={styles.pricingDivider} />

            {/* Daily rate row (computed estimate) */}
            <View style={styles.pricingRow}>
              <View style={styles.pricingLeft}>
                <Text style={styles.pricingIcon}>📅</Text>
                <View>
                  <Text style={styles.pricingTitle}>Daily Rate</Text>
                  <Text style={styles.pricingSubtitle}>Max charge per calendar day</Text>
                </View>
              </View>
              <Text style={styles.pricingAmount}>
                <Text style={[styles.pricingAmountBold, styles.pricingAmountOrange]}>
                  Rs. {dailyRateEstimate}
                </Text>
                <Text style={styles.pricingUnit}> / day</Text>
              </Text>
            </View>
          </View>

          <Text style={styles.feesNote}>
            ✓ No hidden fees. Reservation fee of Rs. 25 applies.
          </Text>
        </View>

        {/* 5. Amenities & Security ────────────────────────────────────────── */}
        {lot.amenities && lot.amenities.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>AMENITIES &amp; SECURITY</Text>
            <View style={styles.amenitiesWrap}>
              {lot.amenities.map((amenity) => {
                const icon = AMENITY_ICONS[amenity] ?? '✓';
                return (
                  <View key={amenity} style={styles.amenityChip}>
                    <Text style={styles.amenityIcon}>{icon}</Text>
                    <Text style={styles.amenityLabel}>{amenity}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* 6. Location & Verified Entrance Card ─────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.locationHeaderRow}>
            <Text style={styles.sectionLabel}>LOCATION & ENTRANCE</Text>
            <TouchableOpacity activeOpacity={0.7} onPress={handleNavigate} disabled={isNavigating}>
              <Text style={styles.openMapsLink}>Open in Maps &gt;</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.locationCard}>
            <View style={styles.locationCardHeader}>
              <View style={styles.locationIconCircle}>
                <Text style={styles.locationPinIcon}>📍</Text>
              </View>
              <View style={styles.locationTextContainer}>
                <Text style={styles.locationCardTitle}>{lot.name}</Text>
                <Text style={styles.locationCardAddress}>{lot.address}, Sri Lanka</Text>
                {lot.entranceName ? (
                  <Text style={styles.locationEntranceName}>
                    Vehicle Entrance: {lot.entranceName}
                  </Text>
                ) : null}
                {lotCoords ? (
                  <Text style={styles.locationCoords}>
                    Verified GPS: {lotCoords.lat.toFixed(4)}° N, {lotCoords.lng.toFixed(4)}° E
                  </Text>
                ) : null}
              </View>
            </View>

            <TouchableOpacity
              style={styles.openMapsBtn}
              activeOpacity={0.85}
              onPress={handleNavigate}
              disabled={isNavigating}
              accessibilityRole="button"
              accessibilityLabel="Start navigation in Google Maps"
            >
              {isNavigating ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.openMapsBtnIcon}>🧭</Text>
                  <Text style={styles.openMapsBtnText}>Start Navigation in Google Maps</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* 7. Contact (if operator phone available) ───────────────────────── */}
        {lot.operatorPhone && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>CONTACT</Text>
            <View style={styles.contactRow}>
              <Text style={styles.contactIcon}>📞</Text>
              <Text style={styles.contactText}>{lot.operatorPhone}</Text>
            </View>
          </View>
        )}

        {/* Spacer not needed with dynamic scrollContent paddingBottom */}
        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* ── Sticky Bottom Bar ─────────────────────────────────────────────── */}
      <View
        style={[styles.bottomBar, { paddingBottom: bottomBarPaddingBottom }]}
        onLayout={(e) => setBottomBarHeight(e.nativeEvent.layout.height)}
      >
        <View style={styles.bottomPriceBlock}>
          <Text style={styles.bottomStartingLabel}>Starting from</Text>
          <Text style={styles.bottomPriceMain}>
            Rs. {lot.pricePerHour}
            <Text style={styles.bottomPriceUnit}> / hr</Text>
          </Text>
          <Text style={styles.bottomPriceDay}>Rs. {dailyRateEstimate} / day max</Text>
        </View>

        <View style={styles.bottomButtonsRow}>
          <TouchableOpacity
            style={styles.navigateBtn}
            activeOpacity={0.85}
            onPress={handleNavigate}
            disabled={isNavigating}
            accessibilityRole="button"
            accessibilityLabel={`Navigate to ${lot.name}`}
          >
            {isNavigating ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Text style={styles.navigateBtnIcon}>🧭</Text>
                <Text style={styles.navigateBtnText}>Navigate</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.reserveBtn}
            activeOpacity={0.88}
            onPress={handleReserve}
            accessibilityRole="button"
            accessibilityLabel={`Reserve a space at ${lot.name}`}
          >
            <Text style={styles.reserveBtnIcon}>✓</Text>
            <Text style={styles.reserveBtnText}>Reserve</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

/* ─── Styles ──────────────────────────────────────────────────────────────── */
const styles = StyleSheet.create({
  // ── Error / not-found state ──
  errorContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  errorInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  errorEmoji: { fontSize: 48, marginBottom: 16 },
  errorTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: DriverColors.navyHeading,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorSubtitle: {
    fontSize: 14,
    color: DriverColors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  errorBackBtn: {
    backgroundColor: DriverColors.navyDark,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  errorBackText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },

  // ── Main layout ──
  safeArea: {
    flex: 1,
    backgroundColor: DriverColors.background,
  },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 0 },

  // ── 1. Hero ──
  heroContainer: {
    height: 260,
    position: 'relative',
    backgroundColor: DriverColors.navyDark,
    overflow: 'hidden',
  },
  heroImage: {
    ...StyleSheet.absoluteFill,
    width: '100%',
    height: '100%',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(10, 17, 40, 0.62)',
  },
  heroTopBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    zIndex: 10,
  },
  heroRightBtns: {
    flexDirection: 'row',
    gap: 10,
  },
  heroBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroBtnText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 22,
  },
  heroTitleBlock: {
    position: 'absolute',
    bottom: 20,
    left: 18,
    right: 18,
  },
  heroLotName: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
    marginBottom: 6,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  heroAddressRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroAddressIcon: { fontSize: 12, marginRight: 4 },
  heroAddress: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '500',
  },

  // ── 2. Stats row ──
  statsRow: {
    flexDirection: 'row',
    backgroundColor: DriverColors.surface,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: DriverColors.borderLight,
  },
  statCell: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: DriverColors.borderLight,
    marginVertical: 4,
  },
  statIcon: { fontSize: 16, marginBottom: 4 },
  statPrimary: {
    fontSize: 13.5,
    fontWeight: '800',
    color: DriverColors.navyHeading,
    textAlign: 'center',
  },
  statGreen: { color: '#059669' },
  statSecondary: {
    fontSize: 11,
    color: DriverColors.textSecondary,
    marginTop: 1,
    textAlign: 'center',
  },

  // ── Sections common ──
  section: {
    backgroundColor: DriverColors.surface,
    marginTop: 10,
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: DriverColors.textSecondary,
    letterSpacing: 0.8,
    marginBottom: 12,
  },

  // ── 3. Availability ──
  availabilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  availBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: DriverColors.cardBorder,
    backgroundColor: DriverColors.surface,
  },
  statusBadgeGreen: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  statusBadgeRed: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
  },
  statusBadgeOrange: {
    backgroundColor: '#FFF7ED',
    borderColor: '#FED7AA',
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: DriverColors.textBody,
  },
  statusBadgeTextGreen: { color: '#059669' },
  statusBadgeTextRed: { color: '#DC2626' },
  statusBadgeTextOrange: { color: '#D97706' },
  availSpacesText: {
    fontSize: 13,
    color: DriverColors.textSecondary,
    flexShrink: 1,
  },
  availSpacesBold: {
    fontWeight: '800',
    color: DriverColors.navyHeading,
    fontSize: 14,
  },
  availPctColumn: {
    alignItems: 'flex-end',
    minWidth: 90,
  },
  availPctText: {
    fontSize: 12,
    fontWeight: '700',
    color: DriverColors.textSecondary,
    marginBottom: 5,
  },
  progressTrack: {
    width: 88,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#E2E8F0',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  progressFillRed: { backgroundColor: '#EF4444' },
  progressFillOrange: { backgroundColor: '#F59E0B' },

  // ── 4. Pricing ──
  pricingCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: DriverColors.cardBorder,
    overflow: 'hidden',
  },
  pricingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  pricingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  pricingIcon: { fontSize: 18 },
  pricingTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: DriverColors.navyHeading,
  },
  pricingSubtitle: {
    fontSize: 11.5,
    color: DriverColors.textSecondary,
    marginTop: 2,
  },
  pricingDivider: {
    height: 1,
    backgroundColor: DriverColors.cardBorder,
    marginHorizontal: 16,
  },
  pricingAmount: {
    flexShrink: 0,
  },
  pricingAmountBold: {
    fontSize: 17,
    fontWeight: '800',
    color: DriverColors.navyHeading,
  },
  pricingAmountOrange: { color: DriverColors.orangePrimary },
  pricingUnit: {
    fontSize: 12,
    color: DriverColors.textSecondary,
  },
  feesNote: {
    fontSize: 12,
    color: DriverColors.textSecondary,
    marginTop: 10,
    lineHeight: 18,
  },

  // ── 5. Amenities ──
  amenitiesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  amenityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: DriverColors.cardBorder,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: '#F8FAFC',
    gap: 6,
  },
  amenityIcon: { fontSize: 13 },
  amenityLabel: {
    fontSize: 12.5,
    color: DriverColors.textBody,
    fontWeight: '600',
  },

  // ── 6. Location map ──
  locationHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  openMapsLink: {
    fontSize: 13,
    fontWeight: '700',
    color: DriverColors.navyDark,
  },
  locationCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    marginTop: 4,
  },
  locationCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  locationIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  locationPinIcon: {
    fontSize: 18,
  },
  locationTextContainer: {
    flex: 1,
  },
  locationCardTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: DriverColors.navyHeading,
  },
  locationCardAddress: {
    fontSize: 12.5,
    color: DriverColors.textSecondary,
    marginTop: 2,
  },
  locationEntranceName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563EB',
    marginTop: 4,
  },
  locationCoords: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 3,
    fontStyle: 'italic',
  },
  openMapsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: DriverColors.brandPrimary,
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: 10,
    gap: 8,
  },
  openMapsBtnIcon: {
    fontSize: 16,
  },
  openMapsBtnText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '700',
  },

  // ── 7. Contact ──
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  contactIcon: { fontSize: 18 },
  contactText: {
    fontSize: 14,
    fontWeight: '600',
    color: DriverColors.textBody,
  },

  // ── Bottom spacer ──
  bottomSpacer: { height: 0 },

  // ── Sticky bottom bar ──
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: DriverColors.surface,
    borderTopWidth: 1,
    borderTopColor: DriverColors.borderLight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 12,
  },
  bottomPriceBlock: {
    flex: 1,
    marginRight: 16,
  },
  bottomStartingLabel: {
    fontSize: 11,
    color: DriverColors.textSecondary,
    fontWeight: '500',
    marginBottom: 1,
  },
  bottomPriceMain: {
    fontSize: 22,
    fontWeight: '800',
    color: DriverColors.navyHeading,
    letterSpacing: -0.3,
    lineHeight: 26,
  },
  bottomPriceUnit: {
    fontSize: 13,
    fontWeight: '500',
    color: DriverColors.textSecondary,
  },
  bottomPriceDay: {
    fontSize: 11.5,
    color: DriverColors.textSecondary,
    marginTop: 2,
  },
  bottomButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  navigateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E3A8A',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 28,
    gap: 6,
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 5,
  },
  navigateBtnIcon: {
    fontSize: 15,
  },
  navigateBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  reserveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: DriverColors.orangePrimary,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 28,
    gap: 6,
    shadowColor: DriverColors.orangePrimary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  reserveBtnIcon: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  reserveBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.1,
  },
});
