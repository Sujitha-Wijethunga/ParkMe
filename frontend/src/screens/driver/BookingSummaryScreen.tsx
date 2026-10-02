import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Platform,
  TextInput,
  KeyboardAvoidingView,
  Image,
  BackHandler,
} from 'react-native';
import { DriverColors } from '../../constants/colors';
import { SAMPLE_NEARBY_PARKING_LOTS } from '../../constants/driverSampleData';
import { getSpaceLayoutForLot } from '../../constants/parkingSpaceData';
import {
  BookingDraft,
  ConfirmedBookingPayload,
  BOOKING_MAX_DURATION_HRS,
  BOOKING_MIN_DURATION_HRS,
  computeBreakdown,
  defaultArrivalTime,
  formatArrivalDate,
  formatTime12,
  validateDraft,
} from '../../constants/bookingDraft';
import { SpaceSelectionResult } from './SelectSpaceScreen';

/* ── Props ──────────────────────────────────────────────────────────────── */

interface BookingSummaryScreenProps {
  /** Full space selection result from SelectSpaceScreen. */
  selection: SpaceSelectionResult;
  /** Preserved booking draft from previous navigation, if any. */
  initialDraft?: BookingDraft | null;
  /** Callback fired whenever the driver modifies the draft. */
  onDraftChange?: (draft: BookingDraft) => void;
  /** Returns to SelectSpaceScreen with selection intact. */
  onBack: () => void;
  /**
   * Called when the driver confirms the booking summary.
   * Payment and reservation creation are the next milestone.
   * The caller should show a clear placeholder message.
   */
  onProceed: (payload: ConfirmedBookingPayload) => void;
}

/* ── Arrival time stepper helpers ──────────────────────────────────────── */

function clampArrival(date: Date): Date {
  const now = new Date();
  const minArrival = new Date(now.getTime() + 30 * 60 * 1000);
  if (date <= minArrival) {
    const next = new Date(minArrival);
    next.setHours(next.getHours() + 1, 0, 0, 0);
    return next;
  }
  return date;
}

function stepHour(date: Date, delta: number): Date {
  const next = new Date(date.getTime() + delta * 60 * 60 * 1000);
  return clampArrival(next);
}

/* ── Mini Map Thumbnail Graphic (matches ParkMe-08-BookingSummary reference) ── */

function MiniMapGraphic({ distance, imageUrl }: { distance: string; imageUrl?: string }) {
  if (imageUrl) {
    return (
      <View style={styles.miniMapWrapper}>
        <Image source={{ uri: imageUrl }} style={styles.miniMapImg} resizeMode="cover" />
        <View style={styles.miniMapBottomBar}>
          <Text style={styles.miniMapDistanceText}>{distance}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.miniMapWrapper}>
      <View style={styles.miniMapRoadsBg}>
        {/* Subtle stylized road grid */}
        <View style={styles.miniMapRoadH} />
        <View style={styles.miniMapRoadV} />
        {/* Orange route origin dot */}
        <View style={styles.miniMapOriginDot}>
          <View style={styles.miniMapOriginInner} />
        </View>
        {/* White P badge */}
        <View style={styles.miniMapBadgeP}>
          <Text style={styles.miniMapBadgePText}>P</Text>
        </View>
      </View>
      {/* Dark bottom bar with distance */}
      <View style={styles.miniMapBottomBar}>
        <Text style={styles.miniMapDistanceText}>{distance}</Text>
      </View>
    </View>
  );
}

/**
 * Driver Booking Summary Screen (ParkMe-08-BookingSummary)
 *
 * Displays the booking summary after space selection:
 *   - Selected lot and space information with visual badge and guaranteed spot tag.
 *   - Stylized mini-map thumbnail matching the design reference.
 *   - Parking schedule: Arrival date and time, duration steppers (1–12 hrs).
 *   - Vehicle info row with expandable inline plate/model editor.
 *   - Price breakdown: Parking Fee (pro-rata estimate) + Service Fee (UI estimate) = Total.
 *   - Free cancellation banner.
 *   - Sticky bottom action bar with total payable and "Proceed to Payment" CTA.
 *
 * Backend alignment:
 *   - Parking fee matches backend reservationController.js formula:
 *     (endTime - startTime) / 3600000 * pricePerHour.
 *   - Service Fee (Rs. 20) is clearly labelled as a UI display estimate
 *     not yet stored in backend models.
 *   - Space is not held or reserved until POST /api/reservations succeeds.
 */
