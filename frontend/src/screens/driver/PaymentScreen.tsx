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
  onPay: (booking: BookingDetails) => Promise<void> | void;
}

const METHODS = [
  { title: 'Card / Online Payment', sub: 'Visa, Mastercard, Amex', icon: '💳' },
  { title: 'Mobile Wallet', sub: 'FriMi, Genie, EZ Cash', icon: '👛' },
  { title: 'Pay with Cash on Arrival', sub: 'Show your booking confirmation to attendant', icon: '💵' },
];

/* ── Validation helpers ─────────────────────────────────────────────────── */
const isCardNumberValid = (v: string) => v.replace(/\s/g, '').length === 16;

const isExpiryValid = (v: string) => {
  const m = /^(\d{2})\/(\d{2})$/.exec(v);
  if (!m) return false;
  const month = parseInt(m[1], 10);
  const year = parseInt(m[2], 10);
  if (month < 1 || month > 12) return false;
  const now = new Date();
  const curYear = now.getFullYear() % 100;
  const curMonth = now.getMonth() + 1;
  if (year < curYear) return false;
  if (year === curYear && month < curMonth) return false;
  return true;
};

const isCvvValid = (v: string) => v.length === 3 || v.length === 4;

export default function PaymentScreen({ booking, onBack, onPay }: PaymentScreenProps) {
  /** null = nothing selected yet */
  const [method, setMethod] = useState<number | null>(null);
  const [card, setCard] = useState('');
  const [exp, setExp] = useState('');
  const [cvv, setCvv] = useState('');
  const [promo, setPromo] = useState('');
  const [discount, setDiscount] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

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

  /* ── What is still missing? ────────────────────────────────────────────── */
  const cardOk = isCardNumberValid(card);
  const expOk = isExpiryValid(exp);
  const cvvOk = isCvvValid(cvv);

  let blockReason: string | null = null;
  if (method === null) {
    blockReason = 'Please select a payment method to continue';
  } else if (method === 0 && !(cardOk && expOk && cvvOk)) {
    blockReason = 'Please enter valid card details to continue';
  }
  const canPay = blockReason === null;

  const handlePay = async () => {
    if (!canPay || isProcessing) return;
    setIsProcessing(true);
    setPaymentError(null);
    try {
      await onPay({ ...booking, total: finalTotal });
    } catch (error) {
      setPaymentError(error instanceof Error ? error.message : 'Could not save your booking. Please try again.');
    } finally {
      setIsProcessing(false);
    }
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
                      style={[styles.input, card.length > 0 && !cardOk && styles.inputError]}
                      placeholder="Card Number"
                      placeholderTextColor={DriverColors.textMuted}
                      keyboardType="number-pad"
                      maxLength={19}
                      value={card}
                      onChangeText={(t) => setCard(formatCard(t))}
                    />
                    {card.length > 0 && !cardOk && (
                      <Text style={styles.errorText}>Card number must be 16 digits</Text>
                    )}

                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                      <View style={{ flex: 1 }}>
                        <TextInput
                          style={[styles.input, exp.length > 0 && !expOk && styles.inputError]}
                          placeholder="MM/YY"
                          placeholderTextColor={DriverColors.textMuted}
                          keyboardType="number-pad"
                          maxLength={5}
                          value={exp}
                          onChangeText={(t) => setExp(formatExp(t))}
                        />
                        {exp.length > 0 && !expOk && (
                          <Text style={styles.errorText}>Invalid or expired date</Text>
                        )}
                      </View>
                      <View style={{ flex: 1 }}>
                        <TextInput
                          style={[styles.input, cvv.length > 0 && !cvvOk && styles.inputError]}
                          placeholder="CVV"
                          placeholderTextColor={DriverColors.textMuted}
                          secureTextEntry
                          keyboardType="number-pad"
                          maxLength={4}
                          value={cvv}
                          onChangeText={(t) => setCvv(t.replace(/\D/g, ''))}
                        />
                        {cvv.length > 0 && !cvvOk && (
                          <Text style={styles.errorText}>3 or 4 digits</Text>
                        )}
                      </View>
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
          <View style={{ height: 120 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Sticky pay bar */}
      <View style={styles.payBar}>
        {blockReason && <Text style={styles.blockText}>{blockReason}</Text>}
        {!!paymentError && <Text style={styles.paymentError}>{paymentError}</Text>}
        <TouchableOpacity
          style={[styles.payBtn, (!canPay || isProcessing) && styles.payBtnDisabled]}
          activeOpacity={canPay ? 0.88 : 1}
          disabled={!canPay || isProcessing}
          onPress={handlePay}
          accessibilityRole="button"
          accessibilityState={{ disabled: !canPay || isProcessing }}
          accessibilityLabel={isProcessing ? 'Saving booking' : canPay ? `Pay Rs. ${finalTotal}` : blockReason ?? 'Pay'}
        >
          <Text style={[styles.payBtnText, !canPay && styles.payBtnTextDisabled]}>
            {isProcessing ? 'Saving Booking…' : `Pay Rs. ${finalTotal} →`}
          </Text>
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
  inputError: { borderColor: '#EF4444', backgroundColor: '#FEF2F2' },
  errorText: { color: '#EF4444', fontSize: 11, marginTop: 4 },
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
    paddingTop: 10,
    paddingBottom: Platform.OS === 'android' ? 16 : 28,
    elevation: 12,
  },
  blockText: {
    textAlign: 'center',
    color: '#D97706',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  paymentError: {
    textAlign: 'center',
    color: '#B42318',
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 17,
    marginBottom: 8,
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
  payBtnDisabled: {
    backgroundColor: '#E2E8F0',
    shadowOpacity: 0,
    elevation: 0,
  },
  payBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  payBtnTextDisabled: { color: '#94A3B8' },
});
