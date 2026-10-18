import React, { useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native';
import { Colors } from '../../constants/colors';
import { SpaceItem } from './ManageSpaceScreen';

interface AddSpaceScreenProps {
  onBack: () => void;
  onSave: (space: SpaceItem) => Promise<number | void> | number | void;
  authorizedLotName?: string;
  isStaff?: boolean;
  existingSpaces?: SpaceItem[];
}

const VEHICLE_TYPES = [
  { id: 'Car', label: 'Car 🚗' },
  { id: 'Bike', label: 'Bike 🏍️' },
  { id: 'SUV', label: 'SUV 🚙' },
  { id: 'EV', label: 'EV ⚡' },
  { id: 'any', label: 'Any Vehicle 🔄' },
];

const COMMON_FLOORS = [
  'Ground Floor',
  'Level 1',
  'Level 2',
  'Level 3',
  'Basement 1',
  'Basement 2',
];

export interface SpaceValidationResult {
  valid: boolean;
  spaces: string[];
  error?: string;
  count: number;
  isRange: boolean;
  isList: boolean;
  summaryText?: string;
}

export function parseAndValidateSpaces(
  rawInput: string,
  existingSpacesList?: string[]
): SpaceValidationResult {
  const clean = rawInput.trim().toUpperCase();
  if (!clean) {
    return {
      valid: false,
      spaces: [],
      error: 'Please enter a space number or range (e.g. A9, A1-A20, or A1, A2).',
      count: 0,
      isRange: false,
      isList: false,
    };
  }

  // 1. Check comma-separated list of individual slots (e.g. "A1, A2, A3")
  if (clean.includes(',')) {
    const rawTokens = clean.split(',').map((s) => s.trim()).filter(Boolean);
    if (rawTokens.length === 0) {
      return {
        valid: false,
        spaces: [],
        error: 'Please enter valid space identifiers separated by commas.',
        count: 0,
        isRange: false,
        isList: true,
      };
    }
    if (rawTokens.length > 100) {
      return {
        valid: false,
        spaces: [],
        error: `Cannot add more than 100 spaces in a single batch (found ${rawTokens.length}).`,
        count: 0,
        isRange: false,
        isList: true,
      };
    }

    const seen = new Set<string>();
    const spaces: string[] = [];

    for (const token of rawTokens) {
      if (!/^[A-Z0-9_-]{1,20}$/.test(token)) {
        return {
          valid: false,
          spaces: [],
          error: `Space "${token}" is invalid. Use 1-20 alphanumeric characters or hyphens only.`,
          count: 0,
          isRange: false,
          isList: true,
        };
      }
      if (seen.has(token)) {
        return {
          valid: false,
          spaces: [],
          error: `Duplicate space "${token}" detected in your input.`,
          count: 0,
          isRange: false,
          isList: true,
        };
      }
      seen.add(token);
      spaces.push(token);
    }

    // Check against existing spaces in lot
    if (existingSpacesList && existingSpacesList.length > 0) {
      const existingSet = new Set(existingSpacesList.map((s) => s.toUpperCase()));
      const duplicate = spaces.find((s) => existingSet.has(s));
      if (duplicate) {
        return {
          valid: false,
          spaces,
          error: `Space "${duplicate}" already exists in this facility.`,
          count: spaces.length,
          isRange: false,
          isList: true,
        };
      }
    }

    return {
      valid: true,
      spaces,
      count: spaces.length,
      isRange: false,
      isList: true,
      summaryText: `${spaces.length} individual spaces: ${spaces.join(', ')}`,
    };
  }

  // 2. Check range format: e.g. "A1-A20", "B01-B10", "1-20"
  const rangeMatch = clean.match(/^([A-Z0-9_*-]*?)(\d+)\s*-\s*([A-Z0-9_*-]*?)(\d+)$/);
  if (rangeMatch && clean.includes('-')) {
    const prefix1 = rangeMatch[1];
    const numStr1 = rangeMatch[2];
    const prefix2 = rangeMatch[3];
    const numStr2 = rangeMatch[4];

    if (prefix1 !== prefix2) {
      return {
        valid: false,
        spaces: [],
        error: `Prefixes in range must match (e.g. A1-A20, not ${prefix1}${numStr1}-${prefix2}${numStr2}).`,
        count: 0,
        isRange: true,
        isList: false,
      };
    }

    const start = parseInt(numStr1, 10);
    const end = parseInt(numStr2, 10);

    if (isNaN(start) || isNaN(end)) {
      return {
        valid: false,
        spaces: [],
        error: 'Range must contain valid numeric slot numbers.',
        count: 0,
        isRange: true,
        isList: false,
      };
    }

    if (start > end) {
      return {
        valid: false,
        spaces: [],
        error: `Start slot number (${start}) cannot be greater than end slot number (${end}).`,
        count: 0,
        isRange: true,
        isList: false,
      };
    }

    const count = end - start + 1;
    if (count > 100) {
      return {
        valid: false,
        spaces: [],
        error: `Cannot add more than 100 spaces in a single range (requested ${count} spaces).`,
        count: 0,
        isRange: true,
        isList: false,
      };
    }

    // Preserve zero padding if start number had leading zeros (e.g. "01")
    const padLength = numStr1.length > 1 && numStr1.startsWith('0') ? numStr1.length : 0;
    const spaces: string[] = [];
    for (let i = start; i <= end; i++) {
      const paddedNum = padLength > 0 ? String(i).padStart(padLength, '0') : String(i);
      spaces.push(`${prefix1}${paddedNum}`);
    }

    // Check against existing spaces in lot
    if (existingSpacesList && existingSpacesList.length > 0) {
      const existingSet = new Set(existingSpacesList.map((s) => s.toUpperCase()));
      const duplicate = spaces.find((s) => existingSet.has(s));
      if (duplicate) {
        return {
          valid: false,
          spaces,
          error: `Space "${duplicate}" in this range already exists in this facility.`,
          count: spaces.length,
          isRange: true,
          isList: false,
        };
      }
    }

    return {
      valid: true,
      spaces,
      count: spaces.length,
      isRange: true,
      isList: false,
      summaryText: `${count} spaces from ${spaces[0]} to ${spaces[spaces.length - 1]}`,
    };
  }

  // 3. Single space format: e.g. "A9", "B-12", "101", "P01"
  if (!/^[A-Z0-9_-]{1,20}$/.test(clean)) {
    return {
      valid: false,
      spaces: [],
      error: 'Invalid space identifier. Use 1-20 alphanumeric characters or hyphens (e.g. A9, A1-A20, or B-12).',
      count: 0,
      isRange: false,
      isList: false,
    };
  }

  // Check against existing spaces in lot
  if (existingSpacesList && existingSpacesList.length > 0) {
    const existingSet = new Set(existingSpacesList.map((s) => s.toUpperCase()));
    if (existingSet.has(clean)) {
      return {
        valid: false,
        spaces: [clean],
        error: `Space "${clean}" already exists in this facility.`,
        count: 1,
        isRange: false,
        isList: false,
      };
    }
  }

  return {
    valid: true,
    spaces: [clean],
    count: 1,
    isRange: false,
    isList: false,
    summaryText: `Single space ${clean}`,
  };
}

export default function AddSpaceScreen({
  onBack,
  onSave,
  authorizedLotName = 'One Galle Face Mall',
  isStaff = true,
  existingSpaces = [],
}: AddSpaceScreenProps) {
  const [lotName, setLotName] = useState(authorizedLotName);
  const [level, setLevel] = useState('Ground Floor');
  const [capacity, setCapacity] = useState('');
  const [selectedVehicleType, setSelectedVehicleType] = useState('Car');

  const [lotError, setLotError] = useState('');
  const [levelError, setLevelError] = useState('');
  const [capacityError, setCapacityError] = useState('');
  const [vehicleTypeError, setVehicleTypeError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Extract known existing space numbers for pre-flight duplicate checking
  const existingSpaceNumbers = useMemo(() => {
    return existingSpaces.map((s) => s.slot);
  }, [existingSpaces]);

  // Real-time live validation for space input
  const liveSpaceValidation = useMemo(() => {
    if (!capacity.trim()) return null;
    return parseAndValidateSpaces(capacity, existingSpaceNumbers);
  }, [capacity, existingSpaceNumbers]);

  const validateAll = (): { hasError: boolean; spaces: string[]; cleanLot: string; cleanLevel: string } => {
    let hasError = false;

    // 1. Lot Validation
    const cleanLot = (isStaff && authorizedLotName ? authorizedLotName : lotName).trim();
    if (!cleanLot) {
      setLotError('Please enter a parking lot or facility name.');
      hasError = true;
    } else if (cleanLot.length < 2 || cleanLot.length > 100) {
      setLotError('Facility name must be between 2 and 100 characters.');
      hasError = true;
    } else {
      setLotError('');
    }

    // 2. Floor / Level Validation
    const cleanLevel = level.trim();
    if (!cleanLevel) {
      setLevelError('Please enter a floor or level (e.g. Ground Floor, Level 1).');
      hasError = true;
    } else if (cleanLevel.length > 50) {
      setLevelError('Floor name cannot exceed 50 characters.');
      hasError = true;
    } else if (!/[A-Za-z0-9]/.test(cleanLevel)) {
      setLevelError('Floor name must contain at least one letter or number.');
      hasError = true;
    } else {
      setLevelError('');
    }

    // 3. Vehicle Type Validation
    if (!selectedVehicleType) {
      setVehicleTypeError('Please select a compatible vehicle type.');
      hasError = true;
    } else {
      setVehicleTypeError('');
    }

    // 4. Space Validation
    const spaceValidation = parseAndValidateSpaces(capacity, existingSpaceNumbers);
    if (!spaceValidation.valid) {
      setCapacityError(spaceValidation.error || 'Please enter a valid space number or range.');
      hasError = true;
      return { hasError, spaces: [], cleanLot, cleanLevel };
    } else {
      setCapacityError('');
    }

    return { hasError, spaces: spaceValidation.spaces, cleanLot, cleanLevel };
  };

  const executeSave = async (spaces: string[], cleanLot: string, cleanLevel: string) => {
    const nextSpace: SpaceItem = {
      id: `${Date.now()}`,
      slot: spaces[0],
      status: 'Available',
      location: cleanLot,
      level: cleanLevel,
      vehicleType: selectedVehicleType,
      spaceNumbers: spaces,
    };

    setIsSubmitting(true);
    try {
      const savedCount = await onSave(nextSpace);
      const count = savedCount ?? spaces.length;
      const spaceRangeText = spaces.length > 1
        ? `${spaces[0]}-${spaces[spaces.length - 1]}`
        : spaces[0];

      Alert.alert(
        'Space Added Successfully! ✅',
        `${count} space(s) (${spaceRangeText}) created for ${cleanLot} (${cleanLevel}).`,
        [{ text: 'OK', onPress: onBack }]
      );
    } catch (err: any) {
      const message = err instanceof Error ? err.message : 'Please check details and try again.';
      if (message.toLowerCase().includes('already exists') || message.toLowerCase().includes('duplicate')) {
        setCapacityError(message);
      } else {
        Alert.alert('Unable to save space', message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSave = async () => {
    if (isSubmitting) return;

    const { hasError, spaces, cleanLot, cleanLevel } = validateAll();
    if (hasError) return;

    // If bulk creating > 10 spaces, prompt confirmation to prevent accidental mass creation
    if (spaces.length > 10) {
      Alert.alert(
        'Confirm Bulk Space Creation 🅿️',
        `You are about to add ${spaces.length} spaces (${spaces[0]} to ${spaces[spaces.length - 1]}) to ${cleanLot} on ${cleanLevel}.\n\nDo you want to proceed?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: `Create ${spaces.length} Spaces`,
            style: 'default',
            onPress: () => executeSave(spaces, cleanLot, cleanLevel),
          },
        ]
      );
      return;
    }

    await executeSave(spaces, cleanLot, cleanLevel);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton} activeOpacity={0.8}>
            <Text style={styles.backArrow}>‹</Text>
          </TouchableOpacity>
          <View style={styles.headerTextWrap}>
            <Text style={styles.title}>Add Space</Text>
            <Text style={styles.subtitle}>Create new parking slots in this facility</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.form} showsVerticalScrollIndicator={false}>
          {/* Facility / Lot */}
          <View style={styles.fieldGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Parking Lot / Facility</Text>
              {!isStaff && <Text style={styles.charCount}>{lotName.trim().length}/100</Text>}
            </View>
            {isStaff && authorizedLotName ? (
              <View style={styles.lockedLotBadge}>
                <Text style={styles.lockedLotText}>🏢 {authorizedLotName}</Text>
                <Text style={styles.lockedLotHint}>Assigned facility (authorized)</Text>
              </View>
            ) : (
              <TextInput
                value={lotName}
                onChangeText={(text) => {
                  setLotName(text);
                  if (lotError) setLotError('');
                }}
                maxLength={100}
                style={[styles.input, lotError ? styles.inputError : null]}
                placeholder="e.g. One Galle Face Mall"
                placeholderTextColor={Colors.placeholder}
                autoCapitalize="words"
              />
            )}
            {lotError ? <Text style={styles.errorText}>⚠️ {lotError}</Text> : null}
          </View>

          {/* Floor / Level */}
          <View style={styles.fieldGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Floor / Level</Text>
              <Text style={styles.charCount}>{level.trim().length}/50</Text>
            </View>

            {/* Quick floor chips */}
            <View style={styles.quickChipsRow}>
              {COMMON_FLOORS.map((floorItem) => {
                const isSelected = level.trim().toLowerCase() === floorItem.toLowerCase();
                return (
                  <TouchableOpacity
                    key={floorItem}
                    style={[styles.quickChip, isSelected && styles.quickChipSelected]}
                    onPress={() => {
                      setLevel(floorItem);
                      if (levelError) setLevelError('');
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.quickChipText, isSelected && styles.quickChipTextSelected]}>
                      {floorItem}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TextInput
              value={level}
              onChangeText={(text) => {
                setLevel(text);
                if (levelError) setLevelError('');
              }}
              maxLength={50}
              style={[styles.input, levelError ? styles.inputError : null]}
              placeholder="e.g. Ground Floor, Level 1, B2"
              placeholderTextColor={Colors.placeholder}
            />
            {levelError ? (
              <Text style={styles.errorText}>⚠️ {levelError}</Text>
            ) : (
              <Text style={styles.helpText}>Select a preset above or type a custom floor (max 50 chars).</Text>
            )}
          </View>

          {/* Compatible Vehicle Type */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Compatible Vehicle Type</Text>
            <View style={styles.vehicleTypeChipsRow}>
              {VEHICLE_TYPES.map((type) => {
                const isSelected = selectedVehicleType === type.id;
                return (
                  <TouchableOpacity
                    key={type.id}
                    style={[
                      styles.vehicleTypeChip,
                      isSelected && styles.vehicleTypeChipSelected,
                    ]}
                    onPress={() => {
                      setSelectedVehicleType(type.id);
                      if (vehicleTypeError) setVehicleTypeError('');
                    }}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.vehicleTypeChipText,
                        isSelected && styles.vehicleTypeChipTextSelected,
                      ]}
                    >
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {vehicleTypeError ? <Text style={styles.errorText}>⚠️ {vehicleTypeError}</Text> : null}
          </View>

          {/* Space Identifier / Capacity Range */}
          <View style={styles.fieldGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Space Identifier / Number</Text>
              {liveSpaceValidation && (
                <Text
                  style={[
                    styles.validationBadge,
                    liveSpaceValidation.valid ? styles.validationBadgeValid : styles.validationBadgeInvalid,
                  ]}
                >
                  {liveSpaceValidation.valid
                    ? `✓ ${liveSpaceValidation.count} ${liveSpaceValidation.count === 1 ? 'Space' : 'Spaces'}`
                    : '✕ Invalid'}
                </Text>
              )}
            </View>

            <TextInput
              value={capacity}
              onChangeText={(text) => {
                setCapacity(text);
                if (capacityError) setCapacityError('');
              }}
              style={[
                styles.input,
                capacityError || (liveSpaceValidation && !liveSpaceValidation.valid)
                  ? styles.inputError
                  : liveSpaceValidation && liveSpaceValidation.valid
                  ? styles.inputValid
                  : null,
              ]}
              placeholder="e.g. A9, A1-A20, or A1, A2"
              placeholderTextColor={Colors.placeholder}
              autoCapitalize="characters"
              autoCorrect={false}
            />

            {capacityError ? (
              <Text style={styles.errorText}>⚠️ {capacityError}</Text>
            ) : liveSpaceValidation && !liveSpaceValidation.valid ? (
              <Text style={styles.errorText}>⚠️ {liveSpaceValidation.error}</Text>
            ) : liveSpaceValidation && liveSpaceValidation.valid ? (
              <Text style={styles.successText}>✅ {liveSpaceValidation.summaryText}</Text>
            ) : (
              <Text style={styles.helpText}>
                Accepts single space (e.g. A9), range (e.g. A1-A20, max 100), or comma-separated list (e.g. A1, A2).
              </Text>
            )}
          </View>

          {/* Preview Card */}
          <View style={styles.previewCard}>
            <View style={styles.previewHeaderRow}>
              <Text style={styles.previewLabel}>PREVIEW & VALIDATION</Text>
              <View
                style={[
                  styles.statusTag,
                  !capacity.trim()
                    ? styles.statusTagNeutral
                    : liveSpaceValidation?.valid
                    ? styles.statusTagSuccess
                    : styles.statusTagError,
                ]}
              >
                <Text
                  style={[
                    styles.statusTagText,
                    !capacity.trim()
                      ? styles.statusTagTextNeutral
                      : liveSpaceValidation?.valid
                      ? styles.statusTagTextSuccess
                      : styles.statusTagTextError,
                  ]}
                >
                  {!capacity.trim()
                    ? 'Enter Space'
                    : liveSpaceValidation?.valid
                    ? 'Ready to Save'
                    : 'Check Format'}
                </Text>
              </View>
            </View>

            <View style={styles.previewRow}>
              <Text style={styles.previewTitle} numberOfLines={1}>
                {liveSpaceValidation?.valid
                  ? liveSpaceValidation.count === 1
                    ? `Space ${liveSpaceValidation.spaces[0]}`
                    : `${liveSpaceValidation.count} Spaces (${liveSpaceValidation.spaces[0]}–${liveSpaceValidation.spaces[liveSpaceValidation.spaces.length - 1]})`
                  : capacity.trim()
                  ? capacity.trim().toUpperCase()
                  : 'Space Slot'}
              </Text>
              <Text style={styles.previewVehicleBadge}>{selectedVehicleType}</Text>
            </View>

            {/* List preview if range or list */}
            {liveSpaceValidation?.valid && liveSpaceValidation.spaces.length > 1 && (
              <View style={styles.spacesPreviewList}>
                <Text style={styles.spacesPreviewListLabel}>Generated slots:</Text>
                <Text style={styles.spacesPreviewListText}>
                  {liveSpaceValidation.spaces.length <= 6
                    ? liveSpaceValidation.spaces.join(', ')
                    : `${liveSpaceValidation.spaces.slice(0, 5).join(', ')} ... ${liveSpaceValidation.spaces[liveSpaceValidation.spaces.length - 1]} (${liveSpaceValidation.count} total)`}
                </Text>
              </View>
            )}

            <Text style={styles.previewMeta}>
              🏢 {(isStaff && authorizedLotName ? authorizedLotName : lotName) || 'Facility'} · 📍 {level || 'Floor'}
            </Text>
          </View>

          {/* Save Button */}
          <TouchableOpacity
            style={[
              styles.saveButton,
              isSubmitting || (liveSpaceValidation && !liveSpaceValidation.valid)
                ? styles.saveButtonDisabled
                : null,
            ]}
            onPress={handleSave}
            disabled={isSubmitting}
            activeOpacity={0.9}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.saveButtonText}>
                {liveSpaceValidation?.valid && liveSpaceValidation.count > 1
                  ? `Save ${liveSpaceValidation.count} Spaces to Facility`
                  : 'Save Space to Facility'}
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
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
  headerTextWrap: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  form: {
    padding: 16,
    paddingBottom: 40,
  },
  fieldGroup: {
    marginBottom: 16,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  charCount: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
  },
  validationBadge: {
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  validationBadgeValid: {
    backgroundColor: '#DCFCE7',
    color: '#166534',
  },
  validationBadgeInvalid: {
    backgroundColor: '#FEE2E2',
    color: '#991B1B',
  },
  quickChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  quickChip: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  quickChipSelected: {
    backgroundColor: '#0F766E',
    borderColor: '#0F766E',
  },
  quickChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  quickChipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
  },
  inputError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  inputValid: {
    borderColor: '#22C55E',
  },
  errorText: {
    fontSize: 12,
    color: '#DC2626',
    marginTop: 4,
    fontWeight: '500',
  },
  successText: {
    fontSize: 12,
    color: '#15803D',
    marginTop: 4,
    fontWeight: '600',
  },
  helpText: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 4,
  },
  lockedLotBadge: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  lockedLotText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  lockedLotHint: {
    fontSize: 11,
    color: '#0F766E',
    marginTop: 2,
    fontWeight: '600',
  },
  vehicleTypeChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  vehicleTypeChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
  },
  vehicleTypeChipSelected: {
    backgroundColor: '#0F766E',
    borderColor: '#0F766E',
  },
  vehicleTypeChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  vehicleTypeChipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  previewCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 14,
    marginTop: 4,
    marginBottom: 20,
  },
  previewHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  previewLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.8,
  },
  statusTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusTagNeutral: {
    backgroundColor: '#F1F5F9',
  },
  statusTagSuccess: {
    backgroundColor: '#DCFCE7',
  },
  statusTagError: {
    backgroundColor: '#FEE2E2',
  },
  statusTagText: {
    fontSize: 10,
    fontWeight: '700',
  },
  statusTagTextNeutral: {
    color: '#64748B',
  },
  statusTagTextSuccess: {
    color: '#15803D',
  },
  statusTagTextError: {
    color: '#B91C1C',
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  previewTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    flex: 1,
    marginRight: 8,
  },
  previewVehicleBadge: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F766E',
    backgroundColor: '#CCFBF1',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  spacesPreviewList: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 8,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  spacesPreviewListLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  spacesPreviewListText: {
    fontSize: 12,
    color: '#0F766E',
    fontWeight: '600',
  },
  previewMeta: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  saveButton: {
    backgroundColor: '#F26419',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
