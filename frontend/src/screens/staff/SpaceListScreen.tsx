import React from 'react';
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Image,
} from 'react-native';
import { SpaceItem } from './ManageSpaceScreen';

interface SpaceListScreenProps {
  spaces: SpaceItem[];
  onBack: () => void;
  onSelectSpace: (space: SpaceItem) => void;
  onDeleteSpace: (space: SpaceItem) => Promise<void>;
  onAddSpace?: () => void;
}

export default function SpaceListScreen({ spaces, onBack, onSelectSpace, onDeleteSpace, onAddSpace }: SpaceListScreenProps) {
  const confirmDelete = (space: SpaceItem) => {
    Alert.alert(
      'Delete parking space?',
      `Are you sure you want to delete ${space.slot}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, delete',
          style: 'destructive',
          onPress: () => {
            void onDeleteSpace(space).catch((error: unknown) => {
              const message = error instanceof Error ? error.message : 'Please try again.';
              Alert.alert('Could not delete space', message);
            });
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton} activeOpacity={0.8}>
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>
        <View style={styles.headerTextWrap}>
          <Text style={styles.title}>Parking Spaces</Text>
          <Text style={styles.subtitle}>All spaces in your lot</Text>
        </View>
        {onAddSpace && (
          <TouchableOpacity style={styles.addButton} onPress={onAddSpace} activeOpacity={0.85}>
            <Text style={styles.addButtonText}>Add Space</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.listContainer} showsVerticalScrollIndicator={false}>
        {spaces.map((space) => {
          const status = space.status;
          const isAvailable = status === 'Available';
          const isReserved = status === 'Reserved';
          const isOccupied = status === 'Occupied';

          return (
            <View
              key={space.id}
              style={[
                styles.card,
                isAvailable && styles.cardAvailable,
                isReserved && styles.cardReserved,
                isOccupied && styles.cardOccupied,
              ]}
            >
              {space.imageUrl ? (
                <Image source={{ uri: space.imageUrl }} style={styles.spaceImage} resizeMode="cover" />
              ) : null}
              <TouchableOpacity
                style={styles.cardContent}
                onPress={() => onSelectSpace(space)}
                activeOpacity={0.8}
              >
                <Text style={styles.nameText} numberOfLines={1}>
                  {space.location || 'One Galle Face Mall'}
                </Text>
                <Text style={styles.addressText} numberOfLines={1}>
                  {space.level || 'Level 3'} · {space.slot}
                </Text>
                <View
                  style={[
                    styles.badge,
                    isAvailable && styles.badgeAvailable,
                    isReserved && styles.badgeReserved,
                    isOccupied && styles.badgeOccupied,
                  ]}
                >
                  <Text
                    style={[
                      styles.badgeText,
                      isAvailable && styles.badgeTextAvailable,
                      isReserved && styles.badgeTextReserved,
                      isOccupied && styles.badgeTextOccupied,
                    ]}
                  >
                    {status}
                  </Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => confirmDelete(space)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={`Delete space ${space.slot}`}
              >
                <Text style={styles.deleteIcon}>🗑️</Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
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
  addButton: {
    backgroundColor: '#0F766E',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    marginLeft: 8,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 24,
    gap: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 2,
  },
  cardAvailable: {
    borderColor: '#A7F3D0',
  },
  cardReserved: {
    borderColor: '#FCD34D',
  },
  cardOccupied: {
    borderColor: '#FCA5A5',
  },
  cardContent: {
    flex: 1,
    gap: 8,
  },
  spaceImage: {
    width: 76,
    height: 76,
    borderRadius: 12,
    backgroundColor: '#E2E8F0',
    marginRight: 12,
  },
  deleteButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  deleteIcon: {
    fontSize: 19,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeAvailable: {
    backgroundColor: '#D1FAE5',
    borderColor: '#6EE7B7',
  },
  badgeReserved: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FCD34D',
  },
  badgeOccupied: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  badgeTextAvailable: {
    color: '#047857',
  },
  badgeTextReserved: {
    color: '#B45309',
  },
  badgeTextOccupied: {
    color: '#B91C1C',
  },
  nameText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 6,
  },
  addressText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
});
