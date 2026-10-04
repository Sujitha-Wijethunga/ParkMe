import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StatusBar,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
import CoordinateMapView from '../../components/CoordinateMapView';
import {
  getCurrentDriverLocation,
  openLocationSettings,
  DriverCoordinate,
  LocationError,
} from '../../services/locationService';
import {
  fetchNearbyDrivingLots,
  checkLotAvailability,
  NearbyDrivingLot,
} from '../../services/parkingService';
import { launchDrivingNavigation } from '../../services/navigationLauncher';

export type SearchResultsViewMode = 'map' | 'list';

interface SearchResultsScreenProps {
  initialQuery?: string;
  initialViewMode?: SearchResultsViewMode;
  initialFilter?: DriverFilterChip;
  /** Restore the previously selected lot ID when returning from Lot Details. */
  initialSelectedLotId?: string | null;
  /** Start directly in 5-minute nearby driving reach mode. */
  initialNearbyFiveMinMode?: boolean;
  onBack?: () => void;
  /**
   * Called when the user taps a parking card or map marker to view full details.
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

/**
 * Driver Search Results & Map Screen
 *
 * Supports two distinct, faithfully separated modes:
 * 1. "5-Min Driving Reach" Mode (ParkMe Feature Milestone):
 *    - Real GPS foreground location.
 *    - Real coordinate-based map with live driver indicator & Mercator-projected lot markers.
 *    - Authoritative backend routing with 300s (5-min) road travel-time filter.
 *    - Re-checks real-time availability before launching turn-by-turn navigation.
 *    - Supports expanding to 10 minutes when no 5-minute lots qualify.
 *    - Clear attribution & "Current reported availability" disclaimer.
 *
 * 2. Normal Search & Filter Mode:
 *    - Preserved mock/demo flow explicitly labelled as sample data.
 */
export default function SearchResultsScreen({
  initialQuery = '',
  initialViewMode = 'map',
  initialFilter = 'Nearest',
  initialSelectedLotId = null,
  initialNearbyFiveMinMode = false,
  onBack,
  onSelectLot,
  onNavigateHome,
  onNavigateBookings,
  onNavigateProfile,
}: SearchResultsScreenProps) {
  const insets = useSafeAreaInsets();
  const topPadding = Math.max(
    insets.top,
    Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) : 0
  );

  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [selectedFilter, setSelectedFilter] = useState<DriverFilterChip>(initialFilter);
  const [viewMode, setViewMode] = useState<SearchResultsViewMode>(initialViewMode);
  const [selectedLotId, setSelectedLotId] = useState<string | null>(initialSelectedLotId ?? null);

