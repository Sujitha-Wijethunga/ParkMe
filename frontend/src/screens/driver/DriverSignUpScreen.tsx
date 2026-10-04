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
import { registerDriver, authWithGoogle } from '../../services/authApi';
import { saveDriverToken, saveDriverUser, saveDriverSession, DriverUser } from '../../services/storage';
import { promptNativeGoogleSignIn } from '../../services/googleAuthService';

export interface DriverSignUpScreenProps {
  onBack: () => void;
  onNavigateToLogin: () => void;
  onNavigateToStaffLogin: () => void;
  onSignUpSuccess: (user: DriverUser, token: string) => void;
}

export default function DriverSignUpScreen({
  onBack,
  onNavigateToLogin,
  onNavigateToStaffLogin,
  onSignUpSuccess,
}: DriverSignUpScreenProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // Focus states
  const [nameFocused, setNameFocused] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [phoneFocused, setPhoneFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [confirmFocused, setConfirmFocused] = useState(false);

  // Field validation and error feedback
  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmError, setConfirmError] = useState('');
  const [generalError, setGeneralError] = useState('');

  // Refs for auto-advancing focus
  const emailInputRef = useRef<TextInput>(null);
  const phoneInputRef = useRef<TextInput>(null);
  const passwordInputRef = useRef<TextInput>(null);
  const confirmInputRef = useRef<TextInput>(null);

  const validate = (): boolean => {
    let isValid = true;
    setNameError('');
    setEmailError('');
    setPhoneError('');
    setPasswordError('');
    setConfirmError('');
    setGeneralError('');

    if (!name.trim()) {
      setNameError('Full name is required');
      isValid = false;
    }

    const trimmedEmail = email.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!trimmedEmail) {
      setEmailError('Email address is required');
      isValid = false;
    } else if (!emailRegex.test(trimmedEmail)) {
      setEmailError('Please enter a valid email address');
      isValid = false;
    }

    if (!phone.trim()) {
      setPhoneError('Phone number is required');
      isValid = false;
    }

    if (!password) {
      setPasswordError('Password is required');
      isValid = false;
    } else if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      isValid = false;
    }

    if (!confirmPassword) {
      setConfirmError('Please confirm your password');
      isValid = false;
    } else if (password !== confirmPassword) {
      setConfirmError('Passwords do not match');
      isValid = false;
    }

    return isValid;
  };

  const handleSignUp = async () => {
    if (isLoading) return;
    if (!validate()) return;

    setIsLoading(true);
    setGeneralError('');

    try {
      // confirmPassword is validated locally only and omitted from the network payload
      const result = await registerDriver({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        password,
      });

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

      onSignUpSuccess(driverProfile, result.token);
    } catch (err: any) {
      const msg = err.message || 'Registration failed. Please review your details.';
      setGeneralError(msg);
      if (err.errors && Array.isArray(err.errors)) {
        for (const e of err.errors) {
          if (e.field === 'name') setNameError(e.message);
          if (e.field === 'email') setEmailError(e.message);
          if (e.field === 'phone') setPhoneError(e.message);
          if (e.field === 'password') setPasswordError(e.message);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
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
      onSignUpSuccess(driverUser, response.token);
    } catch (err: any) {
      if (err?.code === 'ACCOUNT_COLLISION' || err?.status === 409) {
        Alert.alert(
          'Account Exists',
          err.message || 'An account with this email already exists using password login. Please sign in with your email and password.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Go to Login',
              style: 'default',
              onPress: onNavigateToLogin,
            },
          ]
        );
      } else {
        Alert.alert(
          'Google Sign-Up Error',
          err?.message || 'Unable to complete Google registration. Please try again or use email and password.'
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
          <Text style={styles.heading}>Welcome</Text>
          <Text style={styles.subheading}>Create Your Account</Text>

          {/* Segmented Tab Switcher (Sign Up active) */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={styles.inactiveTab}
              onPress={onNavigateToLogin}
              activeOpacity={0.7}
              accessibilityRole="tab"
              accessibilityLabel="Switch to Log In"
            >
              <Text style={styles.inactiveTabText}>Log In</Text>
            </TouchableOpacity>
            <View style={styles.activeTab}>
              <Text style={styles.activeTabText}>Sign Up</Text>
            </View>
          </View>

          {/* Server / General Error Alert Banner */}
          {generalError ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{generalError}</Text>
            </View>
          ) : null}

          {/* Form Fields */}
          <View style={styles.form}>
            {/* Full Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                Name <Text style={styles.requiredStar}>*</Text>
              </Text>
              <View
                style={[
                  styles.inputContainer,
                  nameFocused && styles.inputFocused,
                  Boolean(nameError) && styles.inputErrorBorder,
                ]}
              >
                <TextInput
                  style={styles.textInput}
                  placeholder="Saman Kumara"
                  placeholderTextColor="#94A3B8"
                  value={name}
                  onChangeText={(text) => {
                    setName(text);
                    if (nameError) setNameError('');
                  }}
                  autoCapitalize="words"
                  autoCorrect={false}
                  returnKeyType="next"
                  onFocus={() => setNameFocused(true)}
                  onBlur={() => setNameFocused(false)}
                  onSubmitEditing={() => emailInputRef.current?.focus()}
                  editable={!isLoading}
                  accessibilityLabel="Full Name"
                />
              </View>
              {nameError ? <Text style={styles.inlineError}>{nameError}</Text> : null}
            </View>

            {/* Email */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                Email <Text style={styles.requiredStar}>*</Text>
              </Text>
              <View
                style={[
                  styles.inputContainer,
                  emailFocused && styles.inputFocused,
                  Boolean(emailError) && styles.inputErrorBorder,
                ]}
              >
                <Text style={styles.inputLeadingIcon}>✉</Text>
                <TextInput
                  ref={emailInputRef}
                  style={styles.textInput}
                  placeholder="driver@parkme.city"
                  placeholderTextColor="#94A3B8"
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    if (emailError) setEmailError('');
                  }}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  returnKeyType="next"
                  onFocus={() => setEmailFocused(true)}
                  onBlur={() => setEmailFocused(false)}
                  onSubmitEditing={() => phoneInputRef.current?.focus()}
                  editable={!isLoading}
                  accessibilityLabel="Email Address"
                />
              </View>
              {emailError ? <Text style={styles.inlineError}>{emailError}</Text> : null}
            </View>

            {/* Phone Number */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                Phone Number <Text style={styles.requiredStar}>*</Text>
              </Text>
              <View
                style={[
                  styles.inputContainer,
                  phoneFocused && styles.inputFocused,
                  Boolean(phoneError) && styles.inputErrorBorder,
                ]}
              >
                <TextInput
                  ref={phoneInputRef}
                  style={styles.textInput}
                  placeholder="07x- xxxxxxx"
                  placeholderTextColor="#94A3B8"
                  value={phone}
                  onChangeText={(text) => {
                    setPhone(text);
                    if (phoneError) setPhoneError('');
                  }}
                  keyboardType="phone-pad"
                  returnKeyType="next"
                  onFocus={() => setPhoneFocused(true)}
                  onBlur={() => setPhoneFocused(false)}
                  onSubmitEditing={() => passwordInputRef.current?.focus()}
                  editable={!isLoading}
                  accessibilityLabel="Phone Number"
                />
              </View>
              {phoneError ? <Text style={styles.inlineError}>{phoneError}</Text> : null}
            </View>

            {/* Password */}
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
                  returnKeyType="next"
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                  onSubmitEditing={() => confirmInputRef.current?.focus()}
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
              {passwordError ? <Text style={styles.inlineError}>{passwordError}</Text> : null}
            </View>

            {/* Confirm Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                Confirm Password <Text style={styles.requiredStar}>*</Text>
              </Text>
              <View
                style={[
                  styles.inputContainer,
                  confirmFocused && styles.inputFocused,
                  Boolean(confirmError) && styles.inputErrorBorder,
                ]}
              >
                <Text style={styles.inputLeadingIcon}>🔒</Text>
                <TextInput
                  ref={confirmInputRef}
                  style={styles.textInput}
                  placeholder="••••••••••••"
                  placeholderTextColor="#94A3B8"
                  value={confirmPassword}
                  onChangeText={(text) => {
                    setConfirmPassword(text);
                    if (confirmError) setConfirmError('');
                  }}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="done"
                  onFocus={() => setConfirmFocused(true)}
                  onBlur={() => setConfirmFocused(false)}
                  onSubmitEditing={handleSignUp}
                  editable={!isLoading}
                  accessibilityLabel="Confirm Password"
                />
                <TouchableOpacity
                  style={styles.eyeBtn}
                  onPress={() => setShowConfirmPassword((prev) => !prev)}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  <Text style={styles.eyeIcon}>{showConfirmPassword ? '👁' : '👁‍🗨'}</Text>
                </TouchableOpacity>
              </View>
              {confirmError ? <Text style={styles.inlineError}>{confirmError}</Text> : null}
            </View>

            {/* Primary Submit Button */}
            <TouchableOpacity
              style={[styles.submitBtn, isLoading && styles.submitBtnDisabled]}
              onPress={handleSignUp}
              activeOpacity={0.85}
              disabled={isLoading}
              accessibilityRole="button"
              accessibilityLabel="Sign Up"
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Text style={styles.submitBtnText}>Sign UP</Text>
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
                onPress={handleGoogleSignUp}
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
    marginBottom: 13,
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

  // Submit CTA Button
  submitBtn: {
    backgroundColor: '#FF6B35',
    height: 52,
    borderRadius: 26,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
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
    marginVertical: 20,
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
    opacity: 0.65,
  },
  socialGoogleG: {
    fontSize: 17,
    fontWeight: '700',
    color: '#EA4335',
    marginRight: 8,
  },
  socialAppleIcon: {
    fontSize: 18,
    color: '#000000',
    marginRight: 6,
    lineHeight: 20,
  },
  socialBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },

  // Footer
  footer: {
    marginTop: 22,
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
