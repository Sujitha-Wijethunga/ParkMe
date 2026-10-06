import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import DriverBottomNav, { DriverTabType } from '../../components/DriverBottomNav';
import { DriverColors } from '../../constants/colors';
import {
  canCancelReservation,
  DriverReservation,
  getMyReservations,
  getReservationById,
  isWithinScheduledWindow,
  ReservationStatus,
} from '../../services/reservationApi';

type BookingCategory = 'upcoming' | 'active' | 'past';

interface MyBookingsScreenProps {
  token: string | null;
  userId: string;
  onBack: () => void;
  onSelectBooking: (reservation: DriverReservation) => void;
  onCancelBooking: (reservation: DriverReservation) => void;
  onViewActiveParking: () => void;
  onNavigateHome: () => void;
  onNavigateMap: () => void;
  onNavigateProfile: () => void;
}

interface BookingDetailsScreenProps {
  token: string | null;
  userId: string;
  reservationId: string;
  onBack: () => void;
  onNavigateHome: () => void;
  onNavigateMap: () => void;
  onNavigateProfile: () => void;
}

const CATEGORY_TABS: { key: BookingCategory; label: string }[] = [
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'active', label: 'Active' },
  { key: 'past', label: 'Past' },
];

function getBookingCategory(
  reservation: Pick<DriverReservation, 'status' | 'startTime' | 'endTime'>,
  now: number
): BookingCategory {
  if (reservation.status === 'active') return 'active';
  if (isWithinScheduledWindow(reservation, now)) return 'active';
  if (reservation.status === 'pending' && new Date(reservation.startTime).getTime() > now) return 'upcoming';
  return 'past';
}

function getStatusLabel(status: ReservationStatus): string {
  switch (status) {
    case 'pending':
      return 'Reserved';
    case 'active':
      return 'Active';
    case 'completed':
      return 'Completed';
    case 'cancelled':
      return 'Cancelled';
  }
}

function getStatusStyle(status: ReservationStatus) {
  if (status === 'pending') return styles.statusUpcoming;
  if (status === 'active') return styles.statusActive;
  if (status === 'completed') return styles.statusCompleted;
  return styles.statusCancelled;
}

