import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SearchSuggestionItem } from '../services/parkingService';
import { DriverColors } from '../constants/colors';

interface SearchSuggestionsDropdownProps {
  visible: boolean;
  suggestions: SearchSuggestionItem[];
  isLoading: boolean;
  searchQuery: string;
  hasError?: boolean;
  onSelectSuggestion: (item: SearchSuggestionItem) => void;
  onDismiss?: () => void;
}

export default function SearchSuggestionsDropdown({
  visible,
  suggestions,
  isLoading,
  searchQuery,
  hasError = false,
  onSelectSuggestion,
  onDismiss,
}: SearchSuggestionsDropdownProps) {
  if (!visible || !searchQuery.trim()) {
    return null;
  }

  return (
    <View style={styles.dropdownContainer}>
      {isLoading && (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color={DriverColors.brandPrimary || '#0284C7'} />
          <Text style={styles.loadingText}>Searching parking locations…</Text>
        </View>
      )}

      {!isLoading && hasError && suggestions.length === 0 && (
        <View style={styles.messageRow}>
          <Text style={styles.iconMuted}>⚠️</Text>
          <Text style={styles.messageText}>Unable to load suggestions. Search still works!</Text>
        </View>
      )}

      {!isLoading && !hasError && suggestions.length === 0 && (
        <View style={styles.messageRow}>
          <Text style={styles.iconMuted}>🔍</Text>
          <Text style={styles.messageText}>No matching parking locations in database</Text>
        </View>
      )}

      {suggestions.map((item, index) => {
        const isLot = item.type === 'lot';
        const isLast = index === suggestions.length - 1;

        return (
          <TouchableOpacity
            key={`${item.id}-${index}`}
            style={[styles.itemRow, !isLast && styles.itemBorder]}
            activeOpacity={0.7}
            onPress={() => onSelectSuggestion(item)}
            accessibilityRole="button"
            accessibilityLabel={`${item.name}, ${item.subtitle}`}
          >
            <View style={[styles.iconContainer, isLot ? styles.lotIconBg : styles.cityIconBg]}>
              <Text style={styles.itemIcon}>{isLot ? '🅿️' : '📍'}</Text>
            </View>

            <View style={styles.itemContent}>
              <View style={styles.titleRow}>
                <Text style={styles.itemName} numberOfLines={1}>
                  {item.name}
                </Text>
                {isLot && typeof item.availableSpaces === 'number' && (
                  <View
                    style={[
                      styles.spacePill,
                      item.availableSpaces > 0 ? styles.spaceAvailable : styles.spaceFull,
                    ]}
                  >
                    <Text
                      style={[
                        styles.spacePillText,
                        item.availableSpaces > 0 ? styles.spaceAvailableText : styles.spaceFullText,
                      ]}
                    >
                      {item.availableSpaces > 0 ? `${item.availableSpaces} spots` : 'Full'}
                    </Text>
                  </View>
                )}
              </View>

              <Text style={styles.itemSubtitle} numberOfLines={1}>
                {item.subtitle || item.address}
              </Text>
            </View>

            <Text style={styles.chevronIcon}>›</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  dropdownContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    marginTop: 6,
    marginHorizontal: 1,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 6,
    overflow: 'hidden',
    zIndex: 9999,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 10,
  },
  iconMuted: {
    fontSize: 15,
  },
  messageText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 14,
    gap: 12,
  },
  itemBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F1F5F9',
  },
  iconContainer: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lotIconBg: {
    backgroundColor: '#EFF6FF',
  },
  cityIconBg: {
    backgroundColor: '#F8FAFC',
  },
  itemIcon: {
    fontSize: 16,
  },
  itemContent: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
  },
  itemSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  spacePill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  spaceAvailable: {
    backgroundColor: '#DCFCE7',
  },
  spaceFull: {
    backgroundColor: '#FEE2E2',
  },
  spacePillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  spaceAvailableText: {
    color: '#15803D',
  },
  spaceFullText: {
    color: '#B91C1C',
  },
  chevronIcon: {
    fontSize: 18,
    color: '#CBD5E1',
    fontWeight: '600',
  },
});
