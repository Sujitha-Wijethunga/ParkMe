import React, { useState, useMemo } from 'react';
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
  Dimensions,
  KeyboardAvoidingView,
} from 'react-native';
import { DriverColors } from '../../constants/colors';
import {
  SAMPLE_NEARBY_PARKING_LOTS,
  DRIVER_FILTER_CHIPS,
  ParkingLotCardItem,
  DriverFilterChip,
} from '../../constants/driverSampleData';
import { filterAndSortParkingLots } from '../../utils/parkingFilters';
import ParkingLotCard from '../../components/ParkingLotCard';
import DriverBottomNav, { DriverTabType } from '../../components/DriverBottomNav';

export type SearchResultsViewMode = 'map' | 'list';

interface SearchResultsScreenProps {
  initialQuery?: string;
  initialViewMode?: SearchResultsViewMode;
  initialFilter?: DriverFilterChip;
  /** Restore the previously selected lot ID when returning from Lot Details. */
  initialSelectedLotId?: string | null;
  onBack?: () => void;
  /**
   * Called when the user taps a parking card or map marker to view full details.
   * The second argument is a snapshot of the current search state so the originating
   * screen can be restored faithfully when the user presses Back from Lot Details.
   */
  onSelectLot?: (
    lotId: string,
    searchSnapshot: {
      query: string;
      viewMode: SearchResultsViewMode;
      filterChip: DriverFilterChip;
      selectedLotId: string | null;
    }
  ) => void;
  onNavigateHome?: () => void;
  onNavigateBookings?: () => void;
  onNavigateProfile?: () => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * Driver Search Results & Map Screen (ParkMe-05-SearchResultsMap)
 * 
 * Features:
 * - Editable destination / search input with clear button.
 * - Map vs List view mode switching, preserving search & filter state.
 * - Interactive filter chips (Nearest, Cheapest, Available Now, Covered Parking).
 * - Dynamic illustrative map canvas showing price badges matching filtered results.
 * - Interactive marker selection showing selected lot card in map view.
 * - Scrollable parking card list with accurate result counters.
 * - Empty state with "Reset Search & Filters" recovery action.
 * - Android & iOS safe area handling and responsive touch targets.
 * 
 * Note: Map view is an illustrative design representation matching Milestone 02
 * specifications; live GPS mapping and backend APIs will be integrated in subsequent milestones.
 */
export default function SearchResultsScreen({
  initialQuery = '',
  initialViewMode = 'map',
  initialFilter = 'Nearest',
  initialSelectedLotId = null,
  onBack,
  onSelectLot,
  onNavigateHome,
  onNavigateBookings,
  onNavigateProfile,
}: SearchResultsScreenProps) {
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [selectedFilter, setSelectedFilter] = useState<DriverFilterChip>(initialFilter);
  const [viewMode, setViewMode] = useState<SearchResultsViewMode>(initialViewMode);
  const [selectedLotId, setSelectedLotId] = useState<string | null>(initialSelectedLotId ?? null);

  // Filter and sort lots based on query and active filter chip
  const filteredLots = useMemo(() => {
    return filterAndSortParkingLots(SAMPLE_NEARBY_PARKING_LOTS, searchQuery, selectedFilter);
  }, [searchQuery, selectedFilter]);

  // Keep a selected lot reference for the map preview card
  const activeSelectedLot = useMemo(() => {
    if (filteredLots.length === 0) return null;
    if (selectedLotId) {
      const found = filteredLots.find((lot) => lot.id === selectedLotId);
      if (found) return found;
    }
    return filteredLots[0];
  }, [filteredLots, selectedLotId]);

  const handleClearSearch = () => {
    setSearchQuery('');
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedFilter('Nearest');
    setSelectedLotId(null);
  };

  const handleBottomTabPress = (tab: DriverTabType) => {
    if (tab === 'home' && onNavigateHome) {
      onNavigateHome();
    } else if (tab === 'bookings' && onNavigateBookings) {
      onNavigateBookings();
    } else if (tab === 'profile' && onNavigateProfile) {
      onNavigateProfile();
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* 1. Top Search Header */}
        <View style={styles.topHeader}>
          {/* Back button */}
          <TouchableOpacity
            style={styles.backButton}
            activeOpacity={0.7}
            onPress={onBack || onNavigateHome}
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <Text style={styles.backArrowText}>‹</Text>
          </TouchableOpacity>

          {/* Search Input Box */}
          <View style={styles.searchBar}>
            <Text style={styles.searchIconText}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Search destination, street, or lot"
              placeholderTextColor={DriverColors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
              autoCorrect={false}
              clearButtonMode="while-editing"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={handleClearSearch}
                style={styles.clearBtn}
                accessibilityLabel="Clear search input"
              >
                <Text style={styles.clearBtnText}>✕</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Map / List View Mode Switcher */}
          <TouchableOpacity
            style={styles.viewToggleBtn}
            activeOpacity={0.7}
            onPress={() => setViewMode(viewMode === 'map' ? 'list' : 'map')}
            accessibilityLabel={`Switch to ${viewMode === 'map' ? 'List' : 'Map'} view`}
            accessibilityRole="button"
          >
            <Text style={styles.viewToggleIcon}>
              {viewMode === 'map' ? '📋' : '🗺️'}
            </Text>
            <Text style={styles.viewToggleText}>
              {viewMode === 'map' ? 'List' : 'Map'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* 2. Horizontal Filter Chips */}
        <View style={styles.chipsWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsScrollContainer}
          >
            {DRIVER_FILTER_CHIPS.map((chip) => {
              const isSelected = selectedFilter === chip;
              return (
                <TouchableOpacity
                  key={chip}
                  style={[
                    styles.chipItem,
                    isSelected ? styles.chipItemSelected : styles.chipItemUnselected,
                  ]}
                  activeOpacity={0.7}
                  onPress={() => setSelectedFilter(chip)}
                  accessibilityRole="button"
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
        </View>

        {/* 3. Main Content: Map View or List View */}
        {filteredLots.length === 0 ? (
          /* Empty Search & Filter State */
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <Text style={styles.emptyEmoji}>🚗🔍</Text>
            </View>
            <Text style={styles.emptyTitle}>No parking spaces found</Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery.trim().length > 0
                ? `No parking spaces match "${searchQuery.trim()}" with the selected filter.`
                : 'No parking spaces match the current filter criteria.'}
            </Text>
            <TouchableOpacity
              style={styles.resetButton}
              activeOpacity={0.8}
              onPress={handleResetFilters}
            >
              <Text style={styles.resetButtonText}>Reset Search & Filters</Text>
            </TouchableOpacity>
          </View>
        ) : viewMode === 'map' ? (
          /* ────── Map View Mode ────── */
          <View style={styles.mapViewContainer}>
            {/* Illustrative Map Canvas */}
            <View style={styles.mapCanvas}>
              {/* Road Grid Lines */}
              <View style={styles.mapAvenue} />
              <View style={styles.mapRoadCross1} />
              <View style={styles.mapRoadCross2} />
              <View style={styles.mapWaterBody} />

              {/* User Location Indicator */}
              <View style={styles.userPulseWrapper}>
                <View style={styles.userPulseAura} />
                <View style={styles.userPulseDot} />
              </View>

              {/* Dynamic Price Markers matching filtered lots */}
              {filteredLots.map((lot) => {
                const pos = lot.mapPosition || { topPercent: 35, leftPercent: 50 };
                const isCurrent = activeSelectedLot?.id === lot.id;
                return (
                  <TouchableOpacity
                    key={lot.id}
                    style={[
                      styles.mapMarkerPill,
                      isCurrent && styles.mapMarkerPillActive,
                      {
                        top: `${pos.topPercent}%`,
                        left: `${pos.leftPercent}%`,
                      },
                    ]}
                    activeOpacity={0.8}
                    onPress={() => setSelectedLotId(lot.id)}
                    accessibilityLabel={`${lot.name}, Rs. ${lot.pricePerHour} per hour`}
                  >
                    <View
                      style={[
                        styles.markerDot,
                        isCurrent && styles.markerDotActive,
                      ]}
                    />
                    <Text
                      style={[
                        styles.markerPriceText,
                        isCurrent && styles.markerPriceTextActive,
                      ]}
                    >
                      Rs.{lot.pricePerHour}
                    </Text>
                  </TouchableOpacity>
                );
              })}

              {/* Floating Result Count Chip on Map */}
              <View style={styles.mapCountBadge}>
                <Text style={styles.mapCountText}>
                  {filteredLots.length} {filteredLots.length === 1 ? 'spot' : 'spots'} available
                </Text>
              </View>

              {/* Floating Quick View Switch Button */}
              <TouchableOpacity
                style={styles.floatingSwitchBtn}
                activeOpacity={0.85}
                onPress={() => setViewMode('list')}
              >
                <Text style={styles.floatingSwitchIcon}>📋</Text>
                <Text style={styles.floatingSwitchText}>View List</Text>
              </TouchableOpacity>
            </View>

            {/* Bottom Pull-up Card of Selected Parking Lot */}
            {activeSelectedLot && (
              <View style={styles.mapBottomCardWrapper}>
                <Text style={styles.bottomCardHeader}>
                  Tap marker to inspect • {filteredLots.length} results
                </Text>
                <ParkingLotCard
                  lot={activeSelectedLot}
                  isSelected={true}
                  onPress={(lotId) =>
                    onSelectLot &&
                    onSelectLot(lotId, {
                      query: searchQuery,
                      viewMode,
                      filterChip: selectedFilter,
                      selectedLotId: lotId,
                    })
                  }
                />
              </View>
            )}
          </View>
        ) : (
          /* ────── List View Mode ────── */
          <ScrollView
            style={styles.listScrollView}
            contentContainerStyle={styles.listScrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Results Counter Header */}
            <View style={styles.resultsHeaderRow}>
              <View>
                <Text style={styles.resultsCountTitle}>
                  {filteredLots.length} {filteredLots.length === 1 ? 'Parking Spot' : 'Parking Spots'}
                </Text>
                <Text style={styles.resultsCountSubtitle}>
                  {searchQuery.trim().length > 0
                    ? `Results for "${searchQuery.trim()}"`
                    : 'Showing available spaces in Colombo'}
                </Text>
              </View>

              {/* Floating Map Toggle button */}
              <TouchableOpacity
                style={styles.listMapSwitchBtn}
                activeOpacity={0.7}
                onPress={() => setViewMode('map')}
              >
                <Text style={styles.listMapSwitchIcon}>🗺️</Text>
                <Text style={styles.listMapSwitchText}>Map View</Text>
              </TouchableOpacity>
            </View>

            {/* Vertical list of Parking Lot Cards */}
            {filteredLots.map((lot) => (
              <ParkingLotCard
                key={lot.id}
                lot={lot}
                isSelected={activeSelectedLot?.id === lot.id}
                onPress={(lotId) =>
                  onSelectLot &&
                  onSelectLot(lotId, {
                    query: searchQuery,
                    viewMode,
                    filterChip: selectedFilter,
                    selectedLotId: lotId,
                  })
                }
              />
            ))}
          </ScrollView>
        )}
      </KeyboardAvoidingView>

      {/* 4. Driver Bottom Navigation */}
      <DriverBottomNav activeTab="map" onTabPress={handleBottomTabPress} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  keyboardContainer: {
    flex: 1,
    backgroundColor: DriverColors.background,
  },

  // 1. Top Search Header
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 16,
    paddingRight: 105,
    paddingTop: 8,
    paddingBottom: 8,
    backgroundColor: DriverColors.surface,
    borderBottomWidth: 1,
    borderBottomColor: DriverColors.borderLight,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: DriverColors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  backArrowText: {
    fontSize: 26,
    lineHeight: 28,
    color: DriverColors.navyHeading,
    fontWeight: '600',
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: DriverColors.cardBorder,
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 42,
    marginRight: 10,
  },
  searchIconText: {
    fontSize: 14,
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: DriverColors.textBody,
    padding: 0,
  },
  clearBtn: {
    padding: 4,
  },
  clearBtnText: {
    fontSize: 13,
    color: DriverColors.textSecondary,
    fontWeight: '700',
  },
  viewToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: DriverColors.navyDark,
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  viewToggleIcon: {
    fontSize: 13,
    marginRight: 4,
  },
  viewToggleText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },

  // 2. Filter Chips
  chipsWrapper: {
    backgroundColor: DriverColors.surface,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: DriverColors.borderLight,
  },
  chipsScrollContainer: {
    paddingHorizontal: 16,
  },
  chipItem: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
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
    fontSize: 13,
  },
  chipTextSelected: {
    color: DriverColors.textWhite,
    fontWeight: '700',
  },
  chipTextUnselected: {
    color: DriverColors.textBody,
    fontWeight: '600',
  },

  // 3. Map View Canvas
  mapViewContainer: {
    flex: 1,
    position: 'relative',
  },
  mapCanvas: {
    flex: 1,
    backgroundColor: DriverColors.mapBg,
    position: 'relative',
    overflow: 'hidden',
  },
  mapAvenue: {
    position: 'absolute',
    top: '32%',
    left: -40,
    width: SCREEN_WIDTH + 80,
    height: 32,
    backgroundColor: DriverColors.mapRoadMain,
    transform: [{ rotate: '-14deg' }],
  },
  mapRoadCross1: {
    position: 'absolute',
    top: -20,
    left: '26%',
    width: 22,
    height: '140%',
    backgroundColor: DriverColors.mapRoad,
    transform: [{ rotate: '20deg' }],
  },
  mapRoadCross2: {
    position: 'absolute',
    top: -20,
    right: '28%',
    width: 20,
    height: '140%',
    backgroundColor: DriverColors.mapRoad,
    transform: [{ rotate: '-32deg' }],
  },
  mapWaterBody: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 50,
    height: '100%',
    backgroundColor: '#D9E8F5',
    opacity: 0.5,
  },
  // User Location
  userPulseWrapper: {
    position: 'absolute',
    top: '46%',
    left: '36%',
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userPulseAura: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: DriverColors.mapPulseAura,
  },
  userPulseDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: DriverColors.mapPulseBlue,
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
  },

  // Map Markers
  mapMarkerPill: {
    position: 'absolute',
    backgroundColor: DriverColors.mapMarkerBg,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  mapMarkerPillActive: {
    backgroundColor: DriverColors.orangePrimary,
    borderColor: '#FFFFFF',
    transform: [{ scale: 1.12 }],
  },
  markerDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: DriverColors.mapMarkerDot,
    marginRight: 4,
  },
  markerDotActive: {
    backgroundColor: '#FFFFFF',
  },
  markerPriceText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '800',
  },
  markerPriceTextActive: {
    color: '#FFFFFF',
  },