function getStatusDotStyle(status: ReservationStatus) {
  if (status === 'pending') return styles.statusDotUpcoming;
  if (status === 'active') return styles.statusDotActive;
  if (status === 'completed') return styles.statusDotCompleted;
  return styles.statusDotCancelled;
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date unavailable';
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Time unavailable';
  return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

function formatDuration(startTime: string, endTime: string): string {
  const milliseconds = new Date(endTime).getTime() - new Date(startTime).getTime();
  if (!Number.isFinite(milliseconds) || milliseconds <= 0) return 'Duration unavailable';
  const totalMinutes = Math.round(milliseconds / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes} min`;
  if (minutes === 0) return `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
  return `${hours}h ${minutes}m`;
}

function formatAmount(amount: number): string {
  return `Rs. ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function getLotName(reservation: DriverReservation): string {
  return typeof reservation.parkingLot === 'string'
    ? 'Parking location unavailable'
    : reservation.parkingLot.name || 'Parking location unavailable';
}

function getLotAddress(reservation: DriverReservation): string {
  return typeof reservation.parkingLot === 'string'
    ? ''
    : reservation.parkingLot.address || '';
}

function getSpaceNumber(reservation: DriverReservation): string {
  return typeof reservation.parkingSpace === 'string'
    ? 'Unavailable'
    : reservation.parkingSpace.spaceNumber || 'Unavailable';
}

function getFloor(reservation: DriverReservation): string {
  return typeof reservation.parkingSpace === 'string'
    ? ''
    : reservation.parkingSpace.floor || '';
}

function BookingStatus({ status }: { status: ReservationStatus }) {
  return (
    <View style={[styles.statusPill, getStatusStyle(status)]}>
      <View style={[styles.statusDot, getStatusDotStyle(status)]} />
      <Text style={styles.statusText}>{getStatusLabel(status)}</Text>
    </View>
  );
}

export default function MyBookingsScreen({
  token,
  userId,
  onBack,
  onSelectBooking,
  onCancelBooking,
  onViewActiveParking,
  onNavigateHome,
  onNavigateMap,
  onNavigateProfile,
}: MyBookingsScreenProps) {
  const [activeCategory, setActiveCategory] = useState<BookingCategory>('upcoming');
  const [reservations, setReservations] = useState<DriverReservation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const requestId = useRef(0);

  const loadReservations = useCallback(async (refresh = false) => {
    const id = ++requestId.current;
    setError(null);
    if (refresh) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const result = await getMyReservations(token || '', userId);
      if (requestId.current !== id) return;
      setReservations(result.reservations);
      setWarning(result.warning);
    } catch (loadError) {
      if (requestId.current !== id) return;
      setReservations([]);
      setWarning(null);
      setError(loadError instanceof Error ? loadError.message : 'Unable to load your bookings.');
    } finally {
      if (requestId.current === id) {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    }
  }, [token, userId]);

  useEffect(() => {
    const timeout = setTimeout(() => void loadReservations(), 0);
    return () => {
      clearTimeout(timeout);
      requestId.current += 1;
    };
  }, [loadReservations]);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(interval);
  }, []);

  const categoryCounts = useMemo(() => {
    const counts: Record<BookingCategory, number> = { upcoming: 0, active: 0, past: 0 };
    for (const reservation of reservations) {
      counts[getBookingCategory(reservation, now)] += 1;
    }
    return counts;
  }, [now, reservations]);

  const visibleReservations = useMemo(
    () => reservations.filter((reservation) => getBookingCategory(reservation, now) === activeCategory),
    [activeCategory, now, reservations]
  );

  const handleTabPress = (tab: DriverTabType) => {
    if (tab === 'home') onNavigateHome();
    else if (tab === 'map') onNavigateMap();
    else if (tab === 'profile') onNavigateProfile();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={DriverColors.background} />
      <View style={styles.header}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={styles.backButton}
          onPress={onBack}
        >
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Bookings</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.tabs}>
        {CATEGORY_TABS.map((tab) => {
          const selected = activeCategory === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              style={[styles.tab, selected && styles.tabSelected]}
              onPress={() => {
                setActiveCategory(tab.key);
                void loadReservations(true);
              }}
            >
              <Text style={[styles.tabLabel, selected && styles.tabLabelSelected]}>{tab.label}</Text>
              <Text style={[styles.tabCount, selected && styles.tabCountSelected]}>
                {categoryCounts[tab.key]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {isLoading ? (
        <View style={styles.stateContainer}>
          <ActivityIndicator size="large" color={DriverColors.orangePrimary} />
          <Text style={styles.stateText}>Loading your bookings…</Text>
        </View>
      ) : error ? (
        <View style={styles.stateContainer}>
          <Text style={styles.stateIcon}>!</Text>
          <Text style={styles.stateTitle}>Could not load bookings</Text>
          <Text style={styles.stateText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => void loadReservations()}>
            <Text style={styles.retryText}>Try again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => void loadReservations(true)}
              tintColor={DriverColors.orangePrimary}
            />
          }
        >
          {!!warning && <Text style={styles.inlineWarning}>{warning} Showing bookings saved on this device.</Text>}
          {visibleReservations.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconCircle}>
                <Text style={styles.emptyIcon}>▦</Text>
              </View>
              <Text style={styles.emptyTitle}>No {activeCategory[0].toUpperCase() + activeCategory.slice(1)} Bookings</Text>
              <Text style={styles.emptyText}>
                {activeCategory === 'upcoming'
                  ? 'Your upcoming parking reservations will appear here.'
                  : activeCategory === 'active'
                  ? 'Bookings you are currently using will appear here.'
                  : 'Your completed, cancelled, and expired bookings will appear here.'}
              </Text>
              <TouchableOpacity style={styles.refreshButton} onPress={() => void loadReservations(true)}>
                <Text style={styles.refreshButtonText}>Refresh bookings</Text>
              </TouchableOpacity>
              {activeCategory === 'active' && (
                <TouchableOpacity style={styles.refreshButton} onPress={onViewActiveParking}>
                  <Text style={styles.refreshButtonText}>Open Active Parking</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            visibleReservations.map((reservation) => (
              <View key={reservation._id} style={styles.bookingItem}>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel={`Booking ${reservation.reference || reservation._id}, ${getLotName(reservation)}, ${getStatusLabel(reservation.status)}`}
                  activeOpacity={0.85}
                  style={styles.bookingCard}
                  onPress={() => onSelectBooking(reservation)}
                >
                  <View style={styles.cardTopRow}>
                    <Text style={styles.reference} numberOfLines={1}>REF: {reservation.reference || reservation._id}</Text>
                    <BookingStatus status={reservation.status} />
                  </View>
                  <Text style={styles.lotName} numberOfLines={1}>{getLotName(reservation)}</Text>
                  {!!getLotAddress(reservation) && (
                    <Text style={styles.address} numberOfLines={2}>{getLotAddress(reservation)}</Text>
                  )}
                  <View style={styles.divider} />
                  <View style={styles.infoGrid}>
                    <BookingInfo label="Date & time" value={`${formatDate(reservation.startTime)} · ${formatTime(reservation.startTime)}`} />
                    <BookingInfo label="Duration" value={formatDuration(reservation.startTime, reservation.endTime)} />
                    <BookingInfo label="Space" value={getSpaceNumber(reservation)} />
                    <BookingInfo label="Floor" value={getFloor(reservation) || '—'} />
                  </View>
                  <View style={styles.cardBottomRow}>
                    <Text style={styles.priceLabel}>Total price</Text>
                    <Text style={styles.priceValue}>{formatAmount(reservation.totalAmount)}</Text>
                  </View>
                  <Text style={styles.viewDetails}>View booking details  ›</Text>
                </TouchableOpacity>
                {activeCategory === 'upcoming' && canCancelReservation(reservation, now) ? (
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel={`Cancel booking ${reservation.reference || reservation._id}`}
                    style={styles.cancelUpcomingButton}
                    onPress={() => onCancelBooking(reservation)}
                  >
                    <Text style={styles.cancelUpcomingButtonText}>Cancel Booking</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            ))
          )}
        </ScrollView>
      )}
      <DriverBottomNav activeTab="bookings" onTabPress={handleTabPress} />
    </SafeAreaView>
  );
}

function BookingInfo({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoItem}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={2}>{value}</Text>
    </View>
  );
}

export function BookingDetailsScreen({
  token,
  userId,
  reservationId,
  onBack,
  onNavigateHome,
  onNavigateMap,
  onNavigateProfile,
}: BookingDetailsScreenProps) {
  const [reservation, setReservation] = useState<DriverReservation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  const loadReservation = useCallback(async () => {
    const id = ++requestId.current;
    setIsLoading(true);
    setError(null);
    try {
      const result = await getReservationById(token || '', userId, reservationId);
      if (requestId.current === id) setReservation(result);
    } catch (loadError) {
      if (requestId.current === id) {
        setReservation(null);
        setError(loadError instanceof Error ? loadError.message : 'Unable to load booking details.');
      }
    } finally {
      if (requestId.current === id) setIsLoading(false);
    }
  }, [reservationId, token, userId]);

  useEffect(() => {
    const timeout = setTimeout(() => void loadReservation(), 0);
    return () => {
      clearTimeout(timeout);
      requestId.current += 1;
    };
  }, [loadReservation]);

  const handleTabPress = (tab: DriverTabType) => {
    if (tab === 'home') onNavigateHome();
    else if (tab === 'map') onNavigateMap();
    else if (tab === 'bookings') onBack();
    else if (tab === 'profile') onNavigateProfile();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={DriverColors.background} />
      <View style={styles.header}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Back to bookings"
          style={styles.backButton}
          onPress={onBack}
        >
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Booking Details</Text>
        <View style={styles.headerSpacer} />
      </View>
      {isLoading ? (
        <View style={styles.stateContainer}>
          <ActivityIndicator size="large" color={DriverColors.orangePrimary} />
          <Text style={styles.stateText}>Loading booking details…</Text>
        </View>
      ) : error && !reservation ? (
        <View style={styles.stateContainer}>
          <Text style={styles.stateTitle}>Could not load booking</Text>
          <Text style={styles.stateText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => void loadReservation()}>
            <Text style={styles.retryText}>Try again</Text>
          </TouchableOpacity>
        </View>
      ) : reservation ? (
        <ScrollView contentContainerStyle={styles.detailsContent} showsVerticalScrollIndicator={false}>
          <View style={styles.detailsCard}>
            <View style={styles.cardTopRow}>
              <Text style={styles.reference} numberOfLines={1}>REF: {reservation.reference || reservation._id}</Text>
              <BookingStatus status={reservation.status} />
            </View>
            <Text style={styles.lotName}>{getLotName(reservation)}</Text>
            {!!getLotAddress(reservation) && (
              <Text style={styles.address}>{getLotAddress(reservation)}</Text>
            )}
          </View>
          <View style={styles.detailsCard}>
            <Text style={styles.detailsSectionTitle}>Booking information</Text>
            <BookingInfo label="Date" value={formatDate(reservation.startTime)} />
            <BookingInfo label="Start time" value={formatTime(reservation.startTime)} />
            <BookingInfo label="End time" value={formatTime(reservation.endTime)} />
            <BookingInfo label="Duration" value={formatDuration(reservation.startTime, reservation.endTime)} />
            <BookingInfo label="Parking space" value={getSpaceNumber(reservation)} />
            <BookingInfo label="Floor" value={getFloor(reservation) || '—'} />
            <View style={styles.cardBottomRow}>
              <Text style={styles.priceLabel}>Total price</Text>
              <Text style={styles.priceValue}>{formatAmount(reservation.totalAmount)}</Text>
            </View>
          </View>
          {!!error && <Text style={styles.inlineError}>{error}</Text>}
        </ScrollView>
      ) : null}
      <DriverBottomNav activeTab="bookings" onTabPress={handleTabPress} />
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
    backgroundColor: DriverColors.background,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: DriverColors.surface,
    borderWidth: 1,
    borderColor: DriverColors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: { color: DriverColors.navyHeading, fontSize: 30, lineHeight: 32, marginTop: -3 },
  headerTitle: { color: DriverColors.navyHeading, fontSize: 20, fontWeight: '800' },
  headerSpacer: { width: 40 },
  tabs: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    padding: 4,
    backgroundColor: '#EEF2F7',
    borderRadius: 13,
  },
  tab: {
    flex: 1,
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 10,
  },
  tabSelected: {
    backgroundColor: DriverColors.surface,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 1,
  },
  tabLabel: { color: DriverColors.textSecondary, fontSize: 12, fontWeight: '600' },
  tabLabelSelected: { color: DriverColors.navyHeading, fontWeight: '700' },
  tabCount: {
    minWidth: 19,
    overflow: 'hidden',
    textAlign: 'center',
    color: DriverColors.textSecondary,
    backgroundColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 5,
    paddingVertical: 2,
    fontSize: 10,
    fontWeight: '700',
  },
  tabCountSelected: { color: DriverColors.orangeDark, backgroundColor: DriverColors.orangeLight },
  listContent: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 20, flexGrow: 1 },
  bookingCard: {
    backgroundColor: DriverColors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: DriverColors.cardBorder,
    padding: 15,
    marginBottom: 12,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 1,
  },
  bookingItem: { marginBottom: 12 },
  cancelUpcomingButton: {
    minHeight: 44,
    marginTop: -2,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
    backgroundColor: '#FFF7F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelUpcomingButtonText: { color: '#B42318', fontSize: 13, fontWeight: '700' },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  reference: { color: DriverColors.textSecondary, fontSize: 10, fontWeight: '700', flexShrink: 1 },
  statusPill: {
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  statusUpcoming: { backgroundColor: '#FFF7E6' },
  statusActive: { backgroundColor: '#EAF2FF' },
  statusCompleted: { backgroundColor: '#EAF8F0' },
  statusCancelled: { backgroundColor: '#FEF0EF' },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusDotUpcoming: { backgroundColor: '#D97706' },
  statusDotActive: { backgroundColor: '#2563EB' },
  statusDotCompleted: { backgroundColor: '#059669' },
  statusDotCancelled: { backgroundColor: '#DC2626' },
  statusText: { color: DriverColors.navyHeading, fontSize: 10, fontWeight: '700' },
  lotName: { color: DriverColors.navyHeading, fontSize: 16, fontWeight: '800', marginTop: 11 },
  address: { color: DriverColors.textSecondary, fontSize: 12, lineHeight: 17, marginTop: 3 },
  divider: { height: 1, backgroundColor: DriverColors.borderLight, marginVertical: 12 },
  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 12 },
  infoItem: { width: '50%', paddingRight: 8, marginBottom: 5 },
  infoLabel: { color: DriverColors.textSecondary, fontSize: 10, fontWeight: '600', marginBottom: 4 },
  infoValue: { color: DriverColors.navyHeading, fontSize: 12, fontWeight: '700' },
  cardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: DriverColors.borderLight,
    marginTop: 12,
    paddingTop: 11,
  },
  priceLabel: { color: DriverColors.textSecondary, fontSize: 12, fontWeight: '600' },
  priceValue: { color: DriverColors.orangeDark, fontSize: 15, fontWeight: '800' },
  viewDetails: { color: DriverColors.orangeDark, fontSize: 11, fontWeight: '700', marginTop: 10, textAlign: 'right' },
  stateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingBottom: 36,
  },
  stateIcon: {
    color: DriverColors.orangeDark,
    fontSize: 24,
    fontWeight: '800',
    width: 48,
    height: 48,
    textAlign: 'center',
    textAlignVertical: 'center',
    backgroundColor: DriverColors.orangeLight,
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 14,
  },
  stateTitle: { color: DriverColors.navyHeading, fontSize: 17, fontWeight: '800', textAlign: 'center' },
  stateText: { color: DriverColors.textSecondary, fontSize: 13, textAlign: 'center', lineHeight: 19, marginTop: 9 },
  retryButton: {
    marginTop: 18,
    backgroundColor: DriverColors.orangePrimary,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 11,
  },
  retryText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  emptyState: { flex: 1, minHeight: 360, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  emptyIconCircle: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: '#EEF2F7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },
  emptyIcon: { color: DriverColors.textSecondary, fontSize: 28, fontWeight: '700' },
  emptyTitle: { color: DriverColors.navyHeading, fontSize: 17, fontWeight: '800', textAlign: 'center' },
  emptyText: { color: DriverColors.textSecondary, fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 7, maxWidth: 280 },
  refreshButton: { marginTop: 17, paddingHorizontal: 16, paddingVertical: 9 },
  refreshButtonText: { color: DriverColors.orangeDark, fontSize: 13, fontWeight: '700' },
  detailsContent: { padding: 16, paddingBottom: 24, gap: 12 },
  detailsCard: {
    backgroundColor: DriverColors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: DriverColors.cardBorder,
    padding: 16,
  },
  detailsSectionTitle: { color: DriverColors.navyHeading, fontSize: 15, fontWeight: '800', marginBottom: 14 },
  inlineError: { color: '#B42318', fontSize: 12, lineHeight: 18 },
  inlineWarning: {
    color: '#8A5A00',
    backgroundColor: '#FFF7E6',
    borderRadius: 10,
    padding: 11,
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 10,
  },
});
