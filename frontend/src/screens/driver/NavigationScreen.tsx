import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Platform,
  BackHandler,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DriverColors } from '../../constants/colors';
import { SAMPLE_NEARBY_PARKING_LOTS } from '../../constants/driverSampleData';
import { BookingDetails } from '../../constants/bookingTypes';
import {
  getParkingLotEntranceInfo,
  launchGoogleMapsNavigation,
  shareDirectionsUrl,
  buildGoogleMapsUniversalUrl,
} from '../../services/parkingEntranceService';

interface NavigationScreenProps {
  booking: BookingDetails;
  /** Go back to Booking Confirmed or previous screen. */
  onCancel: () => void;
  /** User arrived at the lot. */
  onArrived: () => void;
}

export default function NavigationScreen({
  booking,
  onCancel,
  onArrived,
}: NavigationScreenProps) {
  const insets = useSafeAreaInsets();
  const [isLaunchingNav, setIsLaunchingNav] = useState(false);

  // Look up lot details and verified vehicle entrance coordinates
  const lot = SAMPLE_NEARBY_PARKING_LOTS.find((l) => l.id === booking.lotId);
  const entranceInfo = getParkingLotEntranceInfo(booking.lotId, lot);

  const topPadding = Math.max(
    insets.top,
    Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) : 0
  );
  const bottomPadding = Math.max(insets.bottom, 16) + 8;

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onCancel();
      return true;
    });
    return () => sub.remove();
  }, [onCancel]);

  /**
   * Launches free Google Maps turn-by-turn driving directions to the verified entrance.
   * Note: Opening Google Maps does NOT mark arrival. Arrival is confirmed by tapping "I've Arrived".
   */
  const handleStartGoogleMapsNavigation = async () => {
    if (!entranceInfo.hasVerifiedEntrance || entranceInfo.latitude === null || entranceInfo.longitude === null) {
      return;
    }

    setIsLaunchingNav(true);
    try {
      await launchGoogleMapsNavigation({
        destLat: entranceInfo.latitude,
        destLng: entranceInfo.longitude,
        lotName: entranceInfo.lotName,
      });
    } finally {
      setIsLaunchingNav(false);
    }
  };

  const handleCopyOrShareLink = async () => {
    if (
      !entranceInfo.hasVerifiedEntrance ||
      entranceInfo.latitude === null ||
      entranceInfo.longitude === null
    ) {
      return;
    }
    const url = buildGoogleMapsUniversalUrl(entranceInfo.latitude, entranceInfo.longitude);
    await shareDirectionsUrl(url, entranceInfo.lotName);
  };

  return (
    <View style={[styles.safeArea, { paddingTop: topPadding }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />

      {/* Screen Header */}
      <View style={styles.header}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Cancel and return"
          style={styles.backBtn}
          activeOpacity={0.7}
          onPress={onCancel}
        >
          <Text style={styles.backBtnText}>‹</Text>
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Driver Navigation</Text>
          <Text style={styles.headerSubtitle}>Google Maps Live Directions</Text>
        </View>
        <View style={styles.headerRightSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPadding + 80 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Destination Summary Card */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.categoryLabel}>NAVIGATING TO</Text>
            <View style={styles.badgeFree}>
              <Text style={styles.badgeFreeText}>Free Directions</Text>
            </View>
          </View>

          <Text style={styles.lotName} numberOfLines={2}>
            {entranceInfo.lotName}
          </Text>

          {Boolean(entranceInfo.address) && (
            <Text style={styles.lotAddress} numberOfLines={2}>
              📍 {entranceInfo.address}
            </Text>
          )}

          {/* Reserved Space Information Grid */}
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>RESERVED SPACE</Text>
              <Text style={styles.metaValueHighlight}>Space {booking.spaceId}</Text>
            </View>
            <View style={styles.metaDivider} />
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>FLOOR</Text>
              <Text style={styles.metaValue}>{booking.floor || 'Ground'}</Text>
            </View>
            <View style={styles.metaDivider} />
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>VEHICLE</Text>
              <Text style={styles.metaValue}>{booking.vehicleType}</Text>
            </View>
          </View>
        </View>

        {/* Vehicle Access Point & Google Maps Navigation Section */}
        <View style={styles.card}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Vehicle Access Point</Text>
            {entranceInfo.hasVerifiedEntrance ? (
              <View style={styles.verifiedBadge}>
                <Text style={styles.verifiedBadgeText}>✓ Verified Entrance</Text>
              </View>
            ) : (
              <View style={styles.unverifiedBadge}>
                <Text style={styles.unverifiedBadgeText}>⚠️ Unverified</Text>
              </View>
            )}
          </View>

          {entranceInfo.hasVerifiedEntrance &&
          entranceInfo.latitude !== null &&
          entranceInfo.longitude !== null ? (
            <>
              <View style={styles.entranceDetailsBox}>
                <View style={styles.entranceIconBox}>
                  <Text style={styles.entranceIcon}>🚗</Text>
                </View>
                <View style={styles.entranceInfoCol}>
                  <Text style={styles.entranceNameText}>
                    {entranceInfo.entranceName}
                  </Text>
                  <Text style={styles.entranceCoordsText}>
                    Destination: {entranceInfo.latitude.toFixed(4)}° N,{' '}
                    {entranceInfo.longitude.toFixed(4)}° E
                  </Text>
                </View>
              </View>

              <View style={styles.routeSpecsList}>
                <View style={styles.routeSpecRow}>
                  <Text style={styles.routeSpecDot}>●</Text>
                  <Text style={styles.routeSpecLabel}>Origin:</Text>
                  <Text style={styles.routeSpecValue}>Your live device GPS location</Text>
                </View>
                <View style={styles.routeSpecRow}>
                  <Text style={styles.routeSpecDot}>●</Text>
                  <Text style={styles.routeSpecLabel}>Routing:</Text>
                  <Text style={styles.routeSpecValue}>Real-time driving turn-by-turn</Text>
                </View>
                <View style={styles.routeSpecRow}>
                  <Text style={styles.routeSpecDot}>●</Text>
                  <Text style={styles.routeSpecLabel}>Service:</Text>
                  <Text style={styles.routeSpecValue}>Google Maps Navigation (Free)</Text>
                </View>
              </View>

              {/* Prominent "Start Navigation in Google Maps" Button */}
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Start Navigation in Google Maps"
                accessibilityHint="Opens Google Maps driving directions to the verified parking entrance"
                style={[
                  styles.startNavBtn,
                  isLaunchingNav && styles.btnDisabled,
                ]}
                activeOpacity={0.88}
                disabled={isLaunchingNav}
                onPress={handleStartGoogleMapsNavigation}
              >
                {isLaunchingNav ? (
                  <View style={styles.btnLoadingRow}>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text style={styles.startNavBtnText}>Opening Google Maps…</Text>
                  </View>
                ) : (
                  <View style={styles.btnContentRow}>
                    <Text style={styles.btnIcon}>🧭</Text>
                    <Text style={styles.startNavBtnText}>
                      Start Navigation in Google Maps
                    </Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* Direct Copy / Share Directions Link Option */}
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Copy or share directions link"
                accessibilityHint="Opens share sheet to copy or send the Google Maps directions link"
                style={styles.shareLinkBtn}
                activeOpacity={0.7}
                onPress={handleCopyOrShareLink}
              >
                <Text style={styles.shareLinkBtnText}>🔗 Copy or Share Directions Link</Text>
              </TouchableOpacity>

              <Text style={styles.instructionNotice}>
                Opens Google Maps app with turn-by-turn audio guidance. Once parked, return to ParkMe and tap{' '}
                <Text style={styles.instructionNoticeBold}>{"\"I've Arrived\""}</Text> below.
              </Text>
            </>
          ) : (
            /* Clear missing coordinates warning and disabled navigation state */
            <View style={styles.missingCoordsContainer}>
              <View style={styles.warningAlertBox}>
                <Text style={styles.warningAlertTitle}>⚠️ Entrance Coordinates Missing</Text>
                <Text style={styles.warningAlertBody}>
                  {entranceInfo.statusMessage ||
                    'This parking lot does not currently have verified vehicle access coordinates in the system.'}
                </Text>
                <Text style={styles.warningAlertHelp}>
                  Live navigation has been disabled for safety until the parking operator configures verified entrance coordinates.
                </Text>
              </View>

              <TouchableOpacity
                accessibilityRole="button"
                accessibilityState={{ disabled: true }}
                style={[styles.startNavBtn, styles.btnDisabledState]}
                disabled={true}
              >
                <Text style={styles.btnDisabledText}>
                  Navigation Disabled (Missing Coordinates)
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Booking Reference & Help Box */}
        <View style={styles.bookingRefCard}>
          <Text style={styles.refCardTitle}>Booking Summary</Text>
          <View style={styles.refRow}>
            <Text style={styles.refLabel}>Tariff Rate:</Text>
            <Text style={styles.refValue}>Rs. {booking.tariffPerHour}/hr</Text>
          </View>
          <View style={styles.refRow}>
            <Text style={styles.refLabel}>Reserved Duration:</Text>
            <Text style={styles.refValue}>{booking.hours} hour(s)</Text>
          </View>
          <View style={styles.refRow}>
            <Text style={styles.refLabel}>Total Paid:</Text>
            <Text style={styles.refValueBold}>Rs. {booking.total}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Persistent Bottom Actions Bar */}
      <View style={[styles.bottomActionBar, { paddingBottom: bottomPadding }]}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Cancel navigation"
          style={[styles.footerBtn, styles.btnOutline]}
          activeOpacity={0.8}
          onPress={onCancel}
        >
          <Text style={styles.btnOutlineText}>⊗ Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Confirm arrival at parking lot"
          style={[styles.footerBtn, styles.btnArrival]}
          activeOpacity={0.88}
          onPress={onArrived}
        >
          <Text style={styles.btnArrivalText}>{"📍 I've Arrived"}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
  },
  backBtnText: {
    fontSize: 28,
    fontWeight: '300',
    color: DriverColors.navyHeading,
    marginTop: -2,
  },
  headerTitleContainer: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: DriverColors.navyHeading,
  },
  headerSubtitle: {
    fontSize: 12,
    color: DriverColors.textSecondary,
    fontWeight: '500',
  },
  headerRightSpacer: {
    width: 40,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: DriverColors.orangePrimary,
    letterSpacing: 0.8,
  },
  badgeFree: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  badgeFreeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803D',
  },
  lotName: {
    fontSize: 19,
    fontWeight: '800',
    color: DriverColors.navyHeading,
    lineHeight: 25,
    marginBottom: 4,
  },
  lotAddress: {
    fontSize: 13,
    color: DriverColors.textSecondary,
    lineHeight: 18,
    marginBottom: 16,
  },
  metaRow: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#EEF2F6',
    alignItems: 'center',
  },
  metaItem: {
    flex: 1,
    alignItems: 'center',
  },
  metaDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#CBD5E1',
  },
  metaLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 2,
    letterSpacing: 0.4,
  },
  metaValue: {
    fontSize: 13,
    fontWeight: '700',
    color: DriverColors.navyHeading,
  },
  metaValueHighlight: {
    fontSize: 14,
    fontWeight: '800',
    color: DriverColors.orangePrimary,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: DriverColors.navyHeading,
  },
  verifiedBadge: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
  },
  verifiedBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0369A1',
  },
  unverifiedBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
  },
  unverifiedBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B45309',
  },
  entranceDetailsBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
  },
  entranceIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  entranceIcon: {
    fontSize: 22,
  },
  entranceInfoCol: {
    flex: 1,
  },
  entranceNameText: {
    fontSize: 14,
    fontWeight: '700',
    color: DriverColors.navyHeading,
    lineHeight: 19,
    marginBottom: 2,
  },
  entranceCoordsText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  routeSpecsList: {
    gap: 6,
    marginBottom: 16,
    paddingLeft: 4,
  },
  routeSpecRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  routeSpecDot: {
    fontSize: 8,
    color: DriverColors.orangePrimary,
    marginRight: 6,
  },
  routeSpecLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    marginRight: 4,
  },
  routeSpecValue: {
    fontSize: 12,
    fontWeight: '700',
    color: DriverColors.navyHeading,
  },
  startNavBtn: {
    backgroundColor: DriverColors.orangePrimary,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: DriverColors.orangePrimary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  btnContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  btnLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  btnIcon: {
    fontSize: 18,
  },
  startNavBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  instructionNotice: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 17,
    marginTop: 12,
    paddingHorizontal: 8,
  },
  instructionNoticeBold: {
    fontWeight: '700',
    color: DriverColors.navyHeading,
  },
  shareLinkBtn: {
    marginTop: 10,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  shareLinkBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: DriverColors.navyHeading,
  },
  missingCoordsContainer: {
    gap: 14,
  },
  warningAlertBox: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 14,
    padding: 14,
  },
  warningAlertTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#DC2626',
    marginBottom: 6,
  },
  warningAlertBody: {
    fontSize: 13,
    color: '#991B1B',
    lineHeight: 18,
    marginBottom: 6,
  },
  warningAlertHelp: {
    fontSize: 11,
    color: '#B91C1C',
    lineHeight: 16,
  },
  btnDisabledState: {
    backgroundColor: '#E2E8F0',
    shadowOpacity: 0,
    elevation: 0,
  },
  btnDisabledText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '700',
  },
  btnDisabled: {
    opacity: 0.7,
  },
  bookingRefCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  refCardTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: DriverColors.navyHeading,
    marginBottom: 4,
  },
  refRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  refLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  refValue: {
    fontSize: 12,
    fontWeight: '600',
    color: DriverColors.navyHeading,
  },
  refValueBold: {
    fontSize: 13,
    fontWeight: '800',
    color: DriverColors.orangePrimary,
  },
  bottomActionBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 8,
  },
  footerBtn: {
    flex: 1,
    borderRadius: 24,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnOutline: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: DriverColors.navyDark,
  },
  btnOutlineText: {
    color: DriverColors.navyDark,
    fontWeight: '800',
    fontSize: 14,
  },
  btnArrival: {
    backgroundColor: DriverColors.navyDark,
  },
  btnArrivalText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
});