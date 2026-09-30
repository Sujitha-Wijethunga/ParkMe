import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  StatusBar,
  TextInput,
  Modal,
  Pressable,
} from 'react-native';
import { Colors } from '../../constants/colors';

export type SpaceStatus = 'Available' | 'Reserved' | 'Occupied';

export interface SpaceItem {
  id: string;
  slot: string;
  status: SpaceStatus;
}

export const initialSpaces: SpaceItem[] = [
  { id: '1', slot: 'A1', status: 'Occupied' },
  { id: '2', slot: 'A2', status: 'Available' },
  { id: '3', slot: 'A3', status: 'Reserved' },
  { id: '4', slot: 'A4', status: 'Available' },
  { id: '5', slot: 'A5', status: 'Reserved' },
  { id: '6', slot: 'A6', status: 'Available' },
  { id: '7', slot: 'A7', status: 'Occupied' },
  { id: '8', slot: 'A8', status: 'Available' },
  { id: '9', slot: 'B1', status: 'Available' },
  { id: '10', slot: 'B2', status: 'Occupied' },
  { id: '11', slot: 'B3', status: 'Available' },
  { id: '12', slot: 'B4', status: 'Reserved' },
  { id: '13', slot: 'B5', status: 'Available' },
  { id: '14', slot: 'B6', status: 'Available' },
  { id: '15', slot: 'B7', status: 'Available' },
  { id: '16', slot: 'B8', status: 'Occupied' },
  { id: '17', slot: 'C1', status: 'Reserved' },
  { id: '18', slot: 'C2', status: 'Available' },
  { id: '19', slot: 'C3', status: 'Occupied' },
  { id: '20', slot: 'C4', status: 'Available' },
  { id: '21', slot: 'C5', status: 'Available' },
  { id: '22', slot: 'C6', status: 'Reserved' },
  { id: '23', slot: 'C7', status: 'Available' },
  { id: '24', slot: 'C8', status: 'Available' },
  { id: '25', slot: 'D1', status: 'Available' },
  { id: '26', slot: 'D2', status: 'Occupied' },
  { id: '27', slot: 'D3', status: 'Available' },
  { id: '28', slot: 'D4', status: 'Reserved' },
  { id: '29', slot: 'D5', status: 'Available' },
  { id: '30', slot: 'D6', status: 'Available' },
  { id: '31', slot: 'D7', status: 'Occupied' },
  { id: '32', slot: 'D8', status: 'Available' },
];

interface ManageSpaceProps {
  onBack: () => void;
  spaces: SpaceItem[];
  setSpaces: React.Dispatch<React.SetStateAction<SpaceItem[]>>;
}

