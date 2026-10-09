import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
  StatusBar,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import {
  getAvailableWalkInSpaces,
  createWalkInEntry,
  getWalkInSession,
  getActiveWalkIns,
  checkoutWalkIn,
  WalkInSpaceItem,
  WalkInSessionData,
  WalkInTariffCalculation,
  WalkInReceiptData,
} from '../../services/walkInApi';

interface WalkInParkingScreenProps {
  authToken: string | null;
  assignedLotId?: string;
  assignedLotName?: string;
  staffName?: string;
  onBack: () => void;
}

type TabMode = 'entry' | 'checkout' | 'active';

/* 21x21 deterministic QR grid generator */
function getQrCells(seed: string): boolean[] {
  const N = 21;
  let seedHash = 0;
  for (let i = 0; i < seed.length; i++) seedHash = (seedHash * 31 + seed.charCodeAt(i)) >>> 0;
  const finder = (r: number, c: number) =>
    [[0, 0], [0, N - 7], [N - 7, 0]].some(([fr, fc]) => {
      const rr = r - fr, cc = c - fc;
      if (rr < 0 || rr > 6 || cc < 0 || cc > 6) return false;
      return rr === 0 || rr === 6 || cc === 0 || cc === 6 || (rr >= 2 && rr <= 4 && cc >= 2 && cc <= 4);
    });
  const inFinderArea = (r: number, c: number) =>
    (r < 8 && c < 8) || (r < 8 && c > N - 9) || (r > N - 9 && c < 8);
  let h = seedHash;
  const result: boolean[] = [];
  for (let i = 0; i < N * N; i++) {
    const r = Math.floor(i / N), c = i % N;
    if (inFinderArea(r, c)) {
      result.push(finder(r, c));
    } else {
      h = (h * 1103515245 + 12345) >>> 0;
      result.push((h >> 16) % 2 === 0);
    }
  }
  return result;
}

function MiniQR({ seed }: { seed: string }) {
  const N = 21;
  const cells = useMemo(() => getQrCells(seed), [seed]);
  const size = 6;
  return (
    <View style={{ width: N * size, height: N * size, flexDirection: 'row', flexWrap: 'wrap', backgroundColor: '#FFFFFF', padding: 4 }}>
      {cells.map((on, i) => (
        <View key={i} style={{ width: size, height: size, backgroundColor: on ? '#0F172A' : '#FFFFFF' }} />
      ))}
    </View>
  );
}

