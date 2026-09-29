import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import StaffLoginScreen from './src/screens/staff/StaffLoginScreen';
import StaffDashboardScreen from './src/screens/staff/StaffDashboardScreen';
import ManageSpaceScreen from './src/screens/staff/ManageSpaceScreen';
import ReservationsScreen from './src/screens/staff/ReservationsScreen';
import VerifyEntryScreen from './src/screens/staff/VerifyEntryScreen';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<'login' | 'dashboard' | 'spaces' | 'reservations' | 'verify'>('login');
  const [loggedStaffId, setLoggedStaffId] = useState<string>('STF-4091');
  const [activeReservation, setActiveReservation] = useState<{ ref: string; slot: string }>({
    ref: 'PE-84213',
    slot: 'A3',
  });

  const handleLoginSuccess = (staffId: string) => {
    setLoggedStaffId(staffId || 'STF-4091');
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
          onLogout={handleLogout}
          onNavigateToSpaces={() => setCurrentScreen('spaces')}
          onNavigateToReservations={() => setCurrentScreen('reservations')}
          onNavigateToVerifyEntry={() => setCurrentScreen('verify')}
        />
      )}
      {currentScreen === 'spaces' && (
        <ManageSpaceScreen onBack={() => setCurrentScreen('dashboard')} />
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
    </>
  );
}
