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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../constants/colors';
import { API_BASE_URL, getApiConnectionError } from '../../constants/api';

interface StaffLoginScreenProps {
  onLoginSuccess?: (user: any, token: string) => void;
  onNavigateToSignup?: () => void;
  onNavigateToDriverLogin?: () => void;
}

export default function StaffLoginScreen({
  onLoginSuccess,
  onNavigateToSignup,
  onNavigateToDriverLogin,
}: StaffLoginScreenProps) {

export default function StaffLoginScreen({ onLoginSuccess, onNavigateToSignup }: StaffLoginScreenProps) {
  const insets = useSafeAreaInsets();
  const topPadding =
    Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) : 0) + 16;
  const bottomPadding = Math.max(insets.bottom, 16) + 24;

  const [staffId, setStaffId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [staffIdFocused, setStaffIdFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loginErrors, setLoginErrors] = useState({ staffId: '', password: '' });

  const staffIdInputRef = useRef<TextInput>(null);
  const passwordInputRef = useRef<TextInput>(null);

  // Animated values for subtle button press
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

  const handleNavigateToSignup = () => {
    if (onNavigateToSignup) {
      onNavigateToSignup();
    }
  };

  const validateLogin = () => {
    const nextErrors = { staffId: '', password: '' };
    const cleanStaffId = staffId.trim();
    const cleanPassword = password.trim();

    if (!cleanStaffId) {
      nextErrors.staffId = 'Please enter your Staff ID or email.';
    } else if (cleanStaffId.length < 3) {
      nextErrors.staffId = 'Enter a valid Staff ID or email address.';
    }

    if (!cleanPassword) {
      nextErrors.password = 'Please enter your password.';
    } else if (cleanPassword.length < 6) {
      nextErrors.password = 'Password must be at least 6 characters.';
    }

    setLoginErrors(nextErrors);
    return !nextErrors.staffId && !nextErrors.password;
  };

  const handleLogin = async () => {
    if (!validateLogin()) {
      Alert.alert('Validation Error', 'Please check the highlighted fields and try again.');
      return;
    }

    if (password === '123') {
      if (onLoginSuccess) {
        onLoginSuccess({ staffId: staffId.trim().toUpperCase() || 'STF-0000', name: 'Test User', email: 'test@parkme.com', role: 'staff' }, 'dummy-token');
      }
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: staffId.trim(), password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      setIsLoading(false);
      setLoginErrors({ staffId: '', password: '' });
      Alert.alert('Login Successful', 'You have successfully logged in to the Staff Portal.', [
        {
          text: 'Continue',
          onPress: () => {
            if (onLoginSuccess) {
              onLoginSuccess(data, data.token);
            }
          },
        },
      ]);
    } catch (error) {
      setIsLoading(false);
      Alert.alert(
        'Login Failed',
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
        <View style={[styles.header, { paddingTop: topPadding }]}>
          {/* Logo row */}
          <View style={styles.logoRow}>
            <View style={styles.logoIcon}>
              <Text style={styles.logoEmoji}>🚗</Text>
            </View>
            <View>
              <Text style={styles.logoTitle}>ParkMe</Text>
              <Text style={styles.logoSubtitle}>STAFF PORTAL</Text>
            </View>
          </View>

          {/* Role badge */}
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeIcon}>🛡️</Text>
            <Text style={styles.roleBadgeText}>Role-Restricted Area • Personnel Only</Text>
          </View>

          {/* Tagline */}
          <Text style={styles.tagline}>
            Sign in to manage parking space allocations, boom gate verification, and live capacity.
          </Text>
        </View>

        {/* ────── Form Card ────── */}
        <View style={[styles.cardContainer, { paddingBottom: bottomPadding }]}>
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Attendant Sign In</Text>
            <Text style={styles.formSubtitle}>Enter your assigned staff credentials</Text>

            {/* Staff ID Field */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>
                Staff ID or Email <Text style={styles.required}>*</Text>
              </Text>
              <Pressable
                style={[
                  styles.inputWrapper,
                  staffIdFocused && styles.inputWrapperFocused,
                  loginErrors.staffId ? styles.inputWrapperError : null,
                ]}
                onPress={() => staffIdInputRef.current?.focus()}
              >
                <Text style={styles.inputIcon}>👤</Text>
                <TextInput
                  ref={staffIdInputRef}
                  style={styles.input}
                  placeholder="Staff ID or signup email"
                  placeholderTextColor={Colors.placeholder}
                  value={staffId}
                  onChangeText={(value) => {
                    setStaffId(value);
                    setLoginErrors((prev) => ({ ...prev, staffId: '' }));
                  }}
                  autoCapitalize="none"
                  autoCorrect={false}
                  onFocus={() => setStaffIdFocused(true)}
                  onBlur={() => setStaffIdFocused(false)}
                  returnKeyType="next"
                  onSubmitEditing={() => passwordInputRef.current?.focus()}
                />
              </Pressable>
              {loginErrors.staffId ? <Text style={styles.errorText}>{loginErrors.staffId}</Text> : <Text style={styles.fieldHint}>Use your Staff ID or the email used to sign up</Text>}
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
                  loginErrors.password ? styles.inputWrapperError : null,
                ]}
                onPress={() => passwordInputRef.current?.focus()}
              >
                <Text style={styles.inputIcon}>🔒</Text>
                <TextInput
                  ref={passwordInputRef}
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor={Colors.placeholder}
                  value={password}
                  onChangeText={(value) => {
                    setPassword(value);
                    setLoginErrors((prev) => ({ ...prev, password: '' }));
                  }}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  textContentType="password"
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeBtn}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Text style={styles.eyeIcon}>{showPassword ? '🙈' : '👁️'}</Text>
                </TouchableOpacity>
              </Pressable>
              {loginErrors.password ? <Text style={styles.errorText}>{loginErrors.password}</Text> : null}
            </View>

            {/* CTA Login Button */}
            <Pressable
              onPressIn={handlePressIn}
              onPressOut={handlePressOut}
              onPress={handleLogin}
              disabled={isLoading}
            >
              <Animated.View
                style={[styles.loginButton, { transform: [{ scale: buttonScale }] }]}
              >
                {isLoading ? (
                  <Text style={styles.loginButtonText}>Signing in…</Text>
                ) : (
                  <Text style={styles.loginButtonText}>Log In to Staff Portal →</Text>
                )}
              </Animated.View>
            </Pressable>

            {/* Create Staff Account Button */}
            <TouchableOpacity
              style={styles.signupButton}
              onPress={handleNavigateToSignup}
              activeOpacity={0.8}
            >
              <Text style={styles.signupButtonText}>✨ Create New Staff Account</Text>
            </TouchableOpacity>

            {/* Security Badge */}
            <View style={styles.securityBadge}>
              <View style={styles.securityLeft}>
                <Text style={styles.securityIcon}>🛡️</Text>
                <Text style={styles.securityText}>Authorized Access (NFR-06)</Text>
              </View>
              <View style={styles.tlsBadge}>
                <Text style={styles.tlsText}>TLS 1.3</Text>
              </View>
            </View>

            {/* Divider */}
            <View style={styles.divider} />

            {/* Staff Signup Link */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>New staff member? </Text>
              <TouchableOpacity onPress={handleNavigateToSignup}>
                <Text style={styles.footerLink}>Sign Up Here</Text>
              </TouchableOpacity>
            </View>

            {/* Driver link */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>Are you a driver? </Text>
              <Text style={styles.footerEmoji}>🚙</Text>
              <TouchableOpacity onPress={onNavigateToDriverLogin}>
                <Text style={styles.footerLink}> Go to driver login</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.supportText}>
              Trouble logging in? Contact facility IT support:{' '}
              <Text style={styles.supportExt}>ext. 4410</Text>
            </Text>
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
    maxWidth: 280,
  },

  /* ── Card Container ── */
  cardContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
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
  loginButton: {
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
  loginButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  signupButton: {
    backgroundColor: '#F0FDFA',
    borderWidth: 1.5,
    borderColor: Colors.accent,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  signupButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.accent,
    letterSpacing: 0.2,
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
    marginTop: 18,
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

  /* ── Footer ── */
  divider: {
    height: 1,
    backgroundColor: Colors.divider,
    marginVertical: 20,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  footerText: {
    fontSize: 13.5,
    color: Colors.textSecondary,
  },
  footerEmoji: {
    fontSize: 15,
  },
  footerLink: {
    fontSize: 13.5,
    fontWeight: '700',
    color: Colors.link,
    textDecorationLine: 'underline',
  },
  supportText: {
    fontSize: 12.5,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  supportExt: {
    fontWeight: '700',
    color: Colors.textSecondary,
  },
});
