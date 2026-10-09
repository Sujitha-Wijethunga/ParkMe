import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  StatusBar,
  TextInput,
  Modal,
  Pressable,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type SpaceStatus = 'Available' | 'Reserved' | 'Occupied';

export interface SpaceItem {
  id: string;
  slot: string;
  status: SpaceStatus;
  location?: string;
  level?: string;
  parkingLotId?: string;
  vehicleType?: string;
  imageUrl?: string;
  imageUri?: string;
  imageMimeType?: string;
  imageFile?: Blob;
  spaceNumbers?: string[];
}

export const initialSpaces: SpaceItem[] = [
  { id: '1', slot: 'A1', status: 'Occupied', level: 'Ground Floor', vehicleType: 'Car' },
  { id: '2', slot: 'A2', status: 'Available', level: 'Ground Floor', vehicleType: 'Car' },
  { id: '3', slot: 'A3', status: 'Reserved', level: 'Ground Floor', vehicleType: 'Car' },
  { id: '4', slot: 'A4', status: 'Available', level: 'Ground Floor', vehicleType: 'SUV' },
  { id: '5', slot: 'A5', status: 'Reserved', level: 'Ground Floor', vehicleType: 'Car' },
  { id: '6', slot: 'A6', status: 'Available', level: 'Ground Floor', vehicleType: 'EV' },
  { id: '7', slot: 'A7', status: 'Occupied', level: 'Ground Floor', vehicleType: 'Bike' },
  { id: '8', slot: 'A8', status: 'Available', level: 'Ground Floor', vehicleType: 'Car' },
  { id: '9', slot: 'B1', status: 'Available', level: 'Level 1', vehicleType: 'Car' },
  { id: '10', slot: 'B2', status: 'Occupied', level: 'Level 1', vehicleType: 'Car' },
  { id: '11', slot: 'B3', status: 'Available', level: 'Level 1', vehicleType: 'SUV' },
  { id: '12', slot: 'B4', status: 'Reserved', level: 'Level 1', vehicleType: 'Car' },
  { id: '13', slot: 'B5', status: 'Available', level: 'Level 1', vehicleType: 'Car' },
  { id: '14', slot: 'B6', status: 'Available', level: 'Level 1', vehicleType: 'Bike' },
  { id: '15', slot: 'B7', status: 'Available', level: 'Level 1', vehicleType: 'EV' },
  { id: '16', slot: 'B8', status: 'Occupied', level: 'Level 1', vehicleType: 'Car' },
  { id: '17', slot: 'C1', status: 'Reserved', level: 'Level 2', vehicleType: 'Car' },
  { id: '18', slot: 'C2', status: 'Available', level: 'Level 2', vehicleType: 'Car' },
  { id: '19', slot: 'C3', status: 'Occupied', level: 'Level 2', vehicleType: 'SUV' },
  { id: '20', slot: 'C4', status: 'Available', level: 'Level 2', vehicleType: 'Car' },
];

interface ManageSpaceProps {
  onBack: () => void;
  onUpdateSpaceStatus: (space: SpaceItem, status: SpaceStatus) => Promise<void>;
  spaces: SpaceItem[];
  selectedSpaceId?: string | null;
  lotName?: string;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  onRefresh?: () => Promise<void> | void;
  onNavigateToAddSpace?: () => void;
  onNavigateTab?: (tab: 'Dashboard' | 'Spaces' | 'Reservations' | 'Profile') => void;
}

const getVehicleIcon = (type?: string) => {
  switch ((type || '').toLowerCase()) {
    case 'bike':
      return '🏍️';
    case 'suv':
      return '🚙';
    case 'ev':
      return '⚡';
    case 'any':
      return '🔄';
    case 'car':
    default:
      return '🚗';
  }
};

