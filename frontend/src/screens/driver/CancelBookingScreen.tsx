import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { DriverColors } from '../../constants/colors';
import {
  CANCELLATION_REASONS,
  CancellationReason,
  canCancelReservation,
  cancelReservation,
  DriverReservation,
} from '../../services/reservationApi';

interface CancelBookingScreenProps {
  token: string | null;
  userId: string;
  reservation: DriverReservation;
  onBack: () => void;
  onDone: () => void;
}

function formatAmount(amount: number): string {
  return `Rs. ${amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function getSpace(reservation: DriverReservation): string {
  return typeof reservation.parkingSpace === 'string'
    ? 'Unavailable'
    : reservation.parkingSpace.spaceNumber || 'Unavailable';
}

export default function CancelBookingScreen({
  token,
  userId,
  reservation,
  onBack,
  onDone,
}: CancelBookingScreenProps) {
  const [selectedReason, setSelectedReason] = useState<CancellationReason | null>(null);
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCancelled, setIsCancelled] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bookingId = reservation.reference || reservation._id;
  const isPaid = Boolean(reservation.paymentMethod);
  const canSubmit = selectedReason !== null && !isSubmitting;

  const handleCancel = () => {
    if (!selectedReason || isSubmitting) return;
    if (!canCancelReservation(reservation)) {
      setError('This booking is no longer eligible for cancellation. Refresh your bookings and try again.');
      return;
    }

    void submitCancellation();
  };

  const submitCancellation = async () => {
    if (!selectedReason || isSubmitting) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await cancelReservation(token || '', userId, reservation._id, selectedReason, note);
      setIsCancelled(true);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to cancel this booking.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={DriverColors.surface} />
      <View style={styles.header}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Back to upcoming bookings"
          style={styles.backButton}
          onPress={onBack}
          disabled={isSubmitting}
        >
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>{isCancelled ? 'Booking Cancelled' : 'Cancel Booking'}</Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            Booking ID: #{bookingId} · Space {getSpace(reservation)}
          </Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.notice, isCancelled && styles.successNotice]}>
            <Text style={[styles.noticeIcon, isCancelled && styles.successText]}>
              {isCancelled ? '✓' : '!'}
            </Text>
            <Text style={[styles.noticeText, isCancelled && styles.successText]}>
              {isCancelled
                ? 'Your booking has been cancelled and the space released. Refunds are not processed by the app.'
                : 'Cancelling releases the reserved space. The app does not currently process refunds.'}
            </Text>
          </View>

          <Text style={styles.sectionLabel}>SELECT REASON FOR CANCELLATION</Text>
          <View style={styles.reasonList}>
            {CANCELLATION_REASONS.map((reason) => {
              const selected = selectedReason === reason;
              return (
                <TouchableOpacity
                  key={reason}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  style={[styles.reasonOption, selected && styles.reasonOptionSelected]}
                  onPress={() => setSelectedReason(reason)}
                  disabled={isCancelled || isSubmitting}
                >
                  <Text style={[styles.reasonText, selected && styles.reasonTextSelected]}>
                    {reason}
                  </Text>
                  <View style={[styles.radioOuter, selected && styles.radioOuterSelected]}>
                    {selected ? <View style={styles.radioInner} /> : null}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          <TextInput
            accessibilityLabel="Additional cancellation details (optional)"
            style={styles.noteInput}
            value={note}
            onChangeText={setNote}
            placeholder="Tell us more (optional)…"
            placeholderTextColor={DriverColors.textMuted}
            multiline
            maxLength={500}
            textAlignVertical="top"
            editable={!isCancelled && !isSubmitting}
          />

          <View style={styles.amountCard}>
            <Text style={styles.amountLabel}>{isPaid ? 'Paid amount' : 'Booking amount'}</Text>
            <Text style={styles.amountValue}>{formatAmount(reservation.totalAmount)}</Text>
          </View>

          {error ? <Text accessibilityRole="alert" style={styles.errorText}>{error}</Text> : null}
        </ScrollView>

        <View style={styles.footer}>
          {isCancelled ? (
            <TouchableOpacity
              accessibilityRole="button"
              style={styles.primaryButton}
              onPress={onDone}
            >
              <Text style={styles.primaryButtonText}>Done</Text>
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity
                accessibilityRole="button"
                disabled={!canSubmit}
                style={[styles.primaryButton, !canSubmit && styles.disabledButton]}
                onPress={handleCancel}
              >
                {isSubmitting ? (
                  <ActivityIndicator color={DriverColors.textWhite} />
                ) : (
                  <Text style={styles.primaryButtonText}>Confirm Cancellation</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityRole="button"
                disabled={isSubmitting}
                style={styles.secondaryButton}
                onPress={onBack}
              >
                <Text style={styles.secondaryButtonText}>Keep Booking</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8FAFC' },
  flex: { flex: 1 },
  header: {
    minHeight: 64,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: DriverColors.cardBorder,
    backgroundColor: DriverColors.surface,
  },
  backButton: { width: 34, height: 44, alignItems: 'flex-start', justifyContent: 'center' },
  backArrow: { color: '#111B78', fontSize: 30, lineHeight: 34 },
  headerText: { flex: 1, minWidth: 0, paddingLeft: 4 },
  headerTitle: { color: DriverColors.navyHeading, fontSize: 16, fontWeight: '800' },
  headerSubtitle: { marginTop: 3, color: DriverColors.textSecondary, fontSize: 10 },
  headerSpacer: { width: 22 },
  content: { paddingHorizontal: 15, paddingTop: 15, paddingBottom: 18 },
  notice: {
    minHeight: 58,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 11,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    backgroundColor: '#FFF5F5',
  },
  noticeIcon: {
    width: 22,
    height: 22,
    marginRight: 8,
    borderRadius: 11,
    overflow: 'hidden',
    color: '#DC2626',
    borderWidth: 1.5,
    borderColor: '#DC2626',
    textAlign: 'center',
    textAlignVertical: 'center',
    fontSize: 13,
    fontWeight: '800',
  },
  noticeText: { flex: 1, color: '#B42318', fontSize: 11, lineHeight: 16 },
  successNotice: { borderColor: '#86EFAC', backgroundColor: '#F0FDF4' },
  successText: { color: '#15803D', borderColor: '#15803D' },
  sectionLabel: {
    marginTop: 17,
    marginBottom: 9,
    color: DriverColors.textBody,
    fontSize: 12,
    fontWeight: '700',
  },
  reasonList: { gap: 7 },
  reasonOption: {
    minHeight: 45,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: DriverColors.cardBorder,
    borderRadius: 10,
    backgroundColor: DriverColors.surface,
  },
  reasonOptionSelected: { borderColor: '#171E8A', borderWidth: 1.3 },
  reasonText: { flex: 1, paddingRight: 10, color: '#526581', fontSize: 12 },
  reasonTextSelected: { color: DriverColors.navyHeading, fontWeight: '600' },
  radioOuter: {
    width: 19,
    height: 19,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
  },
  radioOuterSelected: { borderColor: '#111B78' },
  radioInner: { width: 9, height: 9, borderRadius: 5, backgroundColor: '#111B78' },
  noteInput: {
    minHeight: 76,
    marginTop: 12,
    padding: 11,
    borderWidth: 1,
    borderColor: DriverColors.cardBorder,
    borderRadius: 9,
    backgroundColor: DriverColors.surface,
    color: DriverColors.textBody,
    fontSize: 12,
  },
  amountCard: {
    minHeight: 47,
    marginTop: 12,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: DriverColors.cardBorder,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
  },
  amountLabel: { color: DriverColors.textSecondary, fontSize: 11 },
  amountValue: { color: DriverColors.navyHeading, fontSize: 12, fontWeight: '700' },
  errorText: { marginTop: 10, color: '#B42318', fontSize: 12, lineHeight: 17 },
  footer: {
    paddingHorizontal: 15,
    paddingTop: 10,
    paddingBottom: 10,
    gap: 7,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: DriverColors.cardBorder,
    backgroundColor: DriverColors.surface,
  },
  primaryButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
    backgroundColor: '#EF4444',
  },
  primaryButtonText: { color: DriverColors.textWhite, fontSize: 13, fontWeight: '800' },
  disabledButton: { opacity: 0.48 },
  secondaryButton: {
    minHeight: 41,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#171E8A',
    borderRadius: 11,
    backgroundColor: DriverColors.surface,
  },
  secondaryButtonText: { color: '#111B78', fontSize: 12, fontWeight: '700' },
});