export default function WalkInParkingScreen({
  authToken,
  assignedLotId,
  assignedLotName = 'Colombo City Centre Car Park',
  staffName = 'Attendant',
  onBack,
}: WalkInParkingScreenProps) {
  const insets = useSafeAreaInsets();
  const topPadding = Math.max(
    insets.top,
    Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) : 0
  );
  const paddingBottom = Math.max(insets.bottom, 16) + 20;

  const [activeTab, setActiveTab] = useState<TabMode>('entry');

  // Form State (Entry)
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [vehicleType, setVehicleType] = useState<'Car' | 'Bike' | 'SUV' | 'EV'>('Car');
  const [selectedSpaceId, setSelectedSpaceId] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  // Spaces state
  const [availableSpaces, setAvailableSpaces] = useState<WalkInSpaceItem[]>([]);
  const [isLoadingSpaces, setIsLoadingSpaces] = useState(false);
  const [isSubmittingEntry, setIsSubmittingEntry] = useState(false);

  // Issued Receipt modal state
  const [issuedReceipt, setIssuedReceipt] = useState<{
    session: WalkInSessionData;
    calculation: WalkInTariffCalculation;
    receipt: WalkInReceiptData;
  } | null>(null);

  // Checkout State
  const [checkoutQuery, setCheckoutQuery] = useState('');
  const [isSearchingCheckout, setIsSearchingCheckout] = useState(false);
  const [activeSessionForCheckout, setActiveSessionForCheckout] = useState<{
    session: WalkInSessionData;
    calculation: WalkInTariffCalculation;
  } | null>(null);
  const [cashAmountInput, setCashAmountInput] = useState('');
  const [confirmDeparture, setConfirmDeparture] = useState(true);
  const [isProcessingCheckout, setIsProcessingCheckout] = useState(false);

  // Active sessions tab state
  const [activeList, setActiveList] = useState<Array<WalkInSessionData & { calculation: WalkInTariffCalculation }>>([]);
  const [isLoadingActiveList, setIsLoadingActiveList] = useState(false);
  const [activeSearchQuery, setActiveSearchQuery] = useState('');

  // 1. Fetch available spaces when on entry tab or vehicleType changes
  const fetchSpaces = useCallback(async () => {
    if (!authToken) return;
    setIsLoadingSpaces(true);
    try {
      const res = await getAvailableWalkInSpaces(authToken, assignedLotId, vehicleType);
      setAvailableSpaces(res.spaces || []);
      // If currently selected space is not in new list, reset it
      if (selectedSpaceId && !res.spaces.some((s) => s._id === selectedSpaceId)) {
        setSelectedSpaceId(null);
      }
    } catch (err) {
      console.warn('Failed to load available spaces:', err);
    } finally {
      setIsLoadingSpaces(false);
    }
  }, [authToken, assignedLotId, vehicleType, selectedSpaceId]);

  useEffect(() => {
    if (activeTab === 'entry') {
      void fetchSpaces();
    }
  }, [activeTab, fetchSpaces]);

  // 2. Fetch active sessions list
  const fetchActiveSessions = useCallback(async () => {
    if (!authToken) return;
    setIsLoadingActiveList(true);
    try {
      const list = await getActiveWalkIns(authToken, assignedLotId, activeSearchQuery);
      setActiveList(list);
    } catch (err) {
      console.warn('Failed to load active sessions:', err);
    } finally {
      setIsLoadingActiveList(false);
    }
  }, [authToken, assignedLotId, activeSearchQuery]);

  useEffect(() => {
    if (activeTab === 'active') {
      void fetchActiveSessions();
    }
  }, [activeTab, fetchActiveSessions]);

  // 3. Photo Capture with permission handling
  const handleTakePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Camera Permission Required',
          'Camera access was denied. You can still enter the plate number manually, or select a photo from your gallery.',
          [
            { text: 'Enter Manually', style: 'cancel' },
            {
              text: 'Pick from Gallery',
              onPress: async () => {
                const libRes = await ImagePicker.launchImageLibraryAsync({
                  mediaTypes: ImagePicker.MediaTypeOptions.Images,
                  allowsEditing: true,
                  quality: 0.8,
                });
                if (!libRes.canceled && libRes.assets[0]?.uri) {
                  setPhotoUri(libRes.assets[0].uri);
                }
              },
            },
          ]
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]?.uri) {
        setPhotoUri(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Camera Error', 'Could not access the camera. You can enter the plate number manually.');
    }
  };

  // 4. Submit Entry
  const handleCreateEntry = async () => {
    if (!authToken) {
      Alert.alert('Authentication error', 'Please login to perform staff operations.');
      return;
    }

    const trimmedPlate = vehiclePlate.trim().toUpperCase();
    if (!trimmedPlate) {
      Alert.alert('Plate number required', 'Please enter and confirm the vehicle registration plate.');
      return;
    }

    if (!selectedSpaceId) {
      Alert.alert('Slot selection required', 'Please tap an available parking slot from the list.');
      return;
    }

    setIsSubmittingEntry(true);
    try {
      const res = await createWalkInEntry(authToken, {
        parkingLotId: assignedLotId,
        vehiclePlate: trimmedPlate,
        vehicleType,
        parkingSpaceId: selectedSpaceId,
        customerName: customerName.trim() || undefined,
        customerPhone: customerPhone.trim() || undefined,
        photoUri: photoUri || undefined,
      });

      setIssuedReceipt(res);
      // Reset entry inputs
      setVehiclePlate('');
      setSelectedSpaceId(null);
      setCustomerName('');
      setCustomerPhone('');
      setPhotoUri(null);
    } catch (err) {
      Alert.alert('Walk-in Entry Failed', err instanceof Error ? err.message : 'Could not create parking session.');
    } finally {
      setIsSubmittingEntry(false);
    }
  };

  // 5. Look up session for Checkout
  const handleLookupCheckout = async (targetRef?: string) => {
    const query = (targetRef || checkoutQuery).trim();
    if (!query) {
      Alert.alert('Search Required', 'Please enter a receipt reference number or plate.');
      return;
    }

    if (!authToken) return;
    setIsSearchingCheckout(true);
    try {
      const res = await getWalkInSession(authToken, query);
      setActiveSessionForCheckout(res);
      setCashAmountInput(res.calculation.balanceDue > 0 ? String(res.calculation.balanceDue) : '0');
    } catch (err) {
      Alert.alert('Receipt Not Found', err instanceof Error ? err.message : 'Could not locate active session.');
    } finally {
      setIsSearchingCheckout(false);
    }
  };

  // 6. Complete Checkout / Cash Payment
  const handleExecuteCheckout = async () => {
    if (!authToken || !activeSessionForCheckout) return;

    const parsedAmount = parseFloat(cashAmountInput) || 0;
    if (parsedAmount < 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid cash amount.');
      return;
    }

    setIsProcessingCheckout(true);
    try {
      const res = await checkoutWalkIn(authToken, {
        reference: activeSessionForCheckout.session.reference,
        amountPaid: parsedAmount,
        paymentMethod: 'cash',
        confirmDeparture,
      });

      Alert.alert(
        'Checkout Complete',
        confirmDeparture
          ? `Departure confirmed for ${res.session.vehiclePlate}. Slot ${res.session.spaceNumber} has been freed.`
          : `Cash payment of Rs. ${parsedAmount} recorded successfully.`,
        [
          {
            text: 'OK',
            onPress: () => {
              setActiveSessionForCheckout(null);
              setCheckoutQuery('');
              setActiveTab('active');
            },
          },
        ]
      );
    } catch (err) {
      Alert.alert('Checkout Failed', err instanceof Error ? err.message : 'Could not complete checkout.');
    } finally {
      setIsProcessingCheckout(false);
    }
  };

  // 7. Print Receipt using expo-print
  const handlePrintReceipt = async (receiptData: WalkInReceiptData) => {
    try {
      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
            <style>
              body { font-family: monospace; padding: 20px; font-size: 14px; color: #000; }
              .header { text-align: center; border-bottom: 1px dashed #000; padding-bottom: 10px; margin-bottom: 12px; }
              .title { font-size: 18px; font-weight: bold; }
              .row { display: flex; justify-content: space-between; margin-bottom: 6px; }
              .ref { font-size: 16px; font-weight: bold; text-align: center; margin: 12px 0; border: 1px solid #000; padding: 6px; }
              .footer { border-top: 1px dashed #000; margin-top: 14px; padding-top: 8px; font-size: 11px; text-align: center; }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="title">ParkMe</div>
              <div>${receiptData.locationName}</div>
              <div>${receiptData.locationAddress}</div>
            </div>
            <div class="ref">REF: ${receiptData.reference}</div>
            <div class="row"><span>PLATE:</span><strong>${receiptData.vehiclePlate}</strong></div>
            <div class="row"><span>TYPE:</span><span>${receiptData.vehicleType}</span></div>
            <div class="row"><span>SLOT:</span><strong>${receiptData.spaceNumber} (Floor ${receiptData.floor})</strong></div>
            <div class="row"><span>ENTRY:</span><span>${new Date(receiptData.entryTime).toLocaleString('en-LK')}</span></div>
            <div class="row"><span>HOURLY RATE:</span><span>Rs. ${receiptData.hourlyRate}</span></div>
            <div class="row"><span>SERVICE CHARGE:</span><span>Rs. ${receiptData.serviceCharge}</span></div>
            <div class="footer">
              <p>${receiptData.billingRuleDescription}</p>
              <p>Keep this ticket safe. Show ticket upon exit to settle parking charges.</p>
            </div>
          </body>
        </html>
      `;

      await Print.printAsync({ html });
    } catch (error) {
      Alert.alert('Print Error', 'Could not open print dialog on this device.');
    }
  };

  // 8. Share Receipt PDF using expo-sharing
  const handleShareReceipt = async (receiptData: WalkInReceiptData) => {
    try {
      const html = `
        <!DOCTYPE html>
        <html>
          <body style="font-family: sans-serif; padding: 24px;">
            <h2>ParkMe Walk-in Parking Receipt</h2>
            <h3>${receiptData.locationName}</h3>
            <p><strong>Reference:</strong> ${receiptData.reference}</p>
            <p><strong>Plate:</strong> ${receiptData.vehiclePlate} (${receiptData.vehicleType})</p>
            <p><strong>Slot:</strong> ${receiptData.spaceNumber} - Floor ${receiptData.floor}</p>
            <p><strong>Entry Time:</strong> ${new Date(receiptData.entryTime).toLocaleString('en-LK')}</p>
            <p><strong>Billing Rule:</strong> ${receiptData.billingRuleDescription}</p>
          </body>
        </html>
      `;
      const { uri } = await Print.printToFileAsync({ html });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
      } else {
        Alert.alert('Receipt Generated', `Saved receipt PDF to ${uri}`);
      }
    } catch (error) {
      Alert.alert('Share Error', 'Could not share receipt.');
    }
  };

  return (
    <View style={[styles.container, { paddingTop: topPadding }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.7}>
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Walk-in Parking</Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {assignedLotName}
          </Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Segment Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'entry' && styles.tabItemActive]}
          onPress={() => setActiveTab('entry')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, activeTab === 'entry' && styles.tabTextActive]}>
            ➕ Entry
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'checkout' && styles.tabItemActive]}
          onPress={() => setActiveTab('checkout')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, activeTab === 'checkout' && styles.tabTextActive]}>
            🧾 Checkout
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'active' && styles.tabItemActive]}
          onPress={() => setActiveTab('active')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, activeTab === 'active' && styles.tabTextActive]}>
            🚗 Active ({activeList.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* TAB 1: VEHICLE ENTRY */}
      {activeTab === 'entry' && (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.contentContainer, { paddingBottom }]}
          keyboardShouldPersistTaps="handled"
        >
          {/* Photo Section */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>1. Number Plate Evidence</Text>
            <Text style={styles.cardSubtitle}>
              Take a photo for verification, or enter the plate manually below.
            </Text>

            {photoUri ? (
              <View style={styles.photoPreviewRow}>
                <Image source={{ uri: photoUri }} style={styles.photoThumbnail} />
                <View style={styles.photoInfo}>
                  <Text style={styles.photoAttachedText}>✓ Photo Attached</Text>
                  <TouchableOpacity
                    style={styles.retakeBtn}
                    onPress={handleTakePhoto}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.retakeBtnText}>Retake Photo</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.cameraBtn}
                onPress={handleTakePhoto}
                activeOpacity={0.8}
              >
                <Text style={styles.cameraBtnIcon}>📷</Text>
                <Text style={styles.cameraBtnText}>Capture Plate Photo</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Plate & Vehicle Type */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>2. Vehicle Details</Text>
            <Text style={styles.inputLabel}>REGISTRATION NUMBER *</Text>
            <TextInput
              style={styles.textInput}
              value={vehiclePlate}
              onChangeText={(text) => setVehiclePlate(text.toUpperCase())}
              placeholder="e.g. WP CAB-4921"
              placeholderTextColor="#94A3B8"
              autoCapitalize="characters"
              autoCorrect={false}
            />

            <Text style={[styles.inputLabel, { marginTop: 14 }]}>VEHICLE TYPE</Text>
            <View style={styles.vehicleTypeRow}>
              {(['Car', 'Bike', 'SUV', 'EV'] as const).map((vt) => {
                const isSelected = vehicleType === vt;
                const icon = vt === 'Car' ? '🚗' : vt === 'Bike' ? '🏍️' : vt === 'SUV' ? '🚙' : '⚡';
                return (
                  <TouchableOpacity
                    key={vt}
                    style={[styles.vehiclePill, isSelected && styles.vehiclePillActive]}
                    onPress={() => setVehicleType(vt)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.vehiclePillIcon}>{icon}</Text>
                    <Text style={[styles.vehiclePillText, isSelected && styles.vehiclePillTextActive]}>
                      {vt}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Slot Selection */}
          <View style={styles.card}>
            <View style={styles.rowBetween}>
              <Text style={styles.cardTitle}>3. Assign Parking Slot *</Text>
              <TouchableOpacity onPress={fetchSpaces} activeOpacity={0.7}>
                <Text style={styles.refreshLink}>🔄 Refresh</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.cardSubtitle}>
              Compatible spaces without existing or upcoming reservations
            </Text>

            {isLoadingSpaces ? (
              <ActivityIndicator color="#0F172A" style={{ marginVertical: 16 }} />
            ) : availableSpaces.length === 0 ? (
              <View style={styles.noSpacesBox}>
                <Text style={styles.noSpacesText}>⚠️ No available spaces found for {vehicleType}</Text>
              </View>
            ) : (
              <View style={styles.spacesGrid}>
                {availableSpaces.map((sp) => {
                  const isSelected = selectedSpaceId === sp._id;
                  return (
                    <TouchableOpacity
                      key={sp._id}
                      style={[styles.spaceCell, isSelected && styles.spaceCellActive]}
                      onPress={() => setSelectedSpaceId(sp._id)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.spaceNumberText, isSelected && styles.spaceNumberTextActive]}>
                        {sp.spaceNumber}
                      </Text>
                      <Text style={[styles.spaceFloorText, isSelected && styles.spaceFloorTextActive]}>
                        Fl. {sp.floor || 'G'}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>

          {/* Optional Customer Contact */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>4. Customer Contact (Optional)</Text>
            <TextInput
              style={[styles.textInput, { marginBottom: 10 }]}
              value={customerName}
              onChangeText={setCustomerName}
              placeholder="Customer Name (optional)"
              placeholderTextColor="#94A3B8"
            />
            <TextInput
              style={styles.textInput}
              value={customerPhone}
              onChangeText={setCustomerPhone}
              placeholder="Phone Number (optional)"
              placeholderTextColor="#94A3B8"
              keyboardType="phone-pad"
            />
          </View>

          {/* Submit Action */}
          <TouchableOpacity
            style={[styles.primaryButton, isSubmittingEntry && { opacity: 0.7 }]}
            onPress={handleCreateEntry}
            disabled={isSubmittingEntry}
            activeOpacity={0.85}
          >
            {isSubmittingEntry ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryButtonText}>Assign Slot & Issue Receipt</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* TAB 2: CHECKOUT & SCAN */}
      {activeTab === 'checkout' && (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.contentContainer, { paddingBottom }]}
          keyboardShouldPersistTaps="handled"
        >
          {/* Search Box */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Look up Receipt / Active Ticket</Text>
            <View style={styles.searchRow}>
              <TextInput
                style={[styles.textInput, { flex: 1, marginRight: 8 }]}
                value={checkoutQuery}
                onChangeText={setCheckoutQuery}
                placeholder="Reference (e.g. PM-WI-...) or Plate"
                placeholderTextColor="#94A3B8"
                autoCapitalize="characters"
              />
              <TouchableOpacity
                style={styles.searchButton}
                onPress={() => handleLookupCheckout()}
                activeOpacity={0.8}
                disabled={isSearchingCheckout}
              >
                {isSearchingCheckout ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.searchButtonText}>Search</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Active Session Checkout Details */}
          {activeSessionForCheckout && (
            <View style={styles.card}>
              <View style={styles.rowBetween}>
                <Text style={styles.checkoutRefText}>
                  {activeSessionForCheckout.session.reference}
                </Text>
                <View
                  style={[
                    styles.statusPill,
                    activeSessionForCheckout.session.status === 'completed'
                      ? styles.statusPillCompleted
                      : styles.statusPillActive,
                  ]}
                >
                  <Text style={styles.statusPillText}>
                    {activeSessionForCheckout.session.status.toUpperCase()}
                  </Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.checkoutDetailRow}>
                <Text style={styles.detailLabel}>Vehicle Plate:</Text>
                <Text style={styles.detailValue}>
                  {activeSessionForCheckout.session.vehiclePlate} ({activeSessionForCheckout.session.vehicleType})
                </Text>
              </View>

              <View style={styles.checkoutDetailRow}>
                <Text style={styles.detailLabel}>Assigned Slot:</Text>
                <Text style={styles.detailValue}>
                  {activeSessionForCheckout.session.spaceNumber} (Floor {activeSessionForCheckout.session.floor})
                </Text>
              </View>

              <View style={styles.checkoutDetailRow}>
                <Text style={styles.detailLabel}>Entry Time:</Text>
                <Text style={styles.detailValue}>
                  {new Date(activeSessionForCheckout.session.entryTime).toLocaleTimeString('en-LK', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </View>

              <View style={styles.checkoutDetailRow}>
                <Text style={styles.detailLabel}>Duration:</Text>
                <Text style={styles.detailValue}>
                  {activeSessionForCheckout.calculation.durationMinutes} mins ({activeSessionForCheckout.calculation.startedHours} started hrs)
                </Text>
              </View>

              <View style={styles.itemizedBox}>
                <Text style={styles.itemizedTitle}>BILL BREAKDOWN</Text>
                <View style={styles.checkoutDetailRow}>
                  <Text style={styles.itemizedLabel}>
                    Parking ({activeSessionForCheckout.calculation.startedHours} hr × Rs. {activeSessionForCheckout.calculation.hourlyRate}):
                  </Text>
                  <Text style={styles.itemizedValue}>
                    Rs. {activeSessionForCheckout.calculation.parkingCharge}
                  </Text>
                </View>
                <View style={styles.checkoutDetailRow}>
                  <Text style={styles.itemizedLabel}>Service Charge (One-time):</Text>
                  <Text style={styles.itemizedValue}>
                    Rs. {activeSessionForCheckout.calculation.serviceCharge}
                  </Text>
                </View>
                <View style={[styles.checkoutDetailRow, { marginTop: 6, borderTopWidth: 1, borderColor: '#CBD5E1', paddingTop: 6 }]}>
                  <Text style={styles.totalLabel}>Total Charge:</Text>
                  <Text style={styles.totalValue}>
                    Rs. {activeSessionForCheckout.calculation.totalAmount}
                  </Text>
                </View>
                <View style={styles.checkoutDetailRow}>
                  <Text style={styles.itemizedLabel}>Amount Paid So Far:</Text>
                  <Text style={styles.itemizedValue}>
                    Rs. {activeSessionForCheckout.calculation.amountPaid}
                  </Text>
                </View>
                <View style={[styles.checkoutDetailRow, { marginTop: 4 }]}>
                  <Text style={[styles.totalLabel, { color: '#DC2626' }]}>Outstanding Due:</Text>
                  <Text style={[styles.totalValue, { color: '#DC2626' }]}>
                    Rs. {activeSessionForCheckout.calculation.balanceDue}
                  </Text>
                </View>
                {activeSessionForCheckout.calculation.isEstimated && (
                  <Text style={styles.estimateNotice}>
                    * Displayed charges are a live estimate until departure is confirmed.
                  </Text>
                )}
              </View>

              {/* Cash Collection Section */}
              {activeSessionForCheckout.session.status !== 'completed' ? (
                <View style={{ marginTop: 16 }}>
                  <Text style={styles.inputLabel}>CASH RECEIVED (RS.)</Text>
                  <TextInput
                    style={styles.textInput}
                    value={cashAmountInput}
                    onChangeText={setCashAmountInput}
                    keyboardType="numeric"
                    placeholder="Enter cash received"
                  />

                  <TouchableOpacity
                    style={[styles.departureToggle, confirmDeparture && styles.departureToggleActive]}
                    onPress={() => setConfirmDeparture(!confirmDeparture)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.departureToggleText}>
                      {confirmDeparture ? '☑ Confirm vehicle departure and release slot' : '☐ Record payment only (vehicle still inside)'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.primaryButton, isProcessingCheckout && { opacity: 0.7 }]}
                    onPress={handleExecuteCheckout}
                    disabled={isProcessingCheckout}
                    activeOpacity={0.85}
                  >
                    {isProcessingCheckout ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text style={styles.primaryButtonText}>
                        {confirmDeparture ? 'Confirm Departure & Release Slot' : 'Record Cash Payment'}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.alreadyCompletedBox}>
                  <Text style={styles.alreadyCompletedText}>
                    ✓ This vehicle has already checked out and departed.
                  </Text>
                </View>
              )}
            </View>
          )}
        </ScrollView>
      )}

      {/* TAB 3: ACTIVE VEHICLES */}
      {activeTab === 'active' && (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.contentContainer, { paddingBottom }]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.searchRow}>
            <TextInput
              style={[styles.textInput, { flex: 1, marginRight: 8 }]}
              value={activeSearchQuery}
              onChangeText={setActiveSearchQuery}
              placeholder="Search by plate or slot..."
              placeholderTextColor="#94A3B8"
            />
            <TouchableOpacity
              style={styles.searchButton}
              onPress={fetchActiveSessions}
              activeOpacity={0.8}
            >
              <Text style={styles.searchButtonText}>Filter</Text>
            </TouchableOpacity>
          </View>

          {isLoadingActiveList ? (
            <ActivityIndicator color="#0F172A" style={{ marginTop: 24 }} />
          ) : activeList.length === 0 ? (
            <View style={styles.noSpacesBox}>
              <Text style={styles.noSpacesText}>No active walk-in vehicles currently parked.</Text>
            </View>
          ) : (
            activeList.map((item) => (
              <View key={item._id} style={styles.activeCard}>
                <View style={styles.rowBetween}>
                  <View>
                    <Text style={styles.activePlateText}>{item.vehiclePlate}</Text>
                    <Text style={styles.activeSlotSub}>
                      Slot {item.spaceNumber} (Floor {item.floor}) · {item.vehicleType}
                    </Text>
                  </View>
                  <View style={styles.slotBadge}>
                    <Text style={styles.slotBadgeText}>{item.spaceNumber}</Text>
                  </View>
                </View>

                <View style={styles.divider} />

                <View style={styles.rowBetween}>
                  <Text style={styles.activeTimeText}>
                    Parked: {new Date(item.entryTime).toLocaleTimeString('en-LK', { hour: '2-digit', minute: '2-digit' })} ({item.calculation.durationMinutes}m)
                  </Text>
                  <Text style={styles.activeEstimateText}>
                    Est. Rs. {item.calculation.totalAmount}
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.activeCheckoutBtn}
                  onPress={() => {
                    setActiveTab('checkout');
                    setCheckoutQuery(item.reference);
                    void handleLookupCheckout(item.reference);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.activeCheckoutBtnText}>Checkout / Settle Bill</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </ScrollView>
      )}

      {/* ISSUED RECEIPT MODAL */}
      {issuedReceipt && (
        <View style={styles.receiptOverlay}>
          <ScrollView contentContainerStyle={styles.receiptModalScroll}>
            <View style={styles.receiptCard}>
              <View style={styles.receiptHeader}>
                <Text style={styles.receiptAppBrand}>ParkMe</Text>
                <Text style={styles.receiptLocationName}>{issuedReceipt.receipt.locationName}</Text>
                <Text style={styles.receiptLocationAddress}>{issuedReceipt.receipt.locationAddress}</Text>
              </View>

              <View style={styles.qrContainer}>
                <MiniQR seed={issuedReceipt.receipt.qrPayload} />
                <Text style={styles.receiptRefBig}>{issuedReceipt.receipt.reference}</Text>
              </View>

              <View style={styles.receiptInfoGrid}>
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptRowLabel}>Plate Number:</Text>
                  <Text style={styles.receiptRowValue}>{issuedReceipt.receipt.vehiclePlate}</Text>
                </View>
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptRowLabel}>Vehicle Type:</Text>
                  <Text style={styles.receiptRowValue}>{issuedReceipt.receipt.vehicleType}</Text>
                </View>
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptRowLabel}>Assigned Slot:</Text>
                  <Text style={styles.receiptRowValue}>
                    {issuedReceipt.receipt.spaceNumber} (Floor {issuedReceipt.receipt.floor})
                  </Text>
                </View>
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptRowLabel}>Entry Date/Time:</Text>
                  <Text style={styles.receiptRowValue}>
                    {new Date(issuedReceipt.receipt.entryTime).toLocaleString('en-LK')}
                  </Text>
                </View>
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptRowLabel}>Hourly Rate:</Text>
                  <Text style={styles.receiptRowValue}>Rs. {issuedReceipt.receipt.hourlyRate}</Text>
                </View>
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptRowLabel}>Service Charge:</Text>
                  <Text style={styles.receiptRowValue}>Rs. {issuedReceipt.receipt.serviceCharge}</Text>
                </View>
              </View>

              <View style={styles.receiptNoticeBox}>
                <Text style={styles.receiptNoticeText}>
                  {issuedReceipt.receipt.billingRuleDescription}
                </Text>
                <Text style={[styles.receiptNoticeText, { marginTop: 4, fontWeight: '700' }]}>
                  Please keep this ticket. Scan or show ticket at exit to settle charges.
                </Text>
              </View>

              <View style={styles.receiptActionsRow}>
                <TouchableOpacity
                  style={styles.printBtn}
                  onPress={() => handlePrintReceipt(issuedReceipt.receipt)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.printBtnText}>🖨️ Print Ticket</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.shareBtn}
                  onPress={() => handleShareReceipt(issuedReceipt.receipt)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.shareBtnText}>📤 Share / PDF</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.doneBtn}
                onPress={() => setIssuedReceipt(null)}
                activeOpacity={0.85}
              >
                <Text style={styles.doneBtnText}>Done / Return to Entry</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backArrow: {
    fontSize: 28,
    color: '#0F172A',
    lineHeight: 32,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748B',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  tabItem: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabItemActive: {
    backgroundColor: '#0F172A',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  scroll: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 12,
  },
  cameraBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderStyle: 'dashed',
  },
  cameraBtnIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  cameraBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
  photoPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  photoThumbnail: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#E2E8F0',
  },
  photoInfo: {
    marginLeft: 14,
    flex: 1,
  },
  photoAttachedText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#10B981',
    marginBottom: 6,
  },
  retakeBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#F1F5F9',
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  retakeBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
  },
  vehicleTypeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  vehiclePill: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  vehiclePillActive: {
    borderColor: '#0F172A',
    backgroundColor: '#0F172A',
  },
  vehiclePillIcon: {
    fontSize: 16,
    marginBottom: 2,
  },
  vehiclePillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  vehiclePillTextActive: {
    color: '#FFFFFF',
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  refreshLink: {
    fontSize: 12,
    color: '#2563EB',
    fontWeight: '600',
  },
  noSpacesBox: {
    paddingVertical: 18,
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
  },
  noSpacesText: {
    fontSize: 13,
    color: '#DC2626',
    fontWeight: '500',
  },
  spacesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  spaceCell: {
    width: '23%',
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
  },
  spaceCellActive: {
    borderColor: '#10B981',
    backgroundColor: '#ECFDF5',
  },
  spaceNumberText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  spaceNumberTextActive: {
    color: '#047857',
  },
  spaceFloorText: {
    fontSize: 10,
    color: '#64748B',
  },
  spaceFloorTextActive: {
    color: '#059669',
  },
  primaryButton: {
    backgroundColor: '#0F172A',
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
    shadowColor: '#0F172A',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 4,
    marginTop: 6,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchButton: {
    backgroundColor: '#0F172A',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  checkoutRefText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusPillActive: {
    backgroundColor: '#DCFCE7',
  },
  statusPillCompleted: {
    backgroundColor: '#F1F5F9',
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F172A',
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 10,
  },
  checkoutDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  detailLabel: {
    fontSize: 13,
    color: '#64748B',
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  itemizedBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  itemizedTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  itemizedLabel: {
    fontSize: 13,
    color: '#475569',
  },
  itemizedValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  totalValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  estimateNotice: {
    fontSize: 11,
    color: '#64748B',
    fontStyle: 'italic',
    marginTop: 6,
  },
  departureToggle: {
    paddingVertical: 10,
    marginBottom: 10,
  },
  departureToggleActive: {},
  departureToggleText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  alreadyCompletedBox: {
    backgroundColor: '#F0FDF4',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    alignItems: 'center',
  },
  alreadyCompletedText: {
    color: '#15803D',
    fontWeight: '600',
    fontSize: 13,
  },
  activeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  activePlateText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  activeSlotSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  slotBadge: {
    backgroundColor: '#F1F5F9',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  slotBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  activeTimeText: {
    fontSize: 12,
    color: '#64748B',
  },
  activeEstimateText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  activeCheckoutBtn: {
    backgroundColor: '#0F172A',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  activeCheckoutBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  receiptOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  receiptModalScroll: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  receiptCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 16,
    elevation: 8,
  },
  receiptHeader: {
    alignItems: 'center',
    marginBottom: 12,
  },
  receiptAppBrand: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: 1,
  },
  receiptLocationName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
    marginTop: 2,
    textAlign: 'center',
  },
  receiptLocationAddress: {
    fontSize: 11,
    color: '#64748B',
    textAlign: 'center',
  },
  qrContainer: {
    padding: 10,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    marginBottom: 14,
  },
  receiptRefBig: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 6,
    letterSpacing: 1,
  },
  receiptInfoGrid: {
    width: '100%',
    marginBottom: 12,
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  receiptRowLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  receiptRowValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  receiptNoticeBox: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 8,
    padding: 10,
    width: '100%',
    marginBottom: 16,
  },
  receiptNoticeText: {
    fontSize: 11,
    color: '#B45309',
    textAlign: 'center',
  },
  receiptActionsRow: {
    flexDirection: 'row',
    gap: 8,
    width: '100%',
    marginBottom: 10,
  },
  printBtn: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  printBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  shareBtn: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  shareBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  doneBtn: {
    width: '100%',
    backgroundColor: '#0F172A',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  doneBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});
