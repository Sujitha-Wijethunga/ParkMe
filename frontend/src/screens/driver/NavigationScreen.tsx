import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Platform,
  BackHandler,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DriverColors } from '../../constants/colors';
import { SAMPLE_NEARBY_PARKING_LOTS } from '../../constants/driverSampleData';
import { BookingDetails } from '../../constants/bookingTypes';

interface NavigationScreenProps {
  booking: BookingDetails;
  /** Go back to Booking Confirmed. */
  onCancel: () => void;
  /** User arrived at the lot. */
  onArrived: () => void;
}

export default function NavigationScreen({ booking, onCancel, onArrived }: NavigationScreenProps) {
  const insets = useSafeAreaInsets();
  const lot = SAMPLE_NEARBY_PARKING_LOTS.find((l) => l.id === booking.lotId);

  const topPadding = Math.max(
    insets.top,
    Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) : 0
  );
  const bottomOffset =
    Math.max(insets.bottom, Platform.OS === 'ios' ? 24 : 16) + 4;

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onCancel();
      return true;
    });
    return () => sub.remove();
  }, [onCancel]);

  return (
    <View style={[styles.safeArea, { paddingTop: topPadding }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#E8EEF9" />

      {/* Map placeholder – swap for react-native-maps <MapView/> later */}
      <View style={styles.map} pointerEvents="none">
        <View style={[styles.block, { top: 150, left: 16, width: 110, height: 140 }]} />
        <View style={[styles.block, { top: 150, right: 16, width: 110, height: 140 }]} />
        <View style={[styles.block, { top: 320, left: 16, width: 110, height: 140 }]} />
        <View style={[styles.block, { top: 320, right: 16, width: 110, height: 140 }]} />
        <View style={[styles.route, { top: 130, left: 170, width: 5, height: 250 }]} />
        <View style={[styles.route, { top: 375, left: 170, width: 90, height: 5 }]} />
        <View style={[styles.route, { top: 375, left: 255, width: 5, height: 90 }]} />
        <View style={styles.dot} />
      </View>

      {/* Top card */}
      <View style={styles.topCard}>
        <View style={styles.eta}>
          <Text style={styles.etaNum}>8</Text>
          <Text style={styles.etaUnit}>MIN</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.small}>NAVIGATING TO</Text>
          <Text style={styles.name} numberOfLines={1}>{lot?.name ?? 'Parking Lot'}</Text>
          <Text style={styles.small}>2.1 km · Space {booking.spaceId}</Text>
        </View>
      </View>

      {/* Bottom */}
      <View style={[styles.bottom, { bottom: bottomOffset }]}>
        <View style={styles.chipsRow}>
          <View style={styles.chip}><Text style={styles.chipText}>40 km/h zone</Text></View>
          <View style={styles.chip}>
            <Text style={[styles.chipText, { color: '#10B981' }]}>● </Text>
            <Text style={styles.chipText}>GPS Active</Text>
          </View>
        </View>

        <View style={styles.turnCard}>
          <View style={styles.arrowBox}>
            <Text style={styles.arrowText}>→</Text>
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.turnLabel}>NEXT TURN</Text>
            <Text style={styles.turnText}>Head north on Station Rd</Text>
          </View>
          <Text style={styles.turnDist}>200 m</Text>
        </View>

        <View style={styles.btnRow}>
          <TouchableOpacity style={[styles.btn, styles.btnOutline]} activeOpacity={0.85} onPress={onCancel}>
            <Text style={styles.btnOutlineText}>⊗  Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btn, styles.btnPrimary]} activeOpacity={0.88} onPress={onArrived}>
            <Text style={styles.btnPrimaryText}>{"📍 I've Arrived"}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#E8EEF9',
  },
 map: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  block: { position: 'absolute', backgroundColor: '#D6E0F5', borderRadius: 8 },
  route: { position: 'absolute', backgroundColor: DriverColors.orangePrimary, borderRadius: 3 },
  dot: {
    position: 'absolute',
    top: 462,
    left: 247,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: DriverColors.navyDark,
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },

  topCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    margin: 16,
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  eta: {
    backgroundColor: DriverColors.navyDark,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    minWidth: 54,
  },
  etaNum: { color: '#FFFFFF', fontSize: 22, fontWeight: '800' },
  etaUnit: { color: '#FFFFFF', fontSize: 9, fontWeight: '700' },
  name: { fontSize: 15, fontWeight: '800', color: DriverColors.navyHeading },
  small: { fontSize: 11, color: DriverColors.textSecondary },

  bottom: { position: 'absolute', left: 16, right: 16 },
  chipsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  chipText: { fontSize: 11, fontWeight: '700', color: DriverColors.navyHeading },

  turnCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: DriverColors.navyDark,
    borderRadius: 16,
    padding: 14,
  },
  arrowBox: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: DriverColors.orangePrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowText: { color: '#FFFFFF', fontSize: 22, fontWeight: '800' },
  turnLabel: { color: '#FFFFFF', opacity: 0.7, fontSize: 10, fontWeight: '700' },
  turnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  turnDist: { color: DriverColors.orangePrimary, fontWeight: '800', fontSize: 16 },

  btnRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  btn: { flex: 1, borderRadius: 28, paddingVertical: 14, alignItems: 'center' },
  btnOutline: { backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: DriverColors.navyDark },
  btnOutlineText: { color: DriverColors.navyDark, fontWeight: '800', fontSize: 14 },
  btnPrimary: { backgroundColor: DriverColors.orangePrimary },
  btnPrimaryText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
});