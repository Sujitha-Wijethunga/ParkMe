import React, { useCallback, useEffect, useRef, useState } from 'react';
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
import DriverBottomNav from '../../components/DriverBottomNav';
import { DriverColors } from '../../constants/colors';
import { getCurrentUser } from '../../services/authApi';
import {
  DriverReservation,
  getMyReservations,
} from '../../services/reservationApi';
import { DriverUser } from '../../services/storage';

interface DriverProfileScreenProps {
  token: string;
  userId: string;
  initialUser: DriverUser;
  onBack: () => void;
  onNavigateHome: () => void;
  onNavigateMap: () => void;
  onNavigateBookings: () => void;
  onLogout: () => void;
  onSessionExpired: () => void;
}

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return words.slice(0, 2).map((word) => word[0].toUpperCase()).join('') || '?';
}

function isUnauthorized(error: unknown): boolean {
  return typeof error === 'object' && error !== null &&
    'status' in error && (error.status === 401 || error.status === 403);
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
    return error.message;
  }
  return 'Unable to refresh profile information.';
}

function formatParkingTime(reservations: DriverReservation[] | null): string {
  if (!reservations) return '—';

  const totalMilliseconds = reservations
    .filter((reservation) => reservation.status === 'completed' || reservation.status === 'active')
    .reduce((total, reservation) => {
      const start = Date.parse(reservation.verifiedAt || reservation.startTime);
      const end = Date.parse(
        reservation.status === 'active'
          ? new Date().toISOString()
          : reservation.actualEndTime || reservation.endTime
      );
      return Number.isFinite(start) && Number.isFinite(end) && end > start
        ? total + end - start
        : total;
    }, 0);

  const totalMinutes = Math.floor(totalMilliseconds / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes} min`;
  if (minutes === 0) return `${hours} hrs`;
  return `${hours}h ${minutes}m`;
}

function paymentSummary(reservations: DriverReservation[] | null): string {
  if (!reservations) return 'Payment history unavailable';
  const methods = Array.from(new Set(
    reservations
      .filter((reservation) => reservation.status === 'completed' && reservation.paymentMethod)
      .map((reservation) => reservation.paymentMethod!.toLowerCase())
  ));
  if (methods.length === 0) return 'No completed payments recorded';
  return methods.map((method) => method.charAt(0).toUpperCase() + method.slice(1)).join(' · ');
}

export default function DriverProfileScreen({
  token,
  userId,
  initialUser,
  onBack,
  onNavigateHome,
  onNavigateMap,
  onNavigateBookings,
  onLogout,
  onSessionExpired,
}: DriverProfileScreenProps) {
  const [user, setUser] = useState(initialUser);
  const [reservations, setReservations] = useState<DriverReservation[] | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [bookingsError, setBookingsError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const requestId = useRef(0);

  const loadProfile = useCallback(async () => {
    const currentRequestId = ++requestId.current;
    setIsRefreshing(true);
    setProfileError(null);
    setBookingsError(null);

    try {
      const updatedUser = await getCurrentUser(token);
      if (requestId.current !== currentRequestId) return;
      setUser(updatedUser);
    } catch (error) {
      if (requestId.current !== currentRequestId) return;
      if (isUnauthorized(error)) {
        onSessionExpired();
        return;
      }
      setProfileError(getErrorMessage(error));
    }

    try {
      const result = await getMyReservations(token, userId);
      if (requestId.current !== currentRequestId) return;
      setReservations(result.reservations);
      if (result.warning) setBookingsError(result.warning);
    } catch (error) {
      if (requestId.current !== currentRequestId) return;
      setBookingsError(getErrorMessage(error));
    } finally {
      if (requestId.current === currentRequestId) setIsRefreshing(false);
    }
  }, [onSessionExpired, token, userId]);

  useEffect(() => {
    const initialLoadTimer = setTimeout(() => {
      void loadProfile();
    }, 0);
    return () => {
      clearTimeout(initialLoadTimer);
      requestId.current += 1;
    };
  }, [loadProfile]);

  const handleTabPress = (tab: 'home' | 'map' | 'bookings' | 'profile') => {
    if (tab === 'home') onNavigateHome();
    if (tab === 'map') onNavigateMap();
    if (tab === 'bookings') onNavigateBookings();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={DriverColors.background} />
      <View style={styles.header}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Back to home"
          style={styles.headerButton}
          onPress={onBack}
        >
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Profile</Text>
        <View style={styles.headerButton} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => void loadProfile()}
            tintColor={DriverColors.orangePrimary}
          />
        }
      >
        {profileError ? (
          <View style={styles.warningBanner}>
            <Text style={styles.warningText}>Profile refresh failed: {profileError}</Text>
          </View>
        ) : null}

        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getInitials(user.name)}</Text>
          </View>
          <View style={styles.profileDetails}>
            <Text style={styles.name} numberOfLines={1}>{user.name}</Text>
            <Text style={styles.profileSubtext} numberOfLines={1}>{user.email}</Text>
            {user.phone ? (
              <Text style={styles.profileSubtext} numberOfLines={1}>{user.phone}</Text>
            ) : null}
          </View>
        </View>

        <View style={styles.statsCard}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{reservations ? reservations.length : '—'}</Text>
            <Text style={styles.statLabel}>Total Bookings</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>{formatParkingTime(reservations)}</Text>
            <Text style={styles.statLabel}>Parking Time</Text>
          </View>
        </View>
        {bookingsError ? (
          <Text style={styles.inlineError}>Booking statistics could not be refreshed: {bookingsError}</Text>
        ) : null}

        <SectionTitle title="MY REGISTERED VEHICLES" />
        <View style={styles.infoCard}>
          <View style={styles.iconCircle}>
            <Text style={styles.infoIcon}>▣</Text>
          </View>
          <View style={styles.infoCopy}>
            <Text style={styles.infoTitle}>Vehicle information unavailable</Text>
            <Text style={styles.infoSubtext}>
              Vehicle registration is not supported by the driver account services yet.
            </Text>
          </View>
        </View>

        <SectionTitle title="ACCOUNT & PREFERENCES" />
        <View style={styles.listCard}>
          <InfoRow
            icon="▤"
            title="Payment History"
            subtitle={paymentSummary(reservations)}
            onPress={onNavigateBookings}
          />
          <View style={styles.rowDivider} />
          <InfoRow
            icon="▧"
            title="Booking History & Receipts"
            subtitle="View your reservations and receipts"
            onPress={onNavigateBookings}
          />
        </View>
        <Text style={styles.unavailableNote}>
          Saved payment methods, wallet balance, notification preferences, and support options are not available from the current driver services.
        </Text>

        <TouchableOpacity
          accessibilityRole="button"
          style={styles.logoutButton}
          onPress={onLogout}
        >
          <Text style={styles.logoutIcon}>⇥</Text>
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>

        {isRefreshing && !reservations ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={DriverColors.orangePrimary} />
            <Text style={styles.loadingText}>Loading account activity…</Text>
          </View>
        ) : null}
      </ScrollView>

      <DriverBottomNav activeTab="profile" onTabPress={handleTabPress} />
    </SafeAreaView>
  );
}

function SectionTitle({ title }: { title: string }) {
  return <Text style={styles.sectionTitle}>{title}</Text>;
}

function InfoRow({
  icon,
  title,
  subtitle,
  onPress,
}: {
  icon: string;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      style={styles.infoRow}
      onPress={onPress}
    >
      <Text style={styles.rowIcon}>{icon}</Text>
      <View style={styles.infoCopy}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowSubtitle} numberOfLines={1}>{subtitle}</Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: DriverColors.background,
  },
  header: {
    minHeight: 54,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: DriverColors.cardBorder,
    backgroundColor: DriverColors.surface,
  },
  headerButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    color: DriverColors.navyDark,
    fontSize: 34,
    lineHeight: 38,
  },
  headerTitle: {
    color: DriverColors.navyHeading,
    fontSize: 17,
    fontWeight: '700',
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 22,
  },
  profileCard: {
    minHeight: 112,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: DriverColors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: DriverColors.cardBorder,
  },
  avatar: {
    width: 62,
    height: 62,
    marginRight: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 31,
    backgroundColor: '#E8EDFF',
  },
  avatarText: {
    color: '#243B9B',
    fontSize: 21,
    fontWeight: '700',
  },
  profileDetails: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    color: DriverColors.navyHeading,
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 4,
  },
  profileSubtext: {
    color: DriverColors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
  statsCard: {
    minHeight: 84,
    marginTop: 14,
    paddingVertical: 13,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: DriverColors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: DriverColors.cardBorder,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    color: DriverColors.navyHeading,
    fontSize: 18,
    fontWeight: '700',
  },
  statLabel: {
    marginTop: 4,
    color: DriverColors.textSecondary,
    fontSize: 11,
    textAlign: 'center',
  },
  statDivider: {
    width: StyleSheet.hairlineWidth,
    height: 42,
    backgroundColor: DriverColors.cardBorder,
  },
  sectionTitle: {
    marginTop: 22,
    marginBottom: 9,
    color: DriverColors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.35,
  },
  infoCard: {
    minHeight: 74,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: DriverColors.surface,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: DriverColors.cardBorder,
  },
  iconCircle: {
    width: 36,
    height: 36,
    marginRight: 11,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF2FF',
  },
  infoIcon: {
    color: DriverColors.brandPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  infoCopy: {
    flex: 1,
    minWidth: 0,
  },
  infoTitle: {
    color: DriverColors.textBody,
    fontSize: 13,
    fontWeight: '700',
  },
  infoSubtext: {
    marginTop: 3,
    color: DriverColors.textSecondary,
    fontSize: 11,
    lineHeight: 16,
  },
  listCard: {
    overflow: 'hidden',
    backgroundColor: DriverColors.surface,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: DriverColors.cardBorder,
  },
  infoRow: {
    minHeight: 58,
    paddingHorizontal: 13,
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowIcon: {
    width: 30,
    color: '#15257C',
    fontSize: 18,
    fontWeight: '700',
  },
  rowTitle: {
    color: DriverColors.textBody,
    fontSize: 12,
    fontWeight: '700',
  },
  rowSubtitle: {
    marginTop: 3,
    color: DriverColors.textSecondary,
    fontSize: 10,
  },
  chevron: {
    marginLeft: 8,
    color: DriverColors.textSecondary,
    fontSize: 24,
  },
  rowDivider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 43,
    backgroundColor: DriverColors.cardBorder,
  },
  unavailableNote: {
    marginTop: 10,
    color: DriverColors.textMuted,
    fontSize: 11,
    lineHeight: 16,
  },
  logoutButton: {
    minHeight: 46,
    marginTop: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    backgroundColor: '#FFF7F7',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutIcon: {
    marginRight: 8,
    color: '#EF4444',
    fontSize: 17,
    fontWeight: '700',
  },
  logoutText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '700',
  },
  warningBanner: {
    marginBottom: 12,
    padding: 11,
    borderRadius: 10,
    backgroundColor: '#FFF7ED',
  },
  warningText: {
    color: '#9A3412',
    fontSize: 12,
  },
  inlineError: {
    marginTop: 8,
    color: '#B91C1C',
    fontSize: 11,
    lineHeight: 16,
  },
  loadingRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginLeft: 8,
    color: DriverColors.textSecondary,
    fontSize: 12,
  },
});
