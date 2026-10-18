const http = require('http');

const BASE_URL = 'http://localhost:5000';

function request(options, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(options.path, BASE_URL);
    const reqOptions = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: options.method || 'GET',
      headers: options.headers || {},
    };

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        let json;
        try {
          json = JSON.parse(data);
        } catch {
          json = data;
        }
        resolve({
          status: res.statusCode,
          statusText: res.statusMessage,
          headers: res.headers,
          data: json,
        });
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

async function run() {
  console.log('Running 10 Target Test Cases against', BASE_URL);
  const results = {};

  // Setup: Register/Login a driver
  const driverEmail = `driver_test_${Date.now()}@parkme.test`;
  const regRes = await request(
    {
      method: 'POST',
      path: '/api/auth/driver/register',
      headers: { 'Content-Type': 'application/json' },
    },
    {
      name: 'Test Driver',
      email: driverEmail,
      password: 'Password123!',
      phone: '0771234567',
    }
  );
  const driverToken = regRes.data.token;

  // Setup: Staff Login
  const staffLoginRes = await request(
    {
      method: 'POST',
      path: '/api/auth/login',
      headers: { 'Content-Type': 'application/json' },
    },
    { email: 'kamal.perera@parkme.com', password: 'Password123!' }
  );
  const staffToken = staffLoginRes.data.token;

  // Setup: Find a lot and space
  const lotsRes = await request({ method: 'GET', path: '/api/parking-lots' });
  const lot = Array.isArray(lotsRes.data) && lotsRes.data[0];
  const lotId = lot?._id || '670000000000000000000001';

  const spacesRes = await request({ method: 'GET', path: `/api/parking-lots/${lotId}/spaces` });
  const space = Array.isArray(spacesRes.data) && spacesRes.data[0];
  const spaceId = space?._id || '670000000000000000000002';

  // TC-04: Invalid User Login
  results['TC-04'] = {
    title: 'TC-04: Invalid User Login',
    request: {
      method: 'POST',
      url: `${BASE_URL}/api/auth/driver/login`,
      headers: { 'Content-Type': 'application/json' },
      body: { email: 'wrongdriver@test.com', password: 'WrongPassword999!' },
    },
    response: await request(
      { method: 'POST', path: '/api/auth/driver/login', headers: { 'Content-Type': 'application/json' } },
      { email: 'wrongdriver@test.com', password: 'WrongPassword999!' }
    ),
  };

  // TC-07: Search Parking
  results['TC-07'] = {
    title: 'TC-07: Search Parking',
    request: {
      method: 'GET',
      url: `${BASE_URL}/api/parking-lots?search=Colombo`,
      headers: {},
      body: null,
    },
    response: await request({ method: 'GET', path: '/api/parking-lots?search=Colombo' }),
  };

  // Setup: Create fresh test spaces
  const testSpaceRes = await request(
    {
      method: 'POST',
      path: `/api/parking-lots/${lotId}/spaces`,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${staffToken}` },
    },
    { spaceNumbers: [`TEST-${Date.now()}`], floor: 'Ground Floor', vehicleType: 'Car' }
  );
  const newSpaceId = Array.isArray(testSpaceRes.data) ? testSpaceRes.data[0]._id : testSpaceRes.data._id;

  // Setup: Create a base booking for double-booking test
  const booking1Res = await request(
    {
      method: 'POST',
      path: '/api/reservations',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${driverToken}` },
    },
    {
      parkingSpaceId: newSpaceId,
      parkingLotId: lotId,
      startTime: '2026-12-10T10:00:00.000Z',
      endTime: '2026-12-10T12:00:00.000Z',
      vehicleType: 'Car',
      vehiclePlate: 'WP CAB-4921',
      paymentMethod: 'cash',
    }
  );
  const reservationId = booking1Res.data._id;
  const reservationRef = booking1Res.data.reference;

  // TC-13: Prevent Double Booking
  results['TC-13'] = {
    title: 'TC-13: Prevent Double Booking',
    request: {
      method: 'POST',
      url: `${BASE_URL}/api/reservations`,
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer <driverToken>' },
      body: {
        parkingSpaceId: newSpaceId,
        parkingLotId: lotId,
        startTime: '2026-12-10T10:30:00.000Z',
        endTime: '2026-12-10T11:30:00.000Z',
        vehicleType: 'Car',
        vehiclePlate: 'WP CAB-9999',
        paymentMethod: 'card',
      },
    },
    response: await request(
      {
        method: 'POST',
        path: '/api/reservations',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${driverToken}` },
      },
      {
        parkingSpaceId: newSpaceId,
        parkingLotId: lotId,
        startTime: '2026-12-10T10:30:00.000Z',
        endTime: '2026-12-10T11:30:00.000Z',
        vehicleType: 'Car',
        vehiclePlate: 'WP CAB-9999',
        paymentMethod: 'card',
      }
    ),
  };

  // Setup: Create future reservation for cancellation
  const cancelSpaceRes = await request(
    {
      method: 'POST',
      path: `/api/parking-lots/${lotId}/spaces`,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${staffToken}` },
    },
    { spaceNumbers: [`CAN-${Date.now()}`], floor: 'Ground Floor', vehicleType: 'Car' }
  );
  const cancelSpaceId = Array.isArray(cancelSpaceRes.data) ? cancelSpaceRes.data[0]._id : cancelSpaceRes.data._id;

  const cancelCandidateRes = await request(
    {
      method: 'POST',
      path: '/api/reservations',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${driverToken}` },
    },
    {
      parkingSpaceId: cancelSpaceId,
      parkingLotId: lotId,
      startTime: '2026-12-25T14:00:00.000Z',
      endTime: '2026-12-25T16:00:00.000Z',
      vehicleType: 'Car',
      vehiclePlate: 'WP CAB-7777',
    }
  );
  const cancelId = cancelCandidateRes.data._id;

  // TC-15: Cancel Reservation
  results['TC-15'] = {
    title: 'TC-15: Cancel Reservation',
    request: {
      method: 'PUT',
      url: `${BASE_URL}/api/reservations/${cancelId}/cancel`,
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer <driverToken>' },
      body: { reason: 'Change of plans / Schedule changed' },
    },
    response: await request(
      {
        method: 'PUT',
        path: `/api/reservations/${cancelId}/cancel`,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${driverToken}` },
      },
      { reason: 'Change of plans / Schedule changed' }
    ),
  };

  // TC-17: Payment
  results['TC-17'] = {
    title: 'TC-17: Payment Processing',
    request: {
      method: 'POST',
      url: `${BASE_URL}/api/payments`,
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer <driverToken>' },
      body: {
        reservationId: reservationId,
        method: 'card',
        paymentType: 'booking',
      },
    },
    response: await request(
      {
        method: 'POST',
        path: '/api/payments',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${driverToken}` },
      },
      {
        reservationId: reservationId,
        method: 'card',
        paymentType: 'booking',
      }
    ),
  };

  // TC-24: Parking Space Validation
  results['TC-24'] = {
    title: 'TC-24: Parking Space Validation',
    request: {
      method: 'POST',
      url: `${BASE_URL}/api/parking-lots/${lotId}/spaces`,
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer <staffToken>' },
      body: { spaceNumbers: [], floor: '' },
    },
    response: await request(
      {
        method: 'POST',
        path: `/api/parking-lots/${lotId}/spaces`,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${staffToken}` },
      },
      { spaceNumbers: [], floor: '' }
    ),
  };

  // TC-29: Search or Filter Reservations
  results['TC-29'] = {
    title: 'TC-29: Search or Filter Reservations',
    request: {
      method: 'GET',
      url: `${BASE_URL}/api/reservations?status=pending`,
      headers: { Authorization: 'Bearer <staffToken>' },
      body: null,
    },
    response: await request({
      method: 'GET',
      path: '/api/reservations?status=pending',
      headers: { Authorization: `Bearer ${staffToken}` },
    }),
  };

  // TC-34: QR Code Scanning / Lookup
  results['TC-34'] = {
    title: 'TC-34: QR Code Scanning / Lookup',
    request: {
      method: 'GET',
      url: `${BASE_URL}/api/reservations/lookup?query=${reservationRef}`,
      headers: { Authorization: 'Bearer <staffToken>' },
      body: null,
    },
    response: await request({
      method: 'GET',
      path: `/api/reservations/lookup?query=${encodeURIComponent(reservationRef)}`,
      headers: { Authorization: `Bearer ${staffToken}` },
    }),
  };

  // TC-35: Staff Access Control (Driver Denied)
  results['TC-35'] = {
    title: 'TC-35: Staff Access Control (Driver Denied)',
    request: {
      method: 'GET',
      url: `${BASE_URL}/api/reservations`,
      headers: { Authorization: 'Bearer <driverToken>' },
      body: null,
    },
    response: await request({
      method: 'GET',
      path: '/api/reservations',
      headers: { Authorization: `Bearer ${driverToken}` },
    }),
  };

  // TC-39: Network or Backend Error Handling
  results['TC-39'] = {
    title: 'TC-39: Network or Backend Error Handling',
    request: {
      method: 'GET',
      url: `${BASE_URL}/api/non-existent-endpoint`,
      headers: {},
      body: null,
    },
    response: await request({
      method: 'GET',
      path: '/api/non-existent-endpoint',
    }),
  };

  console.log(JSON.stringify(results, null, 2));
}

run().catch(console.error);
