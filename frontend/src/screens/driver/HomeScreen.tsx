import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StatusBar,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DriverColors } from '../../constants/colors';
import {
  SAMPLE_NEARBY_PARKING_LOTS,
  DRIVER_FILTER_CHIPS,
  ParkingLotCardItem,
  DriverFilterChip,
} from '../../constants/driverSampleData';
import DriverBottomNav, { DriverTabType } from '../../components/DriverBottomNav';
import ParkingLotCard from '../../components/ParkingLotCard';
import DriverNotificationsModal from '../../components/DriverNotificationsModal';

interface HomeScreenProps {
  userName?: string;
  onNavigateToMap?: () => void;
  onNavigateToLotDetails?: (lotId: string) => void;
  onNavigateToBookings?: () => void;
  onNavigateToProfile?: () => void;
  onNavigateToNotifications?: () => void;
  onOpenFilter?: () => void;
  onSeeAllPress?: (query?: string, chip?: DriverFilterChip) => void;
  onSearchSubmit?: (query: string, chip?: DriverFilterChip) => void;
  onBottomTabPress?: (tab: DriverTabType) => void;
  onOpenNearbyFiveMin?: () => void;
}

/**
 * Driver Parking Finder / Home Screen
 * 
 * Matches Milestone 02 design specification (ParkMe-04-Home).
 * Implements greeting, search bar, filter chips, static map preview with
 * price indicators, nearby parking cards list, and driver bottom navigation.
 */
