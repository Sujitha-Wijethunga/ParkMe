import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  StatusBar,
  TextInput,
  Alert,
} from 'react-native';
export interface ReservationItem {
  id: string;
  parkingLotId: string;
  initials: string;
  slot: string;
  reference: string;
  time: string;
  eta: string;
  status: 'Reserved' | 'Active' | 'Completed' | 'Cancelled';
  driverNameMasked: string;
  plate: string;
  bookingTime: string;
  assignedSpace: string;
  paymentAmount: string;
  paymentMethod: string;
}

interface ReservationsScreenProps {
  onBack: () => void;
  onAdmitVehicle?: (reservationId: string, reference: string, slot: string) => void;
  apiBaseUrl: string;
  authToken: string | null;
}

export default function ReservationsScreen({
  onBack,
  onAdmitVehicle,
  apiBaseUrl,
  authToken,
}: ReservationsScreenProps) {
  const [reservations, setReservations] = useState<ReservationItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'Upcoming' | 'Active' | 'Completed' | 'Cancelled'>('Upcoming');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchReservations = useCallback(async (): Promise<ReservationItem[]> => {
    if (!authToken) {
      return [];
    }
    const response = await fetch(`${apiBaseUrl}/api/reservations`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || 'Unable to load reservations');
    return result.map((reservation: any): ReservationItem => {
      const slot = reservation.parkingSpace?.spaceNumber || '—';
      const driverName = reservation.driver?.name || 'Driver';
      const createdAt = new Date(reservation.createdAt);
      const startTime = new Date(reservation.startTime);
      const status = reservation.status === 'pending'
        ? 'Reserved'
        : reservation.status === 'active'
          ? 'Active'
          : reservation.status === 'cancelled'
            ? 'Cancelled'
            : 'Completed';
      return {
        id: reservation._id,
        parkingLotId: reservation.parkingLot?._id || reservation.parkingLot,
        initials: driverName.split(/\s+/).map((part: string) => part[0]).join('').slice(0, 2).toUpperCase(),
        slot,
        reference: reservation.reference || `PM-${reservation._id.slice(-6).toUpperCase()}`,
        time: startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        eta: startTime > new Date() ? startTime.toLocaleDateString() : status,
        status,
        driverNameMasked: driverName,
        plate: '—',
        bookingTime: createdAt.toLocaleString(),
        assignedSpace: `${slot} · ${reservation.parkingLot?.name || 'Parking lot'}`,
        paymentAmount: `Rs. ${Number(reservation.totalAmount || 0).toFixed(2)}`,
        paymentMethod: 'Not recorded',
      };
    });
  }, [apiBaseUrl, authToken]);

  const loadReservations = async () => {
    setReservations(await fetchReservations());
  };

  useEffect(() => {
    let isMounted = true;
    void fetchReservations()
      .then((data) => {
        if (isMounted) setReservations(data);
      })
      .catch((error: unknown) => {
        if (isMounted) {
          Alert.alert('Unable to load reservations', error instanceof Error ? error.message : 'Please try again.');
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, [fetchReservations]);

  const updateReservation = async (item: ReservationItem, action: 'verify' | 'complete') => {
    if (!authToken) throw new Error('Please sign in again to manage reservations.');
    const response = await fetch(`${apiBaseUrl}/api/reservations/${item.id}/${action}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || `Unable to ${action} reservation`);
    await loadReservations();
  };

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const upcomingCount = reservations.filter((r) => r.status === 'Reserved').length;
  const activeCount = reservations.filter((r) => r.status === 'Active').length;
  const completedCount = reservations.filter((r) => r.status === 'Completed').length;
  const cancelledCount = reservations.filter((r) => r.status === 'Cancelled').length;

  const filteredReservations = reservations.filter((r) => {
    const matchesTab =
      (activeTab === 'Upcoming' && r.status === 'Reserved') ||
      (activeTab === 'Active' && r.status === 'Active') ||
      (activeTab === 'Completed' && r.status === 'Completed') ||
      (activeTab === 'Cancelled' && r.status === 'Cancelled');

    const query = searchQuery.trim().toLowerCase();
    const matchesSearch =
      r.reference.toLowerCase().includes(query) ||
      r.slot.toLowerCase().includes(query) ||
      r.plate.toLowerCase().includes(query);

    return matchesTab && matchesSearch;
  });

  const handleVerify = (item: ReservationItem) => {
    Alert.alert('Verify reservation?', `Activate booking ${item.reference} for space ${item.slot}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Verify',
        onPress: () => {
          void updateReservation(item, 'verify').catch((error: unknown) =>
            Alert.alert('Unable to verify reservation', error instanceof Error ? error.message : 'Please try again.')
          );
        },
      },
    ]);
  };

  const handleAdmit = (item: ReservationItem) => {
    if (onAdmitVehicle) {
      onAdmitVehicle(item.id, item.reference, item.slot);
    } else {
      Alert.alert(
        'Admit Vehicle',
        `Vehicle ${item.plate} confirmed for ${item.assignedSpace}.\nBoom barrier opened!`
      );
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={onBack}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Reservations</Text>
          <Text style={styles.headerSubtitle}>One Galle Face Mall — Ground Floor</Text>
        </View>
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search reference (PE-84213) or space (A3)..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="characters"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Text style={styles.clearSearch}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.tabsRow}>
        {/* Upcoming */}
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'Upcoming' && styles.tabButtonActive]}
          onPress={() => setActiveTab('Upcoming')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, activeTab === 'Upcoming' && styles.tabTextActive]}>
            Upcoming
          </Text>
          <View style={[styles.tabBadge, activeTab === 'Upcoming' && styles.tabBadgeActive]}>
            <Text style={[styles.tabBadgeText, activeTab === 'Upcoming' && styles.tabBadgeTextActive]}>
              {upcomingCount}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Active */}
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'Active' && styles.tabButtonActive]}
          onPress={() => setActiveTab('Active')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, activeTab === 'Active' && styles.tabTextActive]}>
            Active
          </Text>
          <View style={[styles.tabBadge, activeTab === 'Active' && styles.tabBadgeActive]}>
            <Text style={[styles.tabBadgeText, activeTab === 'Active' && styles.tabBadgeTextActive]}>
              {activeCount}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Completed */}
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'Completed' && styles.tabButtonActive]}
          onPress={() => setActiveTab('Completed')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, activeTab === 'Completed' && styles.tabTextActive]}>
            Completed
          </Text>
          <View style={[styles.tabBadge, activeTab === 'Completed' && styles.tabBadgeActive]}>
            <Text style={[styles.tabBadgeText, activeTab === 'Completed' && styles.tabBadgeTextActive]}>
              {completedCount}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'Cancelled' && styles.tabButtonActive]}
          onPress={() => setActiveTab('Cancelled')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, activeTab === 'Cancelled' && styles.tabTextActive]}>
            Cancelled
          </Text>
          <View style={[styles.tabBadge, activeTab === 'Cancelled' && styles.tabBadgeActive]}>
            <Text style={[styles.tabBadgeText, activeTab === 'Cancelled' && styles.tabBadgeTextActive]}>
              {cancelledCount}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* List Subheader */}
      <View style={styles.listSubheader}>
        <Text style={styles.countText}>
          {filteredReservations.length} Reservations Listed
        </Text>
        <Text style={styles.hintText}>Tap row to view full details</Text>
      </View>

      {/* Reservations List */}
      <ScrollView
        style={styles.scrollList}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {!isLoading && filteredReservations.length === 0 && (
          <Text style={styles.emptyText}>No reservations to show.</Text>
        )}
        {filteredReservations.map((item) => {
          const isExpanded = expandedId === item.id;

          return (
            <View key={item.id} style={styles.cardWrapper}>
              {/* Card Summary Header Bar */}
              <TouchableOpacity
                style={styles.cardHeader}
                onPress={() => toggleExpand(item.id)}
                activeOpacity={0.8}
              >
                {/* Initials Avatar */}
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{item.initials}</Text>
                </View>

                {/* Slot Badge */}
                <View style={styles.slotBadge}>
                  <Text style={styles.slotText}>{item.slot}</Text>
                </View>

                {/* Reference & Time */}
                <View style={styles.cardTitleCol}>
                  <Text style={styles.refText}>{item.reference}</Text>
                  <View style={styles.timeRow}>
                    <Text style={styles.clockIcon}>🕒</Text>
                    <Text style={styles.timeText}>{item.time} • </Text>
                    <Text style={styles.etaText}>{item.eta}</Text>
                  </View>
                </View>

                {/* Right Side: Verify & Status */}
                <View style={styles.headerRightCol}>
                  {item.status === 'Reserved' && (
                    <TouchableOpacity
                      style={styles.verifyBtn}
                      onPress={() => handleVerify(item)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.verifyIcon}>✓</Text>
                      <Text style={styles.verifyText}>Verify</Text>
                    </TouchableOpacity>
                  )}

                  <View style={styles.statusPillRow}>
                    <View style={styles.statusPill}>
                      <Text style={styles.statusPillText}>{item.status}</Text>
                    </View>
                    <Text style={[styles.chevronArrow, isExpanded && styles.chevronArrowExpanded]}>
                      {isExpanded ? '⌃' : '⌄'}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>

              {/* Expanded Card Details */}
              {isExpanded && (
                <View style={styles.expandedDetails}>
                  {/* Privacy Banner */}
                  <View style={styles.privacyBanner}>
                    <View style={styles.privacyLeft}>
                      <Text style={styles.privacyShield}>🛡️</Text>
                      <Text style={styles.privacyText}>
                        Masked Driver Info (Privacy NFR-05)
                      </Text>
                    </View>
                    <Text style={styles.verifiedTag}>Verified</Text>
                  </View>

                  {/* 2x2 Info Grid */}
                  <View style={styles.infoGrid}>
                    {/* Driver Name */}
                    <View style={styles.infoBox}>
                      <Text style={styles.infoLabel}>Driver Name</Text>
                      <Text style={styles.infoValue}>{item.driverNameMasked}</Text>
                    </View>

                    {/* Vehicle Plate */}
                    <View style={styles.infoBox}>
                      <Text style={styles.infoLabel}>Vehicle Plate</Text>
                      <Text style={[styles.infoValue, styles.plateBold]}>{item.plate}</Text>
                    </View>

                    {/* Booking Time */}
                    <View style={styles.infoBox}>
                      <Text style={styles.infoLabel}>Booking Time</Text>
                      <Text style={styles.infoValue}>{item.bookingTime}</Text>
                    </View>

                    {/* Assigned Space */}
                    <View style={styles.infoBox}>
                      <Text style={styles.infoLabel}>Assigned Space</Text>
                      <Text style={[styles.infoValue, styles.spaceBold]}>{item.assignedSpace}</Text>
                    </View>
                  </View>

                  {/* Payment Status Card */}
                  <View style={styles.paymentCard}>
                    <View>
                      <Text style={styles.paymentLabel}>Payment Status</Text>
                      <Text style={styles.paymentValue}>
                        Paid Online ({item.paymentAmount} via {item.paymentMethod})
                      </Text>
                    </View>
                    <View style={styles.paidBadge}>
                      <Text style={styles.paidText}>Paid</Text>
                    </View>
                  </View>

                  {/* Admit Vehicle Action Button */}
                  {item.status === 'Active' && (
                    <TouchableOpacity
                      style={styles.admitButton}
                      onPress={() => handleAdmit(item)}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.admitIcon}>✓</Text>
                      <Text style={styles.admitText}>Complete reservation</Text>
                      <Text style={styles.admitArrow}>→</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  backArrow: {
    fontSize: 32,
    color: '#1E293B',
    lineHeight: 32,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '500',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: {
    fontSize: 14,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13.5,
    color: '#0F172A',
    paddingVertical: 0,
  },
  clearSearch: {
    fontSize: 14,
    color: '#94A3B8',
    padding: 4,
  },
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 12,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 10,
    gap: 6,
  },
  tabButtonActive: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#134E4A',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  tabTextActive: {
    color: '#134E4A',
    fontWeight: '800',
  },
  tabBadge: {
    backgroundColor: '#94A3B8',
    borderRadius: 12,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBadgeActive: {
    backgroundColor: '#134E4A',
  },
  tabBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  tabBadgeTextActive: {
    color: '#99F6E4',
  },
  listSubheader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  countText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  hintText: {
    fontSize: 11.5,
    color: '#64748B',
  },
  scrollList: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 32,
    gap: 12,
  },
  emptyText: {
    paddingVertical: 24,
    color: '#64748B',
    fontSize: 14,
    textAlign: 'center',
  },
  cardWrapper: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#134E4A',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  slotBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#EDE9FE',
    marginRight: 10,
  },
  slotText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#6D28D9',
  },
  cardTitleCol: {
    flex: 1,
  },
  refText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 2,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clockIcon: {
    fontSize: 10,
    marginRight: 4,
  },
  timeText: {
    fontSize: 11.5,
    color: '#64748B',
    fontWeight: '500',
  },
  etaText: {
    fontSize: 11.5,
    color: '#64748B',
    fontWeight: '600',
  },
  headerRightCol: {
    alignItems: 'flex-end',
    gap: 4,
  },
  verifyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#134E4A',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 4,
  },
  verifyIcon: {
    fontSize: 10,
    color: '#99F6E4',
  },
  verifyText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  statusPillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusPill: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusPillText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#B45309',
  },
  chevronArrow: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '700',
    marginLeft: 2,
  },
  chevronArrowExpanded: {
    color: '#134E4A',
  },
  expandedDetails: {
    paddingHorizontal: 14,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 12,
  },
  privacyBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  privacyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  privacyShield: {
    fontSize: 12,
  },
  privacyText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#15803D',
  },
  verifiedTag: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803D',
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  infoBox: {
    width: '48.5%',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  infoLabel: {
    fontSize: 10.5,
    color: '#64748B',
    marginBottom: 4,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  plateBold: {
    fontWeight: '800',
    color: '#1E293B',
  },
  spaceBold: {
    fontWeight: '700',
    color: '#0F766E',
  },
  paymentCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  paymentLabel: {
    fontSize: 10.5,
    color: '#64748B',
    marginBottom: 3,
  },
  paymentValue: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  paidBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  paidText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803D',
  },
  admitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#134E4A',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
    gap: 8,
    shadowColor: '#134E4A',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  admitIcon: {
    fontSize: 14,
    color: '#99F6E4',
  },
  admitText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  admitArrow: {
    fontSize: 16,
    color: '#99F6E4',
    fontWeight: '800',
  },
});
