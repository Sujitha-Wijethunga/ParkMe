import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Platform,
  Image,
  Dimensions,
} from 'react-native';

export interface WelcomeScreenProps {
  /** Callback triggered when user taps 'Get Started' */
  onGetStarted?: () => void;
  /** Callback triggered when user taps 'I already have an account' */
  onAlreadyHaveAccount?: () => void;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

/**
 * Driver Welcome Screen
 *
 * Matches the ParkMe-01-Splash interactive prototype specification:
 * - Deep navy full-screen background (#000066)
 * - Centered ParkMe car/parking squircle logo
 * - Bold white "ParkMe" wordmark
 * - Muted light-purple "Arrive. Park. Go." tagline
 * - Large rounded orange "Get Started" CTA button with right arrow (#FF6B35)
 * - "I already have an account" navigation link
 * - 3 pagination dots with the middle dot in brand orange
 */
export default function WelcomeScreen({
  onGetStarted,
  onAlreadyHaveAccount,
}: WelcomeScreenProps) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#000066" />
      <View style={styles.container}>
        {/* Centered Brand / Logo Section */}
        <View style={styles.centerSection}>
          <View style={styles.logoWrapper}>
            <Image
              source={require('../../../assets/android-icon-foreground.png')}
              style={styles.logoImage}
              resizeMode="contain"
              accessibilityLabel="ParkMe Brand Logo"
            />
          </View>
          <Text style={styles.brandTitle}>ParkMe</Text>
          <Text style={styles.tagline}>Arrive. Park. Go.</Text>
        </View>

        {/* Bottom Actions Section */}
        <View style={styles.bottomSection}>
          {/* Get Started CTA Button */}
          <TouchableOpacity
            style={styles.getStartedButton}
            activeOpacity={0.85}
            onPress={onGetStarted}
            accessibilityRole="button"
            accessibilityLabel="Get Started"
          >
            <Text style={styles.getStartedText}>Get Started</Text>
            <Text style={styles.arrowIcon}>→</Text>
          </TouchableOpacity>

          {/* Already have an account link */}
          <TouchableOpacity
            style={styles.loginLink}
            activeOpacity={0.7}
            onPress={onAlreadyHaveAccount}
            accessibilityRole="button"
            accessibilityLabel="I already have an account"
          >
            <Text style={styles.loginLinkText}>I already have an account</Text>
          </TouchableOpacity>

          {/* Three Pagination Indicator Dots (Middle dot active/orange) */}
          <View style={styles.dotsContainer} accessibilityLabel="Page indicators">
            <View style={styles.dotInactive} />
            <View style={styles.dotActive} />
            <View style={styles.dotInactive} />
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#000066',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  container: {
    flex: 1,
    backgroundColor: '#000066',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
  },

  // Centered Brand Content
  centerSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: SCREEN_HEIGHT < 700 ? 10 : 30,
  },
  logoWrapper: {
    width: SCREEN_WIDTH < 380 ? 140 : 160,
    height: SCREEN_WIDTH < 380 ? 140 : 160,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  brandTitle: {
    fontSize: SCREEN_WIDTH < 380 ? 32 : 36,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
    marginTop: 4,
    textAlign: 'center',
  },
  tagline: {
    fontSize: SCREEN_WIDTH < 380 ? 15 : 16,
    fontWeight: '400',
    color: '#B2B2D1',
    letterSpacing: 0.3,
    marginTop: 8,
    textAlign: 'center',
  },

  // Bottom Actions Area
  bottomSection: {
    paddingBottom: Platform.OS === 'ios' ? 24 : 32,
    alignItems: 'center',
    width: '100%',
  },
  getStartedButton: {
    backgroundColor: '#FF6B35',
    width: '100%',
    height: 56,
    borderRadius: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  getStartedText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  arrowIcon: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    marginLeft: 8,
    lineHeight: 22,
  },
  loginLink: {
    marginTop: 18,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  loginLinkText: {
    color: '#CCCCE0',
    fontSize: 14.5,
    fontWeight: '500',
    letterSpacing: 0.2,
    textAlign: 'center',
  },

  // Pagination Dots
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 26,
    gap: 8,
  },
  dotInactive: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#4C4C94',
  },
  dotActive: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#FF6B35',
  },
});