export default function HomeScreen({
  userName = 'Kasun',
  onNavigateToMap,
  onNavigateToLotDetails,
  onNavigateToBookings,
  onNavigateToProfile,
  onNavigateToNotifications,
  onOpenFilter,
  onSeeAllPress,
  onSearchSubmit,
  onBottomTabPress,
  onOpenNearbyFiveMin,
}: HomeScreenProps) {
  const insets = useSafeAreaInsets();
  const topPadding = Math.max(
    insets.top,
    Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) : 0
  );

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChip, setSelectedChip] = useState<DriverFilterChip>('Nearest');
  const [parkingLots] = useState<ParkingLotCardItem[]>(SAMPLE_NEARBY_PARKING_LOTS);
  const [notificationsVisible, setNotificationsVisible] = useState(false);

  // Handle bottom navigation tab switching
  const handleTabPress = (tab: DriverTabType) => {
    if (tab === 'map' && onNavigateToMap) {
      onNavigateToMap();
    } else if (tab === 'bookings' && onNavigateToBookings) {
      onNavigateToBookings();
    } else if (tab === 'profile' && onNavigateToProfile) {
      onNavigateToProfile();
    } else if (onBottomTabPress) {
      onBottomTabPress(tab);
    }
  };

  return (
    <View style={[styles.safeArea, { paddingTop: topPadding }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Main Scrollable Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* 1. Header: Greeting & Notifications */}
        <View style={styles.headerRow}>
          <View style={styles.greetingContainer}>
            <View style={styles.greetingTitleRow}>
              <Text style={styles.greetingTitle}>Hi, {userName}</Text>
              <Text style={styles.waveEmoji}>👋</Text>
            </View>
            <Text style={styles.greetingSubtitle}>Find available parking in Sri Lanka</Text>
          </View>

          {/* Notification Bell Button */}
          <TouchableOpacity
            style={styles.notificationBtn}
            activeOpacity={0.7}
            onPress={() => {
              if (onNavigateToNotifications) {
                onNavigateToNotifications();
              }
              setNotificationsVisible(true);
            }}
            accessibilityLabel="Notifications"
          >
            <NotificationBellIcon />
            {/* Red unread indicator dot */}
            <View style={styles.unreadBadgeDot} />
          </TouchableOpacity>
        </View>

        {/* 2. Search Bar Card */}
        <View style={styles.searchCard}>
          <View style={styles.searchIconContainer}>
            <Text style={styles.searchIconText}>🔍</Text>
          </View>

          <View style={styles.searchInputWrapper}>
            <Text style={styles.searchPromptTitle}>Where do you want to park?</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Search by landmark, destination, or street"
              placeholderTextColor={DriverColors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
              autoCorrect={false}
              onSubmitEditing={() => {
                if (onSearchSubmit) {
                  onSearchSubmit(searchQuery, selectedChip);
                } else if (onNavigateToMap) {
                  onNavigateToMap();
                }
              }}
            />
          </View>

          {/* Filter Trigger Button */}
          <TouchableOpacity
            style={styles.filterBtn}
            activeOpacity={0.7}
            onPress={() => {
              if (onSearchSubmit) {
                onSearchSubmit(searchQuery, selectedChip);
              } else if (onOpenFilter) {
                onOpenFilter();
              }
            }}
            accessibilityLabel="Filter search results"
          >
            <FilterSlidersIcon />
          </TouchableOpacity>
        </View>

        {/* 3. Category Filter Chips (Horizontally Scrollable) */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsScrollContainer}
          style={styles.chipsScrollView}
        >
          {DRIVER_FILTER_CHIPS.map((chip) => {
            const isSelected = selectedChip === chip;
            return (
              <TouchableOpacity
                key={chip}
                style={[
                  styles.chipItem,
                  isSelected ? styles.chipItemSelected : styles.chipItemUnselected,
                ]}
                activeOpacity={0.7}
                onPress={() => setSelectedChip(chip)}
              >
                <Text
                  style={[
                    styles.chipText,
                    isSelected ? styles.chipTextSelected : styles.chipTextUnselected,
                  ]}
                >
                  {chip}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* 3b. Prominent "Find Fastest Available Parking" Feature Button */}
        <TouchableOpacity
          style={styles.nearbyFiveMinBtn}
          activeOpacity={0.88}
          onPress={() => {
            if (onOpenNearbyFiveMin) {
              onOpenNearbyFiveMin();
            } else if (onNavigateToMap) {
              onNavigateToMap();
            }
          }}
          accessibilityRole="button"
          accessibilityLabel="Find Fastest Available Parking"
        >
          <View style={styles.nearbyFiveMinGlowIcon}>
            <Text style={styles.nearbyFiveMinIconText}>⚡</Text>
          </View>
          <View style={styles.nearbyFiveMinBody}>
            <View style={styles.nearbyFiveMinTitleRow}>
              <Text style={styles.nearbyFiveMinTitle}>Find Fastest Available Parking</Text>
              <View style={styles.nearbyFiveMinLiveBadge}>
                <Text style={styles.nearbyFiveMinLiveBadgeText}>LIVE GPS</Text>
              </View>
            </View>
            <Text style={styles.nearbyFiveMinSubtitle}>
              Reachable spots ranked by live travel time & availability
            </Text>
          </View>
          <View style={styles.nearbyFiveMinChevron}>
            <Text style={styles.nearbyFiveMinChevronText}>›</Text>
          </View>
        </TouchableOpacity>

        {/* 4. GPS Spatial Radar Preview Card */}
        <View style={styles.mapPreviewCard}>
          <View style={styles.mapBackgroundLayer}>
            {/* Compass / Directional North Indicator */}
            <View style={styles.compassContainer}>
              <Text style={styles.compassLabel}>🧭 N</Text>
            </View>

            {/* Radar / Distance rings */}
            <View style={styles.radarRingOuter} />
            <View style={styles.radarRingInner} />
            <View style={styles.radarCrosshairH} />
            <View style={styles.radarCrosshairV} />

            {/* Current User Location Blue Indicator with Pulse Aura */}
            <View style={styles.userLocationPulseWrapper}>
              <View style={styles.userLocationAura} />
              <View style={styles.userLocationDot} />
            </View>

            {/* Real Nearby Lot Price Markers */}
            {parkingLots.slice(0, 3).map((lot, idx) => {
              const offsets = [
                { topPercent: 22, leftPercent: 18 },
                { topPercent: 32, leftPercent: 54 },
                { topPercent: 58, leftPercent: 68 },
              ];
              const pos = offsets[idx] || { topPercent: 40, leftPercent: 40 };
              return (
                <View
                  key={lot.id}
                  style={[
                    styles.mapPricePill,
                    {
                      top: `${pos.topPercent}%`,
                      left: `${pos.leftPercent}%`,
                    },
                  ]}
                >
                  <View style={styles.mapPriceDot} />
                  <Text style={styles.mapPriceText}>Rs.{lot.pricePerHour}</Text>
                </View>
              );
            })}
          </View>

          {/* "View Interactive Map" Action Button */}
          <TouchableOpacity
            style={styles.viewFullMapBtn}
            activeOpacity={0.85}
            onPress={onNavigateToMap}
          >
            <Text style={styles.compassEmoji}>📍</Text>
            <Text style={styles.viewFullMapText}>Open Interactive Map</Text>
            <Text style={styles.chevronRightText}>›</Text>
          </TouchableOpacity>
        </View>

        {/* 5. "Nearby Parking" Section Header */}
        <View style={styles.sectionHeaderRow}>
          <View>
            <Text style={styles.sectionTitle}>Nearby Parking</Text>
            <Text style={styles.sectionSubtitle}>Real-time available spaces</Text>
          </View>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
              if (onSeeAllPress) {
                onSeeAllPress(searchQuery, selectedChip);
              } else if (onNavigateToMap) {
                onNavigateToMap();
              }
            }}
          >
            <Text style={styles.seeAllText}>See All ({parkingLots.length})</Text>
          </TouchableOpacity>
        </View>

        {/* 6. Parking Cards List */}
        <View style={styles.cardsListContainer}>
          {parkingLots.map((lot) => (
            <ParkingLotCard
              key={lot.id}
              lot={lot}
              onPress={(lotId) => onNavigateToLotDetails && onNavigateToLotDetails(lotId)}
            />
          ))}
        </View>
      </ScrollView>

      {/* 7. Driver Bottom Navigation */}
      <DriverBottomNav activeTab="home" onTabPress={handleTabPress} />

      {/* 8. Driver Notifications Modal */}
      <DriverNotificationsModal
        visible={notificationsVisible}
        onClose={() => setNotificationsVisible(false)}
      />
    </View>
  );
}

// Outlined Notification Bell Icon
function NotificationBellIcon() {
  return (
    <View style={iconStyles.bellContainer}>
      <View style={iconStyles.bellDome} />
      <View style={iconStyles.bellRim} />
      <View style={iconStyles.bellClapper} />
    </View>
  );
}

// Filter Sliders Icon (Tune / Settings)
function FilterSlidersIcon() {
  return (
    <View style={iconStyles.slidersContainer}>
      <View style={iconStyles.sliderTrack}>
        <View style={[iconStyles.sliderKnob, { left: 4 }]} />
      </View>
      <View style={iconStyles.sliderTrack}>
        <View style={[iconStyles.sliderKnob, { right: 4 }]} />
      </View>
      <View style={iconStyles.sliderTrack}>
        <View style={[iconStyles.sliderKnob, { left: 8 }]} />
      </View>
    </View>
  );
}

const iconStyles = StyleSheet.create({
  // Bell Icon
  bellContainer: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellDome: {
    width: 14,
    height: 12,
    borderTopLeftRadius: 7,
    borderTopRightRadius: 7,
    borderWidth: 1.8,
    borderBottomWidth: 0,
    borderColor: DriverColors.navyHeading,
  },
  bellRim: {
    width: 18,
    height: 2,
    backgroundColor: DriverColors.navyHeading,
    borderRadius: 1,
  },
  bellClapper: {
    width: 4,
    height: 3,
    backgroundColor: DriverColors.navyHeading,
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 2,
    marginTop: 1,
  },

  // Sliders Icon
  slidersContainer: {
    width: 18,
    height: 16,
    justifyContent: 'space-between',
  },
  sliderTrack: {
    height: 2,
    backgroundColor: '#64748B',
    borderRadius: 1,
    position: 'relative',
    justifyContent: 'center',
  },
  sliderKnob: {
    position: 'absolute',
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
});

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
    backgroundColor: DriverColors.background,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
  },

  // Header Row
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  greetingContainer: {
    flex: 1,
  },
  greetingTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  greetingTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: DriverColors.navyHeading,
    letterSpacing: -0.3,
  },
  waveEmoji: {
    fontSize: 20,
    marginLeft: 6,
  },
  greetingSubtitle: {
    fontSize: 13.5,
    color: DriverColors.textSecondary,
    marginTop: 2,
    fontWeight: '400',
  },
  notificationBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: DriverColors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: DriverColors.borderLight,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  unreadBadgeDot: {
    position: 'absolute',
    top: 9,
    right: 10,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: DriverColors.orangePrimary,
  },

  // Search Card
  searchCard: {
    backgroundColor: DriverColors.surface,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: DriverColors.cardBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    marginBottom: 14,
  },
  searchIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: DriverColors.searchIconBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchIconText: {
    fontSize: 18,
  },
  searchInputWrapper: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  searchPromptTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: DriverColors.textBody,
    marginBottom: 2,
  },
  searchInput: {
    fontSize: 12.5,
    color: DriverColors.textBody,
    padding: 0,
    margin: 0,
  },
  filterBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: DriverColors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Category Filter Chips
  chipsScrollView: {
    marginBottom: 14,
  },
  chipsScrollContainer: {
    paddingRight: 10,
  },
  chipItem: {
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 22,
    marginRight: 10,
    borderWidth: 1,
  },
  chipItemSelected: {
    backgroundColor: DriverColors.navyDark,
    borderColor: DriverColors.navyDark,
  },
  chipItemUnselected: {
    backgroundColor: DriverColors.surface,
    borderColor: DriverColors.cardBorder,
  },
  chipText: {
    fontSize: 13.5,
  },
  chipTextSelected: {
    color: DriverColors.textWhite,
    fontWeight: '700',
  },
  chipTextUnselected: {
    color: DriverColors.textBody,
    fontWeight: '600',
  },

  // Static Map Preview Card
  mapPreviewCard: {
    height: 155,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: DriverColors.mapBg,
    borderWidth: 1,
    borderColor: '#D0DFEE',
    position: 'relative',
    marginBottom: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  mapBackgroundLayer: {
    ...StyleSheet.absoluteFill,
  },
  compassContainer: {
    position: 'absolute',
    top: 10,
    right: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    zIndex: 5,
  },
  compassLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: DriverColors.navyHeading,
  },
  radarRingOuter: {
    position: 'absolute',
    top: 15,
    left: 45,
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 1,
    borderColor: 'rgba(30, 58, 138, 0.15)',
    borderStyle: 'dashed',
  },
  radarRingInner: {
    position: 'absolute',
    top: 45,
    left: 75,
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 1,
    borderColor: 'rgba(30, 58, 138, 0.22)',
  },
  radarCrosshairH: {
    position: 'absolute',
    top: 85,
    left: 20,
    right: 20,
    height: 1,
    backgroundColor: 'rgba(30, 58, 138, 0.1)',
  },
  radarCrosshairV: {
    position: 'absolute',
    top: 10,
    bottom: 10,
    left: 115,
    width: 1,
    backgroundColor: 'rgba(30, 58, 138, 0.1)',
  },
  // User Location Dot
  userLocationPulseWrapper: {
    position: 'absolute',
    top: 65,
    left: 105,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userLocationAura: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: DriverColors.mapPulseAura,
  },
  userLocationDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: DriverColors.mapPulseBlue,
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
  },
  // Price Pills on Map
  mapPricePill: {
    position: 'absolute',
    backgroundColor: DriverColors.mapMarkerBg,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4.5,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 4,
  },
  mapPriceDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: DriverColors.mapMarkerDot,
    marginRight: 4,
  },
  mapPriceText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  // View Full Map Floating Button
  viewFullMapBtn: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: DriverColors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  compassEmoji: {
    fontSize: 13,
    marginRight: 4,
  },
  viewFullMapText: {
    fontSize: 12,
    fontWeight: '700',
    color: DriverColors.navyHeading,
    marginRight: 2,
  },
  chevronRightText: {
    fontSize: 16,
    fontWeight: '700',
    color: DriverColors.textSecondary,
    lineHeight: 16,
  },

  // Section Header Row
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: DriverColors.navyHeading,
    letterSpacing: -0.2,
  },
  sectionSubtitle: {
    fontSize: 12.5,
    color: DriverColors.textSecondary,
    marginTop: 2,
  },
  seeAllText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: DriverColors.navyDark,
  },

  // Cards List
  cardsListContainer: {
    gap: 12,
  },

  // 3b. Nearby 5-Min Feature Button
  nearbyFiveMinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginVertical: 14,
    borderWidth: 1.5,
    borderColor: '#3B82F6',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 6,
  },
  nearbyFiveMinGlowIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#38BDF8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  nearbyFiveMinIconText: {
    fontSize: 20,
  },
  nearbyFiveMinBody: {
    flex: 1,
  },
  nearbyFiveMinTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 3,
  },
  nearbyFiveMinTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  nearbyFiveMinLiveBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  nearbyFiveMinLiveBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  nearbyFiveMinSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
  },
  nearbyFiveMinChevron: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  nearbyFiveMinChevronText: {
    color: '#38BDF8',
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 20,
  },
});

