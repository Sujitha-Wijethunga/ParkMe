import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Animated,
  Platform,
  KeyboardAvoidingView,
  Pressable,
  StatusBar,
  Alert,
} from 'react-native';
import { Colors } from '../../constants/colors';
import { API_BASE_URL, getApiConnectionError } from '../../constants/api';

interface StaffSignupScreenProps {
  onSignupSuccess?: (user: any, token: string) => void;
  onBackToLogin?: () => void;
}

export default function StaffSignupScreen({
  onSignupSuccess,
  onBackToLogin,
}: StaffSignupScreenProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [staffId, setStaffId] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formErrors, setFormErrors] = useState({
    name: '',
    email: '',
    phone: '',
    staffId: '',
    password: '',
    confirmPassword: '',
  });

  // Focus states
  const [nameFocused, setNameFocused] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [phoneFocused, setPhoneFocused] = useState(false);
  const [staffIdFocused, setStaffIdFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [confirmPasswordFocused, setConfirmPasswordFocused] = useState(false);

  // Refs for sequential focus
  const nameInputRef = useRef<TextInput>(null);
  const emailInputRef = useRef<TextInput>(null);
  const phoneInputRef = useRef<TextInput>(null);
  const staffIdInputRef = useRef<TextInput>(null);
  const passwordInputRef = useRef<TextInput>(null);
  const confirmPasswordInputRef = useRef<TextInput>(null);

  // Animated scale for button
  const [buttonScale] = useState(() => new Animated.Value(1));

  const handlePressIn = () => {
    Animated.spring(buttonScale, {
      toValue: 0.97,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(buttonScale, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  const validateSignup = () => {
    const nextErrors = {
      name: '',
      email: '',
      phone: '',
      staffId: '',
      password: '',
      confirmPassword: '',
    };

    const cleanName = name.trim();
    const cleanEmail = email.trim();
    const cleanPhone = phone.trim();
    const cleanStaffId = staffId.trim();
    const phoneDigits = cleanPhone.replace(/\D/g, '');

    if (!cleanName) {
      nextErrors.name = 'Please enter your full name.';
    } else if (cleanName.length < 2) {
      nextErrors.name = 'Name must be at least 2 characters.';
    } else if (cleanName.length > 80 || !/^[\p{L}\p{M}]+(?:[ .'-][\p{L}\p{M}]+)*$/u.test(cleanName)) {
      nextErrors.name = 'Enter a valid name using letters, spaces, apostrophes, periods, or hyphens.';
    }

    if (!cleanEmail) {
      nextErrors.email = 'Please enter your email address.';
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
      if (!emailRegex.test(cleanEmail)) {
        nextErrors.email = 'Please enter a valid email address.';
      }
    }

    if (!cleanPhone) {
      nextErrors.phone = 'Please enter your phone number.';
    } else {
      if (phoneDigits.length < 9 || phoneDigits.length > 12) {
        nextErrors.phone = 'Phone number must be 9 to 12 digits.';
      } else if (!/^\+?[0-9][0-9\s()-]*$/.test(cleanPhone)) {
        nextErrors.phone = 'Phone number format is invalid.';
      }
    }

    if (cleanStaffId && !/^[A-Z0-9-]{3,20}$/i.test(cleanStaffId)) {
      nextErrors.staffId = 'Staff ID must be 3 to 20 characters and use only letters, numbers, or hyphens.';
    }

    if (!password) {
      nextErrors.password = 'Please enter a password.';
    } else if (password.length < 8) {
      nextErrors.password = 'Password must be at least 8 characters long.';
    } else if (!/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
      nextErrors.password = 'Password must include at least one uppercase letter and one number.';
    }

    if (!confirmPassword) {
      nextErrors.confirmPassword = 'Please confirm your password.';
    } else if (password !== confirmPassword) {
      nextErrors.confirmPassword = 'Password and confirm password do not match.';
    }

    setFormErrors(nextErrors);
    return !nextErrors.name && !nextErrors.email && !nextErrors.phone && !nextErrors.staffId && !nextErrors.password && !nextErrors.confirmPassword;
  };

  const handleRegister = async () => {
    if (!validateSignup()) {
      Alert.alert('Validation Error', 'Please review the highlighted fields and try again.');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim(),
          staffId: staffId.trim() ? staffId.trim().toUpperCase() : undefined,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Registration failed');
      }

      setIsLoading(false);
      setFormErrors({
        name: '',
        email: '',
        phone: '',
        staffId: '',
        password: '',
        confirmPassword: '',
      });

      Alert.alert(
        'Account Created Successfully',
        `Your staff account has been saved. Staff ID: ${data.staffId || 'not assigned'}. You can log in with your email or Staff ID and password.`,
        [
          {
            text: 'Proceed to Portal',
            onPress: () => {
              if (onSignupSuccess) {
                onSignupSuccess(data, data.token);
              }
            },
          },
        ]
      );
    } catch (error: any) {
      setIsLoading(false);
      Alert.alert(
        'Registration Failed',
        error instanceof TypeError ? getApiConnectionError() : error instanceof Error ? error.message : 'Please try again.'
      );
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      enabled={Platform.OS === 'ios'}
    >
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="always"
        keyboardDismissMode="none"
        removeClippedSubviews={false}
        showsVerticalScrollIndicator={false}
      >
        {/* ────── Dark Teal Header ────── */}
        <View style={styles.header}>
          {/* Logo row */}
          <View style={styles.logoRow}>
            <View style={styles.logoIcon}>
              <Text style={styles.logoEmoji}>🚗</Text>
            </View>
            <View>
              <Text style={styles.logoTitle}>ParkMe</Text>
              <Text style={styles.logoSubtitle}>STAFF REGISTRATION</Text>
            </View>
          </View>

          {/* Role badge */}
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeIcon}>✨</Text>
            <Text style={styles.roleBadgeText}>New Personnel Onboarding</Text>
          </View>

          {/* Tagline */}
          <Text style={styles.tagline}>
            Create your staff profile to start managing parking allocations and boom gate operations.
          </Text>
        </View>

        {/* ────── Form Card ────── */}
        <View style={styles.cardContainer}>
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Staff Sign Up</Text>
            <Text style={styles.formSubtitle}>Create an official facility attendant account</Text>

            {/* Full Name Field */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>
                Full Name <Text style={styles.required}>*</Text>
              </Text>
              <Pressable
                style={[
                  styles.inputWrapper,
                  nameFocused && styles.inputWrapperFocused,
                  formErrors.name ? styles.inputWrapperError : null,
                ]}
                onPress={() => nameInputRef.current?.focus()}
              >
                <Text style={styles.inputIcon}>👤</Text>
                <TextInput
                  ref={nameInputRef}
                  style={styles.input}
                  placeholder="e.g. Kasun Perera"
                  placeholderTextColor={Colors.placeholder}
                  value={name}
                  onChangeText={(value) => {
                    setName(value);
                    setFormErrors((prev) => ({ ...prev, name: '' }));
                  }}
                  autoCapitalize="words"
                  autoCorrect={false}
                  onFocus={() => setNameFocused(true)}
                  onBlur={() => setNameFocused(false)}
                  returnKeyType="next"
                  onSubmitEditing={() => emailInputRef.current?.focus()}
                />
              </Pressable>
              {formErrors.name ? <Text style={styles.errorText}>{formErrors.name}</Text> : null}
            </View>

            {/* Email Field */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>
                Email Address <Text style={styles.required}>*</Text>
              </Text>
              <Pressable
                style={[
                  styles.inputWrapper,
                  emailFocused && styles.inputWrapperFocused,
                  formErrors.email ? styles.inputWrapperError : null,
                ]}
                onPress={() => emailInputRef.current?.focus()}
              >
                <Text style={styles.inputIcon}>✉️</Text>
                <TextInput
                  ref={emailInputRef}
                  style={styles.input}
                  placeholder="e.g. kasun@parkme.lk"
                  placeholderTextColor={Colors.placeholder}
                  value={email}
                  onChangeText={(value) => {
                    setEmail(value);
                    setFormErrors((prev) => ({ ...prev, email: '' }));
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  onFocus={() => setEmailFocused(true)}
                  onBlur={() => setEmailFocused(false)}
                  returnKeyType="next"
                  onSubmitEditing={() => phoneInputRef.current?.focus()}
                />
              </Pressable>
              {formErrors.email ? <Text style={styles.errorText}>{formErrors.email}</Text> : null}
            </View>

            {/* Phone Number Field */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>
                Phone Number <Text style={styles.required}>*</Text>
              </Text>
              <Pressable
                style={[
                  styles.inputWrapper,
                  phoneFocused && styles.inputWrapperFocused,
                  formErrors.phone ? styles.inputWrapperError : null,
                ]}
                onPress={() => phoneInputRef.current?.focus()}
              >
                <Text style={styles.inputIcon}>📞</Text>
                <TextInput
                  ref={phoneInputRef}
                  style={styles.input}
                  placeholder="e.g. 077 123 4567"
                  placeholderTextColor={Colors.placeholder}
                  value={phone}
                  onChangeText={(value) => {
                    setPhone(value);
                    setFormErrors((prev) => ({ ...prev, phone: '' }));
                  }}
                  keyboardType="phone-pad"
                  onFocus={() => setPhoneFocused(true)}
                  onBlur={() => setPhoneFocused(false)}
                  returnKeyType="next"
                  onSubmitEditing={() => staffIdInputRef.current?.focus()}
                />
              </Pressable>
              {formErrors.phone ? <Text style={styles.errorText}>{formErrors.phone}</Text> : null}
            </View>

            {/* Staff ID Field (Optional / Custom) */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>
                Staff ID <Text style={styles.optionalHint}>(Optional)</Text>
              </Text>
              <Pressable
                style={[
                  styles.inputWrapper,
                  staffIdFocused && styles.inputWrapperFocused,
                  formErrors.staffId ? styles.inputWrapperError : null,
                ]}
                onPress={() => staffIdInputRef.current?.focus()}
              >
                <Text style={styles.inputIcon}>🛡️</Text>
                <TextInput
                  ref={staffIdInputRef}
                  style={styles.input}
                  placeholder="e.g. STF-4091 (Or leave blank to auto-generate)"
                  placeholderTextColor={Colors.placeholder}
                  value={staffId}
                  onChangeText={(value) => {
                    setStaffId(value);
                    setFormErrors((prev) => ({ ...prev, staffId: '' }));
                  }}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  onFocus={() => setStaffIdFocused(true)}
                  onBlur={() => setStaffIdFocused(false)}
                  returnKeyType="next"
                  onSubmitEditing={() => passwordInputRef.current?.focus()}
                />
              </Pressable>
              {formErrors.staffId ? <Text style={styles.errorText}>{formErrors.staffId}</Text> : <Text style={styles.fieldHint}>If left blank, a unique Staff ID (e.g. STF-8492) will be auto-generated.</Text>}
            </View>

            {/* Password Field */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>
                Password <Text style={styles.required}>*</Text>
              </Text>
              <Pressable
                style={[
                  styles.inputWrapper,
                  passwordFocused && styles.inputWrapperFocused,
                  formErrors.password ? styles.inputWrapperError : null,
                ]}
                onPress={() => passwordInputRef.current?.focus()}
              >
                <Text style={styles.inputIcon}>🔒</Text>
                <TextInput
                  ref={passwordInputRef}
                  style={styles.input}
                  placeholder="At least 8 characters, with a capital letter and number"
                  placeholderTextColor={Colors.placeholder}
                  value={password}
                  onChangeText={(value) => {
                    setPassword(value);
                    setFormErrors((prev) => ({ ...prev, password: '', confirmPassword: '' }));
                  }}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                  returnKeyType="next"
                  onSubmitEditing={() => confirmPasswordInputRef.current?.focus()}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeBtn}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Text style={styles.eyeIcon}>{showPassword ? '🙈' : '👁️'}</Text>
                </TouchableOpacity>
              </Pressable>
              {formErrors.password ? <Text style={styles.errorText}>{formErrors.password}</Text> : null}
            </View>

            {/* Confirm Password Field */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>
                Confirm Password <Text style={styles.required}>*</Text>
              </Text>
              <Pressable
                style={[
                  styles.inputWrapper,
                  confirmPasswordFocused && styles.inputWrapperFocused,
                  formErrors.confirmPassword ? styles.inputWrapperError : null,
                ]}
                onPress={() => confirmPasswordInputRef.current?.focus()}
              >
                <Text style={styles.inputIcon}>🔒</Text>
                <TextInput
                  ref={confirmPasswordInputRef}
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor={Colors.placeholder}
                  value={confirmPassword}
                  onChangeText={(value) => {
                    setConfirmPassword(value);
                    setFormErrors((prev) => ({ ...prev, confirmPassword: '' }));
                  }}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  onFocus={() => setConfirmPasswordFocused(true)}
                  onBlur={() => setConfirmPasswordFocused(false)}
                  returnKeyType="done"
                  onSubmitEditing={handleRegister}
                />
                <TouchableOpacity
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={styles.eyeBtn}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Text style={styles.eyeIcon}>{showConfirmPassword ? '🙈' : '👁️'}</Text>
                </TouchableOpacity>
              </Pressable>
              {formErrors.confirmPassword ? <Text style={styles.errorText}>{formErrors.confirmPassword}</Text> : null}
            </View>

            {/* CTA Button */}
            <Pressable
              onPressIn={handlePressIn}
              onPressOut={handlePressOut}
              onPress={handleRegister}
              disabled={isLoading}
            >
              <Animated.View
                style={[styles.signupButton, { transform: [{ scale: buttonScale }] }]}
              >
                {isLoading ? (
                  <Text style={styles.signupButtonText}>Creating Account...</Text>
                ) : (
                  <Text style={styles.signupButtonText}>Register Staff Account →</Text>
                )}
              </Animated.View>
            </Pressable>

            {/* Already have account link */}
            <View style={styles.footerRow}>
              <Text style={styles.footerText}>Already registered as staff? </Text>
              <TouchableOpacity onPress={onBackToLogin}>
                <Text style={styles.footerLink}>Log In here</Text>
              </TouchableOpacity>
            </View>

            {/* Security Badge */}
            <View style={styles.securityBadge}>
              <View style={styles.securityLeft}>
                <Text style={styles.securityIcon}>🛡️</Text>
                <Text style={styles.securityText}>Authorized Staff Registration</Text>
              </View>
              <View style={styles.tlsBadge}>
                <Text style={styles.tlsText}>TLS 1.3</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    flexGrow: 1,
  },

  /* ── Header ── */
  header: {
    backgroundColor: Colors.primary,
    paddingTop: Platform.OS === 'android' ? 44 : 56,
    paddingBottom: 28,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  logoIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoEmoji: {
    fontSize: 26,
  },
  logoTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.textOnDark,
    letterSpacing: -0.5,
  },
  logoSubtitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#4DB6AC',
    letterSpacing: 2,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    borderRadius: 100,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginBottom: 14,
  },
  roleBadgeIcon: {
    fontSize: 13,
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textOnDark,
    letterSpacing: 0.2,
  },
  tagline: {
    fontSize: 13.5,
    color: Colors.textOnDarkMuted,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 290,
  },

  /* ── Card Container ── */
  cardContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },
  formCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.07,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  formTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  formSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 24,
  },

  /* ── Fields ── */
  fieldGroup: {
    marginBottom: 18,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  required: {
    color: Colors.error,
  },
  optionalHint: {
    fontSize: 12,
    fontWeight: '400',
    color: Colors.textMuted,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.inputBorder,
    borderRadius: 12,
    backgroundColor: Colors.inputBackground,
    paddingHorizontal: 14,
    height: 52,
  },
  inputWrapperFocused: {
    borderColor: Colors.inputFocusBorder,
    shadowColor: Colors.inputFocusBorder,
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
    elevation: 2,
  },
  inputWrapperError: {
    borderColor: Colors.error,
    shadowColor: Colors.error,
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
    elevation: 2,
  },
  inputIcon: {
    fontSize: 17,
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15.5,
    color: Colors.textPrimary,
    height: '100%',
    paddingVertical: 0,
  },
  eyeBtn: {
    padding: 6,
  },
  eyeIcon: {
    fontSize: 18,
  },
  fieldHint: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 5,
  },
  errorText: {
    color: Colors.error,
    fontSize: 12,
    marginTop: 6,
    fontWeight: '600',
  },

  /* ── CTA Button ── */
  signupButton: {
    backgroundColor: Colors.accent,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: Colors.accent,
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  signupButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },

  /* ── Footer Row ── */
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 10,
  },
  footerText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  footerLink: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.link,
    textDecorationLine: 'underline',
  },

  /* ── Security Badge ── */
  securityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.securityBg,
    borderWidth: 1,
    borderColor: Colors.securityBorder,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 14,
  },
  securityLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  securityIcon: {
    fontSize: 15,
  },
  securityText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.securityText,
  },
  tlsBadge: {
    backgroundColor: '#E8F5E9',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  tlsText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2E7D32',
    letterSpacing: 0.5,
  },
});
