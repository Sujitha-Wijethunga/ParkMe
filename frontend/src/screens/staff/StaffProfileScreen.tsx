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
  Switch,
  Alert,
  Modal,
  TextInput,
  Pressable,
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Colors } from '../../constants/colors';
import { StaffProfile } from '../../constants/profile';

interface StaffProfileScreenProps {
  profile: StaffProfile;
  onUpdateProfile: (updated: StaffProfile) => void;
  onBack: () => void;
  onLogout: () => void;
  onNavigateTab: (tab: 'dashboard' | 'spaces' | 'reservations' | 'profile') => void;
}

const AVATAR_OPTIONS = ['👤', '👨‍💼', '👩‍💼', '👮‍♂️', '👮‍♀️', '🧑‍💻', '🚗', '🛡️'];
const AVATAR_BG_OPTIONS = ['#BAE6FD', '#DCFCE7', '#FEF08A', '#FED7AA', '#FBCFE8', '#DDD6FE'];
const ROLE_OPTIONS = ['Parking Staff', 'Senior Attendant', 'Gate Supervisor', 'Shift Manager'];

export default function StaffProfileScreen({
  profile,
  onUpdateProfile,
  onBack,
  onLogout,
  onNavigateTab,
}: StaffProfileScreenProps) {
  const [shiftAlerts, setShiftAlerts] = useState(true);

  // Edit Modal State
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editName, setEditName] = useState(profile.name);
  const [editEmail, setEditEmail] = useState(profile.email);
  const [editRole, setEditRole] = useState(profile.role);
  const [editAvatar, setEditAvatar] = useState(profile.avatar);
  const [editAvatarBg, setEditAvatarBg] = useState(profile.avatarBg);
  const [editAvatarImageUri, setEditAvatarImageUri] = useState(profile.avatarImageUri);

  const openEditModal = () => {
    setEditName(profile.name);
    setEditEmail(profile.email);
    setEditRole(profile.role);
    setEditAvatar(profile.avatar);
    setEditAvatarBg(profile.avatarBg);
    setEditAvatarImageUri(profile.avatarImageUri);
    setIsEditModalVisible(true);
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setEditAvatarImageUri(result.assets[0].uri);
    }
  };

  const handleSaveProfile = () => {
    if (!editName.trim()) {
      Alert.alert('Required', 'Please enter your name.');
      return;
    }
    if (!editEmail.trim()) {
      Alert.alert('Required', 'Please enter your email.');
      return;
    }

    const updated: StaffProfile = {
      ...profile,
      name: editName.trim(),
      email: editEmail.trim(),
      role: editRole.trim(),
      avatar: editAvatar,
      avatarBg: editAvatarBg,
      avatarImageUri: editAvatarImageUri,
    };

    onUpdateProfile(updated);
    setIsEditModalVisible(false);
    Alert.alert('Profile Updated', 'Your profile changes have been saved successfully! ✨');
  };

  const handleMenuItemPress = (title: string, detail?: string) => {
    Alert.alert(title, detail || `Opening ${title}...`);
  };

  const confirmLogout = () => {
    Alert.alert('Confirm Log Out', 'Are you sure you want to sign out of the Staff Portal?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: onLogout,
      },
    ]);
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
        <Text style={styles.headerTitle}>My Profile</Text>
        <TouchableOpacity
          onPress={openEditModal}
          style={styles.headerEditBtn}
          activeOpacity={0.7}
        >
          <Text style={styles.headerEditBtnText}>Edit</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Card Container */}
        <View style={styles.profileCard}>
          {/* Edit Button on Top Right */}
          <TouchableOpacity
            style={styles.cardEditBadge}
            onPress={openEditModal}
            activeOpacity={0.8}
          >
            <Text style={styles.cardEditBadgeText}>✏️ Edit Profile</Text>
          </TouchableOpacity>

          {/* Avatar Section */}
          <View style={styles.avatarSection}>
            <TouchableOpacity
              onPress={openEditModal}
              activeOpacity={0.85}
              style={styles.avatarTouchable}
            >
              <View style={[styles.avatarCircle, { backgroundColor: profile.avatarBg }]}>
                {profile.avatarImageUri ? (
                  <Image source={{ uri: profile.avatarImageUri }} style={styles.avatarImage} />
                ) : (
                  <Text style={styles.avatarIcon}>{profile.avatar}</Text>
                )}
              </View>
              <View style={styles.cameraIconBadge}>
                <Text style={styles.cameraEmoji}>📷</Text>
              </View>
            </TouchableOpacity>
            <Text style={styles.staffBadgeText}>{profile.role}</Text>
            <Text style={styles.staffIdSubtext}>{profile.staffId}</Text>
          </View>

          {/* User Details */}
          <View style={styles.detailsSection}>
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Name</Text>
              <Text style={styles.fieldValue}>{profile.name}</Text>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Email</Text>
              <Text style={styles.fieldValue}>{profile.email}</Text>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Role</Text>
              <Text style={styles.fieldValue}>{profile.role}</Text>
            </View>
          </View>

          {/* Account & Preferences */}
          <View style={styles.preferencesSection}>
            <Text style={styles.sectionHeading}>Account & Preferences</Text>

            {/* Payroll Details */}
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleMenuItemPress('Payroll Details', 'Account number: ****4521')}
              activeOpacity={0.7}
            >
              <View style={styles.menuLeft}>
                <Text style={styles.menuIcon}>💳</Text>
                <Text style={styles.menuTitle}>Payroll Details</Text>
              </View>
              <View style={styles.menuRight}>
                <Text style={styles.menuValue}>Acc ****4521</Text>
                <Text style={styles.chevron}>›</Text>
              </View>
            </TouchableOpacity>

            <View style={styles.divider} />

            {/* Shift Notifications & Alerts */}
            <View style={styles.menuItem}>
              <View style={styles.menuLeft}>
                <Text style={styles.menuIcon}>🔔</Text>
                <Text style={styles.menuTitle}>Shift Notifications & Alerts</Text>
              </View>
              <Switch
                value={shiftAlerts}
                onValueChange={setShiftAlerts}
                trackColor={{ false: '#E2E8F0', true: '#22C55E' }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View style={styles.divider} />

            {/* Attendance & Leave History */}
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleMenuItemPress('Attendance & Leave History')}
              activeOpacity={0.7}
            >
              <View style={styles.menuLeft}>
                <Text style={styles.menuIcon}>📄</Text>
                <Text style={styles.menuTitle}>Attendance & Leave History</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>

            <View style={styles.divider} />

            {/* Help & Emergency */}
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleMenuItemPress('Help & Emergency', 'Emergency speed dial: Base station (Ext. 4410)')}
              activeOpacity={0.7}
            >
              <View style={styles.menuLeft}>
                <Text style={styles.menuIcon}>☎️</Text>
                <Text style={styles.menuTitle}>Help & Emergency</Text>
              </View>
              <View style={styles.menuRight}>
                <Text style={styles.menuValue}>Base station</Text>
                <Text style={styles.chevron}>›</Text>
              </View>
            </TouchableOpacity>

            <View style={styles.divider} />

            {/* Change Password */}
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleMenuItemPress('Change Password')}
              activeOpacity={0.7}
            >
              <View style={styles.menuLeft}>
                <Text style={styles.menuIcon}>🔑</Text>
                <Text style={styles.menuTitle}>Change Password</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>

            <View style={styles.divider} />

            {/* Settings */}
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleMenuItemPress('Settings')}
              activeOpacity={0.7}
            >
              <View style={styles.menuLeft}>
                <Text style={styles.menuIcon}>⚙️</Text>
                <Text style={styles.menuTitle}>Settings</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Log Out Button */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={confirmLogout}
          activeOpacity={0.8}
        >
          <Text style={styles.logoutIcon}>🚪</Text>
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Edit Profile Modal Bottom Sheet */}
      <Modal
        visible={isEditModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsEditModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setIsEditModalVisible(false)}
        >
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Modal Header */}
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle}>Edit Staff Profile</Text>
                  <Text style={styles.modalSubtitle}>Update your personal information & avatar</Text>
                </View>
                <TouchableOpacity
                  onPress={() => setIsEditModalVisible(false)}
                  style={styles.modalCloseBtn}
                >
                  <Text style={styles.modalCloseText}>✕</Text>
                </TouchableOpacity>
              </View>

              {/* Avatar Selector */}
              <Text style={styles.editSectionLabel}>AVATAR & IMAGE</Text>
              
              <View style={{ alignItems: 'center', marginBottom: 15 }}>
                <TouchableOpacity onPress={pickImage} style={styles.pickImageBtn}>
                  {editAvatarImageUri ? (
                    <Image source={{ uri: editAvatarImageUri }} style={styles.avatarImagePreview} />
                  ) : (
                    <Text style={styles.pickImageText}>📷 Choose from Gallery</Text>
                  )}
                </TouchableOpacity>
                {editAvatarImageUri && (
                  <TouchableOpacity onPress={() => setEditAvatarImageUri(undefined)} style={{ marginTop: 8 }}>
                    <Text style={{ color: '#EF4444', fontSize: 12, fontWeight: '600' }}>Remove Image</Text>
                  </TouchableOpacity>
                )}
              </View>

              <Text style={styles.editSectionLabel}>OR SELECT AVATAR EMOJI</Text>
              <View style={styles.avatarPickerRow}>
                {AVATAR_OPTIONS.map((item) => (
                  <TouchableOpacity
                    key={item}
                    style={[
                      styles.avatarPickItem,
                      editAvatar === item && styles.avatarPickItemSelected,
                    ]}
                    onPress={() => setEditAvatar(item)}
                  >
                    <Text style={styles.avatarPickEmoji}>{item}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Background Color Selector */}
              <Text style={styles.editSectionLabel}>AVATAR BACKGROUND</Text>
              <View style={styles.colorPickerRow}>
                {AVATAR_BG_OPTIONS.map((color) => (
                  <TouchableOpacity
                    key={color}
                    style={[
                      styles.colorPickItem,
                      { backgroundColor: color },
                      editAvatarBg === color && styles.colorPickItemSelected,
                    ]}
                    onPress={() => setEditAvatarBg(color)}
                  >
                    {editAvatarBg === color && <Text style={styles.colorCheck}>✓</Text>}
                  </TouchableOpacity>
                ))}
              </View>

              {/* Name Field */}
              <View style={styles.editInputGroup}>
                <Text style={styles.editInputLabel}>Full Name</Text>
                <TextInput
                  style={styles.editTextInput}
                  value={editName}
                  onChangeText={setEditName}
                  placeholder="Enter full name"
                  placeholderTextColor="#94A3B8"
                />
              </View>

              {/* Email Field */}
              <View style={styles.editInputGroup}>
                <Text style={styles.editInputLabel}>Email Address</Text>
                <TextInput
                  style={styles.editTextInput}
                  value={editEmail}
                  onChangeText={setEditEmail}
                  placeholder="Enter email address"
                  placeholderTextColor="#94A3B8"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              {/* Role Selector */}
              <View style={styles.editInputGroup}>
                <Text style={styles.editInputLabel}>Staff Role</Text>
                <View style={styles.roleChipsContainer}>
                  {ROLE_OPTIONS.map((role) => (
                    <TouchableOpacity
                      key={role}
                      style={[
                        styles.roleChip,
                        editRole === role && styles.roleChipSelected,
                      ]}
                      onPress={() => setEditRole(role)}
                    >
                      <Text
                        style={[
                          styles.roleChipText,
                          editRole === role && styles.roleChipTextSelected,
                        ]}
                      >
                        {role}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Action Buttons */}
              <TouchableOpacity
                style={styles.saveProfileBtn}
                onPress={handleSaveProfile}
                activeOpacity={0.85}
              >
                <Text style={styles.saveProfileBtnText}>Save Profile Changes</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setIsEditModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Bottom Navigation Bar */}
      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => onNavigateTab('dashboard')}
        >
          <Text style={styles.navIcon}>📊</Text>
          <Text style={styles.navLabel}>Dashboard</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => onNavigateTab('spaces')}
        >
          <Text style={styles.navIcon}>🎛️</Text>
          <Text style={styles.navLabel}>Spaces</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => onNavigateTab('reservations')}
        >
          <Text style={styles.navIcon}>📋</Text>
          <Text style={styles.navLabel}>Reservations</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => onNavigateTab('profile')}
        >
          <Text style={[styles.navIcon, styles.navIconActive]}>👤</Text>
          <Text style={[styles.navLabel, styles.navLabelActive]}>Profile</Text>
        </TouchableOpacity>
      </View>
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: {
    fontSize: 32,
    color: '#1D4ED8',
    lineHeight: 32,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1E3A8A',
    letterSpacing: -0.3,
  },
  headerEditBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
  },
  headerEditBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    marginBottom: 20,
    position: 'relative',
  },
  cardEditBadge: {
    alignSelf: 'flex-end',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    marginBottom: 8,
  },
  cardEditBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarTouchable: {
    position: 'relative',
  },
  avatarCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    overflow: 'hidden',
  },
  avatarImage: {
    width: 90,
    height: 90,
    borderRadius: 45,
  },
  avatarIcon: {
    fontSize: 48,
  },
  cameraIconBadge: {
    position: 'absolute',
    bottom: 8,
    right: -2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cameraEmoji: {
    fontSize: 13,
  },
  staffBadgeText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0284C7',
  },
  staffIdSubtext: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
    marginTop: 2,
  },
  detailsSection: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 16,
    marginBottom: 20,
    gap: 14,
  },
  fieldGroup: {
    gap: 2,
  },
  fieldLabel: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '500',
  },
  fieldValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  preferencesSection: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 18,
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 14,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuIcon: {
    fontSize: 16,
  },
  menuTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  menuRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  menuValue: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '500',
  },
  chevron: {
    fontSize: 18,
    color: '#CBD5E1',
    fontWeight: '800',
  },
  divider: {
    height: 1,
    backgroundColor: '#F8FAFC',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1.5,
    borderColor: '#F87171',
    borderRadius: 14,
    paddingVertical: 14,
    gap: 8,
    marginBottom: 10,
  },
  logoutIcon: {
    fontSize: 16,
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#DC2626',
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingVertical: 8,
    paddingBottom: Platform.OS === 'ios' ? 24 : 10,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navIcon: {
    fontSize: 18,
    color: '#94A3B8',
    marginBottom: 3,
  },
  navIconActive: {
    color: '#0F766E',
  },
  navLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
  },
  navLabelActive: {
    color: '#0F766E',
    fontWeight: '700',
  },

  /* ── Edit Modal Styles ── */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 18,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalSubtitle: {
    fontSize: 12.5,
    color: '#64748B',
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseText: {
    fontSize: 16,
    color: '#475569',
    fontWeight: '700',
  },
  editSectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  avatarPickerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 18,
  },
  avatarPickItem: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  avatarPickItemSelected: {
    borderColor: '#0284C7',
    backgroundColor: '#E0F2FE',
  },
  avatarPickEmoji: {
    fontSize: 24,
  },
  pickImageBtn: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickImageText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
  avatarImagePreview: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  colorPickerRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  colorPickItem: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#CBD5E1',
  },
  colorPickItemSelected: {
    borderColor: '#0284C7',
    transform: [{ scale: 1.1 }],
  },
  colorCheck: {
    fontSize: 14,
    color: '#0369A1',
    fontWeight: '900',
  },
  editInputGroup: {
    marginBottom: 16,
  },
  editInputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  editTextInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '600',
  },
  roleChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  roleChip: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  roleChipSelected: {
    backgroundColor: '#0F766E',
    borderColor: '#0F766E',
  },
  roleChipText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#475569',
  },
  roleChipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  saveProfileBtn: {
    backgroundColor: '#F26419',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: '#F26419',
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  saveProfileBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  cancelBtn: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 6,
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
});
