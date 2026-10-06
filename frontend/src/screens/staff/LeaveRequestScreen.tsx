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
  TextInput,
  Alert,
} from 'react-native';

const LEAVE_TYPES = ['Annual Leave', 'Sick Leave', 'Casual Leave', 'Emergency Leave'];

interface LeaveRequestScreenProps {
  onBack: () => void;
  onSubmitRequest: (request: {
    type: string;
    startDate: string;
    endDate: string;
    reason: string;
  }) => Promise<void>;
}

export default function LeaveRequestScreen({ onBack, onSubmitRequest }: LeaveRequestScreenProps) {
  const [selectedType, setSelectedType] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');

  const handleSubmit = async () => {
    if (!selectedType) {
      Alert.alert('Required', 'Please select a leave type.');
      return;
    }
    if (!startDate.trim()) {
      Alert.alert('Required', 'Please enter a start date.');
      return;
    }
    if (!endDate.trim()) {
      Alert.alert('Required', 'Please enter an end date.');
      return;
    }
    if (!reason.trim()) {
      Alert.alert('Required', 'Please provide a reason for your leave.');
      return;
    }

    const normalizedStart = startDate.trim();
    const normalizedEnd = endDate.trim();
    const start = new Date(`${normalizedStart}T00:00:00Z`);
    const end = new Date(`${normalizedEnd}T00:00:00Z`);
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(normalizedStart)
      || !/^\d{4}-\d{2}-\d{2}$/.test(normalizedEnd)
      || Number.isNaN(start.getTime())
      || Number.isNaN(end.getTime())
      || start.toISOString().slice(0, 10) !== normalizedStart
      || end.toISOString().slice(0, 10) !== normalizedEnd
      || end < start
    ) {
      Alert.alert('Invalid dates', 'Enter dates as YYYY-MM-DD and make sure the end date is not before the start date.');
      return;
    }

    try {
      await onSubmitRequest({
        type: selectedType,
        startDate: normalizedStart,
        endDate: normalizedEnd,
        reason: reason.trim(),
      });
      Alert.alert('Leave Request Submitted', 'Your leave request has been submitted and is pending approval.', [
        { text: 'OK', onPress: onBack },
      ]);
    } catch (error) {
      Alert.alert('Unable to submit leave request', error instanceof Error ? error.message : 'Please try again.');
    }
  };

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
        <Text style={styles.headerTitle}>Request Leave</Text>
        <View style={styles.placeholderBtn} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Leave Balance Card */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceCardTitle}>Your Leave Balance</Text>
          <View style={styles.balanceRow}>
            <View style={styles.balanceItem}>
              <Text style={styles.balanceNumber}>10</Text>
              <Text style={styles.balanceLabel}>Annual</Text>
            </View>
            <View style={styles.balanceDivider} />
            <View style={styles.balanceItem}>
              <Text style={styles.balanceNumber}>5</Text>
              <Text style={styles.balanceLabel}>Sick</Text>
            </View>
            <View style={styles.balanceDivider} />
            <View style={styles.balanceItem}>
              <Text style={styles.balanceNumber}>3</Text>
              <Text style={styles.balanceLabel}>Casual</Text>
            </View>
            <View style={styles.balanceDivider} />
            <View style={styles.balanceItem}>
              <Text style={styles.balanceNumber}>2</Text>
              <Text style={styles.balanceLabel}>Emergency</Text>
            </View>
          </View>
        </View>

        {/* Form Container */}
        <View style={styles.formContainer}>
          {/* Leave Type */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Leave Type</Text>
            <View style={styles.typeChipsContainer}>
              {LEAVE_TYPES.map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.typeChip,
                    selectedType === type && styles.typeChipSelected,
                  ]}
                  onPress={() => setSelectedType(type)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.typeChipText,
                      selectedType === type && styles.typeChipTextSelected,
                    ]}
                  >
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Date Range */}
          <View style={styles.dateRow}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.inputLabel}>Start Date</Text>
              <TextInput
                style={styles.textInput}
                value={startDate}
                onChangeText={setStartDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#94A3B8"
              />
            </View>
            <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.inputLabel}>End Date</Text>
              <TextInput
                style={styles.textInput}
                value={endDate}
                onChangeText={setEndDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#94A3B8"
              />
            </View>
          </View>

          {/* Reason */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Reason</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={reason}
              onChangeText={setReason}
              placeholder="Briefly describe the reason for your leave..."
              placeholderTextColor="#94A3B8"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={styles.submitBtn}
          onPress={handleSubmit}
          activeOpacity={0.85}
        >
          <Text style={styles.submitBtnText}>Submit Leave Request</Text>
        </TouchableOpacity>

        {/* Cancel Button */}
        <TouchableOpacity
          style={styles.cancelBtn}
          onPress={onBack}
          activeOpacity={0.7}
        >
          <Text style={styles.cancelBtnText}>Cancel</Text>
        </TouchableOpacity>
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
  scrollView: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 32,
  },
  balanceCard: {
    backgroundColor: '#134E4A',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  balanceCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#99F6E4',
    marginBottom: 16,
    letterSpacing: 0.3,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  balanceItem: {
    flex: 1,
    alignItems: 'center',
  },
  balanceNumber: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  balanceLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#5EEAD4',
  },
  balanceDivider: {
    width: 1,
    height: 36,
    backgroundColor: '#0F3C39',
  },
  formContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 20,
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 10,
  },
  typeChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeChip: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  typeChipSelected: {
    backgroundColor: '#0F766E',
    borderColor: '#0F766E',
  },
  typeChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  typeChipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  dateRow: {
    flexDirection: 'row',
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 15,
    color: '#0F172A',
    fontWeight: '600',
  },
  textArea: {
    height: 100,
    paddingTop: 14,
  },
  submitBtn: {
    backgroundColor: '#F26419',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#F26419',
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    marginBottom: 12,
  },
  submitBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  cancelBtn: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
});