  // Floating map elements
  mapCountBadge: {
    position: 'absolute',
    top: 14,
    left: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: DriverColors.cardBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 3,
  },
  mapCountText: {
    fontSize: 12,
    fontWeight: '700',
    color: DriverColors.navyHeading,
  },
  floatingSwitchBtn: {
    position: 'absolute',
    top: 14,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: DriverColors.surface,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: DriverColors.cardBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  floatingSwitchIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  floatingSwitchText: {
    fontSize: 12,
    fontWeight: '700',
    color: DriverColors.navyHeading,
  },

  // Bottom pull-up card in Map view
  mapBottomCardWrapper: {
    position: 'absolute',
    bottom: 8,
    left: 14,
    right: 14,
  },
  bottomCardHeader: {
    fontSize: 11,
    fontWeight: '600',
    color: DriverColors.textSecondary,
    marginBottom: 6,
    marginLeft: 4,
  },

  // 4. List View Mode
  listScrollView: {
    flex: 1,
    backgroundColor: DriverColors.background,
  },
  listScrollContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 24,
  },
  resultsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  resultsCountTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: DriverColors.navyHeading,
  },
  resultsCountSubtitle: {
    fontSize: 12.5,
    color: DriverColors.textSecondary,
    marginTop: 2,
  },
  listMapSwitchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: DriverColors.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: DriverColors.cardBorder,
  },
  listMapSwitchIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  listMapSwitchText: {
    fontSize: 12,
    fontWeight: '700',
    color: DriverColors.navyHeading,
  },

  // 5. Empty State
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingBottom: 40,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyEmoji: {
    fontSize: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: DriverColors.navyHeading,
    marginBottom: 6,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    color: DriverColors.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
  },
  resetButton: {
    backgroundColor: DriverColors.orangePrimary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  resetButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