export default function BookingSummaryScreen({
  selection,
  initialDraft,
  onDraftChange,
  onBack,
  onProceed,
}: BookingSummaryScreenProps) {
  const { lotId, spaceId, floor, vehicleType, tariffPerHour } = selection;

  /* Lot and space data */
  const lot = SAMPLE_NEARBY_PARKING_LOTS.find((l) => l.id === lotId);
  const layout = getSpaceLayoutForLot(lotId);
  const floorLayout = layout?.floors.find((f) => f.label === floor);
  const space = floorLayout?.spaces.find((s) => s.id === spaceId);

  /* Booking draft state (preserves edits from initialDraft if available) */
  const [draft, setDraft] = useState<BookingDraft>(() => {
    if (initialDraft && initialDraft.lotId === lotId) {
      return {
        ...initialDraft,
        spaceId,
        floor,
        vehicleType,
        tariffPerHour,
      };
    }
    return {
      lotId,
      spaceId,
      floor,
      vehicleType,
      tariffPerHour,
      arrivalTime: defaultArrivalTime(),
      durationHours: 2,
      vehiclePlate: 'WP CAB-7829',
      vehicleModel: 'Toyota Prius',
    };
  });

  const [showVehicleForm, setShowVehicleForm] = useState(false);
  const [touched, setTouched] = useState<Partial<Record<keyof BookingDraft, boolean>>>({});

  const updateDraft = useCallback(
    (updater: (prev: BookingDraft) => BookingDraft) => {
      setDraft((prev) => {
        const next = updater(prev);
        onDraftChange?.(next);
        return next;
      });
    },
    [onDraftChange]
  );

  // Android hardware back handling
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onBack();
      return true;
    });
    return () => sub.remove();
  }, [onBack]);

  /* Derived */
  const price = useMemo(() => computeBreakdown(draft), [draft]);
  const validation = useMemo(() => validateDraft(draft), [draft]);

  const fieldError = useCallback(
    (field: keyof BookingDraft) =>
      touched[field] ? validation.errors[field] : undefined,
    [validation, touched]
  );

  const touch = useCallback((field: keyof BookingDraft) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  }, []);

  /* Arrival time steppers */
  const handleArrivalUp = useCallback(() => {
    updateDraft((prev) => ({ ...prev, arrivalTime: stepHour(prev.arrivalTime, +1) }));
  }, [updateDraft]);

  const handleArrivalDown = useCallback(() => {
    updateDraft((prev) => ({ ...prev, arrivalTime: stepHour(prev.arrivalTime, -1) }));
  }, [updateDraft]);

  /* Duration steppers */
  const handleDurationUp = useCallback(() => {
    updateDraft((prev) => ({
      ...prev,
      durationHours: Math.min(prev.durationHours + 1, BOOKING_MAX_DURATION_HRS),
    }));
  }, [updateDraft]);

  const handleDurationDown = useCallback(() => {
    updateDraft((prev) => ({
      ...prev,
      durationHours: Math.max(prev.durationHours - 1, BOOKING_MIN_DURATION_HRS),
    }));
  }, [updateDraft]);

  /* Proceed */
  const handleProceed = useCallback(() => {
    setTouched({
      lotId: true,
      spaceId: true,
      arrivalTime: true,
      durationHours: true,
      vehiclePlate: true,
      vehicleModel: true,
    });
    if (!validation.isValid) return;
    onProceed({
      draft,
      price,
      startTimeISO: draft.arrivalTime.toISOString(),
      endTimeISO: price.endTime.toISOString(),
    });
  }, [draft, price, validation, onProceed]);

  /* ── Guard: missing lot ─────────────────────────────────────────────── */
  if (!lot) {
    return (
      <SafeAreaView style={styles.errorContainer}>
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
      </SafeAreaView>
    );
  }

  /* ── Guard: space not found in sample data ───────────────────────────── */
  if (!space) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <View style={styles.errorInner}>
          <Text style={styles.errorEmoji}>🗺️</Text>
          <Text style={styles.errorTitle}>Space not found</Text>
          <Text style={styles.errorSubtitle}>
            Space {spaceId} on floor {floor} could not be loaded.{'\n'}
            Please go back and re-select a space.
          </Text>
          <TouchableOpacity style={styles.errorBackBtn} activeOpacity={0.8} onPress={onBack}>
            <Text style={styles.errorBackText}>← Back to Space Selection</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const spaceTypeLabel =
    space.type === 'EV'
      ? 'EV Spot'
      : space.type === 'disabled'
      ? 'Accessible Spot'
      : 'Standard Spot';
  const floorName = floorLayout?.name ?? `Floor ${floor}`;
  const canProceed = validation.isValid;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <KeyboardAvoidingView
        style={styles.flex1}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* ── Header ──────────────────────────────────────────────────── */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            activeOpacity={0.75}
            onPress={onBack}
            accessibilityLabel="Go back to space selection"
            accessibilityRole="button"
          >
            <Text style={styles.backArrow}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Booking Summary</Text>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── 1. Space Selected Card ───────────────────────────────── */}
          <View style={styles.card}>
            {/* Top row: badge & mini map */}
            <View style={styles.cardTopRow}>
              <View style={styles.lotMetaCol}>
                <View style={styles.spaceSelectedBadge}>
                  <View style={styles.badgeCheckCircle}>
                    <Text style={styles.badgeCheckText}>✓</Text>
                  </View>
                  <Text style={styles.spaceSelectedBadgeText}>SPACE SELECTED</Text>
                </View>
                <Text style={styles.lotName}>{lot.name}</Text>
                <View style={styles.lotAddressRow}>
                  <Text style={styles.lotAddressPin}>📍</Text>
                  <Text style={styles.lotAddressText}>{lot.address}</Text>
                </View>
              </View>

              <MiniMapGraphic distance={lot.distance} imageUrl={lot.imageUrl} />
            </View>

            {/* Inset Space Card (matches ParkMe-08-BookingSummary) */}
            <View style={styles.spaceInsetCard}>
              <View style={styles.spaceIdBadge}>
                <Text style={styles.spaceIdBadgeText}>{spaceId}</Text>
              </View>
              <View style={styles.spaceInsetInfo}>
                <Text style={styles.spaceInsetName}>Space {spaceId}</Text>
                <Text style={styles.spaceInsetSub}>
                  {floorName} · {spaceTypeLabel}
                </Text>
              </View>
              <View style={styles.guaranteedBadge}>
                <Text style={styles.guaranteedBadgeText}>Guaranteed</Text>
              </View>
            </View>
          </View>

          {/* ── 2. Parking Schedule Card ─────────────────────────────── */}
          <View style={styles.card}>
            <View style={styles.scheduleHeaderRow}>
              <Text style={styles.cardSectionLabel}>PARKING SCHEDULE</Text>
              <Text style={styles.rateText}>Rate: Rs. {tariffPerHour}/hr</Text>
            </View>

            {/* Side-by-side rounded boxes */}
            <View style={styles.scheduleRow}>
              {/* Arrival Box */}
              <View style={styles.scheduleBox}>
                <View style={styles.boxHeaderRow}>
                  <Text style={styles.boxHeaderIcon}>📅</Text>
                  <Text style={styles.boxHeaderLabel}>ARRIVAL</Text>
                </View>
                <Text style={styles.boxDateText}>{formatArrivalDate(draft.arrivalTime)}</Text>
                <View style={styles.arrivalTimeRow}>
                  <TouchableOpacity
                    style={styles.timeStepBtn}
                    onPress={handleArrivalDown}
                    activeOpacity={0.7}
                    accessibilityLabel="Decrease arrival hour"
                  >
                    <Text style={styles.timeStepBtnText}>−</Text>
                  </TouchableOpacity>
                  <View style={styles.timeDisplayPill}>
                    <Text style={styles.clockIcon}>🕐</Text>
                    <Text style={styles.timeDisplayText}>{formatTime12(draft.arrivalTime)}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.timeStepBtn}
                    onPress={handleArrivalUp}
                    activeOpacity={0.7}
                    accessibilityLabel="Increase arrival hour"
                  >
                    <Text style={styles.timeStepBtnText}>+</Text>
                  </TouchableOpacity>
                </View>
                {fieldError('arrivalTime') ? (
                  <Text style={styles.fieldError}>{fieldError('arrivalTime')}</Text>
                ) : null}
              </View>

              {/* Duration Box */}
              <View style={[styles.scheduleBox, styles.scheduleBoxRight]}>
                <Text style={styles.boxHeaderLabel}>DURATION</Text>
                <View style={styles.durationRow}>
                  <TouchableOpacity
                    style={[
                      styles.durationStepBtn,
                      draft.durationHours <= BOOKING_MIN_DURATION_HRS && styles.durationStepBtnDisabled,
                    ]}
                    onPress={handleDurationDown}
                    disabled={draft.durationHours <= BOOKING_MIN_DURATION_HRS}
                    activeOpacity={0.7}
                    accessibilityLabel="Decrease duration by 1 hour"
                  >
                    <Text style={styles.durationStepBtnText}>−</Text>
                  </TouchableOpacity>
                  <Text style={styles.durationValueText}>{draft.durationHours} hrs</Text>
                  <TouchableOpacity
                    style={[
                      styles.durationStepBtn,
                      draft.durationHours >= BOOKING_MAX_DURATION_HRS && styles.durationStepBtnDisabled,
                    ]}
                    onPress={handleDurationUp}
                    disabled={draft.durationHours >= BOOKING_MAX_DURATION_HRS}
                    activeOpacity={0.7}
                    accessibilityLabel="Increase duration by 1 hour"
                  >
                    <Text style={styles.durationStepBtnText}>+</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.endTimeHintText}>Until {formatTime12(price.endTime)}</Text>
                {fieldError('durationHours') ? (
                  <Text style={styles.fieldError}>{fieldError('durationHours')}</Text>
                ) : null}
              </View>
            </View>

            {/* Vehicle Row Pill */}
            <TouchableOpacity
              style={styles.vehiclePill}
              onPress={() => setShowVehicleForm((v) => !v)}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Change vehicle information"
            >
              <Text style={styles.vehiclePillIcon}>🚗</Text>
              <View style={styles.vehiclePillInfo}>
                <Text style={styles.vehiclePlateText}>
                  {draft.vehiclePlate.trim() || 'Enter plate'}
                  {draft.vehicleModel.trim() ? (
                    <Text style={styles.vehicleModelText}> ({draft.vehicleModel.trim()})</Text>
                  ) : null}
                </Text>
              </View>
              <Text style={styles.vehicleChangeLink}>{showVehicleForm ? 'Done' : 'Change'}</Text>
            </TouchableOpacity>

            {/* Expandable vehicle editor */}
            {showVehicleForm && (
              <View style={styles.vehicleForm}>
                <View style={styles.vehicleFormField}>
                  <Text style={styles.vehicleFormLabel}>Registration Plate *</Text>
                  <TextInput
                    style={[
                      styles.vehicleFormInput,
                      fieldError('vehiclePlate') ? styles.inputError : null,
                    ]}
                    value={draft.vehiclePlate}
                    onChangeText={(v) => updateDraft((prev) => ({ ...prev, vehiclePlate: v }))}
                    onBlur={() => touch('vehiclePlate')}
                    placeholder="e.g. WP CAB-7829"
                    placeholderTextColor={DriverColors.textMuted}
                    autoCapitalize="characters"
                    maxLength={14}
                    accessibilityLabel="Vehicle registration plate"
                  />
                  {fieldError('vehiclePlate') ? (
                    <Text style={styles.fieldError}>{fieldError('vehiclePlate')}</Text>
                  ) : null}
                </View>
                <View style={styles.vehicleFormField}>
                  <Text style={styles.vehicleFormLabel}>Vehicle Model *</Text>
                  <TextInput
                    style={[
                      styles.vehicleFormInput,
                      fieldError('vehicleModel') ? styles.inputError : null,
                    ]}
                    value={draft.vehicleModel}
                    onChangeText={(v) => updateDraft((prev) => ({ ...prev, vehicleModel: v }))}
                    onBlur={() => touch('vehicleModel')}
                    placeholder="e.g. Toyota Prius"
                    placeholderTextColor={DriverColors.textMuted}
                    autoCapitalize="words"
                    maxLength={40}
                    accessibilityLabel="Vehicle model"
                  />
                  {fieldError('vehicleModel') ? (
                    <Text style={styles.fieldError}>{fieldError('vehicleModel')}</Text>
                  ) : null}
                </View>
              </View>
            )}
          </View>

          {/* ── 3. Price Details Card ─────────────────────────────────── */}
          <View style={styles.card}>
            <Text style={styles.cardSectionLabel}>PRICE DETAILS</Text>

            <View style={styles.priceEstimateNotice}>
              <Text style={styles.priceEstimateNoticeText}>
                ⓘ Amounts are estimates until confirmed by the server.
              </Text>
            </View>

            {/* Parking Fee */}
            <View style={styles.priceRow}>
              <View style={styles.priceRowLeft}>
                <Text style={styles.priceRowTitle}>Parking Fee ({draft.durationHours} hrs)</Text>
                <Text style={styles.priceRowSub}>
                  Rs. {tariffPerHour} × {draft.durationHours} hrs
                </Text>
              </View>
              <Text style={styles.priceRowAmount}>Rs. {price.parkingFeeRs}</Text>
            </View>

            {/* Service Fee */}
            <View style={styles.priceRow}>
              <View style={styles.priceRowLeft}>
                <Text style={styles.priceRowTitle}>Service Fee</Text>
                <Text style={styles.priceRowSub}>Guaranteed spot lock fee *</Text>
              </View>
              <Text style={styles.priceRowAmount}>Rs. {price.serviceFeeRs}</Text>
            </View>

            <View style={styles.priceDivider} />

            {/* Total */}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalAmount}>Rs. {price.totalRs}</Text>
            </View>

            <Text style={styles.serviceFeeFootnote}>
              * Service fee not yet in the backend model; shown as a UI display estimate only.
            </Text>
          </View>

          {/* ── 4. Free Cancellation Banner ───────────────────────────── */}
          <View style={styles.cancelBanner}>
            <Text style={styles.cancelBannerIcon}>🛡️</Text>
            <View style={styles.cancelBannerContent}>
              <Text style={styles.cancelBannerTitle}>
                Free cancellation up to 15 minutes before arrival
              </Text>
              <Text style={styles.cancelBannerSubtitle}>
                100% full refund to original payment method. No hassle.
              </Text>
            </View>
          </View>

          <View style={styles.bottomSpacer} />
        </ScrollView>

        {/* ── Sticky Bottom Bar ─────────────────────────────────────────── */}
        <View style={styles.bottomBar}>
          <View style={styles.bottomBarTopRow}>
            <View style={styles.bottomBarPayableCol}>
              <Text style={styles.totalPayableLabel}>TOTAL PAYABLE</Text>
              <Text style={styles.totalPayableAmount}>Rs. {price.totalRs}</Text>
            </View>
            <Text style={styles.bottomBarSummaryText}>
              {draft.durationHours} hrs · Space {spaceId}
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.proceedBtn, !canProceed && styles.proceedBtnDisabled]}
            activeOpacity={canProceed ? 0.88 : 1}
            onPress={handleProceed}
            accessibilityRole="button"
            accessibilityLabel="Proceed to payment"
            accessibilityState={{ disabled: !canProceed }}
          >
            <Text style={[styles.proceedBtnText, !canProceed && styles.proceedBtnTextDisabled]}>
              Proceed to Payment  ›
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/* ── Styles ─────────────────────────────────────────────────────────────── */
const CARD_RADIUS = 16;

