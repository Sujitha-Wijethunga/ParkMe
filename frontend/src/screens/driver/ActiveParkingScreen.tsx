import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { DriverColors } from '../../constants/colors';
import {
  DriverReservation,
  getMyReservations,
  isWithinScheduledWindow,
  releaseActiveReservation,
} from '../../services/reservationApi';

interface ActiveParkingScreenProps {
  token: string | null;
  userId: string;
  selectedReservationId?: string | null;
  onBack: () => void;
  onViewBookings: () => void;
  onRelease: (reservation: DriverReservation) => void;
}

interface ReleaseParkingScreenProps {
  token: string | null;
  reservation: DriverReservation;
  onBack: () => void;
  onReleased: () => void;
}

function getRelatedString(
  value: DriverReservation['parkingLot'] | DriverReservation['parkingSpace'],
  field: 'name' | 'address' | 'spaceNumber' | 'floor'
): string {
  if (typeof value === 'string') return '';
  switch (field) {
    case 'name':
      return 'name' in value ? value.name || '' : '';
    case 'address':
      return 'address' in value ? value.address || '' : '';
    case 'spaceNumber':
      return 'spaceNumber' in value ? value.spaceNumber || '' : '';
    case 'floor':
      return 'floor' in value ? value.floor || '' : '';
  }
}

function getLocationName(reservation: DriverReservation): string {
  return getRelatedString(reservation.parkingLot, 'name') || 'Parking location unavailable';
}

function getLocationAddress(reservation: DriverReservation): string {
  return getRelatedString(reservation.parkingLot, 'address');
}

function getSpace(reservation: DriverReservation): string {
  return getRelatedString(reservation.parkingSpace, 'spaceNumber') || '—';
}

function getFloor(reservation: DriverReservation): string {
  return getRelatedString(reservation.parkingSpace, 'floor') || '—';
}