export default function ManageSpaceScreen({
  onBack,
  onUpdateSpaceStatus,
  spaces,
  selectedSpaceId,
  lotName = 'One Galle Face Mall — Ground Floor',
  isLoading = false,
  error = null,
  onRetry,
  onRefresh,
  onNavigateToAddSpace,
  onNavigateTab,
}: ManageSpaceProps) {
  const insets = useSafeAreaInsets();
  const topPadding = Math.max(
    insets.top,
    Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) : 0
  );
  const bottomNavPadding =
    Math.max(insets.bottom, Platform.OS === 'ios' ? 12 : 8) + (insets.bottom > 0 ? 4 : 2);

  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'All' | 'Available' | 'Reserved' | 'Occupied'>('All');
  const [refreshing, setRefreshing] = useState(false);

  // Modal Sheet State
  const [selectedSpace, setSelectedSpace] = useState<SpaceItem | null>(null);
  const [newStatus, setNewStatus] = useState<SpaceStatus>('Available');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const selectedSlotLabel = spaces.find((item) => item.id === selectedSpaceId)?.slot || null;

  // Compute counts
  const availableCount = spaces.filter((s) => s.status === 'Available').length;
  const reservedCount = spaces.filter((s) => s.status === 'Reserved').length;
  const occupiedCount = spaces.filter((s) => s.status === 'Occupied').length;
  const totalCount = spaces.length;

  // Filtered spaces
  const filteredSpaces = spaces.filter((s) => {
    const matchesFilter = activeFilter === 'All' || s.status === activeFilter;
    const query = searchQuery.trim().toLowerCase();
    const matchesSearch =
      s.slot.toLowerCase().includes(query) ||
      (s.level && s.level.toLowerCase().includes(query)) ||
      (s.vehicleType && s.vehicleType.toLowerCase().includes(query));
    return matchesFilter && matchesSearch;
  });

  const handleTilePress = (space: SpaceItem) => {
    setSelectedSpace(space);
    setNewStatus(space.status);
    setIsModalVisible(true);
  };

  const handleSaveStatus = async () => {
    if (!selectedSpace || isSaving) return;
    setIsSaving(true);
    try {
      await onUpdateSpaceStatus(selectedSpace, newStatus);
      setIsModalVisible(false);
      setSelectedSpace(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Please try again.';
      Alert.alert('Unable to update space', message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRefresh = async () => {
    if (!onRefresh) return;
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <View style={[styles.safeArea, { paddingTop: topPadding }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={onBack}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Manage Spaces</Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {selectedSlotLabel ? `Selected: ${selectedSlotLabel} · ${lotName}` : lotName}
          </Text>
        </View>
        {onNavigateToAddSpace && (
          <TouchableOpacity
            style={styles.addSpaceHeaderBtn}
            onPress={onNavigateToAddSpace}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Add Space"
          >
            <Text style={styles.addSpaceHeaderBtnText}>+ Add Space</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search space number, floor, or vehicle type..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="characters"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Text style={styles.clearSearch}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter Tabs Horizontal */}
      <View style={styles.filtersWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersContainer}
        >
          {/* All */}
          <TouchableOpacity
            style={[styles.filterPill, activeFilter === 'All' && styles.filterPillActive]}
            onPress={() => setActiveFilter('All')}
            activeOpacity={0.8}
          >
            <Text style={[styles.filterPillText, activeFilter === 'All' && styles.filterPillTextActive]}>
              All
            </Text>
            <View style={[styles.countBadge, activeFilter === 'All' && styles.countBadgeActive]}>
              <Text style={[styles.countBadgeText, activeFilter === 'All' && styles.countBadgeTextActive]}>
                {totalCount}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Available */}
          <TouchableOpacity
            style={[styles.filterPill, activeFilter === 'Available' && styles.filterPillActive]}
            onPress={() => setActiveFilter('Available')}
            activeOpacity={0.8}
          >
            <Text style={[styles.filterPillText, activeFilter === 'Available' && styles.filterPillTextActive]}>
              Available
            </Text>
            <View style={[styles.countBadge, activeFilter === 'Available' && styles.countBadgeActive]}>
              <Text style={[styles.countBadgeText, activeFilter === 'Available' && styles.countBadgeTextActive]}>
                {availableCount}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Reserved */}
          <TouchableOpacity
            style={[styles.filterPill, activeFilter === 'Reserved' && styles.filterPillActive]}
            onPress={() => setActiveFilter('Reserved')}
            activeOpacity={0.8}
          >
            <Text style={[styles.filterPillText, activeFilter === 'Reserved' && styles.filterPillTextActive]}>
              Reserved
            </Text>
            <View style={[styles.countBadge, activeFilter === 'Reserved' && styles.countBadgeActive]}>
              <Text style={[styles.countBadgeText, activeFilter === 'Reserved' && styles.countBadgeTextActive]}>
                {reservedCount}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Occupied */}
          <TouchableOpacity
            style={[styles.filterPill, activeFilter === 'Occupied' && styles.filterPillActive]}
            onPress={() => setActiveFilter('Occupied')}
            activeOpacity={0.8}
          >
            <Text style={[styles.filterPillText, activeFilter === 'Occupied' && styles.filterPillTextActive]}>
              Occupied
            </Text>
            <View style={[styles.countBadge, activeFilter === 'Occupied' && styles.countBadgeActive]}>
              <Text style={[styles.countBadgeText, activeFilter === 'Occupied' && styles.countBadgeTextActive]}>
                {occupiedCount}
              </Text>
            </View>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Grid Subheader */}
      <View style={styles.gridHeaderRow}>
        <Text style={styles.gridHeaderCount}>SHOWING {filteredSpaces.length} SPACES</Text>
        <Text style={styles.gridHeaderHint}>Tap tile to override status (FR-11)</Text>
      </View>

      {/* Error state */}
      {error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorText}>{error}</Text>
          {onRetry && (
            <TouchableOpacity style={styles.retryButton} onPress={onRetry} activeOpacity={0.8}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : null}

      {/* Loading state */}
      {isLoading && spaces.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0F766E" />
          <Text style={styles.loadingText}>Loading parking spaces…</Text>
        </View>
      ) : (
        /* Spaces Grid */
        <ScrollView
          style={styles.gridScroll}
          contentContainerStyle={[styles.gridContainer, { paddingBottom: bottomNavPadding + 70 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            onRefresh ? (
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#0F766E']} />
            ) : undefined
          }
        >
          {filteredSpaces.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>🅿️</Text>
              <Text style={styles.emptyTitle}>No parking spaces found</Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery
                  ? `No spaces match "${searchQuery}".`
                  : 'Get started by adding the first parking space to this facility.'}
              </Text>
              {onNavigateToAddSpace && (
                <TouchableOpacity
                  style={styles.emptyActionBtn}
                  onPress={onNavigateToAddSpace}
                  activeOpacity={0.85}
                >
                  <Text style={styles.emptyActionBtnText}>+ Add First Space</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View style={styles.tilesRow}>
              {filteredSpaces.map((space) => {
                const isAvail = space.status === 'Available';
                const isRes = space.status === 'Reserved';
                const isOcc = space.status === 'Occupied';
                const vIcon = getVehicleIcon(space.vehicleType);

                return (
                  <TouchableOpacity
                    key={space.id}
                    style={[
                      styles.spaceTile,
                      isAvail && styles.tileAvailable,
                      isRes && styles.tileReserved,
                      isOcc && styles.tileOccupied,
                      selectedSpaceId === space.id && styles.selectedSpaceTile,
                    ]}
                    onPress={() => handleTilePress(space)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.tileTopRow}>
                      <Text style={styles.tileSlot}>{space.slot}</Text>
                      <Text style={styles.tileVehicleIcon}>{vIcon}</Text>
                    </View>

                    {space.level ? (
                      <Text style={styles.tileLevelText} numberOfLines={1}>
                        {space.level}
                      </Text>
                    ) : null}

                    <View style={styles.tileStatusRow}>
                      {isAvail && (
                        <>
                          <Text style={styles.availCheck}>✓</Text>
                          <Text style={styles.availLabel}>Available</Text>
                        </>
                      )}
                      {isRes && (
                        <>
                          <Text style={styles.resIcon}>⏱</Text>
                          <Text style={styles.resLabel}>Reserved</Text>
                        </>
                      )}
                      {isOcc && (
                        <>
                          <Text style={styles.occIcon}>⛔</Text>
                          <Text style={styles.occLabel}>Occupied</Text>
                        </>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </ScrollView>
      )}

      {/* Bottom Navigation Bar */}
      {onNavigateTab && (
        <View style={[styles.bottomNav, { paddingBottom: bottomNavPadding }]}>
          <TouchableOpacity
            style={styles.navItem}
            onPress={() => onNavigateTab('Dashboard')}
            activeOpacity={0.7}
          >
            <Text style={styles.navIcon}>📊</Text>
            <Text style={styles.navLabel}>Dashboard</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navItem}
            onPress={() => onNavigateTab('Spaces')}
            activeOpacity={0.7}
          >
            <Text style={[styles.navIcon, styles.navIconActive]}>🎛️</Text>
            <Text style={[styles.navLabel, styles.navLabelActive]}>Spaces</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navItem}
            onPress={() => onNavigateTab('Reservations')}
            activeOpacity={0.7}
          >
            <Text style={styles.navIcon}>📋</Text>
            <Text style={styles.navLabel}>Reservations</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navItem}
            onPress={() => onNavigateTab('Profile')}
            activeOpacity={0.7}
          >
            <Text style={styles.navIcon}>👤</Text>
            <Text style={styles.navLabel}>Profile</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Manual Status Override Modal Bottom Sheet */}
      <Modal
        visible={isModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setIsModalVisible(false)}
        >
          <Pressable
            style={[
              styles.bottomSheet,
              { paddingBottom: Math.max(insets.bottom, 16) + 16 },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Sheet Header */}
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetTitle}>Update Space {selectedSpace?.slot}</Text>
                <Text style={styles.sheetSubtitle}>
                  {selectedSpace?.level ? `${selectedSpace.level} · ` : ''}Manual Status Override (FR-11)
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsModalVisible(false)}
                style={styles.sheetCloseBtn}
              >
                <Text style={styles.sheetCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Change Status To Label */}
            <Text style={styles.changeLabel}>CHANGE STATUS TO:</Text>

            {/* 3 Status Selector Options */}
            <View style={styles.statusOptionsRow}>
              {/* Available */}
              <TouchableOpacity
                style={[
                  styles.optionButton,
                  styles.optionAvailable,
                  newStatus === 'Available' && styles.optionSelectedAvailable,
                ]}
                onPress={() => setNewStatus('Available')}
              >
                <Text
                  style={[
                    styles.optionText,
                    styles.optionTextAvailable,
                    newStatus === 'Available' && styles.optionTextSelectedWhite,
                  ]}
                >
                  Available
                </Text>
              </TouchableOpacity>

              {/* Reserved */}
              <TouchableOpacity
                style={[
                  styles.optionButton,
                  styles.optionReserved,
                  newStatus === 'Reserved' && styles.optionSelectedReserved,
                ]}
                onPress={() => setNewStatus('Reserved')}
              >
                <Text
                  style={[
                    styles.optionText,
                    styles.optionTextReserved,
                    newStatus === 'Reserved' && styles.optionTextSelectedWhite,
                  ]}
                >
                  Reserved
                </Text>
              </TouchableOpacity>

              {/* Occupied */}
              <TouchableOpacity
                style={[
                  styles.optionButton,
                  styles.optionOccupied,
                  newStatus === 'Occupied' && styles.optionSelectedOccupied,
                ]}
                onPress={() => setNewStatus('Occupied')}
              >
                <Text
                  style={[
                    styles.optionText,
                    styles.optionTextOccupied,
                    newStatus === 'Occupied' && styles.optionTextSelectedWhite,
                  ]}
                >
                  Occupied
                </Text>
              </TouchableOpacity>
            </View>

            {/* Save CTA */}
            <TouchableOpacity
              style={[styles.saveBtn, isSaving && styles.saveBtnDisabled]}
              onPress={handleSaveStatus}
              disabled={isSaving}
              activeOpacity={0.85}
            >
              {isSaving ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.saveBtnText}>Save Space Status</Text>
              )}
            </TouchableOpacity>

            <View style={styles.sheetFooter}>
              <Text style={styles.clockFooterIcon}>🕒</Text>
              <Text style={styles.footerInfoText}>
                Changes are synchronized in real-time across staff and driver apps.
              </Text>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  backArrow: {
    fontSize: 32,
    color: '#1E293B',
    lineHeight: 32,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '500',
  },
  addSpaceHeaderBtn: {
    backgroundColor: '#0F766E',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    marginLeft: 8,
  },
  addSpaceHeaderBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  selectedSpaceTile: {
    borderWidth: 2,
    borderColor: '#0F766E',
    shadowColor: '#0F766E',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
  },
  searchIcon: {
    fontSize: 14,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
    paddingVertical: 0,
  },
  clearSearch: {
    fontSize: 14,
    color: '#94A3B8',
    padding: 4,
  },
  filtersWrapper: {
    paddingBottom: 8,
  },
  filtersContainer: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 24,
    paddingVertical: 6,
    paddingHorizontal: 14,
    gap: 6,
  },
  filterPillActive: {
    backgroundColor: '#134E4A',
  },
  filterPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  filterPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  countBadge: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
  },
  countBadgeActive: {
    backgroundColor: '#0F3C39',
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  countBadgeTextActive: {
    color: '#99F6E4',
  },
  gridHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 8,
  },
  gridHeaderCount: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: 0.5,
  },
  gridHeaderHint: {
    fontSize: 11,
    color: '#64748B',
  },
  gridScroll: {
    flex: 1,
  },
  gridContainer: {
    paddingHorizontal: 16,
  },
  tilesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
  },
  spaceTile: {
    width: '48%',
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 10,
    marginBottom: 8,
  },
  tileTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  tileAvailable: {
    backgroundColor: '#F0FDF4',
    borderColor: '#86EFAC',
  },
  tileReserved: {
    backgroundColor: '#FEFCE8',
    borderColor: '#FDE047',
  },
  tileOccupied: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  tileSlot: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  tileVehicleIcon: {
    fontSize: 16,
  },
  tileLevelText: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 6,
    fontWeight: '500',
  },
  tileStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  availCheck: {
    fontSize: 12,
    color: '#16A34A',
    fontWeight: '800',
  },
  availLabel: {
    fontSize: 12,
    color: '#16A34A',
    fontWeight: '700',
  },
  resIcon: {
    fontSize: 12,
  },
  resLabel: {
    fontSize: 12,
    color: '#CA8A04',
    fontWeight: '700',
  },
  occIcon: {
    fontSize: 12,
  },
  occLabel: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '700',
  },
  errorContainer: {
    marginHorizontal: 16,
    marginVertical: 12,
    padding: 14,
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
    borderWidth: 1,
    borderRadius: 12,
    alignItems: 'center',
  },
  errorIcon: {
    fontSize: 24,
    marginBottom: 6,
  },
  errorText: {
    fontSize: 13,
    color: '#991B1B',
    textAlign: 'center',
    marginBottom: 10,
    fontWeight: '500',
  },
  retryButton: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  emptyActionBtn: {
    backgroundColor: '#0F766E',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  emptyActionBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 10,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 8,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  navIcon: {
    fontSize: 20,
    marginBottom: 2,
    opacity: 0.5,
  },
  navIconActive: {
    opacity: 1,
  },
  navLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  navLabelActive: {
    color: '#0F766E',
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  sheetSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '500',
  },
  sheetCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetCloseText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '700',
  },
  changeLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  statusOptionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 24,
  },
  optionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionAvailable: {
    backgroundColor: '#F0FDF4',
    borderColor: '#86EFAC',
  },
  optionReserved: {
    backgroundColor: '#FEFCE8',
    borderColor: '#FDE047',
  },
  optionOccupied: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  optionSelectedAvailable: {
    backgroundColor: '#16A34A',
    borderColor: '#16A34A',
  },
  optionSelectedReserved: {
    backgroundColor: '#CA8A04',
    borderColor: '#CA8A04',
  },
  optionSelectedOccupied: {
    backgroundColor: '#DC2626',
    borderColor: '#DC2626',
  },
  optionText: {
    fontSize: 13,
    fontWeight: '700',
  },
  optionTextAvailable: {
    color: '#16A34A',
  },
  optionTextReserved: {
    color: '#CA8A04',
  },
  optionTextOccupied: {
    color: '#DC2626',
  },
  optionTextSelectedWhite: {
    color: '#FFFFFF',
  },
  saveBtn: {
    backgroundColor: '#F26419',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  saveBtnDisabled: {
    opacity: 0.7,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  sheetFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  clockFooterIcon: {
    fontSize: 12,
  },
  footerInfoText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
    textAlign: 'center',
    flex: 1,
  },
});
