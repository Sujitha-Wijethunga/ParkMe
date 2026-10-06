import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DriverColors } from '../constants/colors';

export type DriverTabType = 'home' | 'map' | 'bookings' | 'profile';

interface DriverBottomNavProps {
  activeTab: DriverTabType;
  onTabPress?: (tab: DriverTabType) => void;
}

/**
 * Reusable Driver Bottom Navigation Component
 * References the ParkMe-04-Home design prototype:
 * 4 tabs: Home, Map, Bookings, Profile.
 */
export default function DriverBottomNav({
  activeTab = 'home',
  onTabPress,
}: DriverBottomNavProps) {
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, Platform.OS === 'ios' ? 12 : 8) + (insets.bottom > 0 ? 4 : 2);

  const handlePress = (tab: DriverTabType) => {
    if (onTabPress) {
      onTabPress(tab);
    }
  };

  return (
    <View style={[styles.container, { paddingBottom: bottomPadding }]}>
      {/* 1. Home Tab */}
      <TouchableOpacity
        style={styles.navItem}
        activeOpacity={0.7}
        onPress={() => handlePress('home')}
      >
        <View style={styles.iconWrapper}>
          <HomeNavIcon active={activeTab === 'home'} />
        </View>
        <Text
          style={[
            styles.navLabel,
            activeTab === 'home' ? styles.navLabelActive : styles.navLabelInactive,
          ]}
        >
          Home
        </Text>
      </TouchableOpacity>

      {/* 2. Map Tab */}
      <TouchableOpacity
        style={styles.navItem}
        activeOpacity={0.7}
        onPress={() => handlePress('map')}
      >
        <View style={styles.iconWrapper}>
          <MapNavIcon active={activeTab === 'map'} />
        </View>
        <Text
          style={[
            styles.navLabel,
            activeTab === 'map' ? styles.navLabelActive : styles.navLabelInactive,
          ]}
        >
          Map
        </Text>
      </TouchableOpacity>

      {/* 3. Bookings Tab */}
      <TouchableOpacity
        style={styles.navItem}
        activeOpacity={0.7}
        onPress={() => handlePress('bookings')}
      >
        <View style={styles.iconWrapper}>
          <BookingsNavIcon active={activeTab === 'bookings'} />
        </View>
        <Text
          style={[
            styles.navLabel,
            activeTab === 'bookings' ? styles.navLabelActive : styles.navLabelInactive,
          ]}
        >
          Bookings
        </Text>
      </TouchableOpacity>

      {/* 4. Profile Tab */}
      <TouchableOpacity
        style={styles.navItem}
        activeOpacity={0.7}
        onPress={() => handlePress('profile')}
      >
        <View style={styles.iconWrapper}>
          <ProfileNavIcon active={activeTab === 'profile'} />
        </View>
        <Text
          style={[
            styles.navLabel,
            activeTab === 'profile' ? styles.navLabelActive : styles.navLabelInactive,
          ]}
        >
          Profile
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// Custom styled vector icons matching the Home prototype
function HomeNavIcon({ active }: { active: boolean }) {
  const color = active ? DriverColors.orangePrimary : DriverColors.textSecondary;
  return (
    <View style={iconStyles.homeContainer}>
      {/* Roof triangle / slant */}
      <View
        style={[
          iconStyles.homeRoof,
          { borderBottomColor: color },
        ]}
      />
      {/* Base box */}
      <View
        style={[
          iconStyles.homeBase,
          { borderColor: color },
        ]}
      >
        <View style={[iconStyles.homeDoor, { borderColor: color }]} />
      </View>
    </View>
  );
}

function MapNavIcon({ active }: { active: boolean }) {
  const color = active ? DriverColors.orangePrimary : DriverColors.textSecondary;
  return (
    <View style={iconStyles.mapContainer}>
      <View style={[iconStyles.mapPanel, { borderColor: color, transform: [{ skewY: '-8deg' }] }]} />
      <View style={[iconStyles.mapPanel, { borderColor: color, transform: [{ skewY: '8deg' }] }]} />
      <View style={[iconStyles.mapPanel, { borderColor: color, transform: [{ skewY: '-8deg' }] }]} />
    </View>
  );
}

function BookingsNavIcon({ active }: { active: boolean }) {
  const color = active ? DriverColors.orangePrimary : DriverColors.textSecondary;
  return (
    <View style={[iconStyles.calendarContainer, { borderColor: color }]}>
      {/* Top hanger rings */}
      <View style={[iconStyles.calRing, { left: 4, backgroundColor: color }]} />
      <View style={[iconStyles.calRing, { right: 4, backgroundColor: color }]} />
      {/* Calendar header bar */}
      <View style={[iconStyles.calHeaderBar, { backgroundColor: color }]} />
      {/* Calendar date grid indicator */}
      <View style={iconStyles.calDotsRow}>
        <View style={[iconStyles.calDot, { backgroundColor: color }]} />
        <View style={[iconStyles.calDot, { backgroundColor: color }]} />
      </View>
    </View>
  );
}

function ProfileNavIcon({ active }: { active: boolean }) {
  const color = active ? DriverColors.orangePrimary : DriverColors.textSecondary;
  return (
    <View style={iconStyles.profileContainer}>
      {/* Head circle */}
      <View style={[iconStyles.profileHead, { borderColor: color }]} />
      {/* Shoulder arc */}
      <View style={[iconStyles.profileShoulders, { borderColor: color }]} />
    </View>
  );
}

const iconStyles = StyleSheet.create({
  // Home icon
  homeContainer: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  homeRoof: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderBottomWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  homeBase: {
    width: 17,
    height: 12,
    borderWidth: 2,
    borderTopWidth: 0,
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  homeDoor: {
    width: 6,
    height: 6,
    borderWidth: 1.5,
    borderBottomWidth: 0,
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
  },

  // Map icon
  mapContainer: {
    width: 22,
    height: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mapPanel: {
    width: 6,
    height: 17,
    borderWidth: 1.8,
    borderRadius: 1.5,
  },

  // Calendar icon
  calendarContainer: {
    width: 20,
    height: 19,
    borderWidth: 2,
    borderRadius: 4,
    position: 'relative',
    marginTop: 2,
  },
  calRing: {
    position: 'absolute',
    top: -4,
    width: 2,
    height: 4,
    borderRadius: 1,
  },
  calHeaderBar: {
    width: '100%',
    height: 3,
    marginTop: 2,
  },
  calDotsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 3,
    paddingHorizontal: 2,
  },
  calDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
  },

  // Profile icon
  profileContainer: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileHead: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
  },
  profileShoulders: {
    width: 18,
    height: 9,
    borderTopLeftRadius: 9,
    borderTopRightRadius: 9,
    borderWidth: 2,
    borderBottomWidth: 0,
    marginTop: 1,
  },
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: DriverColors.surface,
    borderTopWidth: 1,
    borderTopColor: DriverColors.borderLight,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 24 : 10,
    paddingHorizontal: 12,
    justifyContent: 'space-around',
    alignItems: 'center',
    // Elevation / shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 8,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingVertical: 4,
  },
  iconWrapper: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  navLabel: {
    fontSize: 11,
    letterSpacing: 0.2,
  },
  navLabelActive: {
    color: DriverColors.orangePrimary,
    fontWeight: '700',
  },
  navLabelInactive: {
    color: DriverColors.textSecondary,
    fontWeight: '500',
  },
});
