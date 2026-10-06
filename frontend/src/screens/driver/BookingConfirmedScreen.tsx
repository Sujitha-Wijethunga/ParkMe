import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Platform,
  BackHandler,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DriverColors } from '../../constants/colors';
import { SAMPLE_NEARBY_PARKING_LOTS } from '../../constants/driverSampleData';
import { BookingDetails } from '../../constants/bookingTypes';

interface BookingConfirmedScreenProps {
  booking: BookingDetails;
  onGetDirections: () => void;
  /** Cancel the booking and return to Home. */
  onCancel: () => void;
}

/* Placeholder QR: deterministic 21x21 pattern. Replace with react-native-qrcode-svg later. */
function FakeQR({ seed }: { seed: string }) {
  const N = 21;
  const cells = useMemo(() => {
    let seedHash = 0;
    for (let i = 0; i < seed.length; i++) seedHash = (seedHash * 31 + seed.charCodeAt(i)) >>> 0;
    const finder = (r: number, c: number) =>
      [[0, 0], [0, N - 7], [N - 7, 0]].some(([fr, fc]) => {
        const rr = r - fr, cc = c - fc;
        if (rr < 0 || rr > 6 || cc < 0 || cc > 6) return false;
        return rr === 0 || rr === 6 || cc === 0 || cc === 6 || (rr >= 2 && rr <= 4 && cc >= 2 && cc <= 4);
      });
    const inFinderArea = (r: number, c: number) =>
      (r < 8 && c < 8) || (r < 8 && c > N - 9) || (r > N - 9 && c < 8);
    let h = seedHash;
    const result: boolean[] = [];
    for (let i = 0; i < N * N; i++) {
      const r = Math.floor(i / N), c = i % N;
      if (inFinderArea(r, c)) {
        result.push(finder(r, c));
      } else {
        h = (h * 1103515245 + 12345) >>> 0;
        result.push((h >> 16) % 2 === 0);
      }
    }
    return result;
  }, [seed]);

  const size = 7;
  return (
    <View style={{ width: N * size, height: N * size, flexDirection: 'row', flexWrap: 'wrap' }}>
      {cells.map((on, i) => (
        <View key={i} style={{ width: size, height: size, backgroundColor: on ? DriverColors.navyDark : '#FFFFFF' }} />
      ))}
    </View>
  );
}

export default function BookingConfirmedScreen({
  booking,
  onGetDirections,
  onCancel,
}: BookingConfirmedScreenProps) {
  const insets = useSafeAreaInsets();
  const topPadding = Math.max(
    insets.top,
    Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) : 0
  );
  const bottomPadding = Math.max(insets.bottom, 16) + 24;

  const lot = SAMPLE_NEARBY_PARKING_LOTS.find((l) => l.id === booking.lotId);
  const [ref] = useState(() => `PE-${Math.floor(10000 + Math.random() * 89999)}`);

  // Back button on this screen should not return to payment
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, []);

  const confirmCancel = () =>
    Alert.alert('Cancel booking?', 'Your reserved space will be released.', [
      { text: 'Keep booking', style: 'cancel' },
      { text: 'Cancel booking', style: 'destructive', onPress: onCancel },
    ]);

  return (
    <View style={[styles.safeArea, { paddingTop: topPadding }]}>
      <StatusBar barStyle="dark-content" backgroundColor={DriverColors.background} />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: bottomPadding }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Success */}
        <View style={styles.success}>
          <View style={styles.checkCircle}>
            <Text style={styles.checkMark}>✓</Text>
          </View>
          <Text style={styles.title}>Booking Confirmed!</Text>
          <Text style={styles.refPill}>Ref: {ref}</Text>
        </View>

        {/* Location */}
        <View style={styles.card}>
          <Text style={styles.label}>RESERVED LOCATION</Text>
          <View style={styles.rowBetween}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text style={styles.lotName}>{lot?.name ?? 'Parking Lot'}</Text>
              <Text style={styles.small}>Floor {booking.floor} · {booking.vehicleType}</Text>
            </View>
            <View style={styles.spaceBadge}>
              <Text style={styles.spaceBadgeLabel}>SPACE</Text>
              <Text style={styles.spaceBadgeValue}>{booking.spaceId}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoBox}>
              <Text style={styles.infoLabel}>Date & Time</Text>
              <Text style={styles.infoVal}>Today · Arrival 10:00 AM</Text>
            </View>
            <View style={styles.infoBox}>
              <Text style={styles.infoLabel}>Duration</Text>
              <Text style={styles.infoVal}>{booking.hours} hours</Text>
            </View>
            <View style={styles.infoBox}>
              <Text style={styles.infoLabel}>Total Paid</Text>
              <Text style={[styles.infoVal, { color: DriverColors.orangePrimary }]}>Rs. {booking.total}</Text>
            </View>
          </View>
        </View>

        {/* QR */}
        <View style={[styles.card, { alignItems: 'center' }]}>
          <Text style={styles.label}>SHOW THIS AT ENTRY</Text>
          <View style={styles.qrBox}>
            <FakeQR seed={ref + booking.spaceId} />
          </View>
          <Text style={styles.small}>Scan at barrier scanner for automatic gate lift</Text>
        </View>

        {/* Actions */}
        <TouchableOpacity style={styles.primaryBtn} activeOpacity={0.88} onPress={onGetDirections}>
          <Text style={styles.primaryText}>➤  Get Directions</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.outlineBtn}
          activeOpacity={0.85}
          onPress={() =>
            Alert.alert(
              'Booking Details',
              `Ref: ${ref}\nSpace ${booking.spaceId} · Floor ${booking.floor}\n${booking.vehicleType} · ${booking.hours} hrs\nTotal: Rs. ${booking.total}`
            )
          }
        >
          <Text style={styles.outlineText}>View Booking Details</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.dangerBtn} activeOpacity={0.88} onPress={confirmCancel}>
          <Text style={styles.primaryText}>✕  Cancel</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: DriverColors.background,
  },
  content: { padding: 16, gap: 12 },

  success: { alignItems: 'center', marginVertical: 8 },
  checkCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMark: { color: '#FFFFFF', fontSize: 34, fontWeight: '800' },
  title: { fontSize: 21, fontWeight: '800', color: DriverColors.navyHeading, marginTop: 10 },
  refPill: {
    fontSize: 12,
    color: DriverColors.textSecondary,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
    marginTop: 8,
    overflow: 'hidden',
    fontWeight: '600',
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: DriverColors.cardBorder,
    padding: 14,
  },
  label: {
    fontSize: 10.5,
    fontWeight: '700',
    color: DriverColors.textSecondary,
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  lotName: { fontSize: 15, fontWeight: '800', color: DriverColors.navyHeading },
  small: { fontSize: 12, color: DriverColors.textSecondary, marginTop: 2 },
  spaceBadge: {
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 6,
    alignItems: 'center',
  },
  spaceBadgeLabel: { fontSize: 9, fontWeight: '700', color: DriverColors.textSecondary },
  spaceBadgeValue: { fontSize: 20, fontWeight: '800', color: DriverColors.navyHeading },

  infoRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  infoBox: { flex: 1, backgroundColor: '#F8FAFC', borderRadius: 10, padding: 8 },
  infoLabel: { fontSize: 10, color: DriverColors.textSecondary },
  infoVal: { fontSize: 12, fontWeight: '800', color: DriverColors.navyHeading, marginTop: 2 },

  qrBox: {
    padding: 12,
    borderWidth: 1,
    borderColor: DriverColors.cardBorder,
    borderRadius: 12,
    marginVertical: 12,
    backgroundColor: '#FFFFFF',
  },


  primaryBtn: {
    backgroundColor: DriverColors.orangePrimary,
    borderRadius: 28,
    paddingVertical: 15,
    alignItems: 'center',
  },
  primaryText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  outlineBtn: {
    borderRadius: 28,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: DriverColors.navyDark,
    backgroundColor: '#FFFFFF',
  },
  outlineText: { color: DriverColors.navyDark, fontSize: 15, fontWeight: '800' },
  dangerBtn: {
    backgroundColor: '#E5383B',
    borderRadius: 28,
    paddingVertical: 15,
    alignItems: 'center',
  },
});