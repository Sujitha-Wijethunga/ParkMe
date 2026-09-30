import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
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

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<'login' | 'dashboard' | 'spaces' | 'reservations' | 'verify' | 'profile' | 'change-password' | 'attendance' | 'leave-request'>('login');
  const [loggedStaffId, setLoggedStaffId] = useState<string>('STF-4091');
  const [staffProfile, setStaffProfile] = useState<StaffProfile>(defaultStaffProfile);
  const [activeReservation, setActiveReservation] = useState<{ ref: string; slot: string }>({
    ref: 'PE-84213',
    slot: 'A3',
  });
  const [spaces, setSpaces] = useState<SpaceItem[]>(initialSpaces);

  const handleLoginSuccess = (staffId: string) => {
    const id = staffId || 'STF-4091';
    setLoggedStaffId(id);
    setStaffProfile((prev) => ({ ...prev, staffId: id }));
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
    </>
  );
}
