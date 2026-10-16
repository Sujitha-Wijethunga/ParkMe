import React, { useEffect } from 'react';
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
import { SAMPLE_NEARBY_PARKING_LOTS, resolveParkingLotItem } from '../../constants/driverSampleData';
import { BookingDetails } from '../../constants/bookingTypes';
import { DriverReservation } from '../../services/reservationApi';
import BookingQrCode, { BookingQrDetails } from '../../components/BookingQrCode';
import { formatSriLankanDateTime } from '../../utils/timeFormat';

interface BookingConfirmedScreenProps {
  booking: BookingDetails;
  reservation: DriverReservation;
  onGetDirections: () => void;
  onViewBookingDetails: () => void;
  onReturnHome?: () => void;
}

export default function BookingConfirmedScreen({
  booking,
  reservation,
  onGetDirections,
  onViewBookingDetails,
  onReturnHome,
}: BookingConfirmedScreenProps) {
  const insets = useSafeAreaInsets();
  const topPadding = Math.max(
    insets.top,
    Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) : 0
  );
  const bottomPadding = Math.max(insets.bottom, 16) + 24;

  const lot =
    resolveParkingLotItem(booking.lotId) ||
    SAMPLE_NEARBY_PARKING_LOTS.find((l) => l.id === booking.lotId || (l as any)._id === booking.lotId);
  const lotName =
    booking.lotName ||
    lot?.name ||
    (typeof reservation.parkingLot === 'object' && (reservation.parkingLot as any)?.name) ||
    'Parking Lot';
  const lotAddress =
    booking.lotAddress ||
    (typeof reservation.parkingLot === 'object' && (reservation.parkingLot as any)?.address) ||
    'Address unavailable';
  const ref = reservation.reference || reservation._id;
  const qrDetails: BookingQrDetails = {
    reference: ref,
    lot: lotName,
    space: booking.spaceId,
    floor: booking.floor,
    vehicle: booking.vehicleType,
    vehiclePlate: booking.vehiclePlate,
    hours: booking.hours,
    total: booking.total,
  };
  const bookingDateTime = formatSriLankanDateTime(reservation.startTime);
  const bookingEndTime = formatSriLankanDateTime(reservation.endTime);
  const handleShareQr = async () => {
    try {
      await Share.share({
        title: 'ParkMe Booking Details',
        message: [
          'ParkMe Booking Details',
          `Reference: ${ref}`,
          `Date & time: ${bookingDateTime}`,
          `End time: ${bookingEndTime}`,
          `Parking place: ${lotName}`,
          `Address: ${lotAddress}`,
          `Space: ${booking.spaceId}`,
          `Floor: ${booking.floor}`,
          `Vehicle: ${booking.vehicleType}${booking.vehiclePlate ? ` (${booking.vehiclePlate})` : ''}`,
          `Duration: ${booking.hours} hours`,
          `Total paid: Rs. ${booking.total}`,
          '',
          'Please come on time for your parking reservation.',
        ].join('\n'),
      });
    } catch (error) {
      console.error('Failed to share booking details', error);
      Alert.alert('Share failed', 'The booking details could not be shared. Please try again.');
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
              <Text style={styles.lotName}>{lotName}</Text>
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
              <Text style={styles.infoVal}>{bookingDateTime}</Text>
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
            <BookingQrCode details={qrDetails} />
          </View>
          <Text style={styles.small}>Scan at barrier scanner for automatic gate lift</Text>
          <TouchableOpacity
            style={styles.downloadQrButton}
            activeOpacity={0.85}
            onPress={handleShareQr}
            accessibilityRole="button"
            accessibilityLabel="Share the booking QR code"
          >
            <Text style={styles.downloadQrText}>Share the QR</Text>
          </TouchableOpacity>
        </View>

        {/* Actions */}
        <TouchableOpacity
          style={styles.primaryBtn}
          activeOpacity={0.88}
          onPress={onGetDirections}
          accessibilityRole="button"
          accessibilityLabel="Get driving directions"
        >
          <Text style={styles.primaryText}>➤  Get Directions</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryBtn}
          activeOpacity={0.88}
          onPress={onViewBookingDetails}
          accessibilityRole="button"
          accessibilityLabel="View booking details in bookings list"
        >
          <Text style={styles.secondaryText}>📋  View Booking Details</Text>
        </TouchableOpacity>

        {!!onReturnHome && (
          <TouchableOpacity
            style={styles.outlineBtn}
            activeOpacity={0.88}
            onPress={onReturnHome}
            accessibilityRole="button"
            accessibilityLabel="Return to home screen"
          >
            <Text style={styles.outlineText}>🏠  Return Home</Text>
          </TouchableOpacity>
        )}
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
  secondaryBtn: {
    backgroundColor: DriverColors.navyDark,
    borderRadius: 28,
    paddingVertical: 15,
    alignItems: 'center',
  },
  secondaryText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  outlineBtn: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    alignItems: 'center',
  },
  outlineText: { color: DriverColors.navyHeading, fontSize: 14, fontWeight: '700' },
});