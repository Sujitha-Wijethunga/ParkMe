import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  Platform,
  StatusBar as RNStatusBar,
  Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Prevent native splash screen from autohiding while initial resources load
SplashScreen.preventAutoHideAsync().catch((err) => {
  console.warn('[SplashScreen.preventAutoHideAsync]', err);
});
import WelcomeScreen from './src/screens/driver/WelcomeScreen';
import DriverLoginScreen from './src/screens/driver/DriverLoginScreen';
import DriverSignUpScreen from './src/screens/driver/DriverSignUpScreen';
import HomeScreen from './src/screens/driver/HomeScreen';
import SearchResultsScreen, { SearchResultsViewMode } from './src/screens/driver/SearchResultsScreen';
import LotDetailsScreen from './src/screens/driver/LotDetailsScreen';
import SelectSpaceScreen, { SpaceSelectionResult } from './src/screens/driver/SelectSpaceScreen';
import BookingSummaryScreen from './src/screens/driver/BookingSummaryScreen';
import PaymentScreen from './src/screens/driver/PaymentScreen';
import BookingConfirmedScreen from './src/screens/driver/BookingConfirmedScreen';
import MyBookingsScreen, { BookingDetailsScreen } from './src/screens/driver/MyBookingsScreen';
import ActiveParkingScreen, { ReleaseParkingScreen } from './src/screens/driver/ActiveParkingScreen';
import NavigationScreen from './src/screens/driver/NavigationScreen';
import { BookingDetails } from './src/constants/bookingTypes';
import { DriverUser, getDriverToken, clearDriverSession } from './src/services/storage';
import {
  DriverReservation,
  isWithinScheduledWindow,
  saveConfirmedBooking,
} from './src/services/reservationApi';
import { getCurrentUser } from './src/services/authApi';

