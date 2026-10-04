import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { loginDriver, authWithGoogle } from '../../services/authApi';
import { saveDriverToken, saveDriverUser, saveDriverSession, DriverUser } from '../../services/storage';
import { promptNativeGoogleSignIn } from '../../services/googleAuthService';

export interface DriverLoginScreenProps {
  onBack: () => void;
  onNavigateToSignUp: () => void;
  onNavigateToStaffLogin: () => void;
  onLoginSuccess: (user: DriverUser, token: string) => void;
}

export default function DriverLoginScreen({
  onBack,
  onNavigateToSignUp,
  onNavigateToStaffLogin,
  onLoginSuccess,
}: DriverLoginScreenProps) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // Field validation and error feedback
  const [identifierError, setIdentifierError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [generalError, setGeneralError] = useState('');

  // Focus states
  const [identifierFocused, setIdentifierFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const passwordInputRef = useRef<TextInput>(null);

  const validate = (): boolean => {
    let isValid = true;
    setIdentifierError('');
    setPasswordError('');
    setGeneralError('');

    const trimmedId = identifier.trim();
    if (!trimmedId) {
      setIdentifierError('Email or mobile phone is required');
      isValid = false;
    }

    if (!password) {
      setPasswordError('Password is required');
      isValid = false;
    } else if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      isValid = false;
    }

    return isValid;
  };

  const handleLogin = async () => {
    if (isLoading) return;
    if (!validate()) return;

    setIsLoading(true);
    setGeneralError('');

    try {
      const result = await loginDriver(identifier.trim(), password);

      const driverProfile: DriverUser = {
        _id: result._id,
        name: result.name,
        email: result.email,
        phone: result.phone,
        role: 'driver',
      };

      // Persist credentials securely
      await saveDriverToken(result.token);
      await saveDriverUser(driverProfile);

      onLoginSuccess(driverProfile, result.token);
    } catch (err: any) {
      const msg = err.message || 'Login failed. Please check your credentials and try again.';
      setGeneralError(msg);
      if (err.errors && Array.isArray(err.errors)) {
        for (const e of err.errors) {
          if (e.field === 'email' || e.field === 'identifier') setIdentifierError(e.message);
          if (e.field === 'password') setPasswordError(e.message);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = () => {
    Alert.alert(
      'Password Recovery',
      'Driver password recovery is coming in a future update. If you need immediate assistance, please contact support at support@parkme.city.',
      [{ text: 'OK', style: 'default' }]
    );
  };

  const handleGoogleLogin = async () => {
    if (isLoading || isGoogleLoading) return;
    setIsGoogleLoading(true);

    try {
      const result = await promptNativeGoogleSignIn();

      if (result.cancelled) {
        setIsGoogleLoading(false);
        return;
      }

      if (!result.success || !result.idToken) {
        setIsGoogleLoading(false);
        return;
      }

      // Send Google ID token to backend for cryptographic verification
      const response = await authWithGoogle(result.idToken);

      const driverUser: DriverUser = {
        _id: response._id,
        name: response.name,
        email: response.email,
        phone: response.phone,
        role: 'driver',
      };

      await saveDriverSession(driverUser, response.token);
      onLoginSuccess(driverUser, response.token);
    } catch (err: any) {
      if (err?.code === 'ACCOUNT_COLLISION' || err?.status === 409) {
        Alert.alert(
          'Account Exists',
          err.message || 'An account with this email already exists using password login. Please sign in with your email and password.',
          [{ text: 'OK', style: 'default' }]
        );
      } else {
        Alert.alert(
          'Google Sign-In Error',
          err?.message || 'Unable to sign in with Google. Please try again or use your password.'
        );
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Top Bar: Back Button & Driver Portal Pill Badge */}
          <View style={styles.topBar}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={onBack}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Back to welcome screen"
            >
              <Text style={styles.backArrow}>‹</Text>
            </TouchableOpacity>

            <View style={styles.portalBadge}>
              <Text style={styles.portalBadgeIcon}>🛡️</Text>
              <Text style={styles.portalBadgeText}>Driver Portal</Text>
            </View>
          </View>

          {/* Security Branding */}
          <View style={styles.brandRow}>
            <View style={styles.brandIconSquircle}>
              <Image
                source={require('../../../assets/icon.png')}
                style={styles.brandIconImage}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.brandText}>PARKME SECURITY</Text>
          </View>

          {/* Header Titles */}
          <Text style={styles.heading}>Welcome back</Text>
          <Text style={styles.subheading}>
            Enter your credentials to manage your parking & bookings
          </Text>

          {/* Segmented Tab Switcher (Login active) */}
          <View style={styles.tabContainer}>
            <View style={styles.activeTab}>
              <Text style={styles.activeTabText}>Login</Text>
            </View>
            <TouchableOpacity
              style={styles.inactiveTab}
              onPress={onNavigateToSignUp}
              activeOpacity={0.7}
              accessibilityRole="tab"
              accessibilityLabel="Switch to Sign Up"
            >
              <Text style={styles.inactiveTabText}>Sign Up</Text>
            </TouchableOpacity>
          </View>

          {/* Server / General Error Alert Banner */}
          {generalError ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{generalError}</Text>
            </View>
          ) : null}

          {/* Form Fields */}
          <View style={styles.form}>
            {/* Email or Phone Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                Email or Mobile Phone <Text style={styles.requiredStar}>*</Text>
              </Text>
              <View
                style={[
                  styles.inputContainer,
                  identifierFocused && styles.inputFocused,
                  Boolean(identifierError) && styles.inputErrorBorder,
                ]}
              >
                <Text style={styles.inputLeadingIcon}>✉</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="driver@parkme.city"
                  placeholderTextColor="#94A3B8"
                  value={identifier}
                  onChangeText={(text) => {
                    setIdentifier(text);
                    if (identifierError) setIdentifierError('');
                  }}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  returnKeyType="next"
                  onFocus={() => setIdentifierFocused(true)}
                  onBlur={() => setIdentifierFocused(false)}
                  onSubmitEditing={() => passwordInputRef.current?.focus()}
                  editable={!isLoading}
                  accessibilityLabel="Email or Mobile Phone"
                />
              </View>
              {identifierError ? (
                <Text style={styles.inlineError}>{identifierError}</Text>
              ) : null}
            </View>

            {/* Password Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                Password <Text style={styles.requiredStar}>*</Text>
              </Text>
              <View
                style={[
                  styles.inputContainer,
                  passwordFocused && styles.inputFocused,
                  Boolean(passwordError) && styles.inputErrorBorder,
                ]}
              >
                <Text style={styles.inputLeadingIcon}>🔒</Text>
                <TextInput
                  ref={passwordInputRef}
                  style={styles.textInput}
                  placeholder="••••••••••••"
                  placeholderTextColor="#94A3B8"
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    if (passwordError) setPasswordError('');
                  }}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="done"
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                  onSubmitEditing={handleLogin}
                  editable={!isLoading}
                  accessibilityLabel="Password"
                />
                <TouchableOpacity
                  style={styles.eyeBtn}
                  onPress={() => setShowPassword((prev) => !prev)}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                >
                  <Text style={styles.eyeIcon}>{showPassword ? '👁' : '👁‍🗨'}</Text>
                </TouchableOpacity>
              </View>
              {passwordError ? (
                <Text style={styles.inlineError}>{passwordError}</Text>
              ) : null}
            </View>

            {/* Forgot Password Link */}
            <TouchableOpacity
              style={styles.forgotBtn}
              onPress={handleForgotPassword}
              activeOpacity={0.7}
            >
              <Text style={styles.forgotText}>Forgot password?</Text>
            </TouchableOpacity>

            {/* Primary Submit Button */}
            <TouchableOpacity
              style={[styles.submitBtn, isLoading && styles.submitBtnDisabled]}
              onPress={handleLogin}
              activeOpacity={0.85}
              disabled={isLoading}
              accessibilityRole="button"
              accessibilityLabel="Log In"
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Text style={styles.submitBtnText}>Log In</Text>
                  <Text style={styles.submitBtnArrow}>→</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Social Divider */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or continue with</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Social Buttons */}
            <View style={styles.socialRow}>
              <TouchableOpacity
                style={[styles.socialBtn, (isLoading || isGoogleLoading) && styles.socialBtnDisabled]}
                onPress={handleGoogleLogin}
                disabled={isLoading || isGoogleLoading}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Continue with Google"
              >
                {isGoogleLoading ? (
                  <ActivityIndicator size="small" color="#EA4335" />
                ) : (
                  <>
                    <Text style={styles.socialGoogleG}>G</Text>
                    <Text style={styles.socialBtnText}>Continue with Google</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Footer: Link to Staff Login */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Are you parking staff?{' '}
              <Text
                style={styles.footerLink}
                onPress={onNavigateToStaffLogin}
                accessibilityRole="link"
              >
                Staff Login
              </Text>
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 22,
    paddingTop: 10,
    paddingBottom: 28,
  },

  // Top Bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backArrow: {
    fontSize: 28,
    color: '#0F172A',
    fontWeight: '300',
    lineHeight: 32,
  },
  portalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  portalBadgeIcon: {
    fontSize: 13,
    marginRight: 5,
  },
  portalBadgeText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#1D4ED8',
  },

  // Brand Security
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  brandIconSquircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#000066',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    overflow: 'hidden',
  },
  brandIconImage: {
    width: 24,
    height: 24,
  },
  brandText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#000066',
    letterSpacing: 0.8,
  },

  // Headings
  heading: {
    fontSize: 27,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  subheading: {
    fontSize: 13.5,
    color: '#64748B',
    lineHeight: 19,
    marginBottom: 18,
  },

  // Segmented Tabs
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 24,
    padding: 4,
    marginBottom: 20,
  },
  activeTab: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 9,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  activeTabText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000066',
  },
  inactiveTab: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
  },
  inactiveTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },

  // Error Banner
  errorBanner: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 16,
  },
  errorBannerText: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '500',
  },

  // Form Fields
  form: {
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
  },
  requiredStar: {
    color: '#EF4444',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    height: 50,
    paddingHorizontal: 12,
  },
  inputFocused: {
    borderColor: '#1D4ED8',
  },
  inputErrorBorder: {
    borderColor: '#EF4444',
  },
  inputLeadingIcon: {
    fontSize: 15,
    marginRight: 10,
    color: '#64748B',
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    height: '100%',
  },
  eyeBtn: {
    padding: 6,
  },
  eyeIcon: {
    fontSize: 16,
    color: '#64748B',
  },
  inlineError: {
    fontSize: 11.5,
    color: '#DC2626',
    marginTop: 4,
    marginLeft: 2,
  },

  // Forgot Password
  forgotBtn: {
    alignSelf: 'flex-end',
    marginBottom: 18,
    paddingVertical: 4,
  },
  forgotText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#000066',
  },

  // Submit CTA Button
  submitBtn: {
    backgroundColor: '#FF6B35',
    height: 52,
    borderRadius: 26,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.28,
    shadowRadius: 6,
    elevation: 3,
  },
  submitBtnDisabled: {
    opacity: 0.7,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 16.5,
    fontWeight: '700',
  },
  submitBtnArrow: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 8,
  },

  // Divider
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 22,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  dividerText: {
    fontSize: 12.5,
    color: '#64748B',
    paddingHorizontal: 12,
  },

  // Social Buttons
  socialRow: {
    flexDirection: 'row',
    gap: 12,
  },
  socialBtn: {
    flex: 1,
    height: 46,
    borderRadius: 23,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  socialBtnDisabled: {
    opacity: 0.6,
  },
  socialGoogleG: {
    fontSize: 17,
    fontWeight: '700',
    color: '#EA4335',
    marginRight: 8,
  },
  socialBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },

  // Footer
  footer: {
    marginTop: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerText: {
    fontSize: 13.5,
    color: '#475569',
  },
  footerLink: {
    fontWeight: '800',
    color: '#000066',
    textDecorationLine: 'underline',
  },
});
