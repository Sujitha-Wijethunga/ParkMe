import React, { useCallback, useEffect, useState } from 'react';
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
import { appendImageToFormData } from './src/utils/imageUpload';

// Prevent native splash screen from autohiding while initial resources load
SplashScreen.preventAutoHideAsync().catch((err) => {
  console.warn('[SplashScreen.preventAutoHideAsync]', err);
});
import WelcomeScreen from './src/screens/driver/WelcomeScreen';
import DriverLoginScreen from './src/screens/driver/DriverLoginScreen';
import DriverSignUpScreen from './src/screens/driver/DriverSignUpScreen';
import HomeScreen from './src/screens/driver/HomeScreen';
import DriverProfileScreen from './src/screens/driver/DriverProfileScreen';
import SearchResultsScreen, { SearchResultsViewMode } from './src/screens/driver/SearchResultsScreen';
import LotDetailsScreen from './src/screens/driver/LotDetailsScreen';
import SelectSpaceScreen, { SpaceSelectionResult } from './src/screens/driver/SelectSpaceScreen';
import { VehicleType } from './src/constants/parkingSpaceData';
import BookingSummaryScreen from './src/screens/driver/BookingSummaryScreen';
import PaymentScreen from './src/screens/driver/PaymentScreen';
import BookingConfirmedScreen from './src/screens/driver/BookingConfirmedScreen';
import MyBookingsScreen, { BookingDetailsScreen } from './src/screens/driver/MyBookingsScreen';
import CancelBookingScreen from './src/screens/driver/CancelBookingScreen';
import ActiveParkingScreen, {
  ExitConfirmationScreen,
  ReleaseParkingScreen,
} from './src/screens/driver/ActiveParkingScreen';
import NavigationScreen from './src/screens/driver/NavigationScreen';
import { BookingDetails } from './src/constants/bookingTypes';
import {
  DriverUser,
  getDriverToken,
  saveDriverSession,
  clearDriverSession,
  getStaffToken,
  saveStaffSession,
  clearStaffSession,
  getActiveRole,
  saveActiveRole,
} from './src/services/storage';
import {
  DriverReservation,
  isWithinScheduledWindow,
  ReleasedReservationReceipt,
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
import StaffSignupScreen from './src/screens/staff/StaffSignupScreen';
import StaffDashboardScreen from './src/screens/staff/StaffDashboardScreen';
import ManageSpaceScreen, { SpaceItem, initialSpaces } from './src/screens/staff/ManageSpaceScreen';
import SpaceListScreen from './src/screens/staff/SpaceListScreen';
import AddSpaceScreen from './src/screens/staff/AddSpaceScreen';
import ReservationsScreen from './src/screens/staff/ReservationsScreen';
import VerifyEntryScreen from './src/screens/staff/VerifyEntryScreen';
import StaffProfileScreen from './src/screens/staff/StaffProfileScreen';
import ChangePasswordScreen from './src/screens/staff/ChangePasswordScreen';
import AttendanceScreen from './src/screens/staff/AttendanceScreen';
import LeaveRequestScreen from './src/screens/staff/LeaveRequestScreen';
import { StaffProfile, defaultStaffProfile } from './src/constants/profile';
import { API_BASE_URL } from './src/constants/api';
import {
  DriverFilterChip,
  ParkingLotCardItem,
  SAMPLE_NEARBY_PARKING_LOTS,
} from './src/constants/driverSampleData';

type ScreenType =
  | 'driver-welcome'
  | 'driver-login'
  | 'driver-signup'
  | 'driver-home'
  | 'driver-profile'
  | 'driver-search'
  | 'driver-lot-details'
  | 'driver-space-selection'
  | 'driver-booking-summary'
  | 'driver-payment'
  | 'driver-booking-confirmed'
  | 'driver-navigation'
  | 'driver-bookings'
  | 'driver-booking-details'
  | 'driver-cancel-booking'
  | 'driver-active-parking'
  | 'driver-release-parking'
  | 'driver-exit-confirmation'
  | 'login'
  | 'signup'
  | 'dashboard'
  | 'spaces-list'
  | 'spaces'
  | 'add-space'
  | 'reservations'
  | 'verify'
  | 'profile'
  | 'change-password'
  | 'attendance'
  | 'leave-request';

const resolveApiImageUrl = (imageUrl?: string) => {
  if (!imageUrl) return undefined;
  return imageUrl.startsWith('/') ? `${API_BASE_URL}${imageUrl}` : imageUrl;
};

const readApiError = async (response: Response, fallback: string) => {
  const responseText = await response.text();
  try {
    const payload = JSON.parse(responseText);
    if (typeof payload.message === 'string' && payload.message.trim()) return payload.message;
  } catch {
    // Non-JSON server errors are surfaced as their response text below.
  }
  return responseText || fallback;
};

const normalizeSpaceStatus = (status?: string): SpaceItem['status'] => {
  switch (status) {
    case 'occupied':
      return 'Occupied';
    case 'maintenance':
      return 'Reserved';
    case 'available':
    default:
      return 'Available';
  }
};

const mapLotToDriverCard = (lot: any): ParkingLotCardItem => ({
  id: lot._id || lot.id,
  name: lot.name || 'Parking Lot',
  address: lot.address || 'Colombo',
  distance: '0.4 km',
  status: lot.availableSpaces > 0 ? 'Available' : 'Full',
  availableSpaces: Number(lot.availableSpaces || 0),
  totalSpaces: Number(lot.totalSpaces || 0),
  isCovered: true,
  hasEVCharging: Array.isArray(lot.amenities) ? lot.amenities.includes('EV Charging') : false,
  pricePerHour: Number(lot.pricePerHour || 150),
  imageUrl: 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=600&q=80',
  mapPosition: { topPercent: 30, leftPercent: 50 },
  amenities: Array.isArray(lot.amenities) ? lot.amenities : ['CCTV Surveillance'],
  openingHours: 'Open 24 hours',
  parkingType: 'Multi-story',
  maxHeight: '2.2 m',
  operatorPhone: '+94 11 234 5678',
});

export default function App() {
  const [appIsReady, setAppIsReady] = useState(false);
  const [currentScreen, setCurrentScreen] = useState<ScreenType>('driver-welcome');
  const [profileReturnScreen, setProfileReturnScreen] = useState<ScreenType>('driver-home');
  const [bookingDetailsReturnScreen, setBookingDetailsReturnScreen] =
    useState<ScreenType>('driver-bookings');
  const [cancellationReturnScreen, setCancellationReturnScreen] =
    useState<ScreenType>('driver-bookings');
  const [driverUser, setDriverUser] = useState<DriverUser | null>(null);
  const [driverToken, setDriverToken] = useState<string | null>(null);

  useEffect(() => {
    async function prepare() {
      try {
        const activeRole = await getActiveRole();

        // 1. If active role was staff, attempt to restore staff session
        if (activeRole === 'staff') {
          const staffToken = await getStaffToken();
          if (staffToken) {
            try {
              const res = await fetch(`${API_BASE_URL}/api/auth/me`, {
                headers: { Authorization: `Bearer ${staffToken}` },
              });
              if (!res.ok) {
                throw new Error('Staff token expired or invalid');
              }
              const user = await res.json();
              if (user.role !== 'staff' && user.role !== 'admin') {
                throw new Error('User does not hold staff authorization');
              }
              setAuthToken(staffToken);
              setLoggedStaffId(user.staffId || user._id);
              setStaffProfile((prev) => ({
                ...prev,
                staffId: user.staffId || user._id,
                name: user.name,
                email: user.email,
                role: user.role === 'staff' ? 'Parking Staff' : user.role,
              }));
              setCurrentScreen('dashboard');
              return;
            } catch (err: any) {
              console.warn('[App.prepare] Staff session validation failed:', err?.message);
              await clearStaffSession();
              setCurrentScreen('login');
              return;
            }
          } else {
            setCurrentScreen('login');
            return;
          }
        }

        // 2. Otherwise restore driver session
        const token = await getDriverToken();
        if (token) {
          try {
            const user = await getCurrentUser(token);
            setDriverUser(user);
            setDriverToken(token);
            setCurrentScreen('driver-home');
          } catch (sessionErr: any) {
            console.warn('[App.prepare] Driver session restoration failed:', sessionErr?.message);
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

  // Fallback safety: ensure splash screen hides as soon as readiness completes
  useEffect(() => {
    if (appIsReady) {
      SplashScreen.hideAsync().catch(() => {});
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
  const [activeReservation, setActiveReservation] = useState<{
    id: string; ref: string; slot: string;
    driverName?: string; plate?: string; vehicleModel?: string;
  }>({
    id: '',
    ref: 'PM-000000',
    slot: 'A3',
  });
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [spaces, setSpaces] = useState<SpaceItem[]>(initialSpaces);
  const [selectedSpaceId, setSelectedSpaceId] = useState<string | null>(null);
  const [driverParkingLots, setDriverParkingLots] = useState<ParkingLotCardItem[]>(SAMPLE_NEARBY_PARKING_LOTS);
  const [bookingSelection, setBookingSelection] = useState<SpaceSelectionResult | null>(null);
  const [bookingDraft, setBookingDraft] = useState<BookingDraft | null>(null);
  /** NEW: booking used by Payment, Booking Confirmed and Navigation screens. */
  const [confirmedBooking, setConfirmedBooking] = useState<BookingDetails | null>(null);
  const [confirmedReservation, setConfirmedReservation] = useState<DriverReservation | null>(null);
  const [selectedReservationId, setSelectedReservationId] = useState<string | null>(null);
  const [reservationToCancel, setReservationToCancel] = useState<DriverReservation | null>(null);
  const [reservationToRelease, setReservationToRelease] = useState<DriverReservation | null>(null);
  const [releaseReceipt, setReleaseReceipt] = useState<ReleasedReservationReceipt | null>(null);
  const [selectedVehicleType, setSelectedVehicleType] = useState<VehicleType>('Car');
  const [highlightedBookingId, setHighlightedBookingId] = useState<string | null>(null);

  useEffect(() => {
    const fetchDriverLots = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/parking-lots`);
        if (!response.ok) {
          throw new Error('Unable to load parking lots');
        }
        const lots = await response.json();
        if (Array.isArray(lots) && lots.length > 0) {
          setDriverParkingLots(lots.map(mapLotToDriverCard));
          const spacesByLot = await Promise.all(
            lots.map(async (lot: any) => {
              const lotId = lot._id || lot.id;
              const spacesResponse = await fetch(`${API_BASE_URL}/api/parking-lots/${lotId}/spaces`);
              if (!spacesResponse.ok) {
                throw new Error(`Unable to load spaces for ${lot.name || 'parking lot'}`);
              }

              const lotSpaces = await spacesResponse.json();
              return Array.isArray(lotSpaces)
                ? lotSpaces.map((space: any): SpaceItem => ({
                    id: space._id || space.id,
                    slot: space.spaceNumber,
                    status: normalizeSpaceStatus(space.status),
                    location: lot.name,
                    level: space.floor,
                    parkingLotId: lotId,
                    imageUrl: resolveApiImageUrl(space.imageUrl),
                  }))
                : [];
            })
          );
          const persistedSpaces = spacesByLot.flat();
          if (persistedSpaces.length > 0) {
            setSpaces(persistedSpaces);
          }
        }
      } catch (error) {
        console.warn('Failed to load parking lots from backend:', error);
      }
    };

    void fetchDriverLots();
  }, []);

  useEffect(() => {
    if (!authToken) return;

    const loadStaffProfile = async () => {
      const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!response.ok) throw new Error('Unable to load staff profile');
      const user = await response.json();
      setLoggedStaffId(user.staffId || user._id);
      setStaffProfile((profile) => ({
        ...profile,
        name: user.name,
        email: user.email,
        role: user.role,
        staffId: user.staffId || user._id,
        avatar: user.avatar || profile.avatar,
        avatarBg: user.avatarBg || profile.avatarBg,
        avatarImageUri: resolveApiImageUrl(user.avatarUrl) || profile.avatarImageUri,
      }));
    };

    const loadStaffSpaces = async () => {
      const response = await fetch(`${API_BASE_URL}/api/parking-lots`);
      if (!response.ok) throw new Error('Unable to load parking lots');
      const lots = await response.json();
      if (!Array.isArray(lots)) throw new Error('Invalid parking-lot response');

      const spacesByLot = await Promise.all(
        lots.map(async (lot: any) => {
          const lotId = lot._id || lot.id;
          const spacesResponse = await fetch(`${API_BASE_URL}/api/parking-lots/${lotId}/spaces`);
          if (!spacesResponse.ok) throw new Error(`Unable to load spaces for ${lot.name}`);
          const lotSpaces = await spacesResponse.json();
          return Array.isArray(lotSpaces)
            ? lotSpaces.map((space: any): SpaceItem => ({
                id: space._id || space.id,
                slot: space.spaceNumber,
                status: normalizeSpaceStatus(space.status),
                location: lot.name,
                level: space.floor,
                parkingLotId: lotId,
                imageUrl: resolveApiImageUrl(space.imageUrl),
              }))
            : [];
        })
      );
      setSpaces(spacesByLot.flat());
      setDriverParkingLots(lots.map(mapLotToDriverCard));
    };

    void Promise.all([loadStaffProfile(), loadStaffSpaces()]).catch((error) => {
      console.error('Failed to load staff data:', error);
      Alert.alert('Unable to load staff data', error instanceof Error ? error.message : 'Please try again.');
    });
  }, [authToken]);

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
    searchSnapshot?: { query: string; viewMode: SearchResultsViewMode; filterChip: DriverFilterChip; selectedLotId: string | null },
    lotItem?: ParkingLotCardItem
  ) => {
    if (lotItem) {
      setDriverParkingLots((prev) => {
        if (prev.some((p) => p.id === lotItem.id)) return prev;
        return [...prev, lotItem];
      });
    }
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

  const handleOpenBookings = (highlightId?: string | null) => {
    setHighlightedBookingId(highlightId ?? null);
    setCurrentScreen('driver-bookings');
  };

  const handleSelectReservation = (reservation: DriverReservation) => {
    setSelectedReservationId(reservation._id);
    setBookingDetailsReturnScreen(currentScreen);
    setCurrentScreen(
      reservation.status === 'active'
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
      vehiclePlate: draft.vehiclePlate,
      vehicleModel: draft.vehicleModel,
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

    const savedReservation = await saveConfirmedBooking({
      userId: driverUser?._id || 'guest',
      booking: paid,
      startTime: bookingDraft.arrivalTime,
      token: driverToken,
    });
    setConfirmedReservation(savedReservation);
    setConfirmedBooking(paid);
    setCurrentScreen('driver-booking-confirmed');
  };

  /** NEW: Cancel / finish: clear the booking and go Home */
  const resetBookingFlow = () => {
    setConfirmedBooking(null);
    setConfirmedReservation(null);
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
  const handleDriverAuthSuccess = async (user: DriverUser, token: string) => {
    try {
      await saveDriverSession(user, token);
      await saveActiveRole('driver');
    } catch (e) {
      console.warn('Failed to save driver session:', e);
    }
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
    setProfileReturnScreen(currentScreen);
    setCurrentScreen('driver-profile');
  };

  const handleLoginSuccess = async (user: any, token: string) => {
    try {
      await saveStaffSession(user, token);
      await saveActiveRole('staff');
    } catch (e) {
      console.warn('Failed to save staff session:', e);
    }
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

  const handleUpdateProfile = async (updatedProfile: StaffProfile) => {
    if (!authToken) throw new Error('Please sign in again to update your profile.');

    let result: any;
    const isLocalImage =
      updatedProfile.avatarImageUri &&
      (updatedProfile.avatarImageUri.startsWith('file:') ||
        updatedProfile.avatarImageUri.startsWith('content:') ||
        updatedProfile.avatarImageUri.startsWith('blob:') ||
        updatedProfile.avatarImageUri.startsWith('data:'));

    if (isLocalImage) {
      const formData = new FormData();
      formData.append('name', updatedProfile.name);
      formData.append('email', updatedProfile.email);
      if (updatedProfile.avatar) formData.append('avatar', updatedProfile.avatar);
      if (updatedProfile.avatarBg) formData.append('avatarBg', updatedProfile.avatarBg);
      await appendImageToFormData(formData, 'avatar', updatedProfile.avatarImageUri!);

      const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        body: formData,
      });
      result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Unable to update profile');
    } else {
      const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          name: updatedProfile.name,
          email: updatedProfile.email,
          avatar: updatedProfile.avatar,
          avatarBg: updatedProfile.avatarBg,
          avatarUrl: updatedProfile.avatarImageUri || '',
        }),
      });
      result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Unable to update profile');
    }

    setStaffProfile((profile) => ({
      ...profile,
      name: result.name || updatedProfile.name,
      email: result.email || updatedProfile.email,
      avatar: result.avatar || updatedProfile.avatar,
      avatarBg: result.avatarBg || updatedProfile.avatarBg,
      avatarImageUri: resolveApiImageUrl(result.avatarUrl) || updatedProfile.avatarImageUri,
    }));
  };

  const handleChangePassword = async (currentPassword: string, newPassword: string) => {
    if (!authToken) throw new Error('Please sign in again to change your password.');
    const response = await fetch(`${API_BASE_URL}/api/auth/change-password`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || 'Unable to update password');
  };

  const handleSubmitLeaveRequest = async (request: {
    type: string;
    startDate: string;
    endDate: string;
    reason: string;
  }) => {
    if (!authToken) throw new Error('Please sign in again to submit a leave request.');
    const response = await fetch(`${API_BASE_URL}/api/leave-requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(request),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || 'Unable to submit leave request');
  };

  const handleUpdateSpaceStatus = async (space: SpaceItem, status: SpaceItem['status']) => {
    if (!authToken || !space.parkingLotId) {
      throw new Error('This space is not connected to a saved parking lot. Reload the staff spaces and try again.');
    }
    const apiStatus = status === 'Available' ? 'available' : status === 'Occupied' ? 'occupied' : 'maintenance';
    const response = await fetch(
      `${API_BASE_URL}/api/parking-lots/${space.parkingLotId}/spaces/${space.id}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ status: apiStatus }),
      }
    );
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || 'Unable to update space status');
    setSpaces((current) => current.map((item) => item.id === space.id
      ? { ...item, status: normalizeSpaceStatus(result.status) }
      : item));
  };

  const syncDriverLotWithNewSpace = (newSpace: SpaceItem) => {
    const lotName = (newSpace.location ?? 'One Galle Face Mall').trim() || 'One Galle Face Mall';

    setDriverParkingLots((prevLots) => {
      const index = prevLots.findIndex((lot) =>
        lot.name.toLowerCase().includes(lotName.toLowerCase())
      );

      if (index >= 0) {
        const updated = [...prevLots];
        const current = updated[index];
        const nextAvailable = newSpace.status === 'Available'
          ? (current.availableSpaces || 0) + 1
          : Math.max(0, current.availableSpaces || 0);

        updated[index] = {
          ...current,
          availableSpaces: nextAvailable,
          totalSpaces: Math.max(current.totalSpaces || 1, (current.totalSpaces || 1) + (newSpace.status === 'Available' ? 1 : 0)),
          status: nextAvailable > 0 ? 'Available' : 'Full',
        };

        return updated;
      }

      const createdLot: ParkingLotCardItem = {
        id: `lot-${Date.now()}`,
        name: lotName,
        address: '1A Centre Road, Colombo 02',
        distance: '0.4 km',
        status: newSpace.status === 'Available' ? 'Available' : 'Full',
        availableSpaces: newSpace.status === 'Available' ? 1 : 0,
        totalSpaces: 1,
        isCovered: true,
        hasEVCharging: true,
        pricePerHour: 150,
        imageUrl: 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=600&q=80',
        mapPosition: { topPercent: 30, leftPercent: 50 },
        amenities: ['CCTV Surveillance'],
        openingHours: 'Open 24 hours',
        parkingType: 'Multi-story',
        maxHeight: '2.2 m',
        operatorPhone: '+94 11 234 5678',
      };

      return [createdLot, ...prevLots];
    });
  };

  const handleAdmitVehicle = (
    reservationId: string,
    reference: string,
    slot: string,
    driverName?: string,
    plate?: string,
    vehicleModel?: string
  ) => {
    setActiveReservation({ id: reservationId, ref: reference, slot, driverName, plate, vehicleModel });
    setCurrentScreen('verify');
  };

  const handleLogout = async () => {
    try {
      await clearStaffSession();
    } catch (e) {
      console.warn('Failed to clear staff session:', e);
    }
    setAuthToken(null);
    setCurrentScreen('login');
  };

  const handleAddSpace = async (newSpace: SpaceItem) => {
    try {
      if (!authToken) {
        throw new Error('Staff must be logged in before adding a parking space.');
      }

      const lotName = (newSpace.location ?? 'One Galle Face Mall').trim() || 'One Galle Face Mall';
      const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      };

      const lotResponse = await fetch(`${API_BASE_URL}/api/parking-lots`);
      if (!lotResponse.ok) {
        throw new Error(await readApiError(lotResponse, 'Unable to load parking lots.'));
      }
      const lotList = await lotResponse.json();
      let lot = Array.isArray(lotList)
        ? lotList.find((item: any) => item.name && item.name.toLowerCase().includes(lotName.toLowerCase()))
        : null;

      if (!lot) {
        const createLotResponse = await fetch(`${API_BASE_URL}/api/parking-lots`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            name: lotName,
            address: '1A Centre Road, Colombo 02',
            location: { type: 'Point', coordinates: [79.8612, 6.9271] },
            totalSpaces: 1,
            availableSpaces: newSpace.status === 'Available' ? 1 : 0,
            pricePerHour: 150,
            openTime: '00:00',
            closeTime: '23:59',
            amenities: ['CCTV Surveillance', 'EV Charging'],
            managedBy: null,
            isActive: true,
          }),
        });

        if (!createLotResponse.ok) {
          throw new Error(await readApiError(createLotResponse, 'Unable to create parking lot.'));
        }

        lot = await createLotResponse.json();
      }

      const lotId = lot._id || lot.id;
      const formData = new FormData();
      formData.append('spaceNumbers', JSON.stringify(newSpace.spaceNumbers ?? [newSpace.slot]));
      formData.append('floor', newSpace.level || 'Level 3');
      formData.append('type', 'standard');
      if (newSpace.imageUri) {
        console.log('Uploading image:', newSpace.imageUri);

        await appendImageToFormData(
          formData,
          'image',
          newSpace.imageUri,
          {
            mimeType: newSpace.imageMimeType || 'image/jpeg',
            fileBlob: newSpace.imageFile,
          }
        );
      }

      const createSpaceResponse = await fetch(`${API_BASE_URL}/api/parking-lots/${lotId}/spaces`, {
        method: 'POST',
        headers: { Authorization: headers.Authorization },
        body: formData,
      });

      if (!createSpaceResponse.ok) {
        throw new Error(await readApiError(createSpaceResponse, 'Unable to create parking space.'));
      }

      const createdResponse = await createSpaceResponse.json();
      const createdRecords = Array.isArray(createdResponse) ? createdResponse : [createdResponse];
      const mappedSpaces: SpaceItem[] = createdRecords.map((createdSpace: any) => ({
        id: createdSpace._id || createdSpace.id || `${Date.now()}-${createdSpace.spaceNumber}`,
        slot: createdSpace.spaceNumber,
        status: normalizeSpaceStatus(createdSpace.status),
        location: lotName,
        level: createdSpace.floor || newSpace.level || 'Level 3',
        parkingLotId: lotId,
        imageUrl: resolveApiImageUrl(createdSpace.imageUrl),
      }));

      setSpaces((prev) => [...mappedSpaces, ...prev]);
      mappedSpaces.forEach(syncDriverLotWithNewSpace);

      try {
        const refreshedLots = await fetch(`${API_BASE_URL}/api/parking-lots`);
        if (refreshedLots.ok) {
          const lots = await refreshedLots.json();
          if (Array.isArray(lots) && lots.length > 0) {
            setDriverParkingLots(lots.map(mapLotToDriverCard));
          }
        }
      } catch (error) {
        console.warn('Space was saved, but driver parking-lot counts could not be refreshed:', error);
      }
    } catch (error) {
      console.error('Failed to save new parking space:', error);
      Alert.alert(
        'Unable to save space',
        error instanceof Error ? error.message : 'Please check the connection and try again.'
      );
      throw error;
    }
    return newSpace.spaceNumbers?.length ?? 1;
  };

  const handleDeleteSpace = async (space: SpaceItem) => {
    if (space.parkingLotId) {
      if (!authToken) {
        throw new Error('Please sign in again before deleting a saved parking space.');
      }

      const response = await fetch(
        `${API_BASE_URL}/api/parking-lots/${space.parkingLotId}/spaces/${space.id}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${authToken}` },
        }
      );

      if (!response.ok) {
        const errorMessage = await response.text();
        throw new Error(errorMessage || 'Unable to delete parking space.');
      }

      const lotName = space.location || '';
      setDriverParkingLots((currentLots) =>
        currentLots.map((lot) => {
          if (!lot.name.toLowerCase().includes(lotName.toLowerCase())) {
            return lot;
          }
          const totalSpaces = Math.max(0, lot.totalSpaces - 1);
          const availableSpaces = Math.max(
            0,
            lot.availableSpaces - (space.status === 'Available' ? 1 : 0)
          );
          return {
            ...lot,
            totalSpaces,
            availableSpaces,
            status: availableSpaces > 0 ? 'Available' : 'Full',
          };
        })
      );

      try {
        const lotsResponse = await fetch(`${API_BASE_URL}/api/parking-lots`);
        if (!lotsResponse.ok) {
          throw new Error('Unable to refresh parking lots after deleting a space.');
        }
        const lots = await lotsResponse.json();
        if (Array.isArray(lots)) {
          setDriverParkingLots(lots.map(mapLotToDriverCard));
        }
      } catch (error) {
        console.warn('Space deleted, but driver parking-lot counts could not be refreshed:', error);
      }
    }

    setSpaces((currentSpaces) => currentSpaces.filter((item) => item.id !== space.id));
    if (selectedSpaceId === space.id) {
      setSelectedSpaceId(null);
    }
  };

  useEffect(() => {
    if (!appIsReady) return;
    const staffProtectedScreens: ScreenType[] = [
      'dashboard',
      'spaces-list',
      'spaces',
      'add-space',
      'reservations',
      'verify',
      'profile',
      'change-password',
      'attendance',
      'leave-request',
    ];
    const driverProtectedScreens: ScreenType[] = [
      'driver-home',
      'driver-profile',
      'driver-bookings',
      'driver-booking-details',
      'driver-active-parking',
      'driver-release-parking',
    ];

    if (staffProtectedScreens.includes(currentScreen) && !authToken) {
      setCurrentScreen('login');
    } else if (driverProtectedScreens.includes(currentScreen) && !driverToken) {
      setCurrentScreen('driver-welcome');
    }
  }, [currentScreen, authToken, driverToken, appIsReady]);

  if (!appIsReady) {
    return null;
  }

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
          parkingLots={driverParkingLots}
          userName={driverUser?.name ? driverUser.name.split(' ')[0] : 'Kasun'}
          selectedVehicleType={selectedVehicleType}
          onVehicleTypeChange={setSelectedVehicleType}
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
      {currentScreen === 'driver-profile' && driverUser && driverToken && (
        <DriverProfileScreen
          token={driverToken}
          userId={driverUser._id}
          initialUser={driverUser}
          onBack={() => setCurrentScreen(profileReturnScreen)}
          onNavigateHome={() => setCurrentScreen('driver-home')}
          onNavigateMap={() => handleOpenSearch('', 'map', 'Nearest')}
          onNavigateBookings={handleOpenBookings}
          onLogout={() => void handleDriverLogout()}
          onSessionExpired={() => void handleDriverLogout()}
        />
      )}
      {currentScreen === 'driver-search' && (
        <SearchResultsScreen
          initialQuery={searchParams.query}
          initialViewMode={searchParams.viewMode}
          initialFilter={searchParams.filterChip}
          initialSelectedLotId={searchParams.selectedLotId}
          initialNearbyFiveMinMode={searchParams.nearbyFiveMinMode}
          selectedVehicleType={selectedVehicleType}
          onVehicleTypeChange={setSelectedVehicleType}
          onBack={() => setCurrentScreen('driver-home')}
          onNavigateHome={() => setCurrentScreen('driver-home')}
          onSelectLot={(lotId, snapshot, lotItem) =>
            handleOpenLotDetails(lotId, 'driver-search', snapshot, lotItem)
          }
          onNavigateBookings={handleOpenBookings}
          onNavigateProfile={handleDriverProfilePress}
        />
      )}
      {currentScreen === 'driver-bookings' && (
        <MyBookingsScreen
          token={driverToken}
          userId={driverUser?._id || 'guest'}
          highlightedBookingId={highlightedBookingId}
          onBack={() => setCurrentScreen('driver-home')}
          onSelectBooking={handleSelectReservation}
          onCancelBooking={(reservation) => {
            setReservationToCancel(reservation);
            setCancellationReturnScreen('driver-bookings');
            setCurrentScreen('driver-cancel-booking');
          }}
          onViewActiveParking={() => {
            setSelectedReservationId(null);
            setCurrentScreen('driver-active-parking');
          }}
          onNavigateHome={() => setCurrentScreen('driver-home')}
          onNavigateMap={() => handleOpenSearch('', 'map', 'Nearest')}
          onNavigateProfile={handleDriverProfilePress}
        />
      )}
      {currentScreen === 'driver-cancel-booking' && reservationToCancel && (
        <CancelBookingScreen
          token={driverToken}
          userId={driverUser?._id || 'guest'}
          reservation={reservationToCancel}
          onBack={() => setCurrentScreen(bookingDetailsReturnScreen)}
          onDone={() => {
            setReservationToCancel(null);
            setCurrentScreen('driver-bookings');
          }}
        />
      )}
      {currentScreen === 'driver-booking-details' && selectedReservationId && (
        <BookingDetailsScreen
          token={driverToken}
          userId={driverUser?._id || 'guest'}
          reservationId={selectedReservationId}
          onBack={() => setCurrentScreen(cancellationReturnScreen)}
          onNavigateHome={() => setCurrentScreen('driver-home')}
          onNavigateMap={() => handleOpenSearch('', 'map', 'Nearest')}
          onNavigateProfile={handleDriverProfilePress}
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
          userId={driverUser?._id || 'guest'}
          reservation={reservationToRelease}
          onBack={() => setCurrentScreen('driver-active-parking')}
          onReleased={(receipt) => {
            setReleaseReceipt(receipt);
            setReservationToRelease(null);
            setCurrentScreen('driver-exit-confirmation');
          }}
        />
      )}
      {currentScreen === 'driver-exit-confirmation' && releaseReceipt && (
        <ExitConfirmationScreen
          receipt={releaseReceipt}
          userId={driverUser?._id || 'guest'}
          onDone={() => {
            setReleaseReceipt(null);
            setSelectedReservationId(null);
            setCurrentScreen('driver-bookings');
          }}
        />
      )}
      {currentScreen === 'driver-lot-details' && (
        <LotDetailsScreen
          lotId={selectedLotId}
          parkingLots={driverParkingLots}
          onBack={handleBackFromLotDetails}
          onSelectSpace={handleOpenSpaceSelection}
        />
      )}
      {currentScreen === 'driver-space-selection' && (
        <SelectSpaceScreen
          lotId={spaceSelectionLotId}
          parkingLots={driverParkingLots}
          initialSelection={bookingSelection}
          selectedVehicleType={selectedVehicleType}
          onVehicleTypeChange={setSelectedVehicleType}
          onBack={() => setCurrentScreen('driver-lot-details')}
          onContinue={handleSpaceSelectionContinue}
        />
      )}
      {currentScreen === 'driver-booking-summary' && bookingSelection && (
        <BookingSummaryScreen
          key={`${bookingSelection.lotId}-${bookingSelection.spaceId}`}
          selection={bookingSelection}
          parkingLots={driverParkingLots}
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
      {currentScreen === 'driver-booking-confirmed' && confirmedBooking && confirmedReservation && (
        <BookingConfirmedScreen
          booking={confirmedBooking}
          reservation={confirmedReservation}
          onGetDirections={() => setCurrentScreen('driver-navigation')}
          onViewBookingDetails={() => {
            setHighlightedBookingId(confirmedReservation._id);
            setCurrentScreen('driver-bookings');
          }}
          onReturnHome={() => {
            resetBookingFlow();
            setCurrentScreen('driver-home');
          }}
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
        <StaffLoginScreen
          onLoginSuccess={handleLoginSuccess}
          onNavigateToSignup={() => setCurrentScreen('signup')}
          onNavigateToDriverLogin={() => setCurrentScreen('driver-login')}
        />
      )}
      {currentScreen === 'signup' && (
        <StaffSignupScreen
          onSignupSuccess={handleLoginSuccess}
          onBackToLogin={() => setCurrentScreen('login')}
        />
      )}
      {currentScreen === 'dashboard' && (
        <StaffDashboardScreen
          staffId={loggedStaffId}
          profile={staffProfile}
          onLogout={handleLogout}
          onNavigateToSpaces={() => setCurrentScreen('spaces-list')}
          onNavigateToReservations={() => setCurrentScreen('reservations')}
          onNavigateToVerifyEntry={() => setCurrentScreen('reservations')}
          onNavigateToProfile={() => setCurrentScreen('profile')}
          spaces={spaces}
        />
      )}
      {currentScreen === 'spaces-list' && (
        <SpaceListScreen
          spaces={spaces}
          onBack={() => setCurrentScreen('dashboard')}
          onAddSpace={() => setCurrentScreen('add-space')}
          onSelectSpace={(space) => {
            setSelectedSpaceId(space.id);
            setCurrentScreen('spaces');
          }}
          onDeleteSpace={handleDeleteSpace}
        />
      )}
      {currentScreen === 'spaces' && (
        <ManageSpaceScreen 
          selectedSpaceId={selectedSpaceId}
          onBack={() => setCurrentScreen('spaces-list')} 
          onUpdateSpaceStatus={handleUpdateSpaceStatus}
          spaces={spaces}
        />
      )}
      {currentScreen === 'add-space' && (
        <AddSpaceScreen
          onBack={() => setCurrentScreen('spaces-list')}
          onSave={handleAddSpace}
        />
      )}
      {currentScreen === 'reservations' && (
        <ReservationsScreen
          onBack={() => setCurrentScreen('dashboard')}
          onAdmitVehicle={handleAdmitVehicle}
          apiBaseUrl={API_BASE_URL}
          authToken={authToken}
        />
      )}
      {currentScreen === 'verify' && (
        <VerifyEntryScreen
          reservationId={activeReservation.id}
          initialReference={activeReservation.ref}
          initialSlot={activeReservation.slot}
          driverName={activeReservation.driverName}
          vehiclePlate={activeReservation.plate}
          vehicleModel={activeReservation.vehicleModel}
          apiBaseUrl={API_BASE_URL}
          authToken={authToken}
          onBack={() => setCurrentScreen('reservations')}
          onEntryConfirmed={() => setCurrentScreen('dashboard')}
        />
      )}
      {currentScreen === 'profile' && (
        <StaffProfileScreen
          profile={staffProfile}
          onUpdateProfile={handleUpdateProfile}
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
        <ChangePasswordScreen
          onBack={() => setCurrentScreen('profile')}
          onUpdatePassword={handleChangePassword}
        />
      )}
      {currentScreen === 'attendance' && (
        <AttendanceScreen 
          onBack={() => setCurrentScreen('profile')} 
          onRequestLeave={() => setCurrentScreen('leave-request')}
          apiBaseUrl={API_BASE_URL}
          authToken={authToken}
        />
      )}
      {currentScreen === 'leave-request' && (
        <LeaveRequestScreen
          onBack={() => setCurrentScreen('attendance')}
          onSubmitRequest={handleSubmitLeaveRequest}
        />
      )}

      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
  },
});
