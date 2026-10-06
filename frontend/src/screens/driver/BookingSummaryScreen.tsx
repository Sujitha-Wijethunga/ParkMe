import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Platform,
  TextInput,
  KeyboardAvoidingView,
  Image,
  BackHandler,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  /** Called when the driver confirms the booking summary. */
  onProceed: (payload: ConfirmedBookingPayload) => void;
}

/* ── Constants & date helpers ──────────────────────────────────────────── */

/** Earliest allowed arrival, in minutes from now. */
const MIN_ARRIVAL_LEAD_MIN = 15;
/** How many days ahead a driver may book. */
const MAX_ADVANCE_DAYS = 60;
/** Quick-pick duration chips (filtered by min/max constants). */
const DURATION_CHIPS = [1, 2, 3, 4, 6, 8, 12];

const VEHICLE_DETAILS: Record<
  SpaceSelectionResult['vehicleType'],
  { icon: string; plateExample: string; modelExample: string }
> = {
  Car: { icon: '🚗', plateExample: 'PB 9036', modelExample: 'Toyota Prius' },
  Bike: { icon: '🏍️', plateExample: 'BBW 3616', modelExample: 'Honda CB Hornet' },
  SUV: { icon: '🚙', plateExample: 'SUV 1234', modelExample: 'Toyota Fortuner' },
  EV: { icon: '⚡', plateExample: 'EV 1234', modelExample: 'Tesla Model 3' },
};

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEKDAY_HEADERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function startOfDay(d: Date): Date {
  const n = new Date(d);
  n.setHours(0, 0, 0, 0);
  return n;
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** e.g. "Fri, 18 Sep 2026" */
function formatLongDate(d: Date): string {
  return `${DAYS_SHORT[d.getDay()]}, ${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}

/** e.g. "Fri, 18 Sep" */
function formatShortDate(d: Date): string {
  return `${DAYS_SHORT[d.getDay()]}, ${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
}

/** "Today" / "Tomorrow" / "" */
function relativeDayLabel(d: Date): string {
  const today = startOfDay(new Date());
  const diff = Math.round((startOfDay(d).getTime() - today.getTime()) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  return '';
}

function get12Hour(d: Date): number {
  return d.getHours() % 12 || 12;
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/* ── Calendar Modal ────────────────────────────────────────────────────── */

interface CalendarModalProps {
  visible: boolean;
  selected: Date;
  onSelect: (day: Date) => void;
  onClose: () => void;
}

function CalendarModal({ visible, selected, onSelect, onClose }: CalendarModalProps) {
  const today = startOfDay(new Date());
  const maxDate = new Date(today);
  maxDate.setDate(maxDate.getDate() + MAX_ADVANCE_DAYS);

  const [month, setMonth] = useState(
    () => new Date(selected.getFullYear(), selected.getMonth(), 1)
  );

  // Jump to the selected month each time the calendar opens
  useEffect(() => {
    if (visible) setMonth(new Date(selected.getFullYear(), selected.getMonth(), 1));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const year = month.getFullYear();
  const mon = month.getMonth();
  const firstWeekday = new Date(year, mon, 1).getDay();
  const daysInMonth = new Date(year, mon + 1, 0).getDate();

  const cells: (Date | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, mon, d));
  while (cells.length % 7 !== 0) cells.push(null);

  const canGoPrev = year > today.getFullYear() || (year === today.getFullYear() && mon > today.getMonth());
  const canGoNext = new Date(year, mon + 1, 1) <= maxDate;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.calOverlay}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
          accessibilityLabel="Close calendar"
        />
        <View style={styles.calCard}>
          <View style={styles.calHeader}>
            <TouchableOpacity
              style={[styles.calNavBtn, !canGoPrev && styles.calNavBtnDisabled]}
              disabled={!canGoPrev}
              onPress={() => setMonth(new Date(year, mon - 1, 1))}
              accessibilityLabel="Previous month"
            >
              <Text style={styles.calNavText}>‹</Text>
            </TouchableOpacity>
            <Text style={styles.calMonthTitle}>
              {MONTHS[mon]} {year}
            </Text>
            <TouchableOpacity
              style={[styles.calNavBtn, !canGoNext && styles.calNavBtnDisabled]}
              disabled={!canGoNext}
              onPress={() => setMonth(new Date(year, mon + 1, 1))}
              accessibilityLabel="Next month"
            >
              <Text style={styles.calNavText}>›</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.calWeekRow}>
            {WEEKDAY_HEADERS.map((w, i) => (
              <Text key={`${w}${i}`} style={styles.calWeekday}>
                {w}
              </Text>
            ))}
          </View>

          <View style={styles.calGrid}>
            {cells.map((day, idx) => {
              if (!day) return <View key={`e${idx}`} style={styles.calCell} />;
              const disabled = day < today || day > maxDate;
              const isSelected = sameDay(day, selected);
              const isToday = sameDay(day, today);
              return (
                <View key={day.getTime()} style={styles.calCell}>
                  <TouchableOpacity
                    disabled={disabled}
                    activeOpacity={0.7}
                    onPress={() => {
                      onSelect(day);
                      onClose();
                    }}
                    style={[
                      styles.calDay,
                      isToday && !isSelected && styles.calDayToday,
                      isSelected && styles.calDaySelected,
                    ]}
                    accessibilityLabel={formatLongDate(day)}
                  >
                    <Text
                      style={[
                        styles.calDayText,
                        disabled && styles.calDayTextDisabled,
                        isSelected && styles.calDayTextSelected,
                      ]}
                    >
                      {day.getDate()}
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>

          <TouchableOpacity style={styles.calCloseBtn} onPress={onClose} activeOpacity={0.8}>
            <Text style={styles.calCloseText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

/* ── Mini Map Thumbnail Graphic ────────────────────────────────────────── */

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
        <View style={styles.miniMapRoadH} />
        <View style={styles.miniMapRoadV} />
        <View style={styles.miniMapOriginDot}>
          <View style={styles.miniMapOriginInner} />
        </View>
        <View style={styles.miniMapBadgeP}>
          <Text style={styles.miniMapBadgePText}>P</Text>
        </View>
      </View>
      <View style={styles.miniMapBottomBar}>
        <Text style={styles.miniMapDistanceText}>{distance}</Text>
      </View>
    </View>
  );
}

/**
 * Driver Booking Summary Screen (ParkMe-08-BookingSummary)
 *
 *   1. Space selected card.
 *   2. Parking schedule:
 *        - ARRIVAL: date (calendar picker) + time (hour : minute + AM/PM).
 *        - DURATION: stepper + quick-pick chips.
 *   3. Booking time summary: date, start time, end time, duration.
 *   4. Vehicle details.
 *   5. Price details + free cancellation banner + sticky bottom bar.
 */
export default function BookingSummaryScreen({
  selection,
  initialDraft,
  onDraftChange,
  onBack,
  onProceed,
}: BookingSummaryScreenProps) {
  const insets = useSafeAreaInsets();
  const [bottomBarHeight, setBottomBarHeight] = useState(0);

  const topPadding = Math.max(
    insets.top,
    Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) : 0
  );
  const bottomBarPaddingBottom =
    Math.max(insets.bottom, Platform.OS === 'ios' ? 14 : 8) + (insets.bottom > 0 ? 4 : 2);

  const { lotId, spaceId, floor, vehicleType, tariffPerHour } = selection;

  /* Lot and space data */
  const lot = SAMPLE_NEARBY_PARKING_LOTS.find((l) => l.id === lotId);
  const layout = getSpaceLayoutForLot(lotId);
  const floorLayout = layout?.floors.find((f) => f.label === floor);
  const space = floorLayout?.spaces.find((s) => s.id === spaceId);

  /* Booking draft state (preserves edits from initialDraft if available) */
  const [draft, setDraft] = useState<BookingDraft>(() => {
    if (initialDraft && initialDraft.lotId === lotId) {
      const vehicleChanged = initialDraft.vehicleType !== vehicleType;
      return {
        ...initialDraft,
        spaceId,
        floor,
        vehicleType,
        tariffPerHour,
        vehiclePlate: vehicleChanged ? '' : initialDraft.vehiclePlate,
        vehicleModel: vehicleChanged ? '' : initialDraft.vehicleModel,
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
      vehiclePlate: '',
      vehicleModel: '',
    };
  });

  const vehicleDetails = VEHICLE_DETAILS[vehicleType];
  const [showCalendar, setShowCalendar] = useState(false);
  const [touched, setTouched] = useState<Partial<Record<keyof BookingDraft, boolean>>>({});

  /* Typed time fields (hour 1–12, minute 00–59) */
  const [hourText, setHourText] = useState(() => String(get12Hour(draft.arrivalTime)));
  const [minText, setMinText] = useState(() => pad2(draft.arrivalTime.getMinutes()));
  const [timeError, setTimeError] = useState<string | undefined>(undefined);
  const previousDraftRef = useRef(draft);

  const updateDraft = useCallback(
    (updater: (prev: BookingDraft) => BookingDraft) => {
      setDraft(updater);
    },
    []
  );

  useEffect(() => {
    if (previousDraftRef.current === draft) return;
    previousDraftRef.current = draft;
    onDraftChange?.(draft);
  }, [draft, onDraftChange]);

  // Keep the typed fields in sync whenever the arrival time changes
  const arrivalMs = draft.arrivalTime.getTime();
  useEffect(() => {
    setHourText(String(get12Hour(draft.arrivalTime)));
    setMinText(pad2(draft.arrivalTime.getMinutes()));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [arrivalMs]);

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

  const arrivalTooSoon =
    draft.arrivalTime.getTime() < Date.now() + MIN_ARRIVAL_LEAD_MIN * 60 * 1000;

  const fieldError = useCallback(
    (field: keyof BookingDraft) =>
      touched[field] ? validation.errors[field] : undefined,
    [validation, touched]
  );

  const touch = useCallback((field: keyof BookingDraft) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  }, []);

  /* ── Arrival: date ─────────────────────────────────────────────────── */
  const handlePickDate = useCallback(
    (day: Date) => {
      setTimeError(undefined);
      touch('arrivalTime');
      updateDraft((prev) => {
        const d = new Date(prev.arrivalTime);
        d.setFullYear(day.getFullYear(), day.getMonth(), day.getDate());
        return { ...prev, arrivalTime: d };
      });
    },
    [updateDraft, touch]
  );

  /* ── Arrival: time ─────────────────────────────────────────────────── */
  const isPm = draft.arrivalTime.getHours() >= 12;

  const stepArrival = useCallback(
    (deltaHours: number) => {
      setTimeError(undefined);
      touch('arrivalTime');
      updateDraft((prev) => ({
        ...prev,
        arrivalTime: new Date(prev.arrivalTime.getTime() + deltaHours * 60 * 60 * 1000),
      }));
    },
    [updateDraft, touch]
  );

  const setMeridiem = useCallback(
    (pm: boolean) => {
      setTimeError(undefined);
      touch('arrivalTime');
      updateDraft((prev) => {
        const d = new Date(prev.arrivalTime);
        const h = d.getHours();
        if (pm && h < 12) d.setHours(h + 12);
        if (!pm && h >= 12) d.setHours(h - 12);
        return { ...prev, arrivalTime: d };
      });
    },
    [updateDraft, touch]
  );

  const commitTime = useCallback(() => {
    touch('arrivalTime');
    const h = parseInt(hourText, 10);
    const m = minText.trim() === '' ? 0 : parseInt(minText, 10);

    if (isNaN(h) || h < 0 || h > 23 || isNaN(m) || m < 0 || m > 59) {
      setTimeError('Enter a valid time (hour 1–12, minutes 00–59)');
      // revert the text boxes to the last good value
      setHourText(String(get12Hour(draft.arrivalTime)));
      setMinText(pad2(draft.arrivalTime.getMinutes()));
      return;
    }

    setTimeError(undefined);
    updateDraft((prev) => {
      const d = new Date(prev.arrivalTime);
      const currentlyPm = prev.arrivalTime.getHours() >= 12;
      let h24: number;
      if (h > 12) h24 = h; // typed in 24-hour form, e.g. 14
      else if (h === 0) h24 = 0;
      else h24 = (h % 12) + (currentlyPm ? 12 : 0);
      d.setHours(h24, m, 0, 0);
      return { ...prev, arrivalTime: d };
    });
  }, [hourText, minText, draft.arrivalTime, updateDraft, touch]);

  /* ── Duration ──────────────────────────────────────────────────────── */
  const setDuration = useCallback(
    (hrs: number) => {
      updateDraft((prev) => ({
        ...prev,
        durationHours: Math.max(
          BOOKING_MIN_DURATION_HRS,
          Math.min(hrs, BOOKING_MAX_DURATION_HRS)
        ),
      }));
    },
    [updateDraft]
  );

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

  /* ── Proceed ───────────────────────────────────────────────────────── */
  const canProceed = validation.isValid && !arrivalTooSoon && !timeError;

  const handleProceed = useCallback(() => {
    setTouched({
      lotId: true,
      spaceId: true,
      arrivalTime: true,
      durationHours: true,
      vehiclePlate: true,
      vehicleModel: true,
    });
    if (!canProceed) return;
    onProceed({
      draft,
      price,
      startTimeISO: draft.arrivalTime.toISOString(),
      endTimeISO: price.endTime.toISOString(),
    });
  }, [draft, price, canProceed, onProceed]);

  /* ── Guard: missing lot ─────────────────────────────────────────────── */
  if (!lot) {
    return (
      <View
        style={[
          styles.errorContainer,
          { paddingTop: topPadding, paddingBottom: insets.bottom },
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

  /* ── Guard: space not found in sample data ───────────────────────────── */
  if (!space) {
    return (
      <View
        style={[
          styles.errorContainer,
          { paddingTop: topPadding, paddingBottom: insets.bottom },
        ]}
      >
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
      </View>
    );
  }

  const spaceTypeLabel =
    space.type === 'EV'
      ? 'EV Spot'
      : space.type === 'disabled'
      ? 'Accessible Spot'
      : 'Standard Spot';
  const floorName = floorLayout?.name ?? `Floor ${floor}`;

  const arrivalErrorText =
    timeError ??
    (arrivalTooSoon
      ? `Arrival must be at least ${MIN_ARRIVAL_LEAD_MIN} minutes from now`
      : fieldError('arrivalTime'));

  const startDate = draft.arrivalTime;
  const endDate = price.endTime;
  const endsOnDifferentDay = !sameDay(startDate, endDate);
  const dayTag = relativeDayLabel(startDate);
  const durationLabel = `${draft.durationHours} ${draft.durationHours === 1 ? 'hour' : 'hours'}`;
  const visibleChips = DURATION_CHIPS.filter(
    (c) => c >= BOOKING_MIN_DURATION_HRS && c <= BOOKING_MAX_DURATION_HRS
  );

  return (
    <View style={[styles.safeArea, { paddingTop: topPadding }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <CalendarModal
        visible={showCalendar}
        selected={draft.arrivalTime}
        onSelect={handlePickDate}
        onClose={() => setShowCalendar(false)}
      />

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
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingBottom:
                (bottomBarHeight > 0 ? bottomBarHeight : 110 + insets.bottom) + 16,
            },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── 1. Space Selected Card ───────────────────────────────── */}
          <View style={styles.card}>
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

          {/* ── 2. Parking Schedule Card (Arrival + Duration) ─────────── */}
          <View style={styles.card}>
            <View style={styles.scheduleHeaderRow}>
              <Text style={styles.cardSectionLabel}>PARKING SCHEDULE</Text>
              <Text style={styles.rateText}>Rate: Rs. {tariffPerHour}/hr</Text>
            </View>

            {/* ARRIVAL section */}
            <View style={styles.sectionBox}>
              <View style={styles.boxHeaderRow}>
                <Text style={styles.boxHeaderIcon}>📅</Text>
                <Text style={styles.boxHeaderLabel}>ARRIVAL</Text>
              </View>

              {/* Date (opens calendar) */}
              <Text style={styles.fieldLabel}>Select the date</Text>
              <TouchableOpacity
                style={styles.dateButton}
                activeOpacity={0.8}
                onPress={() => setShowCalendar(true)}
                accessibilityRole="button"
                accessibilityLabel={`Arrival date ${formatLongDate(draft.arrivalTime)}. Tap to open calendar`}
              >
                <View style={styles.dateButtonLeft}>
                  <Text style={styles.dateButtonIcon}>🗓️</Text>
                  <View>
                    <Text style={styles.dateButtonText}>{formatLongDate(draft.arrivalTime)}</Text>
                    {dayTag ? <Text style={styles.dateButtonTag}>{dayTag}</Text> : null}
                  </View>
                </View>
                <Text style={styles.dateButtonChange}>Change ▾</Text>
              </TouchableOpacity>

              {/* Time: hour : minute + AM/PM */}
              <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Select / nter the time</Text>
              <View style={styles.timeRow}>
                <TouchableOpacity
                  style={styles.timeStepBtn}
                  onPress={() => stepArrival(-1)}
                  activeOpacity={0.7}
                  accessibilityLabel="Decrease arrival time by one hour"
                >
                  <Text style={styles.timeStepBtnText}>−</Text>
                </TouchableOpacity>

                <View
                  style={[
                    styles.timeInputsWrap,
                    arrivalErrorText ? styles.timeInputsWrapError : null,
                  ]}
                >
                  <TextInput
                    style={styles.timeBox}
                    value={hourText}
                    onChangeText={(v) => {
                      setHourText(v.replace(/[^0-9]/g, ''));
                      setTimeError(undefined);
                    }}
                    onBlur={commitTime}
                    onSubmitEditing={commitTime}
                    keyboardType="number-pad"
                    maxLength={2}
                    selectTextOnFocus
                    placeholder="hh"
                    placeholderTextColor={DriverColors.textMuted}
                    accessibilityLabel="Arrival hour"
                  />
                  <Text style={styles.timeColon}>:</Text>
                  <TextInput
                    style={styles.timeBox}
                    value={minText}
                    onChangeText={(v) => {
                      setMinText(v.replace(/[^0-9]/g, ''));
                      setTimeError(undefined);
                    }}
                    onBlur={commitTime}
                    onSubmitEditing={commitTime}
                    keyboardType="number-pad"
                    maxLength={2}
                    selectTextOnFocus
                    placeholder="mm"
                    placeholderTextColor={DriverColors.textMuted}
                    accessibilityLabel="Arrival minutes"
                  />
                </View>

                <View style={styles.meridiemWrap}>
                  <TouchableOpacity
                    style={[styles.meridiemBtn, !isPm && styles.meridiemBtnOn]}
                    onPress={() => setMeridiem(false)}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityState={{ selected: !isPm }}
                    accessibilityLabel="AM"
                  >
                    <Text style={[styles.meridiemText, !isPm && styles.meridiemTextOn]}>AM</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.meridiemBtn, isPm && styles.meridiemBtnOn]}
                    onPress={() => setMeridiem(true)}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isPm }}
                    accessibilityLabel="PM"
                  >
                    <Text style={[styles.meridiemText, isPm && styles.meridiemTextOn]}>PM</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={styles.timeStepBtn}
                  onPress={() => stepArrival(+1)}
                  activeOpacity={0.7}
                  accessibilityLabel="Increase arrival time by one hour"
                >
                  <Text style={styles.timeStepBtnText}>+</Text>
                </TouchableOpacity>
              </View>

              {arrivalErrorText ? (
                <Text style={styles.fieldError}>{arrivalErrorText}</Text>
              ) : (
                <Text style={styles.timeHintText}>Type the time, or use − / + to change by 1 hour</Text>
              )}
            </View>

            {/* DURATION section */}
            <View style={[styles.sectionBox, { marginTop: 10 }]}>
              <View style={styles.boxHeaderRow}>
                <Text style={styles.boxHeaderIcon}>⏱️</Text>
                <Text style={styles.boxHeaderLabel}>ADD DURATION</Text>
              </View>

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
                <Text style={styles.durationValueText}>{durationLabel}</Text>
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

              <View style={styles.chipRow}>
                {visibleChips.map((c) => {
                  const on = draft.durationHours === c;
                  return (
                    <TouchableOpacity
                      key={c}
                      style={[styles.chip, on && styles.chipOn]}
                      onPress={() => setDuration(c)}
                      activeOpacity={0.8}
                      accessibilityLabel={`${c} hours`}
                    >
                      <Text style={[styles.chipText, on && styles.chipTextOn]}>{c} hr</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {fieldError('durationHours') ? (
                <Text style={styles.fieldError}>{fieldError('durationHours')}</Text>
              ) : null}
            </View>
          </View>

          {/* ── 3. Vehicle Card ───────────────────────────────────────── */}
          <View style={styles.card}>
            <Text style={styles.cardSectionLabel}>VEHICLE</Text>

            <View style={styles.vehiclePill}>
              <Text style={styles.vehiclePillIcon}>{vehicleDetails.icon}</Text>
              <View style={styles.vehiclePillInfo}>
                <Text style={styles.vehiclePlateText}>
                  {draft.vehiclePlate.trim() || `Enter ${vehicleType.toLowerCase()} number`}
                  {draft.vehicleModel.trim() ? (
                    <Text style={styles.vehicleModelText}> ({draft.vehicleModel.trim()})</Text>
                  ) : null}
                </Text>
              </View>
            </View>

            <View style={styles.vehicleForm}>
              <View style={styles.vehicleFormField}>
                <Text style={styles.vehicleFormLabel}>{vehicleType} Number *</Text>
                <TextInput
                  style={[
                    styles.vehicleFormInput,
                    fieldError('vehiclePlate') ? styles.inputError : null,
                  ]}
                  value={draft.vehiclePlate}
                  onChangeText={(value) => {
                    const normalized = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
                    const letters = (normalized.match(/^[A-Z]*/)?.[0] ?? '').slice(0, 3);
                    const digits = normalized
                      .slice(letters.length)
                      .replace(/[^0-9]/g, '')
                      .slice(0, 4);
                    updateDraft((prev) => ({ ...prev, vehiclePlate: `${letters}${digits}` }));
                  }}
                  onBlur={() => touch('vehiclePlate')}
                  placeholder={`e.g. ${vehicleDetails.plateExample}`}
                  placeholderTextColor={DriverColors.textMuted}
                  autoCapitalize="characters"
                  maxLength={7}
                  keyboardType="ascii-capable"
                  textContentType="none"
                  accessibilityLabel={`${vehicleType} number`}
                />
                {fieldError('vehiclePlate') ? (
                  <Text style={styles.fieldError}>{fieldError('vehiclePlate')}</Text>
                ) : null}
              </View>
              <View style={styles.vehicleFormField}>
                <Text style={styles.vehicleFormLabel}>{vehicleType} Model *</Text>
                <TextInput
                  style={[
                    styles.vehicleFormInput,
                    fieldError('vehicleModel') ? styles.inputError : null,
                  ]}
                  value={draft.vehicleModel}
                  onChangeText={(v) => updateDraft((prev) => ({ ...prev, vehicleModel: v }))}
                  onBlur={() => touch('vehicleModel')}
                  placeholder={`e.g. ${vehicleDetails.modelExample}`}
                  placeholderTextColor={DriverColors.textMuted}
                  autoCapitalize="words"
                  maxLength={40}
                  accessibilityLabel={`${vehicleType} model`}
                />
                {fieldError('vehicleModel') ? (
                  <Text style={styles.fieldError}>{fieldError('vehicleModel')}</Text>
                ) : null}
              </View>
            </View>
          </View>

          {/* ── 4. Booking Time Summary Card ──────────────────────────── */}
          <View style={styles.card}>
            <Text style={styles.cardSectionLabel}>BOOKING TIME SUMMARY</Text>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Date</Text>
              <View style={styles.summaryValueCol}>
                <Text style={styles.summaryValue}>{formatLongDate(startDate)}</Text>
                {dayTag ? <Text style={styles.summarySub}>{dayTag}</Text> : null}
              </View>
            </View>

            <View style={styles.summaryDivider} />

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Start Time</Text>
              <Text style={styles.summaryValue}>{formatTime12(startDate)}</Text>
            </View>

            <View style={styles.summaryDivider} />

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>End Time</Text>
              <View style={styles.summaryValueCol}>
                <Text style={styles.summaryValue}>{formatTime12(endDate)}</Text>
                {endsOnDifferentDay ? (
                  <Text style={styles.summarySub}>{formatShortDate(endDate)} (next day)</Text>
                ) : null}
              </View>
            </View>

            <View style={styles.summaryDivider} />

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Duration</Text>
              <Text style={styles.summaryValue}>{durationLabel}</Text>
            </View>
            <View style={styles.summaryDivider} />

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Vehicle Number</Text>
              <Text style={styles.summaryValue}>
                {draft.vehiclePlate.trim() || 'Not entered'}
              </Text>
            </View>
          </View>

          {/* ── 5. Price Details Card ─────────────────────────────────── */}
          <View style={styles.card}>
            <Text style={styles.cardSectionLabel}>PRICE DETAILS</Text>

            <View style={styles.priceEstimateNotice}>
              <Text style={styles.priceEstimateNoticeText}>
                ⓘ Amounts are estimates until confirmed by the server.
              </Text>
            </View>

            <View style={styles.priceRow}>
              <View style={styles.priceRowLeft}>
                <Text style={styles.priceRowTitle}>Parking Fee ({draft.durationHours} hrs)</Text>
                <Text style={styles.priceRowSub}>
                  Rs. {tariffPerHour} × {draft.durationHours} hrs
                </Text>
              </View>
              <Text style={styles.priceRowAmount}>Rs. {price.parkingFeeRs}</Text>
            </View>

            <View style={styles.priceRow}>
              <View style={styles.priceRowLeft}>
                <Text style={styles.priceRowTitle}>Service Fee</Text>
                <Text style={styles.priceRowSub}>Guaranteed spot lock fee *</Text>
              </View>
              <Text style={styles.priceRowAmount}>Rs. {price.serviceFeeRs}</Text>
            </View>

            <View style={styles.priceDivider} />

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalAmount}>Rs. {price.totalRs}</Text>
            </View>

            <Text style={styles.serviceFeeFootnote}>
              * Service fee not yet in the backend model; shown as a UI display estimate only.
            </Text>
          </View>

          {/* ── 6. Free Cancellation Banner ───────────────────────────── */}
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
        <View
          style={[styles.bottomBar, { paddingBottom: bottomBarPaddingBottom }]}
          onLayout={(e) => setBottomBarHeight(e.nativeEvent.layout.height)}
        >
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
    </View>
  );
}

/* ── Styles ─────────────────────────────────────────────────────────────── */
const CARD_RADIUS = 16;

const styles = StyleSheet.create({
  flex1: { flex: 1 },

  // Guard states
  errorContainer: { flex: 1, backgroundColor: '#FFFFFF' },
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
  safeArea: { flex: 1, backgroundColor: DriverColors.background },

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

  sectionBox: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: DriverColors.cardBorder,
    backgroundColor: '#FFFFFF',
    padding: 12,
  },
  boxHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 10 },
  boxHeaderIcon: { fontSize: 13 },
  boxHeaderLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: DriverColors.textSecondary,
    letterSpacing: 0.6,
  },
  fieldLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    color: DriverColors.textSecondary,
    marginBottom: 6,
  },

  // Date button
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: DriverColors.cardBorder,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dateButtonLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  dateButtonIcon: { fontSize: 18 },
  dateButtonText: { fontSize: 14.5, fontWeight: '800', color: DriverColors.navyHeading },
  dateButtonTag: {
    fontSize: 11,
    fontWeight: '700',
    color: DriverColors.orangePrimary,
    marginTop: 1,
  },
  dateButtonChange: { fontSize: 12.5, fontWeight: '700', color: DriverColors.orangePrimary },

  // Time row
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  timeStepBtn: {
    width: 30,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeStepBtnText: {
    fontSize: 18,
    fontWeight: '700',
    color: DriverColors.navyHeading,
    lineHeight: 22,
  },
  timeInputsWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: DriverColors.cardBorder,
    height: 40,
  },
  timeInputsWrapError: { borderColor: '#EF4444' },
  timeBox: {
    width: 34,
    padding: 0,
    margin: 0,
    fontSize: 17,
    fontWeight: '800',
    color: DriverColors.navyHeading,
    textAlign: 'center',
  },
  timeColon: { fontSize: 17, fontWeight: '800', color: DriverColors.navyHeading },
  meridiemWrap: {
    flexDirection: 'row',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: DriverColors.cardBorder,
    overflow: 'hidden',
    height: 40,
  },
  meridiemBtn: {
    paddingHorizontal: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  meridiemBtnOn: { backgroundColor: DriverColors.navyDark },
  meridiemText: { fontSize: 13, fontWeight: '800', color: DriverColors.textSecondary },
  meridiemTextOn: { color: '#FFFFFF' },
  timeHintText: { fontSize: 10.5, color: DriverColors.textMuted, marginTop: 6 },

  // Duration
  durationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  durationStepBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: DriverColors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  durationStepBtnDisabled: { opacity: 0.35 },
  durationStepBtnText: {
    fontSize: 20,
    fontWeight: '700',
    color: DriverColors.navyHeading,
    lineHeight: 24,
  },
  durationValueText: {
    fontSize: 18,
    fontWeight: '800',
    color: DriverColors.navyHeading,
    textAlign: 'center',
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: DriverColors.cardBorder,
  },
  chipOn: {
    backgroundColor: DriverColors.navyDark,
    borderColor: DriverColors.navyDark,
  },
  chipText: { fontSize: 12.5, fontWeight: '700', color: DriverColors.navyHeading },
  chipTextOn: { color: '#FFFFFF' },

  // Summary card
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  summaryLabel: {
    fontSize: 13,
    color: DriverColors.textSecondary,
    fontWeight: '600',
    marginTop: 8,
  },
  summaryValueCol: { alignItems: 'flex-end', marginTop: 8 },
  summaryValue: {
    fontSize: 14.5,
    fontWeight: '800',
    color: DriverColors.navyHeading,
    marginTop: 8,
  },
  summarySub: {
    fontSize: 11,
    fontWeight: '700',
    color: DriverColors.orangePrimary,
    marginTop: 1,
  },
  summaryDivider: { height: 1, backgroundColor: DriverColors.borderLight },

  // Calendar modal
  calOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  calCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
  },
  calHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  calNavBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  calNavBtnDisabled: { opacity: 0.3 },
  calNavText: { fontSize: 24, lineHeight: 26, color: DriverColors.navyHeading, fontWeight: '700' },
  calMonthTitle: { fontSize: 16, fontWeight: '800', color: DriverColors.navyHeading },
  calWeekRow: { flexDirection: 'row', marginBottom: 6 },
  calWeekday: {
    width: `${100 / 7}%`,
    textAlign: 'center',
    fontSize: 11.5,
    fontWeight: '700',
    color: DriverColors.textMuted,
  },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calCell: {
    width: `${100 / 7}%`,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calDay: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calDayToday: { borderWidth: 1.5, borderColor: DriverColors.orangePrimary },
  calDaySelected: { backgroundColor: DriverColors.orangePrimary },
  calDayText: { fontSize: 14, fontWeight: '600', color: DriverColors.navyHeading },
  calDayTextDisabled: { color: '#CBD5E1' },
  calDayTextSelected: { color: '#FFFFFF', fontWeight: '800' },
  calCloseBtn: {
    marginTop: 12,
    alignItems: 'center',
    paddingVertical: 11,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
  },
  calCloseText: { fontSize: 14, fontWeight: '700', color: DriverColors.navyHeading },

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
    marginTop: 10,
    gap: 8,
  },
  vehiclePillIcon: { fontSize: 16 },
  vehiclePillInfo: { flex: 1 },
  vehiclePlateText: { fontSize: 13.5, fontWeight: '700', color: DriverColors.navyHeading },
  vehicleModelText: { fontWeight: '400', color: DriverColors.textSecondary },

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
  fieldError: { fontSize: 11, color: '#EF4444', marginTop: 6, fontWeight: '600' },

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

  bottomSpacer: { height: 0 },

  // Sticky Bottom Bar
  bottomBar: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: DriverColors.borderLight,
    paddingHorizontal: 16,
    paddingTop: 12,
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