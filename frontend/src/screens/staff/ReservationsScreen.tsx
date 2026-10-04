import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  StatusBar,
  TextInput,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export interface ReservationItem {
  id: string;
  initials: string;
  slot: string;
  reference: string;
  time: string;
  eta: string;
  status: 'Reserved' | 'Active' | 'Completed';
  driverNameMasked: string;
  plate: string;
  bookingTime: string;
  assignedSpace: string;
  paymentAmount: string;
  paymentMethod: string;
}

const initialReservations: ReservationItem[] = [
  {
    id: '1',
    initials: 'KD',
    slot: 'A3',
    reference: 'PE-84213',
    time: '02:00 PM',
    eta: 'in 15 mins',
    status: 'Reserved',
    driverNameMasked: 'K***n D**s',
    plate: 'WP CAB-4921',
    bookingTime: 'Today at 01:15 PM',
    assignedSpace: 'Space A3 (Ground Floor)',
    paymentAmount: 'Rs. 320',
    paymentMethod: 'Visa',
  },
  {
    id: '2',
    initials: 'NS',
    slot: 'B1',
    reference: 'PE-84214',
    time: '02:20 PM',
    eta: 'in 35 mins',
    status: 'Reserved',
    driverNameMasked: 'N***i S***a',
    plate: 'WP KX-8812',
    bookingTime: 'Today at 01:30 PM',
    assignedSpace: 'Space B1 (Ground Floor)',
    paymentAmount: 'Rs. 250',
    paymentMethod: 'MasterCard',
  },
  {
    id: '3',
    initials: 'RJ',
    slot: 'A7',
    reference: 'PE-84215',
    time: '02:45 PM',
    eta: 'in 1 hr',
    status: 'Reserved',
    driverNameMasked: 'R***n J***y',
    plate: 'WP CAR-1029',
    bookingTime: 'Today at 01:45 PM',
    assignedSpace: 'Space A7 (Ground Floor)',
    paymentAmount: 'Rs. 400',
    paymentMethod: 'Online Banking',
  },
  {
    id: '4',
    initials: 'SM',
    slot: 'C2',
    reference: 'PE-84201',
    time: '12:30 PM',
    eta: 'parked 1h ago',
    status: 'Active',
    driverNameMasked: 'S***h M***a',
    plate: 'WP CAD-5544',
    bookingTime: 'Today at 11:45 AM',
    assignedSpace: 'Space C2 (Ground Floor)',
    paymentAmount: 'Rs. 320',
    paymentMethod: 'Visa',
  },
  {
    id: '5',
    initials: 'DW',
    slot: 'D4',
    reference: 'PE-84198',
    time: '11:00 AM',
    eta: 'completed',
    status: 'Completed',
    driverNameMasked: 'D***h W***e',
    plate: 'WP CAH-9988',
    bookingTime: 'Today at 10:15 AM',
    assignedSpace: 'Space D4 (Ground Floor)',
    paymentAmount: 'Rs. 300',
    paymentMethod: 'Visa',
  },
];

interface ReservationsScreenProps {
  onBack: () => void;
  onAdmitVehicle?: (reference: string, slot: string) => void;
}

export default function ReservationsScreen({
  onBack,
  onAdmitVehicle,
}: ReservationsScreenProps) {
  const insets = useSafeAreaInsets();
  const topPadding = Math.max(
    insets.top,
    Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) : 0
  );
  const bottomPadding = Math.max(insets.bottom, 16) + 24;

  const [reservations] = useState<ReservationItem[]>(initialReservations);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'Upcoming' | 'Active' | 'Completed'>('Upcoming');
  const [expandedId, setExpandedId] = useState<string | null>('1'); // Default card 1 expanded

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const upcomingCount = reservations.filter((r) => r.status === 'Reserved').length;
  const activeCount = reservations.filter((r) => r.status === 'Active').length;
  const completedCount = reservations.filter((r) => r.status === 'Completed').length;

  const filteredReservations = reservations.filter((r) => {
    const matchesTab =
      (activeTab === 'Upcoming' && r.status === 'Reserved') ||
      (activeTab === 'Active' && r.status === 'Active') ||
      (activeTab === 'Completed' && r.status === 'Completed');

    const query = searchQuery.trim().toLowerCase();
    const matchesSearch =
      r.reference.toLowerCase().includes(query) ||
      r.slot.toLowerCase().includes(query) ||
      r.plate.toLowerCase().includes(query);

    return matchesTab && matchesSearch;
  });

  const handleVerify = (item: ReservationItem) => {
    Alert.alert('Scan & Verify', `Verifying QR code for reference: ${item.reference} (Slot ${item.slot})`);
  };

  const handleAdmit = (item: ReservationItem) => {
    if (onAdmitVehicle) {
      onAdmitVehicle(item.reference, item.slot);
    } else {
      Alert.alert(
        'Admit Vehicle',
        `Vehicle ${item.plate} confirmed for ${item.assignedSpace}.\nBoom barrier opened!`
      );
    }
  };

  return (
    <View style={[styles.safeArea, { paddingTop: topPadding }]}>
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
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPadding }]}
        showsVerticalScrollIndicator={false}
      >
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
                  <TouchableOpacity
                    style={styles.verifyBtn}
                    onPress={() => handleVerify(item)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.verifyIcon}>🔳</Text>
                    <Text style={styles.verifyText}>Verify</Text>
                  </TouchableOpacity>

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
                  <TouchableOpacity
                    style={styles.admitButton}
                    onPress={() => handleAdmit(item)}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.admitIcon}>🔳</Text>
                    <Text style={styles.admitText}>
                      Admit Vehicle & Confirm Entry (Screen 20)
                    </Text>
                    <Text style={styles.admitArrow}>→</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
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
    gap: 12,
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
