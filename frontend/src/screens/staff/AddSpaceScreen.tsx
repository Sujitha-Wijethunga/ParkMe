import React, { useMemo, useState } from 'react';
import {
  Alert,
  Image,
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
import * as ImagePicker from 'expo-image-picker';
import { Colors } from '../../constants/colors';
import { SpaceItem } from './ManageSpaceScreen';

interface AddSpaceScreenProps {
  onBack: () => void;
  onSave: (space: SpaceItem) => Promise<number | void> | number | void;
  authorizedLotName?: string;
  isStaff?: boolean;
}

const VEHICLE_TYPES = [
  { id: 'Car', label: 'Car 🚗' },
  { id: 'Bike', label: 'Bike 🏍️' },
  { id: 'SUV', label: 'SUV 🚙' },
  { id: 'EV', label: 'EV ⚡' },
  { id: 'any', label: 'Any Vehicle 🔄' },
];

export default function AddSpaceScreen({
  onBack,
  onSave,
  authorizedLotName = 'One Galle Face Mall',
  isStaff = true,
}: AddSpaceScreenProps) {
  const [lotName, setLotName] = useState(authorizedLotName);
  const [level, setLevel] = useState('Ground Floor');
  const [capacity, setCapacity] = useState('');
  const [selectedVehicleType, setSelectedVehicleType] = useState('Car');
  const [spaceImage, setSpaceImage] = useState<ImagePicker.ImagePickerAsset | null>(null);

  const [lotError, setLotError] = useState('');
  const [levelError, setLevelError] = useState('');
  const [capacityError, setCapacityError] = useState('');
  const [vehicleTypeError, setVehicleTypeError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const chooseImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled) {
        const asset = result.assets[0];
        if (!asset) {
          throw new Error('The photo picker did not return an image.');
        }
        setSpaceImage(asset);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Please try again.';
      Alert.alert('Unable to select image', message);
    }
  };

  const capacityLabel = useMemo(() => capacity.trim().toUpperCase(), [capacity]);

  const handleSave = async () => {
    if (isSubmitting) return;

    let hasError = false;
    const cleanLot = (isStaff && authorizedLotName ? authorizedLotName : lotName).trim();
    const cleanLevel = level.trim();
    const cleanCapacity = capacity.trim().toUpperCase();

    if (!cleanLot) {
      setLotError('Please enter a parking lot or facility name.');
      hasError = true;
    } else {
      setLotError('');
    }

    if (!cleanLevel) {
      setLevelError('Please enter a floor or zone (e.g. Ground Floor, Level 1).');
      hasError = true;
    } else {
      setLevelError('');
    }

    if (!cleanCapacity) {
      setCapacityError('Please enter space identifier (e.g. A9 or A1-A20).');
      hasError = true;
    } else {
      setCapacityError('');
    }

    if (!selectedVehicleType) {
      setVehicleTypeError('Please select a compatible vehicle type.');
      hasError = true;
    } else {
      setVehicleTypeError('');
    }

    if (hasError) return;

    let spaceNumbers: string[];
    try {
      spaceNumbers = expandSpaceCapacity(cleanCapacity);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Use a space format like A9 or A1-A20.';
      setCapacityError(msg);
      Alert.alert('Invalid space format', msg);
      return;
    }

    let imageMimeType: string | undefined;
    if (spaceImage) {
      imageMimeType = resolveImageMimeType(spaceImage);
      if (!imageMimeType) {
        Alert.alert('Unsupported image', 'Please choose a JPEG, PNG, or WebP image.');
        return;
      }
    }

    const nextSpace: SpaceItem = {
      id: `${Date.now()}`,
      slot: spaceNumbers[0],
      status: 'Available',
      location: cleanLot,
      level: cleanLevel,
      vehicleType: selectedVehicleType,
      imageUri: spaceImage?.uri,
      imageMimeType,
      imageFile: spaceImage?.file,
      spaceNumbers,
    };

    setIsSubmitting(true);
    try {
      const savedCount = await onSave(nextSpace);
      const count = savedCount ?? spaceNumbers.length;
      const spaceRangeText = spaceNumbers.length > 1
        ? `${spaceNumbers[0]}-${spaceNumbers[spaceNumbers.length - 1]}`
        : spaceNumbers[0];
      Alert.alert(
        'Space Added Successfully! ✅',
        `${count} space(s) (${spaceRangeText}) created for ${cleanLot} (${cleanLevel}).`,
        [{ text: 'OK', onPress: onBack }]
      );
    } catch (err: any) {
      const message = err instanceof Error ? err.message : 'Please check details and try again.';
      if (message.toLowerCase().includes('already exists') || message.toLowerCase().includes('duplicate')) {
        setCapacityError(message);
      }
    } finally {
      setIsSubmitting(false);
    }
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
            <Text style={styles.subtitle}>Create a new parking slot in this facility</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.form} showsVerticalScrollIndicator={false}>
          {/* Facility / Lot */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Parking Lot / Facility</Text>
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
                style={[styles.input, lotError ? styles.inputError : null]}
                placeholder="e.g. One Galle Face Mall"
                placeholderTextColor={Colors.placeholder}
                autoCapitalize="words"
              />
            )}
            {lotError ? <Text style={styles.errorText}>{lotError}</Text> : null}
          </View>

          {/* Floor / Level */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Floor / Level</Text>
            <TextInput
              value={level}
              onChangeText={(text) => {
                setLevel(text);
                if (levelError) setLevelError('');
              }}
              style={[styles.input, levelError ? styles.inputError : null]}
              placeholder="e.g. Ground Floor, Level 1, B2"
              placeholderTextColor={Colors.placeholder}
            />
            {levelError ? <Text style={styles.errorText}>{levelError}</Text> : null}
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
            {vehicleTypeError ? <Text style={styles.errorText}>{vehicleTypeError}</Text> : null}
          </View>

          {/* Space Identifier / Capacity Range */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Space Identifier / Number</Text>
            <TextInput
              value={capacity}
              onChangeText={(text) => {
                setCapacity(text);
                if (capacityError) setCapacityError('');
              }}
              style={[styles.input, capacityError ? styles.inputError : null]}
              placeholder="e.g. A9 or range A1-A20"
              placeholderTextColor={Colors.placeholder}
              autoCapitalize="characters"
            />
            {capacityError ? <Text style={styles.errorText}>{capacityError}</Text> : null}
            <Text style={styles.helpText}>Enter single slot (e.g. A9) or range with letter prefix (e.g. A1-A20).</Text>
          </View>

          {/* Optional Space Image */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Space Photo (Optional)</Text>
            {spaceImage ? (
              <View style={styles.imagePreviewWrap}>
                <Image source={{ uri: spaceImage.uri }} style={styles.imagePreview} />
                <TouchableOpacity
                  onPress={() => setSpaceImage(null)}
                  style={styles.removeImageButton}
                  accessibilityRole="button"
                  accessibilityLabel="Remove selected image"
                >
                  <Text style={styles.removeImageText}>Remove image</Text>
                </TouchableOpacity>
              </View>
            ) : null}
            <TouchableOpacity
              style={styles.chooseImageButton}
              onPress={chooseImage}
              activeOpacity={0.85}
            >
              <Text style={styles.chooseImageText}>
                {spaceImage ? 'Choose a different image' : '📸 Choose image from phone (Optional)'}
              </Text>
            </TouchableOpacity>
            <Text style={styles.helpText}>JPEG, PNG, or WebP · Optional · Maximum 10 MB</Text>
          </View>

          {/* Preview Card */}
          <View style={styles.previewCard}>
            <Text style={styles.previewLabel}>PREVIEW</Text>
            <View style={styles.previewRow}>
              <Text style={styles.previewTitle}>{capacityLabel || 'Space Slot'}</Text>
              <Text style={styles.previewVehicleBadge}>{selectedVehicleType}</Text>
            </View>
            <Text style={styles.previewMeta}>
              {(isStaff && authorizedLotName ? authorizedLotName : lotName) || 'Facility'} · {level || 'Floor'}
            </Text>
          </View>

          {/* Save Button */}
          <TouchableOpacity
            style={[styles.saveButton, isSubmitting ? styles.saveButtonDisabled : null]}
            onPress={handleSave}
            disabled={isSubmitting}
            activeOpacity={0.9}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.saveButtonText}>Save Space to Facility</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const expandSpaceCapacity = (capacity: string): string[] => {
  const clean = capacity.trim().toUpperCase();
  // Support single space format like A1, B12, C105
  const singleMatch = clean.match(/^([A-Z]+)(\d+)$/);
  if (singleMatch) {
    return [clean];
  }

  // Support range format like A1-A20
  const rangeMatch = clean.match(/^([A-Z]+)(\d+)-([A-Z]+)(\d+)$/);
  if (!rangeMatch || rangeMatch[1] !== rangeMatch[3]) {
    throw new Error('Enter a single slot (e.g. A9) or a range with matching prefix (e.g. A1-A20).');
  }

  const start = Number(rangeMatch[2]);
  const end = Number(rangeMatch[4]);
  const count = end - start + 1;
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 1 || count < 1 || count > 100) {
    throw new Error('The range must be ascending and contain between 1 and 100 spaces.');
  }

  return Array.from({ length: count }, (_, index) => `${rangeMatch[1]}${start + index}`);
};

const resolveImageMimeType = (asset: ImagePicker.ImagePickerAsset) => {
  const mimeTypeByExtension: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    gif: 'image/gif',
  };

  const mimeType = asset.mimeType?.toLowerCase();
  if (mimeType && (Object.values(mimeTypeByExtension).includes(mimeType) || mimeType.startsWith('image/'))) {
    return mimeType === 'image/jpg' ? 'image/jpeg' : mimeType;
  }

  const uriExtension = asset.uri.split(/[?#]/, 1)[0].split('.').pop()?.toLowerCase();
  if (uriExtension && mimeTypeByExtension[uriExtension]) {
    return mimeTypeByExtension[uriExtension];
  }

  const fileExtension = asset.fileName?.split('.').pop()?.toLowerCase();
  if (fileExtension && mimeTypeByExtension[fileExtension]) {
    return mimeTypeByExtension[fileExtension];
  }

  return 'image/jpeg';
};

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
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
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
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 4,
    fontWeight: '500',
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
  imagePreviewWrap: {
    marginBottom: 8,
    borderRadius: 10,
    overflow: 'hidden',
  },
  imagePreview: {
    width: '100%',
    height: 140,
    borderRadius: 10,
  },
  removeImageButton: {
    paddingVertical: 6,
    alignItems: 'center',
  },
  removeImageText: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '600',
  },
  chooseImageButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#94A3B8',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  chooseImageText: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '600',
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
  previewLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  previewTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
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
  previewMeta: {
    fontSize: 12,
    color: '#64748B',
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
