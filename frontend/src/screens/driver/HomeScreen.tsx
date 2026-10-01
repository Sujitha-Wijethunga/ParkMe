import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Platform,
  Image,
  Dimensions,
} from 'react-native';
import { DriverColors } from '../../constants/colors';
import {
  SAMPLE_NEARBY_PARKING_LOTS,
  DRIVER_FILTER_CHIPS,
  STATIC_MAP_MARKERS,
  ParkingLotCardItem,
  DriverFilterChip,
} from '../../constants/driverSampleData';
import DriverBottomNav, { DriverTabType } from '../../components/DriverBottomNav';

interface HomeScreenProps {
  userName?: string;
  onNavigateToMap?: () => void;
  onNavigateToLotDetails?: (lotId: string) => void;
  onNavigateToBookings?: () => void;
  onNavigateToProfile?: () => void;
  onNavigateToNotifications?: () => void;
  onOpenFilter?: () => void;
  onSeeAllPress?: () => void;
  onBottomTabPress?: (tab: DriverTabType) => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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
  onBottomTabPress,
}: HomeScreenProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChip, setSelectedChip] = useState<DriverFilterChip>('Nearest');
  const [parkingLots] = useState<ParkingLotCardItem[]>(SAMPLE_NEARBY_PARKING_LOTS);

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
    <SafeAreaView style={styles.safeArea}>
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
            <Text style={styles.greetingSubtitle}>Find your spot in Colombo</Text>
          </View>

          {/* Notification Bell Button */}
          <TouchableOpacity
            style={styles.notificationBtn}
            activeOpacity={0.7}
            onPress={onNavigateToNotifications}
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
            />
          </View>

          {/* Filter Trigger Button */}
          <TouchableOpacity
            style={styles.filterBtn}
            activeOpacity={0.7}
            onPress={onOpenFilter}
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

        {/* 4. Static Map Graphic Preview (Documented Non-Functional Milestone Preview) */}
        <View style={styles.mapPreviewCard}>
          {/* Stylized vector map background representation */}
          <View style={styles.mapBackgroundLayer}>
            {/* Primary slanted avenue road */}
            <View style={styles.mapAvenueRoad} />
            {/* Secondary cross streets */}
            <View style={styles.mapCrossStreet1} />
            <View style={styles.mapCrossStreet2} />
            <View style={styles.mapCurvedRoad} />

            {/* Current User Location Blue Indicator with Pulse Aura */}
            <View style={styles.userLocationPulseWrapper}>
              <View style={styles.userLocationAura} />
              <View style={styles.userLocationDot} />
            </View>

            {/* Price Markers Placed on Map */}
            {STATIC_MAP_MARKERS.map((marker) => (
              <View
                key={marker.id}
                style={[
                  styles.mapPricePill,
                  {
                    top: `${marker.topPercent}%`,
                    left: `${marker.leftPercent}%`,
                  },
                ]}
              >
                <View style={styles.mapPriceDot} />
                <Text style={styles.mapPriceText}>{marker.price}</Text>
              </View>
            ))}
          </View>

          {/* "View Full Map" Action Button */}
          <TouchableOpacity
            style={styles.viewFullMapBtn}
            activeOpacity={0.85}
            onPress={onNavigateToMap}
          >
            <Text style={styles.compassEmoji}>🧭</Text>
            <Text style={styles.viewFullMapText}>View Full Map</Text>
            <Text style={styles.chevronRightText}>›</Text>
          </TouchableOpacity>
        </View>

        {/* 5. "Nearby Parking" Section Header */}
        <View style={styles.sectionHeaderRow}>
          <View>
            <Text style={styles.sectionTitle}>Nearby Parking</Text>
            <Text style={styles.sectionSubtitle}>Real-time available spaces in Colombo</Text>
          </View>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={onSeeAllPress || onNavigateToMap}
          >
            <Text style={styles.seeAllText}>See All (14)</Text>
          </TouchableOpacity>
        </View>

        {/* 6. Parking Cards List */}
        <View style={styles.cardsListContainer}>
          {parkingLots.map((lot) => (
            <TouchableOpacity
              key={lot.id}
              style={styles.parkingCard}
              activeOpacity={0.9}
              onPress={() => onNavigateToLotDetails && onNavigateToLotDetails(lot.id)}
            >
              <View style={styles.cardContentRow}>
                {/* Left Thumbnail Image with EV Badge */}
                <View style={styles.cardImageContainer}>
                  <Image
                    source={{ uri: lot.imageUrl }}
                    style={styles.cardImage}
                    resizeMode="cover"
                  />
                  {lot.hasEVCharging && (
                    <View style={styles.evBadge}>
                      <Text style={styles.evBadgeIcon}>⚡</Text>
                    </View>
                  )}
                </View>

                {/* Right Details Column */}
                <View style={styles.cardInfoColumn}>
                  {/* Status & Distance Row */}
                  <View style={styles.cardStatusRow}>
                    <View style={styles.availableBadge}>
                      <Text style={styles.checkIcon}>✓</Text>
                      <Text style={styles.availableBadgeText}>Available</Text>
                    </View>
                    <View style={styles.distanceContainer}>
                      <Text style={styles.distanceIcon}>📍</Text>
                      <Text style={styles.distanceText}>{lot.distance}</Text>
                    </View>
                  </View>

                  {/* Lot Name & Address */}
                  <Text style={styles.lotNameText} numberOfLines={1}>
                    {lot.name}
                  </Text>
                  <Text style={styles.lotAddressText} numberOfLines={1}>
                    {lot.address}
                  </Text>

                  {/* Bottom Stats: Capacity & Pricing */}
                  <View style={styles.cardBottomRow}>
                    <View style={styles.capacityRow}>
                      <Text style={styles.remainingSpacesText}>
                        <Text style={styles.remainingSpacesBold}>{lot.availableSpaces}</Text>
                        /{lot.totalSpaces} left
                      </Text>
                      {lot.isCovered && (
                        <View style={styles.coveredBadge}>
                          <Text style={styles.coveredBadgeText}>Covered</Text>
                        </View>
                      )}
                    </View>

                    {/* Hourly Rate */}
                    <Text style={styles.priceContainer}>
                      <Text style={styles.priceBold}>Rs. {lot.pricePerHour}</Text>
                      <Text style={styles.priceUnit}>/hr</Text>
                    </Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* 7. Driver Bottom Navigation */}
      <DriverBottomNav activeTab="home" onTabPress={handleTabPress} />
    </SafeAreaView>
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
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
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
  mapAvenueRoad: {
    position: 'absolute',
    top: 45,
    left: -20,
    width: SCREEN_WIDTH + 60,
    height: 22,
    backgroundColor: DriverColors.mapRoadMain,
    transform: [{ rotate: '-12deg' }],
  },
  mapCrossStreet1: {
    position: 'absolute',
    top: -10,
    left: 80,
    width: 16,
    height: 190,
    backgroundColor: DriverColors.mapRoad,
    transform: [{ rotate: '25deg' }],
  },
  mapCrossStreet2: {
    position: 'absolute',
    top: -10,
    right: 90,
    width: 18,
    height: 190,
    backgroundColor: DriverColors.mapRoad,
    transform: [{ rotate: '-35deg' }],
  },
  mapCurvedRoad: {
    position: 'absolute',
    bottom: -15,
    left: 30,
    width: SCREEN_WIDTH - 80,
    height: 20,
    backgroundColor: DriverColors.mapRoadMain,
    transform: [{ rotate: '5deg' }],
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
  parkingCard: {
    backgroundColor: DriverColors.surface,
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: DriverColors.cardBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 2,
    marginBottom: 4,
  },
  cardContentRow: {
    flexDirection: 'row',
  },
  cardImageContainer: {
    width: 96,
    height: 96,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#E2E8F0',
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  evBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: DriverColors.navyDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  evBadgeIcon: {
    fontSize: 11,
    color: '#FFFFFF',
  },
  cardInfoColumn: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'space-between',
  },
  cardStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  availableBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: DriverColors.greenBadgeBg,
    borderColor: DriverColors.greenBadgeBorder,
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 12,
  },
  checkIcon: {
    fontSize: 10,
    color: DriverColors.greenBadgeText,
    fontWeight: '800',
    marginRight: 3,
  },
  availableBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: DriverColors.greenBadgeText,
  },
  distanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  distanceIcon: {
    fontSize: 11,
    marginRight: 2,
  },
  distanceText: {
    fontSize: 12,
    fontWeight: '600',
    color: DriverColors.textSecondary,
  },
  lotNameText: {
    fontSize: 15,
    fontWeight: '800',
    color: DriverColors.navyHeading,
    marginTop: 3,
  },
  lotAddressText: {
    fontSize: 12,
    color: DriverColors.textSecondary,
    marginTop: 1,
  },
  cardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  capacityRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  remainingSpacesText: {
    fontSize: 12,
    color: DriverColors.textSecondary,
  },
  remainingSpacesBold: {
    fontSize: 13,
    fontWeight: '800',
    color: DriverColors.navyHeading,
  },
  coveredBadge: {
    backgroundColor: DriverColors.coveredBadgeBg,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
    marginLeft: 6,
  },
  coveredBadgeText: {
    fontSize: 10.5,
    color: DriverColors.coveredBadgeText,
    fontWeight: '600',
  },
  priceContainer: {
    fontSize: 12,
  },
  priceBold: {
    fontSize: 15,
    fontWeight: '800',
    color: DriverColors.navyHeading,
  },
  priceUnit: {
    fontSize: 11.5,
    color: DriverColors.textSecondary,
  },
});
