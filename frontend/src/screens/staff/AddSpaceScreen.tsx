import React, { useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Colors } from '../../constants/colors';
import { SpaceItem, SpaceStatus } from './ManageSpaceScreen';

interface AddSpaceScreenProps {
  onBack: () => void;
  onSave: (space: SpaceItem) => Promise<void> | void;
}

export default function AddSpaceScreen({ onBack, onSave }: AddSpaceScreenProps) {
  const [lotName, setLotName] = useState('One Galle Face Mall');
  const [level, setLevel] = useState('Level 3');
  const [slot, setSlot] = useState('L3-A15');
  const [status, setStatus] = useState<SpaceStatus>('Available');

  const slotLabel = useMemo(() => {
    if (!slot.trim()) {
      return 'L3-A15';
    }
    return slot.trim().toUpperCase();
  }, [slot]);

  const handleSave = async () => {
    const cleanLot = lotName.trim() || 'One Galle Face Mall';
    const cleanLevel = level.trim() || 'Level 3';
    const cleanSlot = slotLabel || 'L3-A15';

    if (!cleanSlot) {
      Alert.alert('Missing Space', 'Please add a space slot number.');
      return;
    }

    const nextSpace: SpaceItem = {
      id: `${Date.now()}`,
      slot: cleanSlot,
      status,
      location: cleanLot,
      level: cleanLevel,
    };

    try {
      await onSave(nextSpace);
      Alert.alert('Space Added', `${cleanSlot} has been added to ${cleanLot} (${cleanLevel}).`);
      onBack();
    } catch (error) {
      // Error is already surfaced in App-level alert.
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
              onChangeText={setLotName}
              style={styles.input}
              placeholder="One Galle Face Mall"
              placeholderTextColor={Colors.placeholder}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Level</Text>
            <TextInput
              value={level}
              onChangeText={setLevel}
              style={styles.input}
              placeholder="Level 3"
              placeholderTextColor={Colors.placeholder}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Space Number</Text>
            <TextInput
              value={slot}
              onChangeText={setSlot}
              style={styles.input}
              placeholder="L3-A15"
              placeholderTextColor={Colors.placeholder}
              autoCapitalize="characters"
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Initial Status</Text>
            <View style={styles.statusRow}>
              {(['Available', 'Reserved', 'Occupied'] as SpaceStatus[]).map((option) => (
                <Pressable
                  key={option}
                  onPress={() => setStatus(option)}
                  style={[
                    styles.statusOption,
                    status === option && styles.statusOptionSelected,
                    option === 'Available' && styles.statusAvailable,
                    option === 'Reserved' && styles.statusReserved,
                    option === 'Occupied' && styles.statusOccupied,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      status === option && styles.statusTextSelected,
                      option === 'Available' && styles.statusTextAvailable,
                      option === 'Reserved' && styles.statusTextReserved,
                      option === 'Occupied' && styles.statusTextOccupied,
                    ]}
                  >
                    {option}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.previewCard}>
            <Text style={styles.previewLabel}>Preview</Text>
            <Text style={styles.previewTitle}>{cleanSlotPreview(slotLabel, level)}</Text>
            <Text style={styles.previewMeta}>{lotName || 'One Galle Face Mall'} · {level || 'Level 3'} · {status}</Text>
          </View>

          <TouchableOpacity style={styles.saveButton} onPress={handleSave} activeOpacity={0.9}>
            <Text style={styles.saveButtonText}>Save Space</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const cleanSlotPreview = (slot: string, level: string) => {
  const cleanSlot = slot.trim() || 'L3-A15';
  const cleanLevel = level.trim() || 'Level 3';
  return `${cleanLevel} - ${cleanSlot}`;
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
  statusRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  statusOption: {
    flex: 1,
    minWidth: 90,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusOptionSelected: {
    borderWidth: 2,
  },
  statusAvailable: {
    backgroundColor: '#ECFDF5',
    borderColor: '#10B981',
  },
  statusReserved: {
    backgroundColor: '#FFF7ED',
    borderColor: '#F59E0B',
  },
  statusOccupied: {
    backgroundColor: '#FEE2E2',
    borderColor: '#EF4444',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  statusTextSelected: {
    color: '#FFFFFF',
  },
  statusTextAvailable: {
    color: '#047857',
  },
  statusTextReserved: {
    color: '#B45309',
  },
  statusTextOccupied: {
    color: '#B91C1C',
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
  saveButton: {
    backgroundColor: '#0F766E',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
