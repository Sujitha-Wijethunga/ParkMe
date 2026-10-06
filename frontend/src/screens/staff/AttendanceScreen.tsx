import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  StatusBar,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface AttendanceRecord {
  id: string;
  date: string;
  checkIn: string;
  checkOut: string;
  status: string;
}

interface LeaveRecord {
  id: string;
  type: string;
  dates: string;
  days: number;
  status: string;
}

interface AttendanceScreenProps {
  onBack: () => void;
  onRequestLeave: () => void;
  apiBaseUrl: string;
  authToken: string | null;
}

export default function AttendanceScreen({ onBack, onRequestLeave, apiBaseUrl, authToken }: AttendanceScreenProps) {
  const insets = useSafeAreaInsets();
  const topPadding = Math.max(
    insets.top,
    Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) : 0
  );
  const bottomPadding = Math.max(insets.bottom, 16) + 24;

  const [activeTab, setActiveTab] = useState<'Attendance' | 'Leaves'>('Attendance');
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [leaveRecords, setLeaveRecords] = useState<LeaveRecord[]>([]);
  const todayRecord = attendanceRecords.find((record) => new Date(record.date).toDateString() === new Date().toDateString());

  const fetchRecords = useCallback(async () => {
    if (!authToken) return { attendance: [], leaves: [] };
    const headers = { Authorization: `Bearer ${authToken}` };
    const [attendanceResponse, leaveResponse] = await Promise.all([
      fetch(`${apiBaseUrl}/api/attendance`, { headers }),
      fetch(`${apiBaseUrl}/api/leave-requests`, { headers }),
    ]);
    const attendanceData = await attendanceResponse.json();
    const leaveData = await leaveResponse.json();
    if (!attendanceResponse.ok) throw new Error(attendanceData.message || 'Unable to load attendance');
    if (!leaveResponse.ok) throw new Error(leaveData.message || 'Unable to load leave requests');
    return {
      attendance: attendanceData.map((record: any): AttendanceRecord => ({
      id: record._id,
      date: record.date,
      checkIn: record.checkIn || '—',
      checkOut: record.checkOut || '—',
      status: record.status,
      })),
      leaves: leaveData.map((leave: any): LeaveRecord => ({
      id: leave._id,
      type: leave.type,
      dates: `${new Date(leave.startDate).toLocaleDateString()} - ${new Date(leave.endDate).toLocaleDateString()}`,
      days: leave.days,
      status: leave.status,
      })),
    };
  }, [apiBaseUrl, authToken]);

  const loadRecords = async () => {
    const records = await fetchRecords();
    setAttendanceRecords(records.attendance);
    setLeaveRecords(records.leaves);
  };

  useEffect(() => {
    let isMounted = true;
    void fetchRecords()
      .then((records) => {
        if (isMounted) {
          setAttendanceRecords(records.attendance);
          setLeaveRecords(records.leaves);
        }
      })
      .catch((error: unknown) => {
        if (isMounted) {
          Alert.alert('Unable to load attendance', error instanceof Error ? error.message : 'Please try again.');
        }
      });
    return () => {
      isMounted = false;
    };
  }, [fetchRecords]);

  const updateAttendance = async (action: 'check-in' | 'check-out') => {
    if (!authToken) {
      Alert.alert('Sign in required', 'Please sign in again to record attendance.');
      return;
    }
    try {
      const response = await fetch(`${apiBaseUrl}/api/attendance/${action}`, {
        method: action === 'check-in' ? 'POST' : 'PUT',
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || `Unable to ${action}`);
      await loadRecords();
      Alert.alert('Attendance updated', action === 'check-in' ? 'Your check-in was recorded.' : 'Your check-out was recorded.');
    } catch (error) {
      Alert.alert('Attendance update failed', error instanceof Error ? error.message : 'Please try again.');
    }
  };

  const withdrawLeave = (leaveId: string) => {
    Alert.alert('Withdraw leave request?', 'This removes your pending leave request.', [
      { text: 'Keep request', style: 'cancel' },
      {
        text: 'Withdraw',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            if (!authToken) throw new Error('Please sign in again.');
            const response = await fetch(`${apiBaseUrl}/api/leave-requests/${leaveId}`, {
              method: 'DELETE',
              headers: { Authorization: `Bearer ${authToken}` },
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message || 'Unable to withdraw leave request');
            await loadRecords();
          })().catch((error: unknown) =>
            Alert.alert('Unable to withdraw request', error instanceof Error ? error.message : 'Please try again.')
          );
        },
      },
    ]);
  };

  return (
    <View style={[styles.safeArea, { paddingTop: topPadding }]}>
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
          <Text style={styles.summaryValue}>{attendanceRecords.filter((record) => record.status === 'Present').length}</Text>
          <Text style={styles.summaryLabel}>Days Present</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: '#FEFCE8', borderColor: '#FDE047' }]}>
          <Text style={styles.summaryValue}>{leaveRecords.filter((leave) => leave.status === 'Approved').reduce((sum, leave) => sum + leave.days, 0)}</Text>
          <Text style={styles.summaryLabel}>Leaves Taken</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]}>
          <Text style={styles.summaryValue}>{leaveRecords.filter((leave) => leave.status === 'Pending').length}</Text>
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
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPadding }]}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'Attendance' ? (
          <View style={styles.listContainer}>
            <View style={styles.attendanceActions}>
              <TouchableOpacity
                style={[styles.attendanceAction, !!todayRecord?.checkIn && styles.attendanceActionDisabled]}
                disabled={!!todayRecord?.checkIn}
                onPress={() => updateAttendance('check-in')}
              >
                <Text style={styles.attendanceActionText}>
                  {todayRecord?.checkIn ? `Checked in ${todayRecord.checkIn}` : 'Check in'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.attendanceAction, !todayRecord?.checkIn || !!todayRecord.checkOut ? styles.attendanceActionDisabled : null]}
                disabled={!todayRecord?.checkIn || !!todayRecord.checkOut}
                onPress={() => updateAttendance('check-out')}
              >
                <Text style={styles.attendanceActionText}>
                  {todayRecord?.checkOut ? `Checked out ${todayRecord.checkOut}` : 'Check out'}
                </Text>
              </TouchableOpacity>
            </View>
            {attendanceRecords.length === 0 && (
              <Text style={styles.emptyText}>No attendance records yet.</Text>
            )}
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
                {leave.status === 'Pending' && (
                  <TouchableOpacity
                    style={styles.withdrawButton}
                    onPress={() => withdrawLeave(leave.id)}
                    accessibilityRole="button"
                  >
                    <Text style={styles.withdrawButtonText}>Withdraw request</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
            {leaveRecords.length === 0 && (
              <Text style={styles.emptyText}>No leave requests yet.</Text>
            )}
          </View>
        )}
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
  },
  listContainer: {
    gap: 12,
  },
  attendanceActions: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 4,
  },
  attendanceAction: {
    flex: 1,
    minHeight: 46,
    backgroundColor: '#0F766E',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  attendanceActionDisabled: {
    backgroundColor: '#94A3B8',
  },
  attendanceActionText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptyText: {
    textAlign: 'center',
    paddingVertical: 24,
    color: '#64748B',
    fontSize: 14,
  },
  withdrawButton: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingVertical: 8,
  },
  withdrawButtonText: {
    color: '#B91C1C',
    fontWeight: '700',
    fontSize: 13,
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