export default function ManageSpaceScreen({ onBack, spaces, setSpaces }: ManageSpaceProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'All' | 'Available' | 'Reserved' | 'Occupied'>('All');

  // Modal Sheet State
  const [selectedSpace, setSelectedSpace] = useState<SpaceItem | null>(null);
  const [newStatus, setNewStatus] = useState<SpaceStatus>('Available');
  const [isModalVisible, setIsModalVisible] = useState(false);

  // Compute counts
  const availableCount = spaces.filter((s) => s.status === 'Available').length;
  const reservedCount = spaces.filter((s) => s.status === 'Reserved').length;
  const occupiedCount = spaces.filter((s) => s.status === 'Occupied').length;
  const totalCount = spaces.length;

  // Filtered spaces
  const filteredSpaces = spaces.filter((s) => {
    const matchesFilter = activeFilter === 'All' || s.status === activeFilter;
    const matchesSearch = s.slot.toLowerCase().includes(searchQuery.trim().toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const handleTilePress = (space: SpaceItem) => {
    setSelectedSpace(space);
    setNewStatus(space.status);
    setIsModalVisible(true);
  };

  const handleSaveStatus = () => {
    if (!selectedSpace) return;
    setSpaces((prev) =>
      prev.map((item) =>
        item.id === selectedSpace.id ? { ...item, status: newStatus } : item
      )
    );
    setIsModalVisible(false);
    setSelectedSpace(null);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
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
          <Text style={styles.headerTitle}>Manage Space</Text>
          <Text style={styles.headerSubtitle}>One Galle Face Mall- Ground Floor</Text>
        </View>
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search space number (e.g. A3, B2)..."
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

      {/* 4-Column Spaces Grid */}
      <ScrollView
        style={styles.gridScroll}
        contentContainerStyle={styles.gridContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.tilesRow}>
          {filteredSpaces.map((space) => {
            const isAvail = space.status === 'Available';
            const isRes = space.status === 'Reserved';
            const isOcc = space.status === 'Occupied';

            return (
              <TouchableOpacity
                key={space.id}
                style={[
                  styles.spaceTile,
                  isAvail && styles.tileAvailable,
                  isRes && styles.tileReserved,
                  isOcc && styles.tileOccupied,
                ]}
                onPress={() => handleTilePress(space)}
                activeOpacity={0.7}
              >
                <Text style={styles.tileSlot}>{space.slot}</Text>
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
      </ScrollView>

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
          <Pressable style={styles.bottomSheet} onPress={(e) => e.stopPropagation()}>
            {/* Sheet Header */}
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetTitle}>Update Space {selectedSpace?.slot}</Text>
                <Text style={styles.sheetSubtitle}>Manual Status Override (FR-11)</Text>
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

            {/* Big Orange Save CTA */}
            <TouchableOpacity
              style={styles.saveBtn}
              onPress={handleSaveStatus}
              activeOpacity={0.85}
            >
              <Text style={styles.saveBtnText}>Save Space Status</Text>
            </TouchableOpacity>

            {/* Last updated footer info */}
            <View style={styles.sheetFooter}>
              <Text style={styles.clockFooterIcon}>🕒</Text>
              <Text style={styles.footerInfoText}>
                Last updated 2 min ago by Staff #204
              </Text>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
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
    fontSize: 26,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '500',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: {
    fontSize: 14,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    paddingVertical: 0,
  },
  clearSearch: {
    fontSize: 14,
    color: '#94A3B8',
    padding: 4,
  },
  filtersWrapper: {
    paddingBottom: 10,
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
    paddingTop: 8,
    paddingBottom: 10,
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
    paddingBottom: 32,
  },
  tilesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
  },
  spaceTile: {
    width: '23%',
    aspectRatio: 1.05,
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
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
    marginBottom: 4,
  },
  tileStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  availCheck: {
    fontSize: 11,
    fontWeight: '900',
    color: '#15803D',
  },
  availLabel: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#15803D',
  },
  resIcon: {
    fontSize: 9,
  },
  resLabel: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#A16207',
  },
  occIcon: {
    fontSize: 8.5,
  },
  occLabel: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#B91C1C',
  },

  /* ── Bottom Sheet Modal ── */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 10,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  sheetTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
  },
  sheetSubtitle: {
    fontSize: 12.5,
    color: '#64748B',
    marginTop: 2,
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
    fontSize: 16,
    color: '#475569',
    fontWeight: '700',
  },
  changeLabel: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#334155',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  statusOptionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
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
  optionSelectedAvailable: {
    backgroundColor: '#16A34A',
    borderColor: '#16A34A',
  },
  optionReserved: {
    backgroundColor: '#FEFCE8',
    borderColor: '#FDE047',
  },
  optionSelectedReserved: {
    backgroundColor: '#B45309',
    borderColor: '#B45309',
  },
  optionOccupied: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
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
    color: '#15803D',
  },
  optionTextReserved: {
    color: '#A16207',
  },
  optionTextOccupied: {
    color: '#B91C1C',
  },
  optionTextSelectedWhite: {
    color: '#FFFFFF',
  },
  saveBtn: {
    backgroundColor: '#F26419',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#F26419',
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    marginBottom: 16,
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.2,
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
    fontSize: 12,
    color: '#64748B',
  },
});
