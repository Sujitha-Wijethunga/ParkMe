import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Platform,
  StatusBar,
  TouchableOpacity,
  ScrollView,
} from 'react-native';

interface AttendanceScreenProps {
  onBack: () => void;
  onRequestLeave: () => void;
}

export default function AttendanceScreen({ onBack, onRequestLeave }: AttendanceScreenProps) {
  const [activeTab, setActiveTab] = useState<'Attendance' | 'Leaves'>('Attendance');

  const attendanceRecords = [
    { id: '1', date: 'Oct 12, 2026', checkIn: '08:00 AM', checkOut: '05:00 PM', status: 'Present' },
    { id: '2', date: 'Oct 11, 2026', checkIn: '08:15 AM', checkOut: '05:30 PM', status: 'Late' },
    { id: '3', date: 'Oct 10, 2026', checkIn: '08:00 AM', checkOut: '05:00 PM', status: 'Present' },
    { id: '4', date: 'Oct 09, 2026', checkIn: '-', checkOut: '-', status: 'Absent' },
    { id: '5', date: 'Oct 08, 2026', checkIn: '07:55 AM', checkOut: '05:05 PM', status: 'Present' },
  ];

  const leaveRecords = [
    { id: '1', type: 'Annual Leave', dates: 'Oct 15 - Oct 16, 2026', days: 2, status: 'Approved' },
    { id: '2', type: 'Sick Leave', dates: 'Sep 22, 2026', days: 1, status: 'Approved' },
    { id: '3', type: 'Casual Leave', dates: 'Nov 01, 2026', days: 1, status: 'Pending' },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={onBack}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Attendance & Leave</Text>
        <View style={styles.placeholderBtn} />
      </View>

      {/* Summary Cards */}
      <View style={styles.summaryContainer}>
        <View style={[styles.summaryCard, { backgroundColor: '#F0FDF4', borderColor: '#86EFAC' }]}>
          <Text style={styles.summaryValue}>21</Text>
          <Text style={styles.summaryLabel}>Days Present</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: '#FEFCE8', borderColor: '#FDE047' }]}>
          <Text style={styles.summaryValue}>4</Text>
          <Text style={styles.summaryLabel}>Leaves Taken</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]}>
          <Text style={styles.summaryValue}>10</Text>
          <Text style={styles.summaryLabel}>Leaves Left</Text>
        </View>
      </View>

      {/* Tab Switcher */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'Attendance' && styles.activeTabButton]}
          onPress={() => setActiveTab('Attendance')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, activeTab === 'Attendance' && styles.activeTabText]}>Attendance</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'Leaves' && styles.activeTabButton]}
          onPress={() => setActiveTab('Leaves')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, activeTab === 'Leaves' && styles.activeTabText]}>Leave History</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'Attendance' ? (
          <View style={styles.listContainer}>
            {attendanceRecords.map((record) => (
              <View key={record.id} style={styles.recordCard}>
                <View style={styles.recordHeader}>
                  <View style={styles.dateRow}>
                    <Text style={styles.dateIcon}>📅</Text>
                    <Text style={styles.recordDate}>{record.date}</Text>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      record.status === 'Present' ? styles.statusPresent :
                      record.status === 'Late' ? styles.statusLate : styles.statusAbsent
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        record.status === 'Present' ? styles.statusTextPresent :
                        record.status === 'Late' ? styles.statusTextLate : styles.statusTextAbsent
                      ]}
                    >
                      {record.status}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.timeDivider} />
                
                <View style={styles.timeRow}>
                  <View style={styles.timeBlock}>
                    <Text style={styles.timeLabel}>Check-In</Text>
                    <Text style={styles.timeValue}>{record.checkIn}</Text>
                  </View>
                  <View style={styles.timeBlock}>
                    <Text style={styles.timeLabel}>Check-Out</Text>
                    <Text style={styles.timeValue}>{record.checkOut}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.listContainer}>
            <TouchableOpacity style={styles.requestLeaveBtn} activeOpacity={0.8} onPress={onRequestLeave}>
              <Text style={styles.requestLeaveText}>+ Request New Leave</Text>
            </TouchableOpacity>

            {leaveRecords.map((leave) => (
              <View key={leave.id} style={styles.recordCard}>
                <View style={styles.recordHeader}>
                  <Text style={styles.recordType}>{leave.type}</Text>
                  <View
                    style={[
                      styles.statusBadge,
                      leave.status === 'Approved' ? styles.statusApproved : styles.statusPending
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        leave.status === 'Approved' ? styles.statusTextApproved : styles.statusTextPending
                      ]}
                    >
                      {leave.status}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.leaveInfoRow}>
                  <Text style={styles.leaveDatesIcon}>🗓️</Text>
                  <Text style={styles.leaveDates}>{leave.dates}</Text>
                </View>
                <View style={styles.leaveInfoRow}>
                  <Text style={styles.leaveDatesIcon}>⏳</Text>
                  <Text style={styles.leaveDays}>{leave.days} Day(s)</Text>
                </View>
              </View>
            ))}
          </View>
        )}
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: {
    fontSize: 32,
    color: '#1D4ED8',
    lineHeight: 32,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1E3A8A',
    letterSpacing: -0.3,
  },
  placeholderBtn: {
    width: 36,
  },
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
  },
  summaryCard: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1.5,
    paddingVertical: 12,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 2,
  },
  summaryLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
    textAlign: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  activeTabButton: {
    borderBottomColor: '#0F766E',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  activeTabText: {
    color: '#0F766E',
    fontWeight: '800',
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
  },
  listContainer: {
    gap: 12,
  },
  recordCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  recordDate: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
  },
  recordType: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 12,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800',
  },
  statusPresent: {
    backgroundColor: '#F0FDF4',
    borderColor: '#86EFAC',
  },
  statusTextPresent: {
    color: '#16A34A',
  },
  statusLate: {
    backgroundColor: '#FEFCE8',
    borderColor: '#FDE047',
  },
  statusTextLate: {
    color: '#CA8A04',
  },
  statusAbsent: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  statusTextAbsent: {
    color: '#DC2626',
  },
  statusApproved: {
    backgroundColor: '#F0FDF4',
    borderColor: '#86EFAC',
  },
  statusTextApproved: {
    color: '#16A34A',
  },
  statusPending: {
    backgroundColor: '#F1F5F9',
    borderColor: '#CBD5E1',
  },
  statusTextPending: {
    color: '#475569',
  },
  timeDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 12,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timeBlock: {
    flex: 1,
  },
  timeLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
    marginBottom: 2,
  },
  timeValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#334155',
  },
  leaveInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  leaveDatesIcon: {
    fontSize: 14,
    marginRight: 8,
  },
  leaveDates: {
    fontSize: 14,
    color: '#475569',
    fontWeight: '600',
  },
  leaveDays: {
    fontSize: 14,
    color: '#0F766E',
    fontWeight: '700',
  },
  requestLeaveBtn: {
    backgroundColor: '#0F766E',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#0F766E',
    shadowOpacity: 0.2,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  requestLeaveText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