  // ── Nearby 5-Min Driving Reach Mode State ──
  const [isNearbyMode, setIsNearbyMode] = useState<boolean>(initialNearbyFiveMinMode);
  const [maxDurationSec, setMaxDurationSec] = useState<number>(300);
  const [driverLocation, setDriverLocation] = useState<DriverCoordinate | null>(null);
  const [nearbyLots, setNearbyLots] = useState<NearbyDrivingLot[]>([]);
  const [selectedNearbyLotId, setSelectedNearbyLotId] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [isLoadingLots, setIsLoadingLots] = useState<boolean>(false);
  const [isNavigating, setIsNavigating] = useState<boolean>(false);
  const [locationError, setLocationError] = useState<LocationError | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);

  // Filter and sort lots for normal mode based on sample data
  const filteredSampleLots = useMemo(() => {
    return filterAndSortParkingLots(SAMPLE_NEARBY_PARKING_LOTS, searchQuery, selectedFilter);
  }, [searchQuery, selectedFilter]);

  // Selected sample lot reference for normal map mode
  const activeSelectedSampleLot = useMemo(() => {
    if (filteredSampleLots.length === 0) return null;
    if (selectedLotId) {
      const found = filteredSampleLots.find((lot) => lot.id === selectedLotId);
      if (found) return found;
    }
    return filteredSampleLots[0];
  }, [filteredSampleLots, selectedLotId]);

  // Selected lot for nearby 5-min driving mode
  const activeSelectedNearbyLot = useMemo(() => {
    if (nearbyLots.length === 0) return null;
    if (selectedNearbyLotId) {
      const found = nearbyLots.find((lot) => lot.id === selectedNearbyLotId);
      if (found) return found;
    }
    return nearbyLots[0];
  }, [nearbyLots, selectedNearbyLotId]);

  /**
   * Fetch nearby parking lots using current driver coordinates and backend routing
   */
  const loadNearbyDrivingParking = useCallback(
    async (coords: DriverCoordinate, durationLimit: number = 300) => {
      setIsLoadingLots(true);
      setFetchError(null);

      try {
        const response = await fetchNearbyDrivingLots(
          coords.latitude,
          coords.longitude,
          durationLimit
        );

        setNearbyLots(response.results);
        setLastRefreshedAt(new Date());

        if (response.results.length > 0) {
          setSelectedNearbyLotId(response.results[0].id);
        } else {
          setSelectedNearbyLotId(null);
        }
      } catch (err: any) {
        setFetchError(err?.message || 'Unable to retrieve nearby parking from server.');
      } finally {
        setIsLoadingLots(false);
      }
    },
    []
  );

  /**
   * Activates or refreshes the 5-Minute Driving Reach feature
   */
  const handleActivateNearbyMode = useCallback(
    async (durationLimit: number = 300) => {
      setIsNearbyMode(true);
      setMaxDurationSec(durationLimit);
      setLocationError(null);
      setFetchError(null);
      setIsLocating(true);

      try {
        const coords = await getCurrentDriverLocation(8000);
        setDriverLocation(coords);
        setIsLocating(false);

        await loadNearbyDrivingParking(coords, durationLimit);
      } catch (err: any) {
        setIsLocating(false);
        if (err && err.code) {
          setLocationError(err as LocationError);
        } else {
          setLocationError({
            code: 'UNKNOWN',
            message: err?.message || 'Failed to obtain GPS location.',
            canRetry: true,
            canOpenSettings: false,
          });
        }
      }
    },
    [loadNearbyDrivingParking]
  );

  // Trigger nearby search on mount if initialNearbyFiveMinMode is true
  useEffect(() => {
    let isCancelled = false;
    if (initialNearbyFiveMinMode) {
      const timer = setTimeout(() => {
        if (!isCancelled) {
          handleActivateNearbyMode(300);
        }
      }, 0);
      return () => {
        isCancelled = true;
        clearTimeout(timer);
      };
    }
  }, [initialNearbyFiveMinMode, handleActivateNearbyMode]);

  /**
   * Refresh action to update location, availability, and routing estimates
   */
  const handleRefreshNearby = () => {
    handleActivateNearbyMode(maxDurationSec);
  };

  /**
   * Expand search from 5 minutes (300s) to 10 minutes (600s) when no lots qualify
   */
  const handleExpandTo10Min = () => {
    handleActivateNearbyMode(600);
  };

  /**
   * Switch back to standard search mode
   */
  const handleSwitchToNormalMode = () => {
    setIsNearbyMode(false);
    setMaxDurationSec(300);
    setLocationError(null);
    setFetchError(null);
  };

  /**
   * Navigate action:
   * 1. Re-checks real-time availability with backend.
   * 2. Alerts if lot has become full and suggests refreshed alternatives.
   * 3. Opens turn-by-turn platform driving navigation to lot/entrance.
   */
  const handleStartDrivingNavigation = async (lot: NearbyDrivingLot) => {
    if (!driverLocation) {
      Alert.alert(
        'Location Required',
        'Cannot launch driving navigation without your current GPS coordinates. Please tap Refresh to update location.',
        [{ text: 'OK' }]
      );
      return;
    }

    setIsNavigating(true);

    try {
      // 1. Verify availability right before launching navigation
      const availabilityCheck = await checkLotAvailability(lot.id).catch(() => null);

      if (availabilityCheck && (!availabilityCheck.isAvailable || availabilityCheck.availableSpaces <= 0)) {
        setIsNavigating(false);
        Alert.alert(
          'Parking Lot Just Filled Up',
          `Unfortunately, ${lot.name} currently has ${availabilityCheck.availableSpaces} available spaces reported.\n\nWould you like to refresh nearby parking to find open spaces?`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Refresh Nearby',
              style: 'default',
              onPress: handleRefreshNearby,
            },
          ]
        );
        return;
      }

      // 2. Determine destination navigation coordinates (entrance or center)
      const navCoords = lot.navigationCoordinates || lot.coordinates;

      // 3. Launch platform turn-by-turn navigation
      await launchDrivingNavigation({
        originLat: driverLocation.latitude,
        originLng: driverLocation.longitude,
        destLat: navCoords.lat,
        destLng: navCoords.lng,
        lotName: lot.name,
        hasEntranceCoordinates: lot.hasEntranceCoordinates,
      });
    } catch (err: any) {
      Alert.alert('Navigation Error', err?.message || 'Could not launch driving directions.');
    } finally {
      setIsNavigating(false);
    }
  };

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

  // Convert NearbyDrivingLot to ParkingLotCardItem format for reusable card display
  const mapNearbyLotToCardItem = (lot: NearbyDrivingLot): ParkingLotCardItem => ({
    id: lot.id,
    name: lot.name,
    address: lot.address,
    distance: lot.distanceFormatted,
    status: lot.status,
    availableSpaces: lot.availableSpaces,
    totalSpaces: lot.totalSpaces,
    isCovered: true,
    hasEVCharging: (lot.amenities || []).some((a) => a.toLowerCase().includes('ev')),
    pricePerHour: lot.pricePerHour,
    imageUrl:
      lot.imageUrl ||
      'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=600&q=80',
    amenities: lot.amenities,
    openingHours: lot.openTime && lot.closeTime ? `${lot.openTime} – ${lot.closeTime}` : 'Open 24 hours',
  });

  return (
    <View style={[styles.safeArea, { paddingTop: topPadding }]}>
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
              placeholder={isNearbyMode ? 'Nearby 5-Min Drive Active' : 'Search destination, street, or lot'}
              placeholderTextColor={DriverColors.textMuted}
              value={searchQuery}
              onChangeText={(text) => {
                setSearchQuery(text);
                if (isNearbyMode && text.trim().length > 0) {
                  setIsNearbyMode(false);
                }
              }}
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

        {/* 2. Mode Shortcuts & Filter Chips Row */}
        <View style={styles.chipsWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsScrollContainer}
          >
            {/* Matching "5 min away" Shortcut Button on Map screen */}
            <TouchableOpacity
              style={[
                styles.nearbyShortcutChip,
                isNearbyMode && styles.nearbyShortcutChipActive,
              ]}
              activeOpacity={0.8}
              onPress={() => {
                if (!isNearbyMode) {
                  handleActivateNearbyMode(300);
                } else {
                  handleRefreshNearby();
                }
              }}
              accessibilityRole="button"
              accessibilityLabel="Find parking within 5 minutes drive"
            >
              <Text style={styles.nearbyShortcutIcon}>⚡</Text>
              <Text
                style={[
                  styles.nearbyShortcutText,
                  isNearbyMode && styles.nearbyShortcutTextActive,
                ]}
              >
                {isNearbyMode ? '5 Min Drive Active' : '5 Min Away'}
              </Text>
            </TouchableOpacity>

            {/* Standard Category Chips */}
            {DRIVER_FILTER_CHIPS.map((chip) => {
              const isSelected = !isNearbyMode && selectedFilter === chip;
              return (
                <TouchableOpacity
                  key={chip}
                  style={[
                    styles.chipItem,
                    isSelected ? styles.chipItemSelected : styles.chipItemUnselected,
                  ]}
                  activeOpacity={0.7}
                  onPress={() => {
                    if (isNearbyMode) {
                      setIsNearbyMode(false);
                    }
                    setSelectedFilter(chip);
                  }}
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

        {/* 3. Nearby 5-Min Drive Status & Refresh Banner (when in nearby mode) */}
        {isNearbyMode && (
          <View style={styles.nearbyBannerContainer}>
            <View style={styles.nearbyBannerLeft}>
              <View style={styles.nearbyBadgeRow}>
                <View style={styles.nearbyPulseDot} />
                <Text style={styles.nearbyBannerTitle}>
                  Available parking within {maxDurationSec / 60} minutes’ drive
                </Text>
              </View>
              <Text style={styles.nearbyBannerDisclaimer}>
                {lastRefreshedAt
                  ? `Reported availability at ${lastRefreshedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • Not a guaranteed reservation`
                  : 'Current reported availability, not a guaranteed space or reservation'}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.nearbyRefreshBtn}
              activeOpacity={0.75}
              onPress={handleRefreshNearby}
              disabled={isLocating || isLoadingLots}
              accessibilityLabel="Refresh nearby parking and availability"
            >
              {isLocating || isLoadingLots ? (
                <ActivityIndicator size="small" color="#2563EB" />
              ) : (
                <>
                  <Text style={styles.nearbyRefreshIcon}>🔄</Text>
                  <Text style={styles.nearbyRefreshText}>Refresh</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* 4. MAIN CONTENT */}
        {isNearbyMode ? (
          /* ══════════════════════════════════════════════════════════════════════
             NEARBY 5-MIN DRIVING REACH MODE
             ══════════════════════════════════════════════════════════════════════ */
          isLocating || isLoadingLots ? (
            /* Loading State */
            <View style={styles.centerStateContainer}>
              <ActivityIndicator size="large" color={DriverColors.brandPrimary} />
              <Text style={styles.loadingStateTitle}>
                {isLocating ? 'Locating you with GPS...' : `Calculating driving routes within ${maxDurationSec / 60} min...`}
              </Text>
              <Text style={styles.loadingStateSubtitle}>
                Checking road travel times and live parking lot capacity
              </Text>
            </View>
          ) : locationError ? (
            /* Location Error State */
            <View style={styles.centerStateContainer}>
              <Text style={styles.errorStateEmoji}>📍⚠️</Text>
              <Text style={styles.errorStateTitle}>Location Access Required</Text>
              <Text style={styles.errorStateSubtitle}>{locationError.message}</Text>
              <View style={styles.errorBtnRow}>
                {locationError.canOpenSettings && (
                  <TouchableOpacity
                    style={styles.primaryActionBtn}
                    activeOpacity={0.8}
                    onPress={openLocationSettings}
                  >
                    <Text style={styles.primaryActionBtnText}>Open Settings</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[styles.secondaryActionBtn, !locationError.canOpenSettings && styles.primaryActionBtn]}
                  activeOpacity={0.8}
                  onPress={() => handleActivateNearbyMode(maxDurationSec)}
                >
                  <Text style={!locationError.canOpenSettings ? styles.primaryActionBtnText : styles.secondaryActionBtnText}>
                    Try Again
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : fetchError ? (
            /* Routing / Network Error State */
            <View style={styles.centerStateContainer}>
              <Text style={styles.errorStateEmoji}>🌐⚠️</Text>
              <Text style={styles.errorStateTitle}>Routing Service Unavailable</Text>
              <Text style={styles.errorStateSubtitle}>{fetchError}</Text>
              <TouchableOpacity
                style={styles.primaryActionBtn}
                activeOpacity={0.8}
                onPress={handleRefreshNearby}
              >
                <Text style={styles.primaryActionBtnText}>Retry Route Search</Text>
              </TouchableOpacity>
            </View>
          ) : nearbyLots.length === 0 ? (
            /* Empty 5-Min Results State with Expand to 10 min option */
            <View style={styles.centerStateContainer}>
              <Text style={styles.emptyStateEmoji}>⏱️🚗</Text>
              <Text style={styles.emptyStateTitle}>
                No available parking found within a {maxDurationSec / 60}-minute drive
              </Text>
              <Text style={styles.emptyStateSubtitle}>
                There are no open parking spaces reachable within {maxDurationSec} seconds from your current location right now.
              </Text>

              {maxDurationSec <= 300 && (
                <TouchableOpacity
                  style={styles.expandSearchBtn}
                  activeOpacity={0.85}
                  onPress={handleExpandTo10Min}
                >
                  <Text style={styles.expandSearchBtnText}>
                    ⚡ Expand to 10-Minute Drive
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.switchNormalBtn}
                activeOpacity={0.8}
                onPress={handleSwitchToNormalMode}
              >
                <Text style={styles.switchNormalBtnText}>View Standard City Search</Text>
              </TouchableOpacity>
            </View>
          ) : viewMode === 'map' ? (
            /* Real Coordinate Map View */
            <View style={styles.mapViewContainer}>
              <CoordinateMapView
                userLocation={driverLocation}
                lots={nearbyLots}
                selectedLotId={activeSelectedNearbyLot?.id ?? null}
                onSelectLot={(lot) => setSelectedNearbyLotId(lot.id)}
                maxDurationSeconds={maxDurationSec}
              />

              {/* Bottom Selected Lot Card with "Navigate" CTA */}
              {activeSelectedNearbyLot && (
                <View style={styles.nearbyBottomCardContainer}>
                  <View style={styles.nearbyCardHeaderRow}>
                    <View style={styles.nearbyCardEtaPill}>
                      <Text style={styles.nearbyCardEtaText}>
                        ⏱ {activeSelectedNearbyLot.durationFormatted} drive ({activeSelectedNearbyLot.distanceFormatted})
                      </Text>
                    </View>
                    <View style={styles.nearbySpacesBadge}>
                      <Text style={styles.nearbySpacesBadgeText}>
                        {activeSelectedNearbyLot.availableSpaces} spaces open
                      </Text>
                    </View>
                  </View>

                  <View style={styles.nearbyCardContent}>
                    <View style={styles.nearbyCardInfo}>
                      <Text style={styles.nearbyCardName} numberOfLines={1}>
                        {activeSelectedNearbyLot.name}
                      </Text>
                      <Text style={styles.nearbyCardAddress} numberOfLines={1}>
                        {activeSelectedNearbyLot.address}
                      </Text>
                      <Text style={styles.nearbyCoordinatesNote}>
                        {activeSelectedNearbyLot.navigationCoordinatesNote}
                      </Text>
                    </View>

                    <View style={styles.nearbyCardPriceBlock}>
                      <Text style={styles.nearbyCardPriceText}>
                        Rs.{activeSelectedNearbyLot.pricePerHour}
                      </Text>
                      <Text style={styles.nearbyCardPriceUnit}>/ hour</Text>
                    </View>
                  </View>

                  {/* Actions Row */}
                  <View style={styles.nearbyCardActionsRow}>
                    <TouchableOpacity
                      style={styles.nearbyDetailsBtn}
                      activeOpacity={0.75}
                      onPress={() =>
                        onSelectLot &&
                        onSelectLot(activeSelectedNearbyLot.id, {
                          query: searchQuery,
                          viewMode,
                          filterChip: selectedFilter,
                          selectedLotId: activeSelectedNearbyLot.id,
                        })
                      }
                    >
                      <Text style={styles.nearbyDetailsBtnText}>Details</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.nearbyNavigateBtn}
                      activeOpacity={0.88}
                      onPress={() => handleStartDrivingNavigation(activeSelectedNearbyLot)}
                      disabled={isNavigating}
                    >
                      {isNavigating ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <>
                          <Text style={styles.nearbyNavigateIcon}>🧭</Text>
                          <Text style={styles.nearbyNavigateBtnText}>
                            Navigate ({activeSelectedNearbyLot.durationFormatted})
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          ) : (
            /* Nearby 5-Min List View Mode */
            <ScrollView
              style={styles.listScrollView}
              contentContainerStyle={styles.listScrollContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.resultsHeaderRow}>
                <View>
                  <Text style={styles.resultsCountTitle}>
                    {nearbyLots.length} {nearbyLots.length === 1 ? 'Parking Lot' : 'Parking Lots'}
                  </Text>
                  <Text style={styles.resultsCountSubtitle}>
                    Within {maxDurationSec / 60} min road drive • Sorted by driving time
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.listMapSwitchBtn}
                  activeOpacity={0.7}
                  onPress={() => setViewMode('map')}
                >
                  <Text style={styles.listMapSwitchIcon}>🗺️</Text>
                  <Text style={styles.listMapSwitchText}>Map View</Text>
                </TouchableOpacity>
              </View>

              {nearbyLots.map((lot) => {
                const cardItem = mapNearbyLotToCardItem(lot);
                const isSelected = activeSelectedNearbyLot?.id === lot.id;

                return (
                  <View key={lot.id} style={styles.nearbyListItemCard}>
                    {/* Top Eta & Availability Bar */}
                    <View style={styles.nearbyListEtaBar}>
                      <View style={styles.nearbyListEtaPill}>
                        <Text style={styles.nearbyListEtaPillText}>
                          🚗 {lot.durationFormatted} drive • {lot.distanceFormatted}
                        </Text>
                      </View>
                      <Text style={styles.nearbyListAvailabilityText}>
                        {lot.availableSpaces} spaces reported open
                      </Text>
                    </View>

                    <ParkingLotCard
                      lot={cardItem}
                      isSelected={isSelected}
                      onPress={() =>
                        onSelectLot &&
                        onSelectLot(lot.id, {
                          query: searchQuery,
                          viewMode,
                          filterChip: selectedFilter,
                          selectedLotId: lot.id,
                        })
                      }
                    />

                    {/* Quick Driving Navigation Action */}
                    <View style={styles.nearbyListNavigateRow}>
                      <Text style={styles.nearbyListCoordNote}>
                        {lot.navigationCoordinatesNote}
                      </Text>
                      <TouchableOpacity
                        style={styles.nearbyListQuickNavBtn}
                        activeOpacity={0.85}
                        onPress={() => handleStartDrivingNavigation(lot)}
                      >
                        <Text style={styles.nearbyListQuickNavText}>
                          🧭 Navigate
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          )
        ) : (
          /* ══════════════════════════════════════════════════════════════════════
             STANDARD SEARCH / PRESERVED DEMO FLOW (EXPLICITLY LABELLED)
             ══════════════════════════════════════════════════════════════════════ */
          filteredSampleLots.length === 0 ? (
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
            /* Standard Illustrative Map Canvas */
            <View style={styles.mapViewContainer}>
              <View style={styles.mapCanvas}>
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
                {filteredSampleLots.map((lot) => {
                  const pos = lot.mapPosition || { topPercent: 35, leftPercent: 50 };
                  const isCurrent = activeSelectedSampleLot?.id === lot.id;
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

                {/* Floating Demo Label Chip */}
                <View style={styles.demoLabelBadge}>
                  <Text style={styles.demoLabelText}>
                    {"City Map Overview • Tap '5 Min Away' for live GPS routing"}
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
              {activeSelectedSampleLot && (
                <View style={styles.mapBottomCardWrapper}>
                  <Text style={styles.bottomCardHeader}>
                    Tap marker to inspect • {filteredSampleLots.length} results
                  </Text>
                  <ParkingLotCard
                    lot={activeSelectedSampleLot}
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
            /* Standard List View Mode */
            <ScrollView
              style={styles.listScrollView}
              contentContainerStyle={styles.listScrollContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.resultsHeaderRow}>
                <View>
                  <Text style={styles.resultsCountTitle}>
                    {filteredSampleLots.length} {filteredSampleLots.length === 1 ? 'Parking Spot' : 'Parking Spots'}
                  </Text>
                  <Text style={styles.resultsCountSubtitle}>
                    {searchQuery.trim().length > 0
                      ? `Results for "${searchQuery.trim()}"`
                      : 'Showing available spaces in Colombo'}
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.listMapSwitchBtn}
                  activeOpacity={0.7}
                  onPress={() => setViewMode('map')}
                >
                  <Text style={styles.listMapSwitchIcon}>🗺️</Text>
                  <Text style={styles.listMapSwitchText}>Map View</Text>
                </TouchableOpacity>
              </View>

              {filteredSampleLots.map((lot) => (
                <ParkingLotCard
                  key={lot.id}
                  lot={lot}
                  isSelected={activeSelectedSampleLot?.id === lot.id}
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
          )
        )}
      </KeyboardAvoidingView>

      {/* 5. Driver Bottom Navigation */}
      <DriverBottomNav activeTab="map" onTabPress={handleBottomTabPress} />
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  keyboardContainer: {
    flex: 1,
    backgroundColor: DriverColors.background,
  },

  // 1. Top Search Header
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: DriverColors.border,
    gap: 10,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: DriverColors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrowText: {
    fontSize: 26,
    fontWeight: '300',
    color: DriverColors.navyHeading,
    lineHeight: 30,
    marginTop: -2,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: DriverColors.surfaceLight,
    borderRadius: 22,
    paddingHorizontal: 12,
    height: 42,
    borderWidth: 1,
    borderColor: DriverColors.border,
  },
  searchIconText: {
    fontSize: 15,
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 13.5,
    color: DriverColors.navyHeading,
    fontWeight: '500',
    paddingVertical: 0,
  },
  clearBtn: {
    padding: 4,
  },
  clearBtnText: {
    fontSize: 13,
    color: DriverColors.textMuted,
    fontWeight: '600',
  },
  viewToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: DriverColors.navyDark,
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 18,
    gap: 4,
  },
  viewToggleIcon: {
    fontSize: 13,
  },
  viewToggleText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // 2. Filter Chips
  chipsWrapper: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: DriverColors.border,
    paddingVertical: 8,
  },
  chipsScrollContainer: {
    paddingHorizontal: 16,
    gap: 8,
    alignItems: 'center',
  },
  nearbyShortcutChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 18,
    gap: 5,
    borderWidth: 1.5,
    borderColor: '#3B82F6',
  },
  nearbyShortcutChipActive: {
    backgroundColor: '#1E3A8A',
    borderColor: '#60A5FA',
  },
  nearbyShortcutIcon: {
    fontSize: 13,
  },
  nearbyShortcutText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  nearbyShortcutTextActive: {
    color: '#93C5FD',
  },
  chipItem: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 18,
    borderWidth: 1,
  },
  chipItemSelected: {
    backgroundColor: DriverColors.navyDark,
    borderColor: DriverColors.navyDark,
  },
  chipItemUnselected: {
    backgroundColor: '#FFFFFF',
    borderColor: DriverColors.border,
  },
  chipText: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  chipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  chipTextUnselected: {
    color: DriverColors.textSecondary,
  },

  // 3. Nearby Banner
  nearbyBannerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderBottomWidth: 1,
    borderBottomColor: '#DBEAFE',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  nearbyBannerLeft: {
    flex: 1,
  },
  nearbyBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  nearbyPulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  nearbyBannerTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E3A8A',
  },
  nearbyBannerDisclaimer: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
  nearbyRefreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    gap: 4,
    marginLeft: 10,
  },
  nearbyRefreshIcon: {
    fontSize: 12,
  },
  nearbyRefreshText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#2563EB',
  },

  // 4. Center States (Loading, Error, Empty)
  centerStateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    backgroundColor: '#FFFFFF',
  },
  loadingStateTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: DriverColors.navyHeading,
    marginTop: 16,
    textAlign: 'center',
  },
  loadingStateSubtitle: {
    fontSize: 13,
    color: DriverColors.textSecondary,
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 18,
  },
  errorStateEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  errorStateTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: DriverColors.navyHeading,
    textAlign: 'center',
  },
  errorStateSubtitle: {
    fontSize: 13.5,
    color: DriverColors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
    marginBottom: 20,
  },
  errorBtnRow: {
    flexDirection: 'row',
    gap: 12,
  },
  primaryActionBtn: {
    backgroundColor: DriverColors.navyDark,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 22,
  },
  primaryActionBtnText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '700',
  },
  secondaryActionBtn: {
    backgroundColor: DriverColors.surfaceLight,
    borderWidth: 1,
    borderColor: DriverColors.border,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 22,
  },
  secondaryActionBtnText: {
    color: DriverColors.navyHeading,
    fontSize: 13.5,
    fontWeight: '700',
  },
  emptyStateEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyStateTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: DriverColors.navyHeading,
    textAlign: 'center',
  },
  emptyStateSubtitle: {
    fontSize: 13,
    color: DriverColors.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 19,
    marginBottom: 22,
  },
  expandSearchBtn: {
    backgroundColor: '#0F172A',
    borderWidth: 1.5,
    borderColor: '#3B82F6',
    paddingHorizontal: 22,
    paddingVertical: 13,
    borderRadius: 24,
    marginBottom: 10,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  expandSearchBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  switchNormalBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  switchNormalBtnText: {
    color: DriverColors.navyDark,
    fontSize: 13,
    fontWeight: '700',
  },

  // Map View Layout
  mapViewContainer: {
    flex: 1,
    position: 'relative',
  },
  nearbyBottomCardContainer: {
    position: 'absolute',
    bottom: 12,
    left: 14,
    right: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  nearbyCardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  nearbyCardEtaPill: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  nearbyCardEtaText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1D4ED8',
  },
  nearbySpacesBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  nearbySpacesBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  nearbyCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  nearbyCardInfo: {
    flex: 1,
    marginRight: 10,
  },
  nearbyCardName: {
    fontSize: 15,
    fontWeight: '800',
    color: DriverColors.navyHeading,
  },
  nearbyCardAddress: {
    fontSize: 12,
    color: DriverColors.textSecondary,
    marginTop: 2,
  },
  nearbyCoordinatesNote: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 3,
    fontStyle: 'italic',
  },
  nearbyCardPriceBlock: {
    alignItems: 'flex-end',
  },
  nearbyCardPriceText: {
    fontSize: 17,
    fontWeight: '800',
    color: DriverColors.navyHeading,
  },
  nearbyCardPriceUnit: {
    fontSize: 10,
    color: DriverColors.textMuted,
  },
  nearbyCardActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  nearbyDetailsBtn: {
    backgroundColor: DriverColors.surfaceLight,
    borderWidth: 1,
    borderColor: DriverColors.border,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nearbyDetailsBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: DriverColors.navyHeading,
  },
  nearbyNavigateBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E3A8A',
    paddingVertical: 10,
    borderRadius: 14,
    gap: 6,
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 4,
  },
  nearbyNavigateIcon: {
    fontSize: 15,
  },
  nearbyNavigateBtnText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '800',
  },

  // Nearby List View Cards
  nearbyListItemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  nearbyListEtaBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  nearbyListEtaPill: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  nearbyListEtaPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1D4ED8',
  },
  nearbyListAvailabilityText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  nearbyListNavigateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#F8FAFC',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  nearbyListCoordNote: {
    fontSize: 10,
    color: '#64748B',
    fontStyle: 'italic',
    flex: 1,
    marginRight: 8,
  },
  nearbyListQuickNavBtn: {
    backgroundColor: '#1E3A8A',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
  },
  nearbyListQuickNavText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },

  // Standard Illustrative Map styles
  mapCanvas: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#E5ECF4',
    overflow: 'hidden',
  },
  mapAvenue: {
    position: 'absolute',
    top: '38%',
    left: '-10%',
    width: '120%',
    height: 18,
    backgroundColor: '#FFFFFF',
    transform: [{ rotate: '-25deg' }],
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#CAD5E2',
  },
  mapRoadCross1: {
    position: 'absolute',
    top: '-10%',
    left: '32%',
    width: 12,
    height: '120%',
    backgroundColor: '#FFFFFF',
    transform: [{ rotate: '15deg' }],
  },
  mapRoadCross2: {
    position: 'absolute',
    top: '-10%',
    right: '25%',
    width: 10,
    height: '120%',
    backgroundColor: '#FFFFFF',
    transform: [{ rotate: '-10deg' }],
  },
  mapWaterBody: {
    position: 'absolute',
    bottom: -30,
    left: -30,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#BFDBFE',
    opacity: 0.6,
  },
  userPulseWrapper: {
    position: 'absolute',
    top: '48%',
    left: '46%',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  userPulseAura: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(37, 99, 235, 0.22)',
    borderWidth: 1.5,
    borderColor: 'rgba(37, 99, 235, 0.5)',
  },
  userPulseDot: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#2563EB',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  mapMarkerPill: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: DriverColors.navyDark,
    gap: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 5,
  },
  mapMarkerPillActive: {
    backgroundColor: DriverColors.navyDark,
    borderColor: DriverColors.brandPrimary,
    transform: [{ scale: 1.08 }],
    zIndex: 15,
  },
  markerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: DriverColors.brandPrimary,
  },
  markerDotActive: {
    backgroundColor: '#FFFFFF',
  },
  markerPriceText: {
    fontSize: 11,
    fontWeight: '800',
    color: DriverColors.navyHeading,
  },
  markerPriceTextActive: {
    color: '#FFFFFF',
  },
  demoLabelBadge: {
    position: 'absolute',
    top: 10,
    left: 14,
    right: 14,
    backgroundColor: 'rgba(15, 23, 42, 0.82)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    alignItems: 'center',
  },
  demoLabelText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  floatingSwitchBtn: {
    position: 'absolute',
    bottom: 14,
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: DriverColors.navyDark,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 20,
  },
  floatingSwitchIcon: {
    fontSize: 13,
  },
  floatingSwitchText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  mapBottomCardWrapper: {
    position: 'absolute',
    bottom: 10,
    left: 12,
    right: 12,
    zIndex: 10,
  },
  bottomCardHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: DriverColors.navyHeading,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: 'center',
    marginBottom: 6,
  },

  // Standard List View Layout
  listScrollView: {
    flex: 1,
  },
  listScrollContent: {
    padding: 16,
    paddingBottom: 24,
  },
  resultsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  resultsCountTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: DriverColors.navyHeading,
  },
  resultsCountSubtitle: {
    fontSize: 12,
    color: DriverColors.textSecondary,
    marginTop: 2,
  },
  listMapSwitchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: DriverColors.surfaceLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: DriverColors.border,
    gap: 4,
  },
  listMapSwitchIcon: {
    fontSize: 12,
  },
  listMapSwitchText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: DriverColors.navyHeading,
  },

  // Empty State
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    backgroundColor: '#FFFFFF',
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: DriverColors.surfaceLight,
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
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13.5,
    color: DriverColors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  resetButton: {
    backgroundColor: DriverColors.navyDark,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 24,
  },
  resetButtonText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '700',
  },
});
