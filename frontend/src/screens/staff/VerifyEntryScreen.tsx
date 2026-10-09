import React, { useState, useEffect, useCallback } from 'react';
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
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import {
  lookupReservationByQuery,
  verifyEntryByStaff,
  verifyExitByStaff,
  recordCashPaymentByStaff,
  DriverReservation,
} from '../../services/reservationApi';
import { formatSriLankanDateTime, formatSriLankanTime } from '../../utils/timeFormat';

interface VerifyEntryProps {
  reservationId?: string;
  initialReference?: string;
  initialSlot?: string;
  driverName?: string;
  vehiclePlate?: string;
  vehicleModel?: string;
  apiBaseUrl: string;
  authToken: string | null;
  onBack: () => void;
  onEntryConfirmed?: () => void;
}

export default function VerifyEntryScreen({
  reservationId,
  initialReference = '',
  initialSlot = 'A3',
  driverName: propDriverName = 'Driver',
  vehiclePlate = '—',
  vehicleModel = '',
  apiBaseUrl,
  authToken,
  onBack,
  onEntryConfirmed,
}: VerifyEntryProps) {
  const insets = useSafeAreaInsets();
  const topPadding = Math.max(
    insets.top,
    Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) : 0
  );
  const bottomPadding = Math.max(insets.bottom, 16) + 24;

  const [referenceInput, setReferenceInput] = useState(initialReference || '');
  const [matchedReservation, setMatchedReservation] = useState<DriverReservation | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [collectCash, setCollectCash] = useState(true);
  const [permission, requestPermission] = useCameraPermissions();

  const handleLookup = useCallback(async (searchQuery?: string) => {
    let q = (typeof searchQuery === 'string' ? searchQuery : referenceInput).trim();
    if (!q) {
      Alert.alert('Required', 'Please enter or scan a booking reference or QR code.');
      return;
    }
    // Handle QR codes containing JSON payload
    if (q.startsWith('{') && q.endsWith('}')) {
      try {
        const parsed = JSON.parse(q);
        if (parsed.reference) q = String(parsed.reference).trim();
        else if (parsed.id || parsed._id) q = String(parsed.id || parsed._id).trim();
      } catch {
        // use raw query
      }
    }

    if (!authToken) {
      Alert.alert('Staff Authentication Required', 'Please sign in again.');
      return;
    }

    setIsSearching(true);
    try {
      const found = await lookupReservationByQuery(authToken, q);
      setMatchedReservation(found);
      setReferenceInput(found.reference || found._id);
    } catch (error: any) {
      setMatchedReservation(null);
      Alert.alert(
        'Reservation Not Found',
        error instanceof Error ? error.message : 'No matching reservation found for this reference or QR.'
      );
    } finally {
      setIsSearching(false);
    }
  }, [authToken, referenceInput]);

  useEffect(() => {
    const targetQuery = reservationId || (initialReference && initialReference.trim() ? initialReference.trim() : null);
    if (!targetQuery) return;
    const timer = setTimeout(() => {
      void handleLookup(targetQuery);
    }, 0);
    return () => clearTimeout(timer);
  }, [reservationId, initialReference, handleLookup]);

  const handleResetScanner = () => {
    setIsScanning(true);
    setMatchedReservation(null);
    setReferenceInput('');
  };

  const handleConfirmEntry = async () => {
    if (!authToken || !matchedReservation?._id) {
      Alert.alert('No Reservation Selected', 'Please search for a reservation first.');
      return;
    }
    setIsConfirming(true);
    try {
      const updated = await verifyEntryByStaff(authToken, matchedReservation._id);
      setIsConfirming(false);
      setMatchedReservation(updated);
      const spaceNum = typeof updated.parkingSpace === 'object' && updated.parkingSpace ? updated.parkingSpace.spaceNumber : initialSlot || 'assigned spot';
      Alert.alert(
        'Entry Verified! 🚪',
        `Vehicle entry confirmed. Space ${spaceNum} is now OCCUPIED. Boom barrier opened.`,
        [
          {
            text: 'OK',
            onPress: () => {
              if (onEntryConfirmed) onEntryConfirmed();
            },
          },
        ]
      );
    } catch (error: any) {
      setIsConfirming(false);
      Alert.alert('Verification Failed', error instanceof Error ? error.message : 'Unable to confirm entry.');
    }
  };

  const handleConfirmExit = async () => {
    if (!authToken || !matchedReservation?._id) {
      Alert.alert('No Reservation Selected', 'Please search for a reservation first.');
      return;
    }
    setIsConfirming(true);
    try {
      const overtime = matchedReservation.estimatedOvertimeAmount || matchedReservation.unpaidOvertimeAmount || 0;
      const willRecordCash = collectCash && overtime > 0;
      const updated = await verifyExitByStaff(authToken, matchedReservation._id, {
        recordPayment: willRecordCash,
        paymentMethod: willRecordCash ? 'cash' : undefined,
      });
      setIsConfirming(false);
      setMatchedReservation(updated);
      const spaceNum = typeof updated.parkingSpace === 'object' && updated.parkingSpace ? updated.parkingSpace.spaceNumber : initialSlot || 'assigned spot';
      const overtimeNotice = (updated.unpaidOvertimeAmount || 0) > 0
        ? `\nOvertime of Rs. ${updated.unpaidOvertimeAmount} remains PENDING.`
        : updated.overtimePaymentStatus === 'paid'
        ? `\nOvertime fee paid in cash.`
        : '';
      Alert.alert(
        'Exit Verified! 🚗',
        `Vehicle exit confirmed. Space ${spaceNum} is now FREE.${overtimeNotice}\nBoom barrier opened.`,
        [
          {
            text: 'Return to Dashboard',
            onPress: () => {
              if (onEntryConfirmed) onEntryConfirmed();
              else onBack();
            },
          },
        ]
      );
    } catch (error: any) {
      setIsConfirming(false);
      Alert.alert('Exit Verification Failed', error instanceof Error ? error.message : 'Unable to confirm exit.');
    }
  };

  const handleRecordCashPayment = async () => {
    if (!authToken || !matchedReservation?._id) return;
    setIsConfirming(true);
    try {
      const updated = await recordCashPaymentByStaff(authToken, matchedReservation._id);
      setIsConfirming(false);
      setMatchedReservation(updated);
      Alert.alert('Payment Recorded! 💵', 'Cash payment confirmed. Overtime balance has been settled.');
    } catch (error: any) {
      setIsConfirming(false);
      Alert.alert('Payment Recording Failed', error instanceof Error ? error.message : 'Unable to record payment.');
    }
  };

  const lotName = typeof matchedReservation?.parkingLot === 'object' && matchedReservation.parkingLot
    ? matchedReservation.parkingLot.name
    : 'Assigned Lot';
  const spaceNumber = typeof matchedReservation?.parkingSpace === 'object' && matchedReservation.parkingSpace
    ? matchedReservation.parkingSpace.spaceNumber
    : initialSlot || '—';
  const driverName = typeof matchedReservation?.driver === 'object' && matchedReservation.driver
    ? (matchedReservation.driver as any).name || propDriverName
    : propDriverName;
  const plateNumber = matchedReservation?.vehiclePlate || '—';
  const isOverdue = Boolean(matchedReservation?.isOverdue);
  const overtimeAmount = matchedReservation?.estimatedOvertimeAmount ?? matchedReservation?.unpaidOvertimeAmount ?? 0;

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
          <Text style={styles.headerTitle}>Verify Entry / Exit</Text>
          <Text style={styles.headerSubtitle}>{lotName}</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPadding }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Section 1: Scan QR Code Viewfinder Card ── */}
        <View style={styles.scannerCard}>
          <Text style={styles.scannerTopHint}>Scan booking QR pass or vehicle reference</Text>

          {/* QR Viewfinder Icon Box / Camera View */}
          {isScanning ? (
            <View style={{ width: '100%', height: 250, borderRadius: 20, overflow: 'hidden', marginBottom: 20 }}>
              {permission?.granted ? (
                <CameraView
                  style={{ width: '100%', height: '100%' }}
                  facing="back"
                  barcodeScannerSettings={{
                    barcodeTypes: ['qr'],
                  }}
                  onBarcodeScanned={({ data }) => {
                    setReferenceInput(data);
                    setIsScanning(false);
                    void handleLookup(data);
                  }}
                />
              ) : (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#374151' }}>
                  <Text style={{ color: 'white', marginBottom: 10 }}>Camera permission needed to scan QR.</Text>
                  <TouchableOpacity onPress={requestPermission} style={styles.verifyRefBtn}>
                    <Text style={styles.verifyRefBtnText}>Grant Permission</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ) : (
            <TouchableOpacity activeOpacity={0.8} onPress={() => { setIsScanning(true); setMatchedReservation(null); }}>
              <View style={styles.viewfinderBox}>
                <View style={styles.viewfinderInner}>
                  <View style={styles.viewfinderRow}>
                    <View style={styles.vfSquare} />
                    <View style={styles.vfSquare} />
                  </View>
                  <View style={styles.viewfinderRow}>
                    <View style={styles.vfSquare} />
                    <View style={[styles.vfSquare, styles.vfSquareAccent]} />
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          )}

          <Text style={styles.scannerTitle}>Scan booking QR code</Text>
          <Text style={styles.scannerSubtitle}>{"Hold scanner over driver's mobile pass"}</Text>
          <Text style={styles.scannerTitle}>Scan Booking QR Code</Text>
          <Text style={styles.scannerSubtitle}>Hold scanner over driver’s mobile pass</Text>

          <TouchableOpacity
            style={styles.resetScannerBtn}
            onPress={handleResetScanner}
            activeOpacity={0.8}
          >
            <Text style={styles.resetScannerText}>{isScanning ? 'Close Camera' : 'Open Camera Scanner'}</Text>
          </TouchableOpacity>
        </View>

        {/* ── Section 2: Manual Reference Input Card ── */}
        <View style={styles.manualCard}>
          <Text style={styles.manualLabel}>Or enter booking reference / vehicle plate</Text>
          <View style={styles.manualRow}>
            <TextInput
              style={styles.manualInput}
              value={referenceInput}
              onChangeText={(value) => {
                setReferenceInput(value);
              }}
              placeholder="e.g. PM-84213 or WP CAB-4921"
              placeholderTextColor="#94A3B8"
              autoCapitalize="characters"
            />
            <TouchableOpacity
              style={styles.verifyRefBtn}
              onPress={() => void handleLookup()}
              disabled={isSearching}
              activeOpacity={0.8}
            >
              {isSearching ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.verifyRefBtnText}>Lookup</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Section 3: MATCH CONFIRMED Banner ── */}
        {matchedReservation && (
          <>
            <View style={[
              styles.confirmedBanner,
              matchedReservation.status === 'cancelled' && { backgroundColor: '#DC2626' },
              matchedReservation.status === 'active' && { backgroundColor: isOverdue ? '#DC2626' : '#2563EB' },
              matchedReservation.status === 'completed' && { backgroundColor: '#4B5563' },
            ]}>
              <View style={styles.confirmedLeft}>
                <Text style={styles.confirmedCheck}>
                  {matchedReservation.status === 'cancelled' ? '❌' : matchedReservation.status === 'pending' ? '✓' : matchedReservation.status === 'active' ? '🚗' : '🏁'}
                </Text>
                <View>
                  <Text style={styles.confirmedTitle}>
                    {matchedReservation.status === 'cancelled'
                      ? 'BOOKING CANCELLED'
                      : matchedReservation.status === 'pending'
                      ? (matchedReservation.checkInStatus === 'requested' ? 'CHECK-IN REQUESTED' : 'UPCOMING RESERVATION')
                      : matchedReservation.status === 'active'
                      ? (isOverdue ? 'OVERDUE ACTIVE SESSION' : 'ACTIVE PARKING SESSION')
                      : 'COMPLETED RESERVATION'}
                  </Text>
                  <Text style={styles.confirmedSubtitle}>
                    {matchedReservation.status === 'cancelled'
                      ? 'Reservation was cancelled and is not valid for entry'
                      : matchedReservation.status === 'pending'
                      ? 'Ready for vehicle entry verification'
                      : matchedReservation.status === 'active'
                      ? (isOverdue ? `Overdue by ${matchedReservation.estimatedOvertimeMinutes || matchedReservation.overtimeMinutes || 0}m (Grace ended)` : 'Vehicle currently parked')
                      : `Checked out at ${formatSriLankanTime(matchedReservation.checkedOutAt || matchedReservation.updatedAt || matchedReservation.endTime)}`}
                  </Text>
                </View>
              </View>
              <View style={styles.refPill}>
                <Text style={styles.refPillText}>{matchedReservation.reference || matchedReservation._id.slice(-6).toUpperCase()}</Text>
              </View>
            </View>

            {/* ── Overtime Warning / Info Banner ── */}
            {isOverdue && matchedReservation.status === 'active' && (
              <View style={styles.overdueNoticeBox}>
                <Text style={styles.overdueNoticeIcon}>⚠️</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.overdueNoticeTitle}>Overtime Applicable: Rs. {overtimeAmount}</Text>
                  <Text style={styles.overdueNoticeDesc}>
                    Booked end was {formatSriLankanTime(matchedReservation.endTime)}. 10-minute grace period has expired.
                  </Text>
                </View>
              </View>
            )}

            {/* ── Section 4: Assigned Space Card ── */}
            <View style={styles.assignedSpaceCard}>
              <View style={styles.assignedLeft}>
                <View style={styles.slotPill}>
                  <Text style={styles.slotPillText}>{spaceNumber}</Text>
                </View>
                <View>
                  <Text style={styles.assignedLabel}>Assigned Space</Text>
                  <Text style={styles.assignedValue}>Space {spaceNumber}</Text>
                  <Text style={styles.floorLabel}>{lotName}</Text>
                </View>
              </View>
              <View style={[styles.reservedTag, matchedReservation.status === 'active' && { borderColor: '#BFDBFE', backgroundColor: '#EFF6FF' }]}>
                <Text style={[styles.reservedTagText, matchedReservation.status === 'active' && { color: '#1D4ED8' }]}>
                  {matchedReservation.status === 'active' ? 'Space Occupied' : matchedReservation.status === 'cancelled' ? 'Booking Cancelled' : 'Space Reserved'}
                </Text>
              </View>
            </View>

            {/* ── Section 5: Driver & Vehicle Plate Grid ── */}
            <View style={styles.infoRow}>
              {/* Driver Box */}
              <View style={styles.infoBox}>
                <View style={styles.labelRow}>
                  <Text style={styles.fieldIcon}>👤</Text>
                  <Text style={styles.fieldLabel}>Driver</Text>
                </View>
                <Text style={styles.fieldValue}>{driverName}</Text>
                {vehicleModel ? (
                  <Text style={[styles.fieldLabel, { marginTop: 2 }]}>{vehicleModel}</Text>
                ) : null}
              </View>

              {/* Vehicle Plate Box */}
              <View style={styles.infoBox}>
                <View style={styles.labelRow}>
                  <Text style={styles.fieldIcon}>💳</Text>
                  <Text style={styles.fieldLabel}>Vehicle Plate</Text>
                </View>
                <Text style={[styles.fieldValue, styles.plateBold]}>
                  {plateNumber && plateNumber !== '—' ? plateNumber : vehiclePlate}
                </Text>
              </View>
            </View>

            {/* Timing Grid */}
            <View style={styles.infoRow}>
              <View style={styles.infoBox}>
                <View style={styles.labelRow}>
                  <Text style={styles.fieldIcon}>🕒</Text>
                  <Text style={styles.fieldLabel}>Booked Start</Text>
                </View>
                <Text style={styles.fieldValue}>{formatSriLankanTime(matchedReservation.startTime)}</Text>
              </View>
              <View style={styles.infoBox}>
                <View style={styles.labelRow}>
                  <Text style={styles.fieldIcon}>🏁</Text>
                  <Text style={styles.fieldLabel}>Booked End</Text>
                </View>
                <Text style={styles.fieldValue}>{formatSriLankanTime(matchedReservation.endTime)}</Text>
              </View>
            </View>

            {/* Verified timestamps */}
            {matchedReservation.checkedInAt && (
              <View style={styles.verifiedTimesCard}>
                <Text style={styles.verifiedTimeText}>
                  Verified Entry: {formatSriLankanDateTime(matchedReservation.checkedInAt)}
                </Text>
                {matchedReservation.checkedOutAt && (
                  <Text style={styles.verifiedTimeText}>
                    Verified Exit: {formatSriLankanDateTime(matchedReservation.checkedOutAt)}
                  </Text>
                )}
              </View>
            )}

            {/* ── Section 6: Action Buttons ── */}
            {matchedReservation.status === 'pending' && (
              <TouchableOpacity
                style={styles.confirmEntryBtn}
                onPress={handleConfirmEntry}
                disabled={isConfirming}
                activeOpacity={0.85}
              >
                <Text style={styles.confirmBtnIcon}>🚪</Text>
                <Text style={styles.confirmBtnText}>
                  {isConfirming ? 'Opening Boom Gate…' : 'Confirm Vehicle Entry'}
                </Text>
              </TouchableOpacity>
            )}

            {matchedReservation.status === 'active' && (
              <>
                {overtimeAmount > 0 && (
                  <TouchableOpacity
                    style={styles.cashToggleRow}
                    onPress={() => setCollectCash(!collectCash)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.cashCheckbox}>{collectCash ? '☑' : '☐'}</Text>
                    <Text style={styles.cashToggleText}>
                      Record Rs. {overtimeAmount} cash collected at exit gate
                    </Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={[styles.confirmEntryBtn, { backgroundColor: '#2563EB', shadowColor: '#2563EB' }]}
                  onPress={handleConfirmExit}
                  disabled={isConfirming}
                  activeOpacity={0.85}
                >
                  <Text style={styles.confirmBtnIcon}>🚗</Text>
                  <Text style={styles.confirmBtnText}>
                    {isConfirming ? 'Processing Exit…' : 'Confirm Vehicle Exit'}
                  </Text>
                </TouchableOpacity>
              </>
            )}

            {matchedReservation.status === 'completed' && (matchedReservation.unpaidOvertimeAmount || 0) > 0 && (
              <TouchableOpacity
                style={[styles.confirmEntryBtn, { backgroundColor: '#059669', shadowColor: '#059669' }]}
                onPress={handleRecordCashPayment}
                disabled={isConfirming}
                activeOpacity={0.85}
              >
                <Text style={styles.confirmBtnIcon}>💵</Text>
                <Text style={styles.confirmBtnText}>
                  {isConfirming ? 'Recording Payment…' : `Record Cash Paid: Rs. ${matchedReservation.unpaidOvertimeAmount}`}
                </Text>
              </TouchableOpacity>
            )}
          </>
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
  scrollView: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 12,
  },

  /* ── Section 1: Scanner Card ── */
  scannerCard: {
    backgroundColor: '#111827',
    borderRadius: 20,
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  scannerTopHint: {
    color: '#9CA3AF',
    fontSize: 12.5,
    fontWeight: '500',
    marginBottom: 20,
  },
  viewfinderBox: {
    width: 110,
    height: 110,
    borderRadius: 22,
    borderWidth: 2.5,
    borderColor: '#2DD4BF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  viewfinderInner: {
    width: 66,
    height: 66,
    justifyContent: 'space-between',
  },
  viewfinderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  vfSquare: {
    width: 28,
    height: 28,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#2DD4BF',
  },
  vfSquareAccent: {
    backgroundColor: '#2DD4BF',
  },
  scannerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  scannerSubtitle: {
    fontSize: 12.5,
    color: '#9CA3AF',
    marginBottom: 20,
  },
  resetScannerBtn: {
    backgroundColor: '#1F2937',
    borderWidth: 1,
    borderColor: '#374151',
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  resetScannerText: {
    color: '#E5E7EB',
    fontSize: 12.5,
    fontWeight: '700',
  },

  /* ── Section 2: Manual Input ── */
  manualCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  manualLabel: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 10,
  },
  manualRow: {
    flexDirection: 'row',
    gap: 10,
  },
  manualInput: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    height: 46,
  },
  verifyRefBtn: {
    backgroundColor: '#134E4A',
    borderRadius: 10,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifyRefBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },

  /* ── Section 3: MATCH CONFIRMED ── */
  confirmedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#15803D',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  confirmedLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  confirmedCheck: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  confirmedTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  confirmedSubtitle: {
    fontSize: 11.5,
    color: '#BBF7D0',
    marginTop: 1,
  },
  refPill: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  refPillText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '700',
  },

  /* ── Section 4: Assigned Space ── */
  assignedSpaceCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  assignedLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  slotPill: {
    backgroundColor: '#1E1B4B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  slotPillText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
  assignedLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  assignedValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  floorLabel: {
    fontSize: 11,
    color: '#64748B',
  },
  reservedTag: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  reservedTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803D',
  },

  /* ── Section 5: Driver & Plate ── */
  infoRow: {
    flexDirection: 'row',
    gap: 10,
  },
  infoBox: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  fieldIcon: {
    fontSize: 12,
  },
  fieldLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  fieldValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  plateBold: {
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: 0.5,
  },

  /* ── Section 6: Big Orange Button ── */
  confirmEntryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F26419',
    borderRadius: 16,
    paddingVertical: 16,
    marginTop: 4,
    gap: 10,
    shadowColor: '#F26419',
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  confirmBtnIcon: {
    fontSize: 18,
  },
  confirmBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },

  /* Overtime & Verification styles */
  overdueNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 14,
    padding: 12,
    gap: 10,
  },
  overdueNoticeIcon: { fontSize: 20 },
  overdueNoticeTitle: { fontSize: 13, fontWeight: '800', color: '#B91C1C' },
  overdueNoticeDesc: { fontSize: 11.5, color: '#DC2626', marginTop: 2 },

  verifiedTimesCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 4,
  },
  verifiedTimeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },

  cashToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 12,
    padding: 12,
    gap: 10,
    marginTop: 4,
  },
  cashCheckbox: {
    fontSize: 18,
    color: '#15803D',
    fontWeight: '800',
  },
  cashToggleText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#15803D',
    flex: 1,
  },
});