import {
  BookingDraft,
  ConfirmedBookingPayload,
  formatArrivalDate,
  formatTime12,
} from './src/constants/bookingDraft';
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
  | 'driver-welcome'
  | 'driver-login'
  | 'driver-signup'
  | 'driver-home'
  | 'driver-search'
  | 'driver-lot-details'
  | 'driver-space-selection'
  | 'driver-booking-summary'
  | 'driver-payment'
  | 'driver-booking-confirmed'
  | 'driver-navigation'
  | 'driver-bookings'
  | 'driver-booking-details'
  | 'driver-active-parking'
  | 'driver-release-parking'
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
  const [appIsReady, setAppIsReady] = useState(false);
  const [currentScreen, setCurrentScreen] = useState<ScreenType>('driver-welcome');
  const [driverUser, setDriverUser] = useState<DriverUser | null>(null);
  const [driverToken, setDriverToken] = useState<string | null>(null);

  useEffect(() => {
    async function prepare() {
      try {
        // Attempt to restore authenticated driver session from secure storage
        const token = await getDriverToken();
        if (token) {
          try {
            const user = await getCurrentUser(token);
            setDriverUser(user);
            setDriverToken(token);
            setCurrentScreen('driver-home');
          } catch (sessionErr: any) {
            console.warn('[App.prepare] Driver session restoration failed:', sessionErr?.message);
            // Expired or invalid token: clear persistent credentials and present welcome screen
            if (sessionErr?.status === 401 || sessionErr?.status === 403) {
              await clearDriverSession();
            }
            setCurrentScreen('driver-welcome');
          }
        } else {
          setCurrentScreen('driver-welcome');
        }
      } catch (e) {
        console.warn('[App.prepare] Error during startup initialization:', e);
        setCurrentScreen('driver-welcome');
      } finally {
        setAppIsReady(true);
      }
    }

    prepare();
  }, []);

  const onLayoutRootView = useCallback(async () => {
    if (appIsReady) {
      try {
        await SplashScreen.hideAsync();
      } catch (e) {
        console.warn('[SplashScreen.hideAsync]', e);
      }
    }
  }, [appIsReady]);

  const [searchParams, setSearchParams] = useState<{
    query: string;
    viewMode: SearchResultsViewMode;
    filterChip: DriverFilterChip;
    selectedLotId: string | null;
    nearbyFiveMinMode?: boolean;
  }>({
    query: '',
    viewMode: 'map',
    filterChip: 'Nearest',
    selectedLotId: null,
    nearbyFiveMinMode: false,
  });

  /** ID of the lot currently being viewed in LotDetailsScreen. */
  const [selectedLotId, setSelectedLotId] = useState<string>('');
  /** ID of the lot being shown in SelectSpaceScreen. */
  const [spaceSelectionLotId, setSpaceSelectionLotId] = useState<string>('');
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
  const [bookingSelection, setBookingSelection] = useState<SpaceSelectionResult | null>(null);
  const [bookingDraft, setBookingDraft] = useState<BookingDraft | null>(null);
  /** NEW: booking used by Payment, Booking Confirmed and Navigation screens. */
  const [confirmedBooking, setConfirmedBooking] = useState<BookingDetails | null>(null);
  const [selectedReservationId, setSelectedReservationId] = useState<string | null>(null);
  const [reservationToRelease, setReservationToRelease] = useState<DriverReservation | null>(null);

  const handleOpenSearch = (
    query: string = '',
    viewMode: SearchResultsViewMode = 'map',
    filterChip: DriverFilterChip = 'Nearest'
  ) => {
    setSearchParams({ query, viewMode, filterChip, selectedLotId: null, nearbyFiveMinMode: false });
    setCurrentScreen('driver-search');
  };

  const handleOpenNearbyFiveMin = () => {
    setSearchParams({
      query: '',
      viewMode: 'map',
      filterChip: 'Nearest',
      selectedLotId: null,
      nearbyFiveMinMode: true,
    });
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

  const handleOpenBookings = () => {
    setCurrentScreen('driver-bookings');
  };

  const handleSelectReservation = (reservation: DriverReservation) => {
    setSelectedReservationId(reservation._id);
    setCurrentScreen(
      reservation.status === 'active' || isWithinScheduledWindow(reservation)
        ? 'driver-active-parking'
        : 'driver-booking-details'
    );
  };

  const handleOpenSpaceSelection = (lotId: string) => {
    // If switching to a different lot, clear incompatible space selection and draft
    if (spaceSelectionLotId !== lotId) {
      setBookingSelection(null);
      setBookingDraft(null);
    }
    setSpaceSelectionLotId(lotId);
    setCurrentScreen('driver-space-selection');
  };

  /**
   * Called when the user confirms space selection.
   * Navigates to the Booking Summary screen with the selected space.
   */
  const handleSpaceSelectionContinue = (selection: SpaceSelectionResult) => {
    setBookingSelection(selection);
    setCurrentScreen('driver-booking-summary');
  };

  /**
   * Called when the user confirms the booking summary.
   * Reservation creation and payment gateway integration are in the next milestone.
   */
  const handleBookingProceed = (payload: ConfirmedBookingPayload) => {
    const { draft, price } = payload;
    Alert.alert(
      'Coming Next: Payment & Reservation',
      `Booking draft ready for confirmation:\n\n` +
        `• Space: ${draft.spaceId} (Floor ${draft.floor})\n` +
        `• Arrival: ${formatArrivalDate(draft.arrivalTime)} at ${formatTime12(draft.arrivalTime)}\n` +
        `• Duration: ${draft.durationHours} hrs (until ${formatTime12(price.endTime)})\n` +
        `• Estimated Total: Rs. ${price.totalRs}\n` +
        `• Vehicle: ${draft.vehiclePlate} (${draft.vehicleModel})\n\n` +
        `Payment gateway integration and server reservation creation via POST /api/reservations are coming in the next milestone.`,
      [{ text: 'Got it', style: 'default' }]
    );
  };

  /** NEW: Booking Summary -> Payment */
  const handleBookingProceedToPayment = (payload: ConfirmedBookingPayload) => {
    if (!bookingSelection) return;
    const { draft, price } = payload;
    setBookingDraft(draft);
    setConfirmedBooking({
      lotId: bookingSelection.lotId,
      spaceId: bookingSelection.spaceId,
      floor: bookingSelection.floor,
      vehicleType: bookingSelection.vehicleType,
      tariffPerHour: bookingSelection.tariffPerHour,
      hours: draft.durationHours,
      total: price.totalRs,
    });
    setCurrentScreen('driver-payment');
  };

  /** NEW: Payment -> Booking Confirmed (receives the final total after promo) */
  const handlePaid = async (paid: BookingDetails) => {
    if (!bookingDraft || !bookingSelection) {
      throw new Error('Your booking details are incomplete. Please go back and try again.');
    }

    await saveConfirmedBooking({
      userId: driverUser?._id || 'guest',
      booking: paid,
      startTime: bookingDraft.arrivalTime,
    });
    setConfirmedBooking(paid);
    setCurrentScreen('driver-booking-confirmed');
  };

  /** NEW: Cancel / finish: clear the booking and go Home */
  const resetBookingFlow = () => {
    setConfirmedBooking(null);
    setBookingSelection(null);
    setBookingDraft(null);
    setCurrentScreen('driver-home');
  };

  /**
   * Navigates to Driver Sign Up when user taps 'Get Started' on Welcome screen.
   */
  const handleWelcomeGetStarted = () => {
    setCurrentScreen('driver-signup');
  };

  /**
   * Navigates to Driver Login when user taps 'I already have an account' on Welcome screen.
   */
  const handleWelcomeLogin = () => {
    setCurrentScreen('driver-login');
  };

  /**
   * Called upon successful driver login or signup.
   * Sets the active driver state and transitions to Driver Home.
   */
  const handleDriverAuthSuccess = (user: DriverUser, token: string) => {
    setDriverUser(user);
    setDriverToken(token);
    setCurrentScreen('driver-home');
  };

  /**
   * Clears driver session from secure storage and returns to unauthenticated Welcome screen.
   */
  const handleDriverLogout = async () => {
    try {
      await clearDriverSession();
    } catch (e) {
      console.warn('[handleDriverLogout] Error clearing session:', e);
    }
    setDriverUser(null);
    setDriverToken(null);
    setCurrentScreen('driver-welcome');
  };

  const handleDriverProfilePress = () => {
    const displayName = driverUser?.name || 'Driver';
    const displayEmail = driverUser?.email || '';
    Alert.alert(
      displayName,
      `Email: ${displayEmail}\nRole: Driver`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Log Out', style: 'destructive', onPress: handleDriverLogout },
      ]
    );
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

  if (!appIsReady) {
    return null;
  }

  const isDriverScreen =
    currentScreen === 'driver-welcome' ||
    currentScreen === 'driver-login' ||
    currentScreen === 'driver-signup' ||
    currentScreen === 'driver-home' ||
    currentScreen === 'driver-search' ||
    currentScreen === 'driver-lot-details' ||
    currentScreen === 'driver-space-selection' ||
    currentScreen === 'driver-booking-summary' ||
    currentScreen === 'driver-payment' ||
    currentScreen === 'driver-booking-confirmed' ||
    currentScreen === 'driver-navigation' ||
    currentScreen === 'driver-bookings' ||
    currentScreen === 'driver-booking-details' ||
    currentScreen === 'driver-active-parking' ||
    currentScreen === 'driver-release-parking';

  return (
    <SafeAreaProvider style={styles.rootContainer}>
      <View style={styles.rootContainer} onLayout={onLayoutRootView}>
      <StatusBar
        style={currentScreen === 'login' || currentScreen === 'driver-welcome' ? 'light' : 'dark'}
      />
      {currentScreen === 'driver-welcome' && (
        <WelcomeScreen
          onGetStarted={handleWelcomeGetStarted}
          onAlreadyHaveAccount={handleWelcomeLogin}
        />
      )}
      {currentScreen === 'driver-login' && (
        <DriverLoginScreen
          onBack={() => setCurrentScreen('driver-welcome')}
          onNavigateToSignUp={() => setCurrentScreen('driver-signup')}
          onNavigateToStaffLogin={() => setCurrentScreen('login')}
          onLoginSuccess={handleDriverAuthSuccess}
        />
      )}
      {currentScreen === 'driver-signup' && (
        <DriverSignUpScreen
          onBack={() => setCurrentScreen('driver-welcome')}
          onNavigateToLogin={() => setCurrentScreen('driver-login')}
          onNavigateToStaffLogin={() => setCurrentScreen('login')}
          onSignUpSuccess={handleDriverAuthSuccess}
        />
      )}
      {currentScreen === 'driver-home' && (
        <HomeScreen
          userName={driverUser?.name ? driverUser.name.split(' ')[0] : 'Kasun'}
          onNavigateToMap={() => handleOpenSearch('', 'map', 'Nearest')}
          onNavigateToLotDetails={(lotId) =>
            handleOpenLotDetails(lotId, 'driver-home')
          }
          onNavigateToBookings={handleOpenBookings}
          onNavigateToProfile={handleDriverProfilePress}
          onNavigateToNotifications={() => {}}
          onOpenFilter={() => handleOpenSearch('', 'list', 'Nearest')}
          onSeeAllPress={(query, chip) => handleOpenSearch(query || '', 'list', chip || 'Nearest')}
          onSearchSubmit={(query, chip) => handleOpenSearch(query, 'list', chip || 'Nearest')}
          onOpenNearbyFiveMin={handleOpenNearbyFiveMin}
          onBottomTabPress={(tab) => {
            if (tab === 'map') {
              handleOpenSearch('', 'map', 'Nearest');
            } else if (tab === 'profile') {
              handleDriverProfilePress();
            } else if (tab === 'bookings') {
              handleOpenBookings();
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
          initialNearbyFiveMinMode={searchParams.nearbyFiveMinMode}
          onBack={() => setCurrentScreen('driver-home')}
          onNavigateHome={() => setCurrentScreen('driver-home')}
          onSelectLot={(lotId, snapshot) =>
            handleOpenLotDetails(lotId, 'driver-search', snapshot)
          }
          onNavigateBookings={handleOpenBookings}
          onNavigateProfile={handleDriverProfilePress}
        />
      )}
      {currentScreen === 'driver-bookings' && (
        <MyBookingsScreen
          token={driverToken}
          userId={driverUser?._id || 'guest'}
          onBack={() => setCurrentScreen('driver-home')}
          onSelectBooking={handleSelectReservation}
          onViewActiveParking={() => {
            setSelectedReservationId(null);
            setCurrentScreen('driver-active-parking');
          }}
          onNavigateHome={() => setCurrentScreen('driver-home')}
          onNavigateMap={() => handleOpenSearch('', 'map', 'Nearest')}
          onNavigateProfile={handleDriverProfilePress}
        />
      )}
      {currentScreen === 'driver-booking-details' && selectedReservationId && (
        <BookingDetailsScreen
          token={driverToken}
          userId={driverUser?._id || 'guest'}
          reservationId={selectedReservationId}
          onBack={() => setCurrentScreen('driver-bookings')}
          onNavigateHome={() => setCurrentScreen('driver-home')}
          onNavigateMap={() => handleOpenSearch('', 'map', 'Nearest')}
          onNavigateProfile={handleDriverProfilePress}
          onReservationCancelled={() => setCurrentScreen('driver-bookings')}
        />
      )}
      {currentScreen === 'driver-active-parking' && (
        <ActiveParkingScreen
          token={driverToken}
          userId={driverUser?._id || 'guest'}
          selectedReservationId={selectedReservationId}
          onBack={() => setCurrentScreen('driver-bookings')}
          onViewBookings={() => setCurrentScreen('driver-bookings')}
          onRelease={(reservation) => {
            setReservationToRelease(reservation);
            setCurrentScreen('driver-release-parking');
          }}
        />
      )}
      {currentScreen === 'driver-release-parking' && reservationToRelease && (
        <ReleaseParkingScreen
          token={driverToken}
          reservation={reservationToRelease}
          onBack={() => setCurrentScreen('driver-active-parking')}
          onReleased={() => {
            setReservationToRelease(null);
            setSelectedReservationId(null);
            setCurrentScreen('driver-bookings');
          }}
        />
      )}
      {currentScreen === 'driver-lot-details' && (
        <LotDetailsScreen
          lotId={selectedLotId}
          onBack={handleBackFromLotDetails}
          onSelectSpace={handleOpenSpaceSelection}
        />
      )}
      {currentScreen === 'driver-space-selection' && (
        <SelectSpaceScreen
          lotId={spaceSelectionLotId}
          initialSelection={bookingSelection}
          onBack={() => setCurrentScreen('driver-lot-details')}
          onContinue={handleSpaceSelectionContinue}
        />
      )}
      {currentScreen === 'driver-booking-summary' && bookingSelection && (
        <BookingSummaryScreen
          key={`${bookingSelection.lotId}-${bookingSelection.spaceId}`}
          selection={bookingSelection}
          initialDraft={bookingDraft}
          onDraftChange={setBookingDraft}
          onBack={() => setCurrentScreen('driver-space-selection')}
          onProceed={handleBookingProceedToPayment}
        />
      )}
      {/* NEW: Payment, Booking Confirmed, Navigation */}
      {currentScreen === 'driver-payment' && confirmedBooking && (
        <PaymentScreen
          booking={confirmedBooking}
          onBack={() => setCurrentScreen('driver-booking-summary')}
          onPay={handlePaid}
        />
      )}
      {currentScreen === 'driver-booking-confirmed' && confirmedBooking && (
        <BookingConfirmedScreen
          booking={confirmedBooking}
          onGetDirections={() => setCurrentScreen('driver-navigation')}
          onCancel={resetBookingFlow}
        />
      )}
      {currentScreen === 'driver-navigation' && confirmedBooking && (
        <NavigationScreen
          booking={confirmedBooking}
          onCancel={() => setCurrentScreen('driver-booking-confirmed')}
          onArrived={resetBookingFlow}
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

      {/* Dev Mode Role Switcher: Shown only in development and positioned clear of screen content */}
      {__DEV__ && (
        <View
          style={[
            styles.devSwitchContainer,
            {
              top:
                currentScreen === 'driver-login' || currentScreen === 'driver-signup'
                  ? (Platform.OS === 'android' ? (RNStatusBar.currentHeight || 24) + 52 : 92)
                  : (Platform.OS === 'android' ? (RNStatusBar.currentHeight || 24) + 14 : 54),
              right:
                currentScreen === 'driver-welcome' ||
                currentScreen === 'driver-login' ||
                currentScreen === 'driver-signup'
                  ? 16
                  : isDriverScreen
                  ? 68
                  : 12,
            },
          ]}
          pointerEvents="box-none"
        >
          <View style={styles.devSwitchGroup}>
            {(currentScreen === 'driver-welcome' ||
              currentScreen === 'driver-login' ||
              currentScreen === 'driver-signup') && (
              <TouchableOpacity
                style={styles.devSwitchBtn}
                activeOpacity={0.8}
                onPress={() => setCurrentScreen('driver-home')}
              >
                <Text style={styles.devSwitchText}>🚗 Driver Home (Dev)</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.devSwitchBtn}
              activeOpacity={0.8}
              onPress={() =>
                setCurrentScreen((prev) => {
                  if (
                    prev === 'driver-welcome' ||
                    prev === 'driver-login' ||
                    prev === 'driver-signup' ||
                    prev === 'driver-home' ||
                    prev === 'driver-search' ||
                    prev === 'driver-lot-details' ||
                    prev === 'driver-space-selection' ||
                    prev === 'driver-booking-summary' ||
                    prev === 'driver-payment' ||
                    prev === 'driver-booking-confirmed' ||
                    prev === 'driver-navigation' ||
                    prev === 'driver-bookings' ||
                    prev === 'driver-booking-details' ||
                    prev === 'driver-active-parking' ||
                    prev === 'driver-release-parking'
                  ) {
                    return 'login';
                  }
                  return driverUser ? 'driver-home' : 'driver-welcome';
                })
              }
            >
              <Text style={styles.devSwitchText}>
                {isDriverScreen ? '👔 Staff Flow' : '🚗 Driver Flow'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
  },
  devSwitchContainer: {
    position: 'absolute',
    zIndex: 9999,
  },
  devSwitchGroup: {
    flexDirection: 'row',
    gap: 6,
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