import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  StatusBar,
  Alert,
} from 'react-native';
import { Colors } from '../../constants/colors';

interface StaffDashboardProps {
  staffId?: string;
  onLogout?: () => void;
  onNavigateToSpaces?: () => void;
  onNavigateToReservations?: () => void;
  onNavigateToVerifyEntry?: () => void;
}

export default function StaffDashboardScreen({
  staffId = 'STF-4091',
  onLogout,
  onNavigateToSpaces,
  onNavigateToReservations,
  onNavigateToVerifyEntry,
}: StaffDashboardProps) {
  const [activeTab, setActiveTab] = useState<'Dashboard' | 'Spaces' | 'Reservations' | 'Profile'>('Dashboard');

  const handleActionPress = (actionName: string, screenNumber: string) => {
    Alert.alert(actionName, `Navigating to ${actionName} (${screenNumber})`);
  };

  const arrivals = [
    {
      id: '1',
      slot: 'A3',
      name: 'Kasun Dias',
      time: '02:00 PM',
      eta: 'in 15 mins',
      plate: 'WP CAB-4921',
      status: 'Reserved',
    },
    {
      id: '2',
      slot: 'B1',
      name: 'Nimali Silva',
      time: '02:20 PM',
      eta: 'in 35 mins',
      plate: 'WP KX-8812',
      status: 'Reserved',
    },
    {
      id: '3',
      slot: 'A7',
      name: 'Rohan J.',
      time: '02:45 PM',
      eta: 'in 1 hr',
      plate: 'WP CAR-1029',
      status: 'Reserved',
    },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Top Main Header */}
      <View style={styles.topHeader}>
        <View style={styles.titleContainer}>
          <Text style={styles.mainTitle}>Dashboard</Text>
          <Text style={styles.subTitle}>One Galle Face Mall — Ground Floor</Text>
        </View>
        <TouchableOpacity
          style={styles.bellButton}
          onPress={() => Alert.alert('Notifications', 'No new alerts')}
          activeOpacity={0.7}
        >
          <Text style={styles.bellIcon}>🔔</Text>
          <View style={styles.notificationDot} />
        </TouchableOpacity>
      </View>

      {/* Attendant Status Bar */}
      <View style={styles.attendantBar}>
        <View style={styles.staffIdBadge}>
          <Text style={styles.staffIdText}>{staffId}</Text>
        </View>

        <TouchableOpacity
          style={styles.attendantModeBadge}
          onPress={onLogout}
          activeOpacity={0.8}
        >
          <Text style={styles.shieldIcon}>🛡️</Text>
          <Text style={styles.attendantModeText}>Attendant Mode</Text>
          {onLogout && <Text style={styles.logoutHint}> (Logout)</Text>}
        </TouchableOpacity>
      </View>

      {/* Main Content Area */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Space Capacity Card Section */}
        <View style={styles.capacitySection}>
          <View style={styles.capacityHeaderRow}>
            <Text style={styles.capacityHeaderTitle}>SPACE CAPACITY (40 TOTAL)</Text>
            <Text style={styles.liveOccupancyText}>Live Occupancy: <Text style={styles.occupancyValue}>55%</Text></Text>
          </View>

          {/* 3 Metric Cards */}
          <View style={styles.statsCardsRow}>
            {/* Available */}
            <View style={[styles.statCard, styles.availableCard]}>
              <View style={styles.statCardHeader}>
                <Text style={[styles.statCardTitle, styles.availableText]}>Available</Text>
                <Text style={styles.statusCheck}>✓</Text>
              </View>
              <Text style={[styles.statNumber, styles.availableText]}>18</Text>
              <Text style={styles.statSub}>Ready to park</Text>
            </View>

            {/* Reserved */}
            <View style={[styles.statCard, styles.reservedCard]}>
              <View style={styles.statCardHeader}>
                <Text style={[styles.statCardTitle, styles.reservedText]}>Reserved</Text>
                <Text style={styles.statusIcon}>⏱</Text>
              </View>
              <Text style={[styles.statNumber, styles.reservedText]}>6</Text>
              <Text style={styles.statSub}>Booked online</Text>
            </View>

            {/* Occupied */}
            <View style={[styles.statCard, styles.occupiedCard]}>
              <View style={styles.statCardHeader}>
                <Text style={[styles.statCardTitle, styles.occupiedText]}>Occupied</Text>
                <Text style={styles.statusIcon}>🚗</Text>
              </View>
              <Text style={[styles.statNumber, styles.occupiedText]}>16</Text>
              <Text style={styles.statSub}>Vehicles inside</Text>
            </View>
          </View>
        </View>

        {/* Quick Actions Section */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <Text style={styles.sectionSubtitle}>Facility management shortcuts</Text>

          <View style={styles.quickActionsRow}>
            {/* Manage Spaces */}
            <TouchableOpacity
              style={styles.actionItem}
              onPress={() => {
                if (onNavigateToSpaces) {
                  onNavigateToSpaces();
                } else {
                  handleActionPress('Manage Spaces', 'Screen 18');
                }
              }}
              activeOpacity={0.7}
            >
              <View style={[styles.actionIconContainer, { backgroundColor: '#EDE9FE' }]}>
                <Text style={styles.actionIconText}>🎛️</Text>
              </View>
              <Text style={styles.actionTitle}>Manage Spaces</Text>
              <Text style={styles.actionScreen}>Screen 18</Text>
            </TouchableOpacity>

            {/* Reservations */}
            <TouchableOpacity
              style={styles.actionItem}
              onPress={() => {
                if (onNavigateToReservations) {
                  onNavigateToReservations();
                } else {
                  handleActionPress('Reservations', 'Screen 19');
                }
              }}
              activeOpacity={0.7}
            >
              <View style={[styles.actionIconContainer, { backgroundColor: '#FFEDD5' }]}>
                <Text style={styles.actionIconText}>📅</Text>
              </View>
              <Text style={styles.actionTitle}>Reservations</Text>
              <Text style={styles.actionScreen}>Screen 19</Text>
            </TouchableOpacity>

            {/* Verify Entry */}
            <TouchableOpacity
              style={styles.actionItem}
              onPress={() => {
                if (onNavigateToVerifyEntry) {
                  onNavigateToVerifyEntry();
                } else {
                  handleActionPress('Verify Entry', 'Screen 20');
                }
              }}
              activeOpacity={0.7}
            >
              <View style={[styles.actionIconContainer, { backgroundColor: '#DCFCE7' }]}>
                <Text style={styles.actionIconText}>🔳</Text>
              </View>
              <Text style={styles.actionTitle}>Verify Entry</Text>
              <Text style={styles.actionScreen}>Screen 20</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Upcoming Arrivals Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.arrivalsHeader}>
            <View>
              <Text style={styles.sectionTitle}>Upcoming Arrivals</Text>
              <Text style={styles.sectionSubtitle}>Next confirmed drivers</Text>
            </View>
            <TouchableOpacity
              onPress={() => Alert.alert('Upcoming Arrivals', 'Showing all incoming bookings')}
              style={styles.viewAllBtn}
            >
              <Text style={styles.viewAllText}>View All </Text>
              <Text style={styles.viewAllArrow}>❯</Text>
            </TouchableOpacity>
          </View>

          {/* Arrivals List */}
          <View style={styles.arrivalsList}>
            {arrivals.map((driver) => (
              <TouchableOpacity
                key={driver.id}
                style={styles.arrivalCard}
                onPress={() => Alert.alert(driver.name, `Vehicle: ${driver.plate}\nSlot: ${driver.slot}\nETA: ${driver.eta}`)}
                activeOpacity={0.7}
              >
                {/* Slot Badge */}
                <View style={styles.slotBadge}>
                  <Text style={styles.slotText}>{driver.slot}</Text>
                </View>

                {/* Driver Info */}
                <View style={styles.driverDetails}>
                  <Text style={styles.driverName}>{driver.name}</Text>
                  <View style={styles.timeRow}>
                    <Text style={styles.clockIcon}>🕒</Text>
                    <Text style={styles.driverTime}>{driver.time} </Text>
                    <Text style={styles.etaText}>({driver.eta})</Text>
                  </View>
                  <View style={styles.plateBadge}>
                    <Text style={styles.plateText}>{driver.plate}</Text>
                  </View>
                </View>

                {/* Status and Arrow */}
                <View style={styles.arrivalRight}>
                  <View style={styles.reservedPill}>
                    <Text style={styles.reservedPillText}>{driver.status}</Text>
                  </View>
                  <Text style={styles.chevronIcon}>❯</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Bottom Navigation Bar */}
      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => setActiveTab('Dashboard')}
        >
          <Text style={[styles.navIcon, activeTab === 'Dashboard' && styles.navIconActive]}>📊</Text>
          <Text style={[styles.navLabel, activeTab === 'Dashboard' && styles.navLabelActive]}>Dashboard</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => {
            setActiveTab('Spaces');
            if (onNavigateToSpaces) {
              onNavigateToSpaces();
            }
          }}
        >
          <Text style={[styles.navIcon, activeTab === 'Spaces' && styles.navIconActive]}>🎛️</Text>
          <Text style={[styles.navLabel, activeTab === 'Spaces' && styles.navLabelActive]}>Spaces</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => {
            setActiveTab('Reservations');
            if (onNavigateToReservations) {
              onNavigateToReservations();
            }
          }}
        >
          <Text style={[styles.navIcon, activeTab === 'Reservations' && styles.navIconActive]}>📋</Text>
          <Text style={[styles.navLabel, activeTab === 'Reservations' && styles.navLabelActive]}>Reservations</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => setActiveTab('Profile')}
        >
          <Text style={[styles.navIcon, activeTab === 'Profile' && styles.navIconActive]}>👤</Text>
          <Text style={[styles.navLabel, activeTab === 'Profile' && styles.navLabelActive]}>Profile</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14,
    backgroundColor: '#FFFFFF',
  },
  titleContainer: {
    flex: 1,
  },
  mainTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.5,
  },
  subTitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
    fontWeight: '500',
  },
  bellButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  bellIcon: {
    fontSize: 20,
  },
  notificationDot: {
    position: 'absolute',
    top: 10,
    right: 11,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  attendantBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#134E4A',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  staffIdBadge: {
    backgroundColor: '#0F3C39',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
  },
  staffIdText: {
    color: '#99F6E4',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  attendantModeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  shieldIcon: {
    fontSize: 13,
  },
  attendantModeText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  logoutHint: {
    color: '#FCA5A5',
    fontSize: 11,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  capacitySection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    marginBottom: 24,
  },
  capacityHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  capacityHeaderTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1E293B',
    letterSpacing: 0.5,
  },
  liveOccupancyText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
  },
  occupancyValue: {
    color: '#0284C7',
    fontWeight: '700',
  },
  statsCardsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  statCard: {
    flex: 1,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1.5,
  },
  availableCard: {
    backgroundColor: '#F0FDF4',
    borderColor: '#86EFAC',
  },
  reservedCard: {
    backgroundColor: '#FEFCE8',
    borderColor: '#FDE047',
  },
  occupiedCard: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  statCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  statCardTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  availableText: {
    color: '#15803D',
  },
  reservedText: {
    color: '#A16207',
  },
  occupiedText: {
    color: '#B91C1C',
  },
  statusCheck: {
    fontSize: 14,
    color: '#15803D',
    fontWeight: '900',
  },
  statusIcon: {
    fontSize: 11,
  },
  statNumber: {
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 2,
  },
  statSub: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '500',
  },
  sectionContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  sectionSubtitle: {
    fontSize: 12.5,
    color: '#64748B',
    marginTop: 2,
    marginBottom: 14,
  },
  quickActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  actionItem: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  actionIconContainer: {
    width: 48,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  actionIconText: {
    fontSize: 18,
  },
  actionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
    textAlign: 'center',
  },
  actionScreen: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 3,
  },
  arrivalsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F766E',
  },
  viewAllArrow: {
    fontSize: 11,
    fontWeight: '900',
    color: '#0F766E',
  },
  arrivalsList: {
    gap: 12,
  },
  arrivalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  slotBadge: {
    width: 44,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EDE9FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  slotText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#6D28D9',
  },
  driverDetails: {
    flex: 1,
  },
  driverName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  clockIcon: {
    fontSize: 10,
    marginRight: 4,
  },
  driverTime: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  etaText: {
    fontSize: 12,
    color: '#EA580C',
    fontWeight: '700',
  },
  plateBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  plateText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#334155',
    letterSpacing: 0.5,
  },
  arrivalRight: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 54,
  },
  reservedPill: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  reservedPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B45309',
  },
  chevronIcon: {
    fontSize: 15,
    fontWeight: '900',
    color: '#94A3B8',
    marginRight: 4,
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingVertical: 8,
    paddingBottom: Platform.OS === 'ios' ? 24 : 10,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navIcon: {
    fontSize: 18,
    color: '#94A3B8',
    marginBottom: 3,
  },
  navIconActive: {
    color: '#0F766E',
  },
  navLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
  },
  navLabelActive: {
    color: '#0F766E',
    fontWeight: '700',
  },
});
