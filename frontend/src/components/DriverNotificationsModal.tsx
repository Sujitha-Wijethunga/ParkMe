import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Pressable,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DriverColors } from '../constants/colors';

export interface DriverNotificationItem {
  id: string;
  type: 'booking' | 'reminder' | 'payment' | 'system';
  title: string;
  message: string;
  time: string;
  isUnread: boolean;
  icon: string;
  color: string;
}

const INITIAL_DRIVER_NOTIFICATIONS: DriverNotificationItem[] = [
  {
    id: 'n-1',
    type: 'booking',
    title: 'Space Reserved',
    message: 'Slot A3 reserved at One Galle Face Mall.',
    time: '5m ago',
    isUnread: true,
    icon: '🚗',
    color: '#EFF6FF',
  },
  {
    id: 'n-2',
    type: 'payment',
    title: 'Payment Successful',
    message: 'Rs. 150 charged for 1-hour parking.',
    time: '25m ago',
    isUnread: true,
    icon: '💳',
    color: '#ECFDF5',
  },
  {
    id: 'n-3',
    type: 'reminder',
    title: '15-Min Free Cancellation',
    message: 'Free cancellation available up to 15 mins before arrival.',
    time: '1h ago',
    isUnread: false,
    icon: '⏱',
    color: '#FFFBEB',
  },
  {
    id: 'n-4',
    type: 'system',
    title: 'Fastest Available Routing',
    message: 'Real driving times enabled across Sri Lanka.',
    time: 'Yesterday',
    isUnread: false,
    icon: '📍',
    color: '#F8FAFC',
  },
];

interface DriverNotificationsModalProps {
  visible: boolean;
  onClose: () => void;
  onViewBookings?: () => void;
}

export default function DriverNotificationsModal({
  visible,
  onClose,
  onViewBookings,
}: DriverNotificationsModalProps) {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const [notifications, setNotifications] = useState<DriverNotificationItem[]>(INITIAL_DRIVER_NOTIFICATIONS);

  const unreadCount = notifications.filter((n) => n.isUnread).length;

  const handleMarkAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isUnread: false })));
  };

  const handleNotificationPress = (notif: DriverNotificationItem) => {
    // Mark this one as read
    setNotifications((prev) =>
      prev.map((n) => (n.id === notif.id ? { ...n, isUnread: false } : n))
    );
    if (notif.type === 'booking' && onViewBookings) {
      onClose();
      onViewBookings();
    }
  };

  // Safe bottom padding tailored for Android 3-button & gesture nav
  const bottomPadding = Math.max(insets.bottom, Platform.OS === 'android' ? 18 : 12) + 8;
  const maxPanelHeight = Math.min(windowHeight * 0.8, 540);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[
            styles.panel,
            {
              maxHeight: maxPanelHeight,
              paddingBottom: bottomPadding,
            },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Header Row */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <Text style={styles.headerTitle}>Notifications</Text>
              {unreadCount > 0 && (
                <View style={styles.unreadCountBadge}>
                  <Text style={styles.unreadCountText}>{unreadCount} new</Text>
                </View>
              )}
            </View>

            <View style={styles.headerActions}>
              {unreadCount > 0 && (
                <TouchableOpacity
                  onPress={handleMarkAllAsRead}
                  style={styles.markAllBtn}
                  accessibilityLabel="Mark all notifications as read"
                >
                  <Text style={styles.markAllText}>Mark all read</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={onClose}
                style={styles.closeBtn}
                accessibilityLabel="Close notifications modal"
              >
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Notifications List */}
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {notifications.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>🔔</Text>
                <Text style={styles.emptyTitle}>No Notifications</Text>
                <Text style={styles.emptySubtitle}>You are all caught up!</Text>
              </View>
            ) : (
              notifications.map((notif) => (
                <TouchableOpacity
                  key={notif.id}
                  style={[
                    styles.notifItem,
                    notif.isUnread && styles.notifItemUnread,
                  ]}
                  activeOpacity={0.75}
                  onPress={() => handleNotificationPress(notif)}
                  accessibilityRole="button"
                  accessibilityLabel={`${notif.title}: ${notif.message}, ${notif.time}`}
                >
                  {/* Left Icon Badge */}
                  <View style={[styles.iconBox, { backgroundColor: notif.color }]}>
                    <Text style={styles.iconEmoji}>{notif.icon}</Text>
                  </View>

                  {/* Content Column */}
                  <View style={styles.contentCol}>
                    <View style={styles.titleRow}>
                      <Text style={styles.notifTitle} numberOfLines={1}>
                        {notif.title}
                      </Text>
                      <Text style={styles.notifTime}>{notif.time}</Text>
                    </View>
                    <Text style={styles.notifMessage} numberOfLines={3}>
                      {notif.message}
                    </Text>
                  </View>

                  {/* Unread dot */}
                  {notif.isUnread && <View style={styles.unreadDot} />}
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end',
  },
  panel: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: DriverColors.navyDark,
  },
  unreadCountBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  unreadCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563EB',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  markAllBtn: {
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  markAllText: {
    fontSize: 12,
    fontWeight: '600',
    color: DriverColors.brandPrimary,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
  },
  scrollView: {
    marginTop: 8,
  },
  scrollContent: {
    paddingBottom: 8,
  },
  notifItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 14,
    marginBottom: 4,
  },
  notifItemUnread: {
    backgroundColor: '#F8FAFC',
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iconEmoji: {
    fontSize: 18,
  },
  contentCol: {
    flex: 1,
    paddingRight: 6,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  notifTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: DriverColors.navyDark,
    flex: 1,
    marginRight: 8,
  },
  notifTime: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
  },
  notifMessage: {
    fontSize: 12.5,
    color: '#475569',
    lineHeight: 18,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3B82F6',
    marginTop: 6,
    marginLeft: 4,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyIcon: {
    fontSize: 36,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: DriverColors.navyDark,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#94A3B8',
  },
});
