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
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Colors } from '../../constants/colors';
import { SpaceItem } from './ManageSpaceScreen';

interface AddSpaceScreenProps {
  onBack: () => void;
  onSave: (space: SpaceItem) => Promise<number | void> | number | void;
}

export default function AddSpaceScreen({ onBack, onSave }: AddSpaceScreenProps) {
  const [lotName, setLotName] = useState('');
  const [level, setLevel] = useState('');
  const [capacity, setCapacity] = useState('');
  const [spaceImage, setSpaceImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [lotError, setLotError] = useState('');
  const [levelError, setLevelError] = useState('');
  const [capacityError, setCapacityError] = useState('');
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
    const cleanLot = lotName.trim();
    const cleanLevel = level.trim();
    const cleanCapacity = capacity.trim().toUpperCase();

    if (!cleanLot) {
      setLotError('Please enter a parking lot or building name.');
      hasError = true;
    } else {
      setLotError('');
    }

    if (!cleanLevel) {
      setLevelError('Please enter a parking floor or level.');
      hasError = true;
    } else {
      setLevelError('');
    }

    if (!cleanCapacity) {
      setCapacityError('Please enter space capacity (e.g. A1-A20).');
      hasError = true;
    } else {
      setCapacityError('');
    }

    if (hasError) return;

    let spaceNumbers: string[];
    try {
      spaceNumbers = expandSpaceCapacity(cleanCapacity);
    } catch (error) {
      setCapacityError(error instanceof Error ? error.message : 'Use a range such as A1-A20.');
      Alert.alert(
        'Invalid space capacity',
        error instanceof Error ? error.message : 'Use a range such as A1-A20.'
      );
      return;
    }
    if (!spaceImage) {
      Alert.alert('Image required', 'Please choose an image for these parking spaces.');
      return;
    }
    const imageMimeType = resolveImageMimeType(spaceImage);
    if (!imageMimeType) {
      Alert.alert('Unsupported image', 'Choose a JPEG, PNG, or WebP image.');
      return;
    }

    const nextSpace: SpaceItem = {
      id: `${Date.now()}`,
      slot: spaceNumbers[0],
      status: 'Available',
      location: cleanLot,
      level: cleanLevel,
      imageUri: spaceImage?.uri,
      imageMimeType,
      imageFile: spaceImage?.file,
      spaceNumbers,
    };

    setIsSubmitting(true);
    try {
      const savedCount = await onSave(nextSpace);
      const count = savedCount ?? spaceNumbers.length;
      Alert.alert(
        'Spaces Added',
        `${count} spaces (${spaceNumbers[0]}-${spaceNumbers[spaceNumbers.length - 1]}) have been added to ${cleanLot} (${cleanLevel}).`
      );
      onBack();
    } catch {
      // The app-level save handler already displays the error.
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
            <Text style={styles.subtitle}>Create a new parking slot</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.form} showsVerticalScrollIndicator={false}>
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Lot / Building</Text>
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
            {lotError ? <Text style={styles.errorText}>{lotError}</Text> : null}
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Level</Text>
            <TextInput
              value={level}
              onChangeText={(text) => {
                setLevel(text);
                if (levelError) setLevelError('');
              }}
              style={[styles.input, levelError ? styles.inputError : null]}
              placeholder="e.g. Level 3 or B1"
              placeholderTextColor={Colors.placeholder}
            />
            {levelError ? <Text style={styles.errorText}>{levelError}</Text> : null}
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Space Capacity</Text>
            <TextInput
              value={capacity}
              onChangeText={(text) => {
                setCapacity(text);
                if (capacityError) setCapacityError('');
              }}
              style={[styles.input, capacityError ? styles.inputError : null]}
              placeholder="e.g. A1-A20"
              placeholderTextColor={Colors.placeholder}
              autoCapitalize="characters"
            />
            {capacityError ? <Text style={styles.errorText}>{capacityError}</Text> : null}
            <Text style={styles.helpText}>Enter a range with one letter prefix, such as A1-A20.</Text>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Space Image</Text>
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
                {spaceImage ? 'Choose a different image' : 'Choose image from phone'}
              </Text>
            </TouchableOpacity>
            <Text style={styles.helpText}>JPEG, PNG, or WebP · Optional · Maximum 10 MB</Text>
          </View>

          <View style={styles.previewCard}>
            <Text style={styles.previewLabel}>Preview</Text>
            <Text style={styles.previewTitle}>{capacityLabel || 'Space Range'}</Text>
            <Text style={styles.previewMeta}>{lotName || 'Parking Lot'} · {level || 'Floor / Level'}</Text>
          </View>

          <TouchableOpacity
            style={[styles.saveButton, isSubmitting ? styles.saveButtonDisabled : null]}
            onPress={handleSave}
            disabled={isSubmitting}
            activeOpacity={0.9}
          >
            <Text style={styles.saveButtonText}>{isSubmitting ? 'Saving...' : 'Save Space'}</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const expandSpaceCapacity = (capacity: string) => {
  const match = capacity.match(/^([A-Z]+)(\d+)-([A-Z]+)(\d+)$/);
  if (!match || match[1] !== match[3]) {
    throw new Error('Enter a range using the same letter prefix, such as A1-A20.');
  }

  const start = Number(match[2]);
  const end = Number(match[4]);
  const count = end - start + 1;
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 1 || count < 1 || count > 100) {
    throw new Error('The range must be ascending and contain between 1 and 100 spaces.');
  }

  return Array.from({ length: count }, (_, index) => `${match[1]}${start + index}`);
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
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  backArrow: {
    fontSize: 28,
    lineHeight: 28,
    color: '#0F172A',
  },
  headerTextWrap: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  form: {
    padding: 20,
  },
  fieldGroup: {
    marginBottom: 18,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#0F172A',
  },
  chooseImageButton: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#94A3B8',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
  },
  chooseImageText: {
    color: '#0F766E',
    fontSize: 14,
    fontWeight: '700',
  },
  imagePreviewWrap: {
    marginBottom: 10,
  },
  imagePreview: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    backgroundColor: '#E2E8F0',
  },
  removeImageButton: {
    alignSelf: 'flex-end',
    paddingTop: 8,
  },
  removeImageText: {
    color: '#B91C1C',
    fontSize: 13,
    fontWeight: '600',
  },
  helpText: {
    marginTop: 6,
    color: '#64748B',
    fontSize: 12,
  },
  previewCard: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 16,
    marginTop: 8,
    marginBottom: 24,
  },
  previewLabel: {
    color: '#CBD5E1',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: '700',
  },
  previewTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    marginTop: 8,
  },
  previewMeta: {
    color: '#E2E8F0',
    fontSize: 13,
    marginTop: 6,
  },
  inputError: {
    borderColor: '#DC2626',
  },
  errorText: {
    color: '#DC2626',
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
  saveButton: {
    backgroundColor: '#0F766E',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
