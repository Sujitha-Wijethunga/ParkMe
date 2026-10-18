import React from 'react';
import { StyleSheet, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { DriverColors } from '../constants/colors';

export interface BookingQrDetails {
  reference: string;
  lot: string;
  space: string;
  floor: string;
  vehicle: string;
  vehiclePlate?: string;
  hours: number;
  total: number;
}

export function createBookingQrValue(details: BookingQrDetails): string {
  return JSON.stringify({
    type: 'parkme-booking',
    reference: details.reference,
    booking: {
      parkingLot: details.lot,
      space: details.space,
      floor: details.floor,
      vehicle: details.vehicle,
      vehiclePlate: details.vehiclePlate || '',
      durationHours: details.hours,
      totalPaid: details.total,
    },
  });
}

export default function BookingQrCode({
  details,
  size = 168,
}: {
  details: BookingQrDetails;
  size?: number;
}) {
  return (
    <View style={styles.container}>
      <QRCode
        value={createBookingQrValue(details)}
        size={size}
        color={DriverColors.navyDark}
        backgroundColor="#FFFFFF"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
});
