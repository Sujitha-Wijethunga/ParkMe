import React, { useEffect, useMemo } from 'react';
import {
  Alert,
  Share,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Platform,
  BackHandler,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DriverColors } from '../../constants/colors';
import { SAMPLE_NEARBY_PARKING_LOTS } from '../../constants/driverSampleData';
import { BookingDetails } from '../../constants/bookingTypes';
import { DriverReservation } from '../../services/reservationApi';

interface BookingConfirmedScreenProps {
  booking: BookingDetails;
  reservation: DriverReservation;
  onGetDirections: () => void;
  onCancel: () => void;
}

/* Placeholder QR: deterministic 21x21 pattern. Replace with react-native-qrcode-svg later. */
function getQrCells(seed: string): boolean[] {
  const N = 21;
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
}

function FakeQR({ seed }: { seed: string }) {
  const N = 21;
  const cells = useMemo(() => getQrCells(seed), [seed]);
  const size = 7;
  return (
    <View style={{ width: N * size, height: N * size, flexDirection: 'row', flexWrap: 'wrap' }}>
      {cells.map((on, i) => (
        <View key={i} style={{ width: size, height: size, backgroundColor: on ? DriverColors.navyDark : '#FFFFFF' }} />
      ))}
    </View>
  );
}

function escapeXml(value: string): string {
  return value.replace(/[<>&'"]/g, (character) => (
    { '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[character] ?? character
  ));
}

function createBookingQrSvg(
  seed: string,
  details: { reference: string; lot: string; space: string; floor: string; vehicle: string; hours: number; total: number }
): string {
  const moduleSize = 12;
  const qrRects = getQrCells(seed)
    .map((on, index) => {
      if (!on) return '';
      const row = Math.floor(index / 21);
      const column = index % 21;
      return `<rect x="${column * moduleSize}" y="${row * moduleSize}" width="${moduleSize}" height="${moduleSize}"/>`;
    })
    .join('');
  const lines = [
    `Reference: ${details.reference}`,
    `Parking lot: ${details.lot}`,
    `Space: ${details.space} | Floor: ${details.floor}`,
    `Vehicle: ${details.vehicle} | Duration: ${details.hours} hours`,
    `Total paid: Rs. ${details.total}`,
  ];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="420" height="390" viewBox="0 0 420 390"><rect width="100%" height="100%" fill="white"/><text x="210" y="28" text-anchor="middle" font-family="sans-serif" font-size="20" font-weight="bold">ParkMe Booking</text><g transform="translate(84 45)" fill="#0F172A">${qrRects}</g>${lines.map((line, index) => `<text x="24" y="${295 + index * 18}" font-family="sans-serif" font-size="12">${escapeXml(line)}</text>`).join('')}</svg>`;
}

export default function BookingConfirmedScreen({
  booking,
  reservation,
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
  const ref = reservation.reference || reservation._id;
  const handleDownloadQr = async () => {
    try {
      const svg = createBookingQrSvg(ref + booking.spaceId, {
        reference: ref,
        lot: lot?.name ?? 'Parking Lot',
        space: booking.spaceId,
        floor: booking.floor,
        vehicle: booking.vehicleType,
        hours: booking.hours,
        total: booking.total,
      });
      const dataUri = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
      await Share.share({
        title: 'Download ParkMe QR',
        message: `ParkMe booking QR code - ${ref}`,
        url: dataUri,
      });
    } catch (error) {
      console.error('Failed to download booking QR code', error);
      Alert.alert('Download failed', 'The QR code could not be shared. Please try again.');
    }
  };

  // Back button on this screen should not return to payment
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, []);

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
          <TouchableOpacity
            style={styles.downloadQrButton}
            activeOpacity={0.85}
            onPress={handleDownloadQr}
            accessibilityRole="button"
            accessibilityLabel="Download the QR code"
          >
            <Text style={styles.downloadQrText}>Download the QR</Text>
          </TouchableOpacity>
        </View>

        {/* Actions */}
        <TouchableOpacity style={styles.primaryBtn} activeOpacity={0.88} onPress={onGetDirections}>
          <Text style={styles.primaryText}>➤  Get Directions</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.dangerBtn} activeOpacity={0.88} onPress={onCancel}>
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
  downloadQrButton: {
    marginTop: 4,
    borderRadius: 22,
    paddingVertical: 11,
    paddingHorizontal: 24,
    borderWidth: 1.5,
    borderColor: DriverColors.navyHeading,
    alignItems: 'center',
  },
  downloadQrText: { color: DriverColors.navyHeading, fontSize: 13, fontWeight: '800' },
  primaryBtn: {
    backgroundColor: DriverColors.orangePrimary,
    borderRadius: 28,
    paddingVertical: 15,
    alignItems: 'center',
  },
  primaryText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  dangerBtn: {
    backgroundColor: '#E5383B',
    borderRadius: 28,
    paddingVertical: 15,
    alignItems: 'center',
  },
});