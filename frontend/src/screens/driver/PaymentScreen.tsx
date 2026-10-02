import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Platform,
  BackHandler,
  KeyboardAvoidingView,
} from 'react-native';
import { DriverColors } from '../../constants/colors';
import { BookingDetails } from '../../constants/bookingTypes';

interface PaymentScreenProps {
  booking: BookingDetails;
  onBack: () => void;
  /** Called after "Pay" is pressed. Receives the booking with the final (discounted) total. */
  onPay: (booking: BookingDetails) => void;
}

const METHODS = [
  { title: 'Card / Online Payment', sub: 'Visa, Mastercard, Amex', icon: '💳' },
  { title: 'Mobile Wallet', sub: 'FriMi, Genie, EZ Cash', icon: '👛' },
  { title: 'Pay with Cash on Arrival', sub: 'Show your booking confirmation to attendant', icon: '💵' },
];

export default function PaymentScreen({ booking, onBack, onPay }: PaymentScreenProps) {
  const [method, setMethod] = useState(0);
  const [card, setCard] = useState('');
  const [exp, setExp] = useState('');
  const [cvv, setCvv] = useState('');
  const [promo, setPromo] = useState('');
  const [discount, setDiscount] = useState(0);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onBack();
      return true;
    });
    return () => sub.remove();
  }, [onBack]);

  const finalTotal = booking.total - discount;

  const applyPromo = () => {
    if (promo.trim().toUpperCase() === 'PARKME20') setDiscount(Math.round(booking.total * 0.2));
    else setDiscount(0);
  };

  const formatCard = (t: string) =>
    t.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();

  const formatExp = (t: string) => {
    const d = t.replace(/\D/g, '').slice(0, 4);
    return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          activeOpacity={0.75}
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payment</Text>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.sectionTitle}>Select Payment Method</Text>
          <Text style={styles.muted}>All transactions are encrypted and secure</Text>

          {METHODS.map((m, i) => {
            const active = method === i;
            return (
              <TouchableOpacity
                key={m.title}
                activeOpacity={0.9}
                onPress={() => setMethod(i)}
                style={[styles.card, active && styles.cardActive]}
                accessibilityRole="button"
                accessibilityLabel={`${m.title}${active ? ', selected' : ''}`}
              >
                <View style={styles.rowBetween}>
                  <View style={styles.rowLeft}>
                    <View style={styles.iconBox}>
                      <Text style={{ fontSize: 18 }}>{m.icon}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.methodTitle}>{m.title}</Text>
                      <Text style={[styles.muted, i === 2 && { color: DriverColors.orangePrimary }]}>
                        {m.sub}
                      </Text>
                    </View>
                  </View>
                  <View style={[styles.radio, active && styles.radioActive]}>
                    {active && <View style={styles.radioDot} />}
                  </View>
                </View>

                {i === 0 && active && (
                  <View style={{ marginTop: 12 }}>
                    <View style={styles.rowBetween}>
                      <Text style={styles.label}>ENTER CARD DETAILS</Text>
                      <Text style={styles.ssl}>🔒 256-BIT SSL</Text>
                    </View>
                    <TextInput
                      style={styles.input}
                      placeholder="Card Number"
                      placeholderTextColor={DriverColors.textMuted}
                      keyboardType="number-pad"
                      maxLength={19}
                      value={card}
                      onChangeText={(t) => setCard(formatCard(t))}
                    />
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                      <TextInput
                        style={[styles.input, { flex: 1 }]}
                        placeholder="MM/YY"
                        placeholderTextColor={DriverColors.textMuted}
                        keyboardType="number-pad"
                        maxLength={5}
                        value={exp}
                        onChangeText={(t) => setExp(formatExp(t))}
                      />
                      <TextInput
                        style={[styles.input, { flex: 1 }]}
                        placeholder="CVV"
                        placeholderTextColor={DriverColors.textMuted}
                        secureTextEntry
                        keyboardType="number-pad"
                        maxLength={4}
                        value={cvv}
                        onChangeText={setCvv}
                      />
                    </View>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}

          {/* Promo */}
          <View style={styles.card}>
            <Text style={styles.label}>PROMO CODE</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="e.g. PARKME20"
                placeholderTextColor={DriverColors.textMuted}
                autoCapitalize="characters"
                value={promo}
                onChangeText={setPromo}
              />
              <TouchableOpacity style={styles.applyBtn} activeOpacity={0.85} onPress={applyPromo}>
                <Text style={styles.applyText}>Apply</Text>
              </TouchableOpacity>
            </View>
            {discount > 0 && <Text style={styles.promoOk}>Promo applied: -Rs. {discount}</Text>}
          </View>

          {/* Totals */}
          <View style={styles.card}>
            <View style={styles.rowBetween}>
              <Text style={styles.muted}>Parking & Service</Text>
              <Text style={styles.methodTitle}>Rs. {booking.total}</Text>
            </View>
            {discount > 0 && (
              <View style={[styles.rowBetween, { marginTop: 6 }]}>
                <Text style={styles.muted}>Discount</Text>
                <Text style={[styles.methodTitle, { color: '#10B981' }]}>-Rs. {discount}</Text>
              </View>
            )}
            <View style={styles.divider} />
            <View style={styles.rowBetween}>
              <Text style={styles.totalText}>Total</Text>
              <Text style={styles.totalText}>Rs. {finalTotal}</Text>
            </View>
          </View>

          <Text style={styles.guarantee}>🛡️ Guaranteed Spot Lock · Instant Confirmation</Text>
          <View style={{ height: 100 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Sticky pay bar */}
      <View style={styles.payBar}>
        <TouchableOpacity
          style={styles.payBtn}
          activeOpacity={0.88}
          onPress={() => onPay({ ...booking, total: finalTotal })}
          accessibilityRole="button"
          accessibilityLabel={`Pay Rs. ${finalTotal}`}
        >
          <Text style={styles.payBtnText}>Pay Rs. {finalTotal} →</Text>
        </TouchableOpacity>
      </View>
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
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: DriverColors.borderLight,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: DriverColors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  backArrow: { fontSize: 26, lineHeight: 28, color: DriverColors.navyHeading, fontWeight: '600' },
  headerTitle: { fontSize: 19, fontWeight: '800', color: DriverColors.navyHeading, letterSpacing: -0.2 },

  scrollView: { flex: 1, backgroundColor: DriverColors.background },
  scrollContent: { padding: 14, gap: 10 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: DriverColors.navyHeading },
  muted: { fontSize: 12, color: DriverColors.textSecondary },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: DriverColors.cardBorder,
    padding: 14,
  },
  cardActive: { borderColor: DriverColors.navyDark, borderWidth: 2 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodTitle: { fontSize: 14, fontWeight: '700', color: DriverColors.navyHeading },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: DriverColors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioActive: { borderColor: DriverColors.navyDark },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: DriverColors.navyDark },

  label: {
    fontSize: 10.5,
    fontWeight: '700',
    color: DriverColors.textSecondary,
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  ssl: { fontSize: 10, fontWeight: '700', color: '#10B981', marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: DriverColors.cardBorder,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#F8FAFC',
    fontSize: 14,
    color: DriverColors.navyHeading,
  },
  applyBtn: {
    backgroundColor: DriverColors.navyDark,
    borderRadius: 10,
    paddingHorizontal: 18,
    justifyContent: 'center',
  },
  applyText: { color: '#FFFFFF', fontWeight: '700' },
  promoOk: { color: '#10B981', fontSize: 12, marginTop: 6, fontWeight: '600' },
  divider: { height: 1, backgroundColor: DriverColors.borderLight, marginVertical: 10 },
  totalText: { fontSize: 18, fontWeight: '800', color: DriverColors.navyHeading },
  guarantee: { textAlign: 'center', fontSize: 11.5, color: DriverColors.textSecondary, marginTop: 4 },

  payBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: DriverColors.borderLight,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'android' ? 16 : 28,
    elevation: 12,
  },
  payBtn: {
    backgroundColor: DriverColors.orangePrimary,
    borderRadius: 28,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: DriverColors.orangePrimary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  payBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
});