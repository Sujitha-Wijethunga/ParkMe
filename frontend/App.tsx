import React, { useState } from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  Platform,
  StatusBar as RNStatusBar,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import HomeScreen from './src/screens/driver/HomeScreen';
import SearchResultsScreen, { SearchResultsViewMode } from './src/screens/driver/SearchResultsScreen';
import LotDetailsScreen from './src/screens/driver/LotDetailsScreen';
import StaffLoginScreen from './src/screens/staff/StaffLoginScreen';
import StaffDashboardScreen from './src/screens/staff/StaffDashboardScreen';
import ManageSpaceScreen, { SpaceItem, initialSpaces } from './src/screens/staff/ManageSpaceScreen';
import ReservationsScreen from './src/screens/staff/ReservationsScreen';
import VerifyEntryScreen from './src/screens/staff/VerifyEntryScreen';
import StaffProfileScreen from './src/screens/staff/StaffProfileScreen';
import ChangePasswordScreen from './src/screens/staff/ChangePasswordScreen';
import AttendanceScreen from './src/screens/staff/AttendanceScreen';
import LeaveRequestScreen from './src/screens/staff/LeaveRequestScreen';
import { StaffProfile, defaultStaffProfile } from './src/constants/profile';
import { DriverFilterChip } from './src/constants/driverSampleData';

type ScreenType =
  | 'driver-home'
  | 'driver-search'
  | 'driver-lot-details'
  | 'login'
  | 'dashboard'
  | 'spaces'
  | 'reservations'
  | 'verify'
  | 'profile'
  | 'change-password'
  | 'attendance'
  | 'leave-request';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<ScreenType>('driver-home');
  const [searchParams, setSearchParams] = useState<{
    query: string;
    viewMode: SearchResultsViewMode;
    filterChip: DriverFilterChip;
    selectedLotId: string | null;
  }>({
    query: '',
    viewMode: 'map',
    filterChip: 'Nearest',
    selectedLotId: null,
  });
  /** ID of the lot currently being viewed in LotDetailsScreen. */
  const [selectedLotId, setSelectedLotId] = useState<string>('');
  /** Which driver screen opened lot details, so Back returns to the right place. */
  const [lotDetailsOrigin, setLotDetailsOrigin] = useState<'driver-home' | 'driver-search'>('driver-home');
  const [loggedStaffId, setLoggedStaffId] = useState<string>('STF-4091');
  const [staffProfile, setStaffProfile] = useState<StaffProfile>(defaultStaffProfile);
  const [activeReservation, setActiveReservation] = useState<{ ref: string; slot: string }>({
    ref: 'PE-84213',
    slot: 'A3',
  });
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [spaces, setSpaces] = useState<SpaceItem[]>(initialSpaces);

  const handleOpenSearch = (
    query: string = '',
    viewMode: SearchResultsViewMode = 'map',
    filterChip: DriverFilterChip = 'Nearest'
  ) => {
    setSearchParams({ query, viewMode, filterChip, selectedLotId: null });
    setCurrentScreen('driver-search');
  };

  const handleOpenLotDetails = (
    lotId: string,
    origin: 'driver-home' | 'driver-search',
    searchSnapshot?: { query: string; viewMode: SearchResultsViewMode; filterChip: DriverFilterChip; selectedLotId: string | null }
  ) => {
    setSelectedLotId(lotId);
    setLotDetailsOrigin(origin);
    if (searchSnapshot) {
      setSearchParams(searchSnapshot);
    }
    setCurrentScreen('driver-lot-details');
  };

  const handleBackFromLotDetails = () => {
    setCurrentScreen(lotDetailsOrigin);
  };

  const handleLoginSuccess = (user: any, token: string) => {
    setLoggedStaffId(user.staffId || user._id);
    setAuthToken(token);
    setStaffProfile((prev) => ({ 
      ...prev, 
      staffId: user.staffId || user._id,
      name: user.name,
      email: user.email,
      role: user.role === 'staff' ? 'Parking Staff' : user.role
    }));
    setCurrentScreen('dashboard');
  };

  const handleLogout = () => {
    setCurrentScreen('login');
  };

  const handleAdmitVehicle = (ref: string, slot: string) => {
    setActiveReservation({ ref, slot });
    setCurrentScreen('verify');
  };

  return (
    <>
      <StatusBar style={currentScreen === 'login' ? 'light' : 'dark'} />
      {currentScreen === 'driver-home' && (
        <HomeScreen
          userName="Kasun"
          onNavigateToMap={() => handleOpenSearch('', 'map', 'Nearest')}
          onNavigateToLotDetails={(lotId) =>
            handleOpenLotDetails(lotId, 'driver-home')
          }
          onNavigateToBookings={() => {}}
          onNavigateToProfile={() => {}}
          onNavigateToNotifications={() => {}}
          onOpenFilter={() => handleOpenSearch('', 'list', 'Nearest')}
          onSeeAllPress={(query, chip) => handleOpenSearch(query || '', 'list', chip || 'Nearest')}
          onSearchSubmit={(query, chip) => handleOpenSearch(query, 'list', chip || 'Nearest')}
          onBottomTabPress={(tab) => {
            if (tab === 'map') {
              handleOpenSearch('', 'map', 'Nearest');
            }
          }}
        />
      )}
      {currentScreen === 'driver-search' && (
        <SearchResultsScreen
          initialQuery={searchParams.query}
          initialViewMode={searchParams.viewMode}
          initialFilter={searchParams.filterChip}
          initialSelectedLotId={searchParams.selectedLotId}
          onBack={() => setCurrentScreen('driver-home')}
          onNavigateHome={() => setCurrentScreen('driver-home')}
          onSelectLot={(lotId, snapshot) =>
            handleOpenLotDetails(lotId, 'driver-search', snapshot)
          }
          onNavigateBookings={() => {}}
          onNavigateProfile={() => {}}
        />
      )}
      {currentScreen === 'driver-lot-details' && (
        <LotDetailsScreen
          lotId={selectedLotId}
          onBack={handleBackFromLotDetails}
        />
      )}
      {currentScreen === 'login' && (
        <StaffLoginScreen onLoginSuccess={handleLoginSuccess} />
      )}
      {currentScreen === 'dashboard' && (
        <StaffDashboardScreen
          staffId={loggedStaffId}
          profile={staffProfile}
          onLogout={handleLogout}
          onNavigateToSpaces={() => setCurrentScreen('spaces')}
          onNavigateToReservations={() => setCurrentScreen('reservations')}
          onNavigateToVerifyEntry={() => setCurrentScreen('verify')}
          onNavigateToProfile={() => setCurrentScreen('profile')}
          spaces={spaces}
        />
      )}
      {currentScreen === 'spaces' && (
        <ManageSpaceScreen 
          onBack={() => setCurrentScreen('dashboard')} 
          spaces={spaces}
          setSpaces={setSpaces}
        />
      )}
      {currentScreen === 'reservations' && (
        <ReservationsScreen
          onBack={() => setCurrentScreen('dashboard')}
          onAdmitVehicle={handleAdmitVehicle}
        />
      )}
      {currentScreen === 'verify' && (
        <VerifyEntryScreen
          initialReference={activeReservation.ref}
          initialSlot={activeReservation.slot}
          onBack={() => setCurrentScreen('reservations')}
          onEntryConfirmed={() => setCurrentScreen('dashboard')}
        />
      )}
      {currentScreen === 'profile' && (
        <StaffProfileScreen
          profile={staffProfile}
          onUpdateProfile={setStaffProfile}
          onBack={() => setCurrentScreen('dashboard')}
          onLogout={handleLogout}
          onNavigateTab={(tab) => {
            if (tab === 'dashboard') setCurrentScreen('dashboard');
            else if (tab === 'spaces') setCurrentScreen('spaces');
            else if (tab === 'reservations') setCurrentScreen('reservations');
            else if (tab === 'profile') setCurrentScreen('profile');
          }}
          onChangePassword={() => setCurrentScreen('change-password')}
          onAttendance={() => setCurrentScreen('attendance')}
        />
      )}
      {currentScreen === 'change-password' && (
        <ChangePasswordScreen onBack={() => setCurrentScreen('profile')} />
      )}
      {currentScreen === 'attendance' && (
        <AttendanceScreen 
          onBack={() => setCurrentScreen('profile')} 
          onRequestLeave={() => setCurrentScreen('leave-request')}
        />
      )}
      {currentScreen === 'leave-request' && (
        <LeaveRequestScreen onBack={() => setCurrentScreen('attendance')} />
      )}

      {/* Dev Mode Role Switcher: Positioned in top header area so it never overlaps driver bottom nav or parking content */}
      <View
        style={[
          styles.devSwitchContainer,
          {
            top: Platform.OS === 'android' ? (RNStatusBar.currentHeight || 24) + 14 : 54,
            right: currentScreen === 'driver-home' ? 68 : currentScreen === 'driver-lot-details' ? 68 : 12,
          },
        ]}
        pointerEvents="box-none"
      >
        <TouchableOpacity
          style={styles.devSwitchBtn}
          activeOpacity={0.8}
          onPress={() =>
            setCurrentScreen((prev) =>
              prev === 'driver-home' || prev === 'driver-search' || prev === 'driver-lot-details'
                ? 'login'
                : 'driver-home'
            )
          }
        >
          <Text style={styles.devSwitchText}>
            {currentScreen === 'driver-home' || currentScreen === 'driver-search' || currentScreen === 'driver-lot-details'
              ? '👔 Staff Flow'
              : '🚗 Driver Flow'}
          </Text>
        </TouchableOpacity>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  devSwitchContainer: {
    position: 'absolute',
    zIndex: 9999,
  },
  devSwitchBtn: {
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 8,
  },
  devSwitchText: {
    color: '#FFFFFF',
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});

