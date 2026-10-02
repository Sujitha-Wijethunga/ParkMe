import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Platform,
  BackHandler,
} from 'react-native';
import { DriverColors } from '../../constants/colors';
import { SAMPLE_NEARBY_PARKING_LOTS } from '../../constants/driverSampleData';
import {
  getSpaceLayoutForLot,
  LotFloor,
  SampleParkingSpace,
  SpaceUIStatus,
  VehicleType,
} from '../../constants/parkingSpaceData';

/* ── Props ──────────────────────────────────────────────────────────────── */

export interface SpaceSelectionResult {
  lotId: string;
  spaceId: string;
  floor: string;
  vehicleType: VehicleType;
  tariffPerHour: number;
}

interface SelectSpaceScreenProps {
  /** Stable lot ID — carried from LotDetailsScreen. */
  lotId: string;
  /** Previously selected space result to preserve when returning from Booking Summary. */
  initialSelection?: SpaceSelectionResult | null;
  /** Returns to LotDetailsScreen for this lot. */
  onBack: () => void;
  /**
   * Called when the user confirms a space selection.
   */
  onContinue: (selection: SpaceSelectionResult) => void;
}

/* ── Vehicle type display config ────────────────────────────────────────── */

const VEHICLE_TYPES: VehicleType[] = ['Car', 'Bike', 'SUV', 'EV'];

const VEHICLE_ICONS: Record<VehicleType, string> = {
  Car: '🚗',
  Bike: '🏍️',
  SUV: '🚙',
  EV: '⚡',
};

/* ── Status colours (matches design legend) ─────────────────────────────── */

type SpaceCellTheme = {
  border: string;
  bg: string;
  iconOrLabel: string;
  labelColor: string;
};

function getTheme(status: SpaceUIStatus, isSelected: boolean, isEV: boolean): SpaceCellTheme {
  if (isSelected) {
    return { border: DriverColors.navyDark, bg: DriverColors.navyDark, iconOrLabel: '✓', labelColor: '#FFFFFF' };
  }
  switch (status) {
    case 'available':
      return isEV
        ? { border: '#3B82F6', bg: '#EFF6FF', iconOrLabel: '⚡', labelColor: DriverColors.navyHeading }
        : { border: '#10B981', bg: '#ECFDF5', iconOrLabel: '✓', labelColor: DriverColors.navyHeading };
    case 'reserved':
      return { border: '#F59E0B', bg: '#FFFBEB', iconOrLabel: '🕐', labelColor: DriverColors.navyHeading };
    case 'occupied':
      return { border: '#EF4444', bg: '#FEF2F2', iconOrLabel: '🚗', labelColor: '#9CA3AF' };
    case 'maintenance':
      return { border: '#D1D5DB', bg: '#F9FAFB', iconOrLabel: '—', labelColor: '#D1D5DB' };
    default:
      return { border: '#D1D5DB', bg: '#F9FAFB', iconOrLabel: '?', labelColor: '#9CA3AF' };
  }
}

function isSelectable(status: SpaceUIStatus): boolean {
  return status === 'available';
}

/* ────────────────────────────────────────────────────────────────────────────
 * SelectSpaceScreen
 *
 * Implements ParkMe-07-SelectSpace design milestone.
 *
 * Selection behaviour:
 *   - Only 'available' spaces are tappable.
 *   - One space selected at a time; tapping another updates selection.
 *   - Switching floors clears selection (floor's spaces are independent).
 *   - Continue is disabled until a valid space is selected.
 *   - No state is written to the backend; selection is local to this screen.
 * ────────────────────────────────────────────────────────────────────────── */
