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
  TextInput,
  Alert,
} from 'react-native';
import { Colors } from '../../constants/colors';

interface VerifyEntryProps {
  initialReference?: string;
  initialSlot?: string;
  onBack: () => void;
  onEntryConfirmed?: () => void;
}

export default function VerifyEntryScreen({
  initialReference = 'PE-84213',
  initialSlot = 'A3',
  onBack,
  onEntryConfirmed,
}: VerifyEntryProps) {
  const [referenceInput, setReferenceInput] = useState(initialReference);
  const [isVerified, setIsVerified] = useState(true);
  const [isConfirming, setIsConfirming] = useState(false);

  const handleVerifyRef = () => {
    if (!referenceInput.trim()) {
      Alert.alert('Required', 'Please enter a booking reference.');
      return;
    }
    setIsVerified(true);
    Alert.alert('Verified', `Booking reference ${referenceInput.trim()} is valid and active.`);
  };

  const handleResetScanner = () => {
    Alert.alert('Scanner Reset', 'QR camera scanner has been re-initialized.');
  };

  const handleConfirmEntry = () => {
    setIsConfirming(true);
    setTimeout(() => {
      setIsConfirming(false);
      Alert.alert(
        'Boom Gate Opened! 🚗',
        `Vehicle entry confirmed for Space ${initialSlot}.\nBoom barrier opened successfully!`,
        [
          {
            text: 'Go to Dashboard',
            onPress: () => {
              if (onEntryConfirmed) {
                onEntryConfirmed();
              } else {
                onBack();
              }
            },
          },
        ]
      );
    }, 700);
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
          <Text style={styles.headerTitle}>Verify Entry</Text>
          <Text style={styles.headerSubtitle}>One Galle Face Mall — Gate 01 (East Entrance)</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Section 1: Scan QR Code Viewfinder Card ── */}
        <View style={styles.scannerCard}>
          <Text style={styles.scannerTopHint}>Scan vehicle plate or enter manually</Text>

          {/* QR Viewfinder Icon Box */}
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

          <Text style={styles.scannerTitle}>Scan booking QR code</Text>
          <Text style={styles.scannerSubtitle}>Hold scanner over driver's mobile pass</Text>

          <TouchableOpacity
            style={styles.resetScannerBtn}
            onPress={handleResetScanner}
            activeOpacity={0.8}
          >
            <Text style={styles.resetScannerText}>Reset Scanner</Text>
          </TouchableOpacity>
        </View>

        {/* ── Section 2: Manual Reference Input Card ── */}
        <View style={styles.manualCard}>
          <Text style={styles.manualLabel}>Or enter booking reference manually</Text>
          <View style={styles.manualRow}>
            <TextInput
              style={styles.manualInput}
              value={referenceInput}
              onChangeText={setReferenceInput}
              placeholder="e.g. PE-84213"
              placeholderTextColor="#94A3B8"
              autoCapitalize="characters"
            />
            <TouchableOpacity
              style={styles.verifyRefBtn}
              onPress={handleVerifyRef}
              activeOpacity={0.8}
            >
              <Text style={styles.verifyRefBtnText}>Verify Ref</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Section 3: MATCH CONFIRMED Banner ── */}
        {isVerified && (
          <>
            <View style={styles.confirmedBanner}>
              <View style={styles.confirmedLeft}>
                <Text style={styles.confirmedCheck}>✓</Text>
                <View>
                  <Text style={styles.confirmedTitle}>MATCH CONFIRMED</Text>
                  <Text style={styles.confirmedSubtitle}>Active reservation verified (FR-10)</Text>
                </View>
              </View>
              <View style={styles.refPill}>
                <Text style={styles.refPillText}>{referenceInput}</Text>
              </View>
            </View>

            {/* ── Section 4: Assigned Space Card ── */}
            <View style={styles.assignedSpaceCard}>
              <View style={styles.assignedLeft}>
                <View style={styles.slotPill}>
                  <Text style={styles.slotPillText}>{initialSlot}</Text>
                </View>
                <View>
                  <Text style={styles.assignedLabel}>Assigned Space</Text>
                  <Text style={styles.assignedValue}>Space {initialSlot}</Text>
                  <Text style={styles.floorLabel}>Ground Floor</Text>
                </View>
              </View>
              <View style={styles.reservedTag}>
                <Text style={styles.reservedTagText}>Reserved for Vehicle</Text>
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
                <Text style={styles.fieldValue}>Kasun Dias</Text>
              </View>

              {/* Vehicle Plate Box */}
              <View style={styles.infoBox}>
                <View style={styles.labelRow}>
                  <Text style={styles.fieldIcon}>💳</Text>
                  <Text style={styles.fieldLabel}>Vehicle Plate</Text>
                </View>
                <Text style={[styles.fieldValue, styles.plateBold]}>WP CAB-4921</Text>
              </View>
            </View>

            {/* ── Section 6: Big Orange Confirm Entry CTA ── */}
            <TouchableOpacity
              style={styles.confirmEntryBtn}
              onPress={handleConfirmEntry}
              disabled={isConfirming}
              activeOpacity={0.85}
            >
              <Text style={styles.confirmBtnIcon}>🚪</Text>
              <Text style={styles.confirmBtnText}>
                {isConfirming ? 'Opening Boom Gate…' : 'Confirm Entry'}
              </Text>
            </TouchableOpacity>
          </>
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
    paddingBottom: 40,
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
});