function formatDuration(milliseconds: number, roundUp = false): string {
  const rawMinutes = milliseconds / 60000;
  const totalMinutes = Math.max(0, roundUp ? Math.ceil(rawMinutes) : Math.floor(rawMinutes));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes.toString().padStart(2, '0')}m`;
}

function formatClock(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Time unavailable';
  return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

function getRatePerHour(reservation: DriverReservation): number {
  if (
    typeof reservation.parkingLot !== 'string' &&
    typeof reservation.parkingLot.pricePerHour === 'number' &&
    Number.isFinite(reservation.parkingLot.pricePerHour)
  ) {
    return reservation.parkingLot.pricePerHour;
  }

  const bookedDuration = new Date(reservation.endTime).getTime() - new Date(reservation.startTime).getTime();
  return bookedDuration > 0 ? reservation.totalAmount / (bookedDuration / 3600000) : 0;
}

function formatMoney(amount: number): string {
  return `Rs. ${amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function getElapsedParts(elapsedMs: number) {
  const secondsTotal = Math.max(0, Math.floor(elapsedMs / 1000));
  return {
    hours: Math.floor(secondsTotal / 3600),
    minutes: Math.floor((secondsTotal % 3600) / 60),
    seconds: secondsTotal % 60,
    total: secondsTotal,
  };
}

export default function ActiveParkingScreen({
  token,
  userId,
  selectedReservationId,
  onBack,
  onViewBookings,
  onRelease,
}: ActiveParkingScreenProps) {
  const [activeReservation, setActiveReservation] = useState<DriverReservation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState<number | null>(null);
  const requestId = useRef(0);

  const loadActiveReservation = useCallback(async () => {
    const id = ++requestId.current;
    setIsLoading(true);
    setError(null);
    try {
      const result = await getMyReservations(token || '', userId);
      if (requestId.current !== id) return;
      const activeReservations = result.reservations.filter(
        (item) => item.status === 'active' || isWithinScheduledWindow(item)
      );
      const selectedReservation = activeReservations.find((item) => item._id === selectedReservationId);
      setActiveReservation(
        selectedReservation ||
        activeReservations.find((item) => item.status === 'active') ||
        activeReservations[0] ||
        null
      );
      if (result.warning) setError(`Could not refresh server bookings: ${result.warning}`);
    } catch (loadError) {
      if (requestId.current !== id) return;
      setActiveReservation(null);
      setError(loadError instanceof Error ? loadError.message : 'Unable to load your active parking session.');
    } finally {
      if (requestId.current === id) setIsLoading(false);
    }
  }, [selectedReservationId, token, userId]);

  useEffect(() => {
    const timeout = setTimeout(() => void loadActiveReservation(), 0);
    return () => {
      clearTimeout(timeout);
      requestId.current += 1;
    };
  }, [loadActiveReservation]);

  useEffect(() => {
    const initialTick = setTimeout(() => setNow(Date.now()), 0);
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      clearTimeout(initialTick);
      clearInterval(interval);
    };
  }, []);

  const scheduledStartMs = activeReservation ? new Date(activeReservation.startTime).getTime() : 0;
  const sessionStartMs = activeReservation
    ? new Date(activeReservation.verifiedAt || activeReservation.startTime).getTime()
    : 0;
  const endMs = activeReservation ? new Date(activeReservation.endTime).getTime() : 0;
  const elapsedMs = activeReservation ? Math.max(0, (now ?? 0) - sessionStartMs) : 0;
  const bookedMs = activeReservation ? Math.max(0, endMs - scheduledStartMs) : 0;
  const remainingMs = activeReservation ? endMs - (now ?? 0) : 0;
  const elapsed = useMemo(() => getElapsedParts(elapsedMs), [elapsedMs]);
  const ratePerHour = activeReservation ? getRatePerHour(activeReservation) : 0;
  const currentCost = ratePerHour * (elapsedMs / 3600000);
  const progress = bookedMs > 0 ? Math.min(elapsedMs / bookedMs, 1) : 0;
  const progressColorStyles = [
    styles.progress0,
    styles.progress25,
    styles.progress50,
    styles.progress75,
  ];
  const progressStyle = progress < 0.25
    ? progressColorStyles[0]
    : progress < 0.5
    ? progressColorStyles[1]
    : progress < 0.75
    ? progressColorStyles[2]
    : progressColorStyles[3];
  const indicatorAngle = progress * Math.PI * 2 - Math.PI / 2;
  const indicatorOffset = 76;
  const indicatorPosition = {
    left: 100 + Math.cos(indicatorAngle) * indicatorOffset - 8,
    top: 100 + Math.sin(indicatorAngle) * indicatorOffset - 8,
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={DriverColors.background} />
      <View style={styles.header}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Go back" style={styles.headerButton} onPress={onBack}>
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Active Parking</Text>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Show booking reference"
          style={styles.headerButton}
          onPress={() => activeReservation && Alert.alert('Booking reference', activeReservation._id)}
        >
          <Text style={styles.qrIcon}>▦</Text>
        </TouchableOpacity>
      </View>

      {isLoading || (activeReservation !== null && now === null) ? (
        <View style={styles.stateContainer}>
          <ActivityIndicator size="large" color={DriverColors.orangePrimary} />
          <Text style={styles.stateText}>Loading active parking…</Text>
        </View>
      ) : error && !activeReservation ? (
        <View style={styles.stateContainer}>
          <Text style={styles.emptyIcon}>!</Text>
          <Text style={styles.emptyTitle}>Could not load active parking</Text>
          <Text style={styles.stateText}>{error}</Text>
          <TouchableOpacity style={styles.secondaryButton} onPress={() => void loadActiveReservation()}>
            <Text style={styles.secondaryButtonText}>Try again</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.textButton} onPress={onViewBookings}>
            <Text style={styles.textButtonLabel}>View My Bookings</Text>
          </TouchableOpacity>
        </View>
      ) : !activeReservation ? (
        <View style={styles.stateContainer}>
          <View style={styles.emptyIconCircle}><Text style={styles.emptyIcon}>P</Text></View>
          <Text style={styles.emptyTitle}>No Active Parking</Text>
          <Text style={styles.stateText}>Your active parking session will appear here.</Text>
          <TouchableOpacity style={styles.secondaryButton} onPress={onViewBookings}>
            <Text style={styles.secondaryButtonText}>View My Bookings</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            {error ? <Text style={styles.warningText}>{error}</Text> : null}
            <View style={styles.timerSection}>
              <View style={styles.timerCircle}>
                <View style={[styles.timerTrack, progressStyle]} />
                <View style={styles.timerInner}>
                  <Text style={styles.elapsedLabel}>ELAPSED</Text>
                  <Text style={styles.elapsedValue}>{formatDuration(elapsedMs)}</Text>
                  <Text style={styles.secondsValue}>:{elapsed.seconds.toString().padStart(2, '0')}</Text>
                </View>
                <View style={[styles.progressIndicator, indicatorPosition]} />
              </View>
              <View style={styles.occupiedBadge}>
                <View style={styles.occupiedDot} />
                <Text style={styles.occupiedText}>
                  {activeReservation.status === 'active' ? 'Occupied' : 'Scheduled'}
                </Text>
              </View>
            </View>

            <View style={styles.sessionCard}>
              <View style={styles.lotHeader}>
                <View style={styles.lotDetails}>
                  <Text style={styles.reference} numberOfLines={1}>REF: {activeReservation._id}</Text>
                  <Text style={styles.locationName} numberOfLines={2}>{getLocationName(activeReservation)}</Text>
                  {!!getLocationAddress(activeReservation) && (
                    <Text style={styles.address} numberOfLines={2}>⌖ {getLocationAddress(activeReservation)}</Text>
                  )}
                </View>
                <View style={styles.spaceBadge}>
                  <Text style={styles.spaceLabel}>SPACE</Text>
                  <Text style={styles.spaceValue}>{getSpace(activeReservation)}</Text>
                </View>
              </View>

              <View style={styles.informationRow}>
                <Info
                  label={activeReservation.status === 'active' ? 'ARRIVED' : 'STARTED'}
                  value={formatClock(activeReservation.verifiedAt || activeReservation.startTime)}
                />
                <Info label="FLOOR" value={getFloor(activeReservation)} />
                <Info label="BOOKED" value={formatDuration(bookedMs)} />
              </View>

              <View style={[styles.remainingPanel, remainingMs < 0 && styles.overtimePanel]}>
                <Text style={styles.remainingIcon}>{remainingMs < 0 ? '!' : '◷'}</Text>
                <View style={styles.remainingTextBlock}>
                  <Text style={styles.remainingLabel}>{remainingMs < 0 ? 'OVERTIME' : 'TIME REMAINING'}</Text>
                  <Text style={[styles.remainingValue, remainingMs < 0 && styles.overtimeText]}>
                    {remainingMs < 0
                      ? formatDuration(Math.abs(remainingMs), true)
                      : formatDuration(remainingMs, true)}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.costCard}>
              <View style={styles.costIcon}><Text style={styles.dollar}>$</Text></View>
              <View style={styles.costDetails}>
                <Text style={styles.costLabel}>CURRENT COST</Text>
                <View style={styles.costLine}>
                  <Text style={styles.costValue}>{formatMoney(currentCost)}</Text>
                  <Text style={styles.soFar}>so far</Text>
                </View>
              </View>
              <View style={styles.rateDetails}>
                <Text style={styles.costLabel}>RATE</Text>
                <Text style={styles.rateValue}>{formatMoney(ratePerHour)}/hr</Text>
              </View>
            </View>
          </ScrollView>

          {activeReservation.status === 'active' ? (
            <View style={styles.footer}>
              <TouchableOpacity
                accessibilityRole="button"
                style={styles.releaseButton}
                onPress={() => onRelease(activeReservation)}
              >
                <Text style={styles.releaseIcon}>↪</Text>
                <Text style={styles.releaseText}>Release Space Now</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </>
      )}
    </SafeAreaView>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoColumn}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

export function ReleaseParkingScreen({
  token,
  reservation,
  onBack,
  onReleased,
}: ReleaseParkingScreenProps) {
  const [isReleasing, setIsReleasing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRelease = async () => {
    if (isReleasing) return;
    setIsReleasing(true);
    setError(null);
    try {
      await releaseActiveReservation(token || '', reservation._id);
      onReleased();
    } catch (releaseError) {
      setError(releaseError instanceof Error ? releaseError.message : 'Unable to release the parking space.');
    } finally {
      setIsReleasing(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={DriverColors.background} />
      <View style={styles.header}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Back to active parking" style={styles.headerButton} onPress={onBack}>
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Release Parking</Text>
        <View style={styles.headerButton} />
      </View>
      <ScrollView contentContainerStyle={styles.releaseContent}>
        <View style={styles.confirmIconCircle}><Text style={styles.confirmIcon}>↪</Text></View>
        <Text style={styles.confirmTitle}>Release this space?</Text>
        <Text style={styles.confirmDescription}>
          Confirm that you have finished parking. The session will be marked completed and the space released.
        </Text>
        <View style={styles.sessionCard}>
          <Text style={styles.reference}>REF: {reservation._id}</Text>
          <Text style={styles.locationName}>{getLocationName(reservation)}</Text>
          {!!getLocationAddress(reservation) && (
            <Text style={styles.address}>{getLocationAddress(reservation)}</Text>
          )}
          <View style={styles.informationRow}>
            <Info label="SPACE" value={getSpace(reservation)} />
            <Info label="FLOOR" value={getFloor(reservation)} />
            <Info label="ARRIVED" value={formatClock(reservation.startTime)} />
          </View>
        </View>
        {!!error && <Text style={styles.releaseError}>{error}</Text>}
        <TouchableOpacity
          accessibilityRole="button"
          disabled={isReleasing}
          style={[styles.confirmButton, isReleasing && styles.disabledButton]}
          onPress={() => void handleRelease()}
        >
          {isReleasing
            ? <ActivityIndicator color="#FFFFFF" />
            : <Text style={styles.confirmButtonText}>Confirm Release</Text>}
        </TouchableOpacity>
        <TouchableOpacity disabled={isReleasing} style={styles.keepButton} onPress={onBack}>
          <Text style={styles.keepButtonText}>Keep Parking</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: DriverColors.background },
  header: {
    minHeight: 58,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: { color: DriverColors.navyHeading, fontSize: 30, lineHeight: 32, marginTop: -3 },
  qrIcon: { color: DriverColors.navyHeading, fontSize: 21, fontWeight: '700' },
  headerTitle: { color: DriverColors.navyHeading, fontSize: 18, fontWeight: '800' },
  content: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 18, flexGrow: 1 },
  timerSection: { alignItems: 'center', paddingTop: 6, paddingBottom: 16 },
  timerCircle: { width: 200, height: 200, alignItems: 'center', justifyContent: 'center' },
  timerTrack: {
    position: 'absolute',
    width: 170,
    height: 170,
    borderRadius: 85,
    borderWidth: 7,
    borderColor: '#E2E8F0',
  },
  progress0: { borderTopColor: DriverColors.navyDark },
  progress25: { borderTopColor: DriverColors.navyDark, borderRightColor: DriverColors.navyDark },
  progress50: {
    borderTopColor: DriverColors.navyDark,
    borderRightColor: DriverColors.navyDark,
    borderBottomColor: DriverColors.navyDark,
  },
  progress75: { borderColor: DriverColors.navyDark },
  timerInner: { alignItems: 'center', justifyContent: 'center' },
  elapsedLabel: { color: DriverColors.textSecondary, fontSize: 9, fontWeight: '700', letterSpacing: 0.3 },
  elapsedValue: { color: DriverColors.navyDark, fontSize: 28, fontWeight: '900', marginTop: 5 },
  secondsValue: { color: DriverColors.textSecondary, fontSize: 12, fontWeight: '600', marginTop: 2 },
  progressIndicator: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 4,
    borderColor: DriverColors.navyDark,
  },
  occupiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    backgroundColor: '#FFF7F7',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    marginTop: 1,
  },
  occupiedDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#EF4444' },
  occupiedText: { color: '#EF4444', fontSize: 10, fontWeight: '700' },
  sessionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 17,
    borderWidth: 1,
    borderColor: DriverColors.cardBorder,
    padding: 13,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 1,
  },
  lotHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 9 },
  lotDetails: { flex: 1, minWidth: 0 },
  reference: { color: DriverColors.textSecondary, fontSize: 9, fontWeight: '700' },
  locationName: { color: DriverColors.navyHeading, fontSize: 13, fontWeight: '800', marginTop: 3 },
  address: { color: DriverColors.textSecondary, fontSize: 10, marginTop: 4, lineHeight: 15 },
  spaceBadge: {
    minWidth: 43,
    paddingHorizontal: 8,
    paddingVertical: 7,
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    borderRadius: 10,
  },
  spaceLabel: { color: DriverColors.textSecondary, fontSize: 8, fontWeight: '700' },
  spaceValue: { color: DriverColors.navyHeading, fontSize: 14, fontWeight: '800', marginTop: 2 },
  informationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 13,
    marginBottom: 11,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: DriverColors.borderLight,
  },
  infoColumn: { flex: 1, alignItems: 'center', paddingHorizontal: 3 },
  infoLabel: { color: DriverColors.textSecondary, fontSize: 8, fontWeight: '700' },
  infoValue: { color: DriverColors.navyHeading, fontSize: 10, fontWeight: '800', marginTop: 4 },
  remainingPanel: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 11,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  overtimePanel: { backgroundColor: '#FFF7ED', borderColor: '#FDBA74' },
  remainingIcon: { color: DriverColors.navyDark, fontSize: 17, fontWeight: '800' },
  remainingTextBlock: { flex: 1 },
  remainingLabel: { color: DriverColors.navyHeading, fontSize: 8, fontWeight: '700' },
  remainingValue: { color: DriverColors.navyHeading, fontSize: 12, fontWeight: '800', marginTop: 2 },
  overtimeText: { color: '#C2410C' },
  costCard: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: DriverColors.cardBorder,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 9,
    marginTop: 11,
  },
  costIcon: {
    width: 31,
    height: 31,
    borderRadius: 9,
    backgroundColor: DriverColors.orangeLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 9,
  },
  dollar: { color: DriverColors.orangePrimary, fontSize: 17, fontWeight: '800' },
  costDetails: { flex: 1 },
  costLabel: { color: DriverColors.textSecondary, fontSize: 8, fontWeight: '700' },
  costLine: { flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 3 },
  costValue: { color: DriverColors.navyHeading, fontSize: 12, fontWeight: '800' },
  soFar: { color: DriverColors.textSecondary, fontSize: 9 },
  rateDetails: { alignItems: 'flex-end', marginLeft: 6 },
  rateValue: { color: DriverColors.navyHeading, fontSize: 10, fontWeight: '800', marginTop: 4 },
  footer: { paddingHorizontal: 16, paddingTop: 9, paddingBottom: 12 },
  releaseButton: {
    minHeight: 48,
    borderWidth: 1.5,
    borderColor: DriverColors.navyDark,
    borderRadius: 26,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: DriverColors.background,
  },
  releaseIcon: { color: DriverColors.navyDark, fontSize: 16, fontWeight: '800' },
  releaseText: { color: DriverColors.navyDark, fontSize: 13, fontWeight: '800' },
  stateContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 },
  stateText: { color: DriverColors.textSecondary, textAlign: 'center', fontSize: 13, lineHeight: 19, marginTop: 8 },
  emptyIconCircle: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: '#EEF2F7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyIcon: { color: DriverColors.textSecondary, fontSize: 24, fontWeight: '800', marginBottom: 14 },
  emptyTitle: { color: DriverColors.navyHeading, fontSize: 17, fontWeight: '800', textAlign: 'center' },
  secondaryButton: {
    marginTop: 17,
    paddingHorizontal: 19,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: DriverColors.orangePrimary,
  },
  secondaryButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  textButton: { padding: 14 },
  textButtonLabel: { color: DriverColors.orangeDark, fontSize: 13, fontWeight: '700' },
  warningText: {
    color: '#8A5A00',
    backgroundColor: '#FFF7E6',
    borderRadius: 9,
    padding: 9,
    fontSize: 11,
    marginBottom: 7,
  },
  releaseContent: { flexGrow: 1, paddingHorizontal: 18, paddingTop: 30, paddingBottom: 24, alignItems: 'stretch' },
  confirmIconCircle: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: DriverColors.orangeLight,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  confirmIcon: { color: DriverColors.orangeDark, fontSize: 26, fontWeight: '800' },
  confirmTitle: { color: DriverColors.navyHeading, fontSize: 21, fontWeight: '800', textAlign: 'center', marginTop: 17 },
  confirmDescription: {
    color: DriverColors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  releaseError: { color: '#B42318', fontSize: 12, lineHeight: 18, marginTop: 12 },
  confirmButton: {
    minHeight: 49,
    backgroundColor: DriverColors.orangePrimary,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
  },
  disabledButton: { opacity: 0.65 },
  confirmButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  keepButton: { minHeight: 45, alignItems: 'center', justifyContent: 'center', marginTop: 7 },
  keepButtonText: { color: DriverColors.textSecondary, fontSize: 13, fontWeight: '700' },
});