export default function SelectSpaceScreen({
  lotId,
  initialSelection,
  onBack,
  onContinue,
}: SelectSpaceScreenProps) {
  /* Lot metadata */
  const lot = SAMPLE_NEARBY_PARKING_LOTS.find((l) => l.id === lotId);
  const layout = getSpaceLayoutForLot(lotId);

  /* Default floor = first in list that matches design (G preferred, else first). */
  const defaultFloor = useMemo(() => {
    if (!layout) return null;
    return layout.floors.find((f) => f.label === 'G') ?? layout.floors[0];
  }, [layout]);

  const matchingFloor = useMemo(() => {
    if (!layout || !initialSelection || initialSelection.lotId !== lotId) return null;
    return layout.floors.find((f) => f.label === initialSelection.floor) ?? null;
  }, [layout, initialSelection, lotId]);

  const [activeFloor, setActiveFloor] = useState<LotFloor | null>(
    matchingFloor ?? defaultFloor
  );
  const [selectedSpaceId, setSelectedSpaceId] = useState<string | null>(
    initialSelection && initialSelection.lotId === lotId ? initialSelection.spaceId : null
  );
  const [vehicleType, setVehicleType] = useState<VehicleType>(
    initialSelection && initialSelection.lotId === lotId ? initialSelection.vehicleType : 'Car'
  );

  // Android hardware back handler
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onBack();
      return true;
    });
    return () => sub.remove();
  }, [onBack]);

  /* Derived */
  const tariffs = layout?.tariffs ?? { Car: lot?.pricePerHour ?? 0, Bike: 0, SUV: 0, EV: 0 };
  const currentTariff = tariffs[vehicleType];
  const selectedSpace = activeFloor?.spaces.find((s) => s.id === selectedSpaceId) ?? null;

  const availableOnFloor = useMemo(
    () => activeFloor?.spaces.filter((s) => s.uiStatus === 'available').length ?? 0,
    [activeFloor]
  );

  const handleFloorChange = useCallback(
    (floor: LotFloor) => {
      setActiveFloor(floor);
      setSelectedSpaceId(null); // clear selection when changing floors
    },
    []
  );

  const handleSpaceTap = useCallback(
    (space: SampleParkingSpace) => {
      if (!isSelectable(space.uiStatus)) return;
      setSelectedSpaceId((prev) => (prev === space.id ? null : space.id));
    },
    []
  );

  const handleContinue = useCallback(() => {
    if (!selectedSpace || !activeFloor || !lot) return;
    onContinue({
      lotId,
      spaceId: selectedSpace.id,
      floor: activeFloor.label,
      vehicleType,
      tariffPerHour: currentTariff,
    });
  }, [selectedSpace, activeFloor, lot, lotId, vehicleType, currentTariff, onContinue]);

  /* ── Guard: missing lot ──────────────────────────────────────────────── */
  if (!lot) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <View style={styles.errorInner}>
          <Text style={styles.errorEmoji}>🚧</Text>
          <Text style={styles.errorTitle}>Parking lot not found</Text>
          <Text style={styles.errorSubtitle}>
            The lot you were viewing could not be loaded.{'\n'}Please go back and try again.
          </Text>
          <TouchableOpacity style={styles.errorBackBtn} activeOpacity={0.8} onPress={onBack}>
            <Text style={styles.errorBackText}>← Back to Details</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  /* ── Guard: no space layout for this lot ─────────────────────────────── */
  if (!layout || !activeFloor) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <View style={styles.errorInner}>
          <Text style={styles.errorEmoji}>🗺️</Text>
          <Text style={styles.errorTitle}>Space layout unavailable</Text>
          <Text style={styles.errorSubtitle}>
            Space-level data for this lot is not yet available.{'\n'}Please check back later.
          </Text>
          <TouchableOpacity style={styles.errorBackBtn} activeOpacity={0.8} onPress={onBack}>
            <Text style={styles.errorBackText}>← Back to Details</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const canContinue = selectedSpace !== null;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          activeOpacity={0.75}
          onPress={onBack}
          accessibilityLabel="Go back to lot details"
          accessibilityRole="button"
        >
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>
        <View style={styles.headerTitles}>
          <Text style={styles.headerTitle}>Select a Space</Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>{lot.name}</Text>
        </View>
      </View>

      {/* ── Floor Selector ───────────────────────────────────────────────── */}
      <View style={styles.floorRow}>
        <View style={styles.floorChips}>
          <Text style={styles.floorLabel}>FLOOR:</Text>
          {layout.floors.map((floor) => {
            const isActive = activeFloor.label === floor.label;
            return (
              <TouchableOpacity
                key={floor.label}
                style={[styles.floorChip, isActive && styles.floorChipActive]}
                activeOpacity={0.75}
                onPress={() => handleFloorChange(floor)}
                accessibilityRole="button"
                accessibilityLabel={`${floor.name}${isActive ? ', selected' : ''}`}
              >
                <Text style={[styles.floorChipText, isActive && styles.floorChipTextActive]}>
                  {floor.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <Text style={styles.floorAvailCount}>
          <Text style={styles.floorAvailBold}>{availableOnFloor}</Text>
          /{activeFloor.spaces.length} free
        </Text>
      </View>

      {/* ── Main scrollable content ──────────────────────────────────────── */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Legend */}
        <View style={styles.legendRow}>
          <LegendItem color="#10B981" icon="✓" label="Available" />
          <LegendItem color="#F59E0B" icon="🕐" label="Reserved" />
          <LegendItem color="#EF4444" icon="🚗" label="Occupied" />
          <LegendItem color="#3B82F6" icon="⚡" label="EV Spot" />
        </View>

        {/* Entry indicator */}
        <View style={styles.entryRow}>
          <View style={styles.entryBadge}>
            <Text style={styles.entryArrow}>›</Text>
            <Text style={styles.entryText}>ENTRY</Text>
          </View>
          <Text style={styles.tapHint}>Tap an available space to select</Text>
        </View>

        {/* Vehicle Type & Tariff */}
        <View style={styles.tariffSection}>
          <View style={styles.tariffHeaderRow}>
            <Text style={styles.tariffSectionLabel}>VEHICLE TYPE &amp; TARIFF:</Text>
            <View style={styles.tariffBadge}>
              <Text style={styles.tariffBadgeText}>Rs. {currentTariff}/hr</Text>
            </View>
          </View>
          <View style={styles.vehicleTypeRow}>
            {VEHICLE_TYPES.map((vt) => {
              const isActive = vehicleType === vt;
              return (
                <TouchableOpacity
                  key={vt}
                  style={[styles.vehicleBtn, isActive && styles.vehicleBtnActive]}
                  activeOpacity={0.8}
                  onPress={() => setVehicleType(vt)}
                  accessibilityRole="button"
                  accessibilityLabel={`${vt}, Rs. ${tariffs[vt]}/hr${isActive ? ', selected' : ''}`}
                >
                  <Text style={styles.vehicleBtnIcon}>{VEHICLE_ICONS[vt]}</Text>
                  <Text style={[styles.vehicleBtnLabel, isActive && styles.vehicleBtnLabelActive]}>
                    {vt}
                  </Text>
                  <Text style={[styles.vehicleBtnTariff, isActive && styles.vehicleBtnTariffActive]}>
                    Rs. {tariffs[vt]}/h
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Space Grid */}
        <View style={styles.gridSection}>
          {activeFloor.rows.map((rowLabel, rowIndex) => {
            const rowSpaces = activeFloor.spaces.filter((s) => s.row === rowLabel);
            const isLastRow = rowIndex === activeFloor.rows.length - 1;
            return (
              <React.Fragment key={rowLabel}>
                <View style={styles.gridRow}>
                  <Text style={styles.rowLabel}>ROW {rowLabel}</Text>
                  <View style={styles.spacesRow}>
                    {rowSpaces.map((space) => {
                      const isSelected = selectedSpaceId === space.id;
                      const theme = getTheme(space.uiStatus, isSelected, space.isEV);
                      const canTap = isSelectable(space.uiStatus);
                      return (
                        <TouchableOpacity
                          key={space.id}
                          style={[
                            styles.spaceCell,
                            {
                              borderColor: theme.border,
                              backgroundColor: theme.bg,
                            },
                            isSelected && styles.spaceCellSelected,
                            !canTap && styles.spaceCellDisabled,
                          ]}
                          activeOpacity={canTap ? 0.75 : 1}
                          onPress={() => handleSpaceTap(space)}
                          disabled={!canTap}
                          accessibilityRole="button"
                          accessibilityLabel={
                            `Space ${space.id}, ${space.uiStatus}${space.isEV ? ', EV charging' : ''}` +
                            (isSelected ? ', selected' : '')
                          }
                          accessibilityState={{ disabled: !canTap, selected: isSelected }}
                        >
                          <Text style={[styles.spaceIcon, { color: isSelected ? '#FFFFFF' : theme.border }]}>
                            {theme.iconOrLabel}
                          </Text>
                          <Text style={[styles.spaceId, { color: theme.labelColor }]}>
                            {space.id}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
                {/* Driving lane indicator between rows (not after the last row) */}
                {!isLastRow && (
                  <View style={styles.drivingLaneRow}>
                    <View style={styles.drivingLaneLine} />
                    <Text style={styles.drivingLaneText}>← DRIVING LANE →</Text>
                    <View style={styles.drivingLaneLine} />
                  </View>
                )}
              </React.Fragment>
            );
          })}
        </View>

        {/* Selected Space Summary */}
        <View style={[styles.selectedSummaryCard, !selectedSpace && styles.selectedSummaryCardEmpty]}>
          {selectedSpace ? (
            <>
              <View style={styles.selectedInfoIcon}>
                <Text style={styles.selectedInfoIconText}>ℹ</Text>
              </View>
              <View style={styles.selectedInfoText}>
                <Text style={styles.selectedSpaceTitle}>
                  Space {selectedSpace.id} Selected · {VEHICLE_ICONS[vehicleType]} {vehicleType}
                </Text>
                <Text style={styles.selectedSpaceTariff}>
                  Tariff: Rs. {currentTariff}/hr
                </Text>
              </View>
            </>
          ) : (
            <>
              <View style={styles.selectedInfoIcon}>
                <Text style={styles.selectedInfoIconText}>ℹ</Text>
              </View>
              <Text style={styles.noSelectionText}>
                No space selected yet — tap an available (green) space above.
              </Text>
            </>
          )}
        </View>

        {/* Info banner about reserved / occupied states */}
        <View style={styles.noteBanner}>
          <Text style={styles.noteIcon}>⚠</Text>
          <Text style={styles.noteText}>
            <Text style={styles.noteBold}>Note:</Text>
            {' '}Reserved spaces (amber 🕐) will become available when their timer expires.
            Occupied spaces (red 🚗) are taken. Your reservation holds the space for{' '}
            <Text style={styles.noteBold}>15 minutes</Text> after booking.
          </Text>
        </View>

        {/* Bottom spacer so sticky bar doesn't hide content */}
        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* ── Sticky Continue Bar ──────────────────────────────────────────── */}
      <View style={styles.continueBar}>
        <TouchableOpacity
          style={[styles.continueBtn, !canContinue && styles.continueBtnDisabled]}
          activeOpacity={canContinue ? 0.88 : 1}
          onPress={handleContinue}
          disabled={!canContinue}
          accessibilityRole="button"
          accessibilityLabel={
            canContinue
              ? `Continue with Space ${selectedSpace?.id}, Rs. ${currentTariff} per hour`
              : 'Select a space to continue'
          }
          accessibilityState={{ disabled: !canContinue }}
        >
          <Text style={[styles.continueBtnText, !canContinue && styles.continueBtnTextDisabled]}>
            {canContinue
              ? `Continue · Space ${selectedSpace!.id} (Rs. ${currentTariff}/hr) →`
              : 'Select a space to continue'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

/* ── Sub-component: Legend item ─────────────────────────────────────────── */
function LegendItem({ color, icon, label }: { color: string; icon: string; label: string }) {
  return (
    <View style={legendStyles.item}>
      <View style={[legendStyles.dot, { borderColor: color, backgroundColor: color + '22' }]}>
        <Text style={legendStyles.icon}>{icon}</Text>
      </View>
      <Text style={legendStyles.label}>{label}</Text>
    </View>
  );
}

const legendStyles = StyleSheet.create({
  item: { flexDirection: 'row', alignItems: 'center', marginRight: 10, marginBottom: 4 },
  dot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  icon: { fontSize: 10 },
  label: { fontSize: 11.5, color: DriverColors.textBody, fontWeight: '600' },
});

/* ── Styles ─────────────────────────────────────────────────────────────── */
const styles = StyleSheet.create({
  // Error / guard states
  errorContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  errorInner: {
    flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32,
  },
  errorEmoji: { fontSize: 44, marginBottom: 16 },
  errorTitle: {
    fontSize: 20, fontWeight: '800', color: DriverColors.navyHeading,
    marginBottom: 8, textAlign: 'center',
  },
  errorSubtitle: {
    fontSize: 14, color: DriverColors.textSecondary,
    textAlign: 'center', lineHeight: 22, marginBottom: 24,
  },
  errorBackBtn: {
    backgroundColor: DriverColors.navyDark,
    paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24,
  },
  errorBackText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },

  // Main layout
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: DriverColors.borderLight,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: DriverColors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  backArrow: {
    fontSize: 26,
    lineHeight: 28,
    color: DriverColors.navyHeading,
    fontWeight: '600',
  },
  headerTitles: { flex: 1 },
  headerTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: DriverColors.navyHeading,
    letterSpacing: -0.2,
  },
  headerSubtitle: {
    fontSize: 12.5,
    color: DriverColors.textSecondary,
    marginTop: 1,
  },

  // Floor selector
  floorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: DriverColors.borderLight,
  },
  floorChips: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  floorLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: DriverColors.textSecondary,
    letterSpacing: 0.6,
    marginRight: 2,
  },
  floorChip: {
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: DriverColors.cardBorder,
    backgroundColor: '#F8FAFC',
  },
  floorChipActive: {
    backgroundColor: DriverColors.navyDark,
    borderColor: DriverColors.navyDark,
  },
  floorChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: DriverColors.textBody,
  },
  floorChipTextActive: { color: '#FFFFFF' },
  floorAvailCount: {
    fontSize: 12.5,
    color: DriverColors.textSecondary,
    fontWeight: '600',
  },
  floorAvailBold: {
    fontWeight: '800',
    color: DriverColors.navyHeading,
    fontSize: 13,
  },

  // Scroll
  scrollView: { flex: 1, backgroundColor: DriverColors.background },
  scrollContent: { paddingHorizontal: 14, paddingTop: 12 },

  // Legend
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
  },

  // Entry indicator
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  entryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: DriverColors.navyDark,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  entryArrow: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  entryText: { color: '#FFFFFF', fontSize: 11.5, fontWeight: '800', letterSpacing: 0.8 },
  tapHint: { fontSize: 11.5, color: DriverColors.textSecondary, fontStyle: 'italic' },

  // Vehicle type & tariff
  tariffSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: DriverColors.cardBorder,
    padding: 12,
    marginBottom: 14,
  },
  tariffHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  tariffSectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: DriverColors.textSecondary,
    letterSpacing: 0.6,
  },
  tariffBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  tariffBadgeText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: DriverColors.navyDark,
  },
  vehicleTypeRow: {
    flexDirection: 'row',
    gap: 6,
  },
  vehicleBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: DriverColors.cardBorder,
    backgroundColor: '#F8FAFC',
  },
  vehicleBtnActive: {
    backgroundColor: DriverColors.navyDark,
    borderColor: DriverColors.navyDark,
  },
  vehicleBtnIcon: { fontSize: 16, marginBottom: 2 },
  vehicleBtnLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: DriverColors.textBody,
  },
  vehicleBtnLabelActive: { color: '#FFFFFF' },
  vehicleBtnTariff: {
    fontSize: 10,
    color: DriverColors.textSecondary,
    marginTop: 1,
  },
  vehicleBtnTariffActive: { color: 'rgba(255,255,255,0.75)' },

  // Space grid
  gridSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: DriverColors.cardBorder,
    padding: 10,
    marginBottom: 12,
  },
  gridRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 3,
  },
  rowLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: DriverColors.textSecondary,
    letterSpacing: 0.4,
    width: 38,
    flexShrink: 0,
  },
  spacesRow: {
    flex: 1,
    flexDirection: 'row',
    gap: 4,
    flexWrap: 'nowrap',
  },
  spaceCell: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 30,
    maxWidth: 44,
  },
  spaceCellSelected: {
    shadowColor: DriverColors.navyDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 4,
  },
  spaceCellDisabled: { opacity: 0.75 },
  spaceIcon: {
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 12,
  },
  spaceId: {
    fontSize: 8.5,
    fontWeight: '800',
    marginTop: 1,
  },

  // Driving lane
  drivingLaneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
    paddingLeft: 38,
  },
  drivingLaneLine: { flex: 1, height: 1, backgroundColor: DriverColors.borderLight },
  drivingLaneText: {
    fontSize: 9,
    color: DriverColors.textMuted,
    fontWeight: '600',
    marginHorizontal: 8,
    letterSpacing: 0.3,
  },

  // Selected summary card
  selectedSummaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: DriverColors.cardBorder,
    padding: 14,
    marginBottom: 10,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  selectedSummaryCardEmpty: {
    borderStyle: 'dashed',
    borderColor: '#CBD5E1',
  },
  selectedInfoIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  selectedInfoIconText: { fontSize: 16, color: DriverColors.textSecondary },
  selectedInfoText: { flex: 1 },
  selectedSpaceTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: DriverColors.navyHeading,
  },
  selectedSpaceTariff: {
    fontSize: 12.5,
    color: DriverColors.textSecondary,
    marginTop: 2,
  },
  noSelectionText: {
    flex: 1,
    fontSize: 13,
    color: DriverColors.textSecondary,
    lineHeight: 19,
  },

  // Note banner
  noteBanner: {
    flexDirection: 'row',
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 12,
    padding: 12,
    gap: 8,
    marginBottom: 10,
    alignItems: 'flex-start',
  },
  noteIcon: { fontSize: 14, color: '#D97706', marginTop: 1 },
  noteText: { flex: 1, fontSize: 12, color: '#92400E', lineHeight: 18 },
  noteBold: { fontWeight: '800' },

  // Bottom spacer
  bottomSpacer: { height: 100 },

  // Sticky continue bar
  continueBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: DriverColors.borderLight,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'android' ? 16 : 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 12,
  },
  continueBtn: {
    backgroundColor: DriverColors.orangePrimary,
    borderRadius: 28,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: DriverColors.orangePrimary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  continueBtnDisabled: {
    backgroundColor: '#E2E8F0',
    shadowOpacity: 0,
    elevation: 0,
  },
  continueBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.1,
  },
  continueBtnTextDisabled: { color: '#94A3B8' },
});