const styles = StyleSheet.create({
  flex1: { flex: 1 },

  // Guard states
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
  errorEmoji: { fontSize: 44, marginBottom: 16 },
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
  errorBackText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },

  // Main layout
  safeArea: {
    flex: 1,
    backgroundColor: DriverColors.background,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: DriverColors.borderLight,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  backArrow: {
    fontSize: 28,
    lineHeight: 30,
    color: DriverColors.navyHeading,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: DriverColors.navyHeading,
    letterSpacing: -0.2,
  },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 14, paddingTop: 14, paddingBottom: 20 },

  // Card container
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: CARD_RADIUS,
    borderWidth: 1,
    borderColor: DriverColors.cardBorder,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },

  // Card 1: Top row
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  lotMetaCol: { flex: 1, paddingRight: 10 },
  spaceSelectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 16,
    gap: 5,
    marginBottom: 8,
  },
  badgeCheckCircle: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeCheckText: { color: '#FFFFFF', fontSize: 9, fontWeight: '900' },
  spaceSelectedBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#4F46E5',
    letterSpacing: 0.5,
  },
  lotName: {
    fontSize: 17,
    fontWeight: '800',
    color: DriverColors.navyHeading,
    marginBottom: 4,
  },
  lotAddressRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  lotAddressPin: { fontSize: 11 },
  lotAddressText: { fontSize: 12.5, color: DriverColors.textSecondary, flex: 1 },

  // Mini Map Graphic
  miniMapWrapper: {
    width: 78,
    height: 62,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#EEF2F6',
  },
  miniMapImg: { width: 78, height: 42 },
  miniMapRoadsBg: {
    width: 78,
    height: 42,
    backgroundColor: '#E2E8F0',
    position: 'relative',
  },
  miniMapRoadH: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 18,
    height: 5,
    backgroundColor: '#CBD5E1',
  },
  miniMapRoadV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 36,
    width: 5,
    backgroundColor: '#CBD5E1',
  },
  miniMapOriginDot: {
    position: 'absolute',
    left: 14,
    top: 15,
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 107, 0, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniMapOriginInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: DriverColors.orangePrimary,
  },
  miniMapBadgeP: {
    position: 'absolute',
    right: 8,
    top: 6,
    width: 16,
    height: 16,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniMapBadgePText: { fontSize: 9, fontWeight: '800', color: '#3B82F6' },
  miniMapBottomBar: {
    height: 20,
    backgroundColor: DriverColors.navyDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniMapDistanceText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700' },

  // Space Inset Card
  spaceInsetCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    gap: 10,
  },
  spaceIdBadge: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: DriverColors.navyDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spaceIdBadgeText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  spaceInsetInfo: { flex: 1 },
  spaceInsetName: { fontSize: 14.5, fontWeight: '700', color: DriverColors.navyHeading },
  spaceInsetSub: { fontSize: 11.5, color: DriverColors.textSecondary, marginTop: 1 },
  guaranteedBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  guaranteedBadgeText: { color: '#059669', fontSize: 11.5, fontWeight: '700' },

  // Parking Schedule
  scheduleHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardSectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: DriverColors.textSecondary,
    letterSpacing: 0.7,
  },
  rateText: { fontSize: 12.5, fontWeight: '700', color: DriverColors.navyHeading },

  scheduleRow: { flexDirection: 'row', alignItems: 'stretch' },
  scheduleBox: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: DriverColors.cardBorder,
    backgroundColor: '#FFFFFF',
    padding: 10,
    justifyContent: 'space-between',
  },
  scheduleBoxRight: { marginLeft: 10 },

  boxHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  boxHeaderIcon: { fontSize: 12 },
  boxHeaderLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    color: DriverColors.textSecondary,
    letterSpacing: 0.5,
  },
  boxDateText: {
    fontSize: 14.5,
    fontWeight: '800',
    color: DriverColors.navyHeading,
    marginBottom: 6,
  },

  arrivalTimeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  timeStepBtn: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeStepBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: DriverColors.navyHeading,
    lineHeight: 18,
  },
  timeDisplayPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 8,
  },
  clockIcon: { fontSize: 11 },
  timeDisplayText: { fontSize: 12, fontWeight: '700', color: DriverColors.navyHeading },

  durationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 6,
  },
  durationStepBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: DriverColors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  durationStepBtnDisabled: { opacity: 0.35 },
  durationStepBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: DriverColors.navyHeading,
    lineHeight: 20,
  },
  durationValueText: {
    fontSize: 15,
    fontWeight: '800',
    color: DriverColors.navyHeading,
    textAlign: 'center',
  },
  endTimeHintText: {
    fontSize: 10.5,
    color: DriverColors.textMuted,
    textAlign: 'center',
    marginTop: 2,
  },

  // Vehicle Row Pill
  vehiclePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: DriverColors.cardBorder,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 12,
    gap: 8,
  },
  vehiclePillIcon: { fontSize: 16 },
  vehiclePillInfo: { flex: 1 },
  vehiclePlateText: { fontSize: 13.5, fontWeight: '700', color: DriverColors.navyHeading },
  vehicleModelText: { fontWeight: '400', color: DriverColors.textSecondary },
  vehicleChangeLink: {
    fontSize: 13,
    fontWeight: '700',
    color: DriverColors.orangePrimary,
    paddingHorizontal: 4,
  },

  // Vehicle form
  vehicleForm: {
    marginTop: 10,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: DriverColors.cardBorder,
    padding: 12,
    gap: 8,
  },
  vehicleFormField: { gap: 4 },
  vehicleFormLabel: { fontSize: 11.5, fontWeight: '700', color: DriverColors.textSecondary },
  vehicleFormInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: DriverColors.cardBorder,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13.5,
    color: DriverColors.navyHeading,
  },
  inputError: { borderColor: '#EF4444' },

  // Validation
  fieldError: { fontSize: 11, color: '#EF4444', marginTop: 3, fontWeight: '600' },

  // Price Card
  priceEstimateNotice: {
    backgroundColor: '#FFFBEB',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  priceEstimateNoticeText: { fontSize: 11.5, color: '#92400E' },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  priceRowLeft: { flex: 1 },
  priceRowTitle: { fontSize: 13.5, fontWeight: '600', color: DriverColors.navyHeading },
  priceRowSub: { fontSize: 11.5, color: DriverColors.textSecondary, marginTop: 1 },
  priceRowAmount: { fontSize: 14, fontWeight: '700', color: DriverColors.navyHeading },
  priceDivider: { height: 1, backgroundColor: DriverColors.borderLight, marginVertical: 10 },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 2,
  },
  totalLabel: { fontSize: 17, fontWeight: '800', color: DriverColors.navyHeading },
  totalAmount: { fontSize: 20, fontWeight: '900', color: DriverColors.navyDark },
  serviceFeeFootnote: {
    fontSize: 10.5,
    color: DriverColors.textMuted,
    marginTop: 8,
    fontStyle: 'italic',
    lineHeight: 14,
  },

  // Cancellation Banner
  cancelBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#ECFDF5',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    padding: 12,
    marginBottom: 8,
  },
  cancelBannerIcon: { fontSize: 18 },
  cancelBannerContent: { flex: 1 },
  cancelBannerTitle: { fontSize: 12.5, fontWeight: '700', color: '#065F46', lineHeight: 17 },
  cancelBannerSubtitle: { fontSize: 11, color: '#047857', marginTop: 2 },

  bottomSpacer: { height: 110 },

  // Sticky Bottom Bar
  bottomBar: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: DriverColors.borderLight,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'android' ? 16 : 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 12,
  },
  bottomBarTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 10,
  },
  bottomBarPayableCol: { gap: 1 },
  totalPayableLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: DriverColors.textSecondary,
    letterSpacing: 0.5,
  },
  totalPayableAmount: { fontSize: 22, fontWeight: '900', color: DriverColors.navyDark },
  bottomBarSummaryText: { fontSize: 12, color: DriverColors.textSecondary },

  proceedBtn: {
    backgroundColor: DriverColors.orangePrimary,
    borderRadius: 28,
    paddingVertical: 15,
    alignItems: 'center',
    shadowColor: DriverColors.orangePrimary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  proceedBtnDisabled: { backgroundColor: '#E2E8F0', shadowOpacity: 0, elevation: 0 },
  proceedBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.1,
  },
  proceedBtnTextDisabled: { color: '#94A3B8' },
});
