import React from 'react';
import {
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
  onAddSpace?: () => void;
}

const lotImage = 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=600&q=80';
const altImage = 'https://images.unsplash.com/photo-1590674899484-d5640e854abe?auto=format&fit=crop&w=600&q=80';

export default function SpaceListScreen({ spaces, onBack, onSelectSpace, onAddSpace }: SpaceListScreenProps) {
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
        {spaces.map((space, index) => {
          const status = space.status;
          const isAvailable = status === 'Available';
          const isReserved = status === 'Reserved';
          const isOccupied = status === 'Occupied';

          return (
            <TouchableOpacity
              key={space.id}
              style={[
                styles.card,
                isAvailable && styles.cardAvailable,
                isReserved && styles.cardReserved,
                isOccupied && styles.cardOccupied,
              ]}
              onPress={() => onSelectSpace(space)}
              activeOpacity={0.9}
            >
              <View style={styles.contentRow}>
                <View style={styles.imageContainer}>
                  <Image
                    source={{ uri: index % 2 === 0 ? lotImage : altImage }}
                    style={styles.image}
                    resizeMode="cover"
                  />
                </View>

                <View style={styles.infoColumn}>
                  <View style={styles.statusRow}>
                    <View
                      style={[
                        styles.badge,
                        isAvailable && styles.badgeAvailable,
                        isReserved && styles.badgeReserved,
                        isOccupied && styles.badgeOccupied,
                      ]}
                    >
                      <Text style={styles.checkIcon}>✓</Text>
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

                    <View style={styles.distanceWrap}>
                      <Text style={styles.distanceIcon}>📍</Text>
                      <Text style={styles.distanceText}>0.{(index + 1) * 4} km</Text>
                    </View>
                  </View>

                  <Text style={styles.nameText} numberOfLines={1}>
                    {space.location || 'One Galle Face Mall'}
                  </Text>
                  <Text style={styles.addressText} numberOfLines={1}>
                    {space.level || 'Level 3'} · {space.slot}
                  </Text>

                  <View style={styles.bottomRow}>
                    <View style={styles.capacityRow}>
                      <Text style={styles.remainingSpacesText}>
                        <Text style={styles.remainingSpacesBold}>{status === 'Available' ? '1' : status === 'Reserved' ? '0' : '0'}</Text>
                        /1 left
                      </Text>
                      <View style={styles.coveredBadge}>
                        <Text style={styles.coveredBadgeText}>Covered</Text>
                      </View>
                    </View>

                    <Text style={styles.priceContainer}>
                      <Text style={styles.priceBold}>Rs. {status === 'Available' ? '150' : status === 'Reserved' ? '140' : '130'}</Text>
                      <Text style={styles.priceUnit}>/hr</Text>
                    </Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
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
  contentRow: {
    flexDirection: 'row',
  },
  imageContainer: {
    width: 96,
    height: 96,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#E2E8F0',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  infoColumn: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'space-between',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  checkIcon: {
    fontSize: 10,
    fontWeight: '800',
    marginRight: 4,
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
  distanceWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  distanceIcon: {
    fontSize: 11,
    marginRight: 4,
  },
  distanceText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
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
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  capacityRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  remainingSpacesText: {
    fontSize: 12,
    color: '#475569',
  },
  remainingSpacesBold: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  coveredBadge: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginLeft: 8,
  },
  coveredBadgeText: {
    fontSize: 11,
    color: '#334155',
    fontWeight: '700',
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  priceBold: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  priceUnit: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '700',
  },
});
