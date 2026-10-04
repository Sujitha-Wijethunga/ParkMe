/**
 * Automated Driver Authentication Verification Test Suite
 *
 * Covers:
 * 1. Validation failure on empty or malformed input
 * 2. Public driver registration (strictly enforces role: 'driver', ignores privilege escalation)
 * 3. Duplicate registration conflict (409)
 * 4. Successful driver login by email
 * 5. Successful driver login by phone number
 * 6. Authentication failure on incorrect password
 * 7. Protected /api/auth/me access with valid JWT token
 * 8. Rejection of invalid / tampered JWT token
 * 9. Rejection of missing JWT token
 */

const BASE_URL = process.env.TEST_API_URL || 'http://localhost:5000';

async function runDriverAuthTests() {
  console.log(`Starting Driver Auth Test Suite against ${BASE_URL}...`);
  const ts = Date.now();
  const testEmail = `driver_test_${ts}@parkme.city`;
  const testPhone = `071${String(ts).slice(-7)}`;
  let passedCount = 0;
  let totalCount = 0;

  function assert(condition, message) {
    totalCount++;
    if (!condition) {
      console.error(`❌ FAILED: ${message}`);
      throw new Error(`Test assertion failed: ${message}`);
    }
    passedCount++;
    console.log(`✅ PASSED: ${message}`);
  }

  // 1. Validation failure on empty body
  {
    const res = await fetch(`${BASE_URL}/api/auth/driver/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const data = await res.json();
    assert(res.status === 400, 'Register with empty payload responds with 400');
    assert(Array.isArray(data.errors) && data.errors.length >= 3, 'Validation returns descriptive field errors');
  }

  // 2. Public driver registration & privilege escalation protection
  let authToken = '';
  {
    const res = await fetch(`${BASE_URL}/api/auth/driver/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Kasun Bandara',
        email: testEmail,
        phone: testPhone,
        password: 'password123',
        role: 'admin', // Attempted escalation
      }),
    });
    const data = await res.json();
    assert(res.status === 201, 'Driver registration succeeds with 201');
    assert(data.role === 'driver', 'Public registration forces role to "driver"');
    assert(typeof data.token === 'string' && data.token.length > 20, 'Returns valid JWT token');
    assert(!data.password, 'Does not return password hash');
    authToken = data.token;
  }

  // 3. Duplicate registration conflict
  {
    const res = await fetch(`${BASE_URL}/api/auth/driver/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Another Driver',
        email: testEmail,
        phone: testPhone,
        password: 'password123',
      }),
    });
    assert(res.status === 409, 'Duplicate email registration returns 409 Conflict');
  }

  // 4. Successful login by email
  {
    const res = await fetch(`${BASE_URL}/api/auth/driver/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: testEmail,
        password: 'password123',
      }),
    });
    const data = await res.json();
    assert(res.status === 200, 'Driver login by email succeeds with 200');
    assert(data.email === testEmail, 'Login returns correct driver user email');
    assert(data.role === 'driver', 'User role is driver');
    assert(typeof data.token === 'string', 'Returns JWT token on login');
  }

  // 5. Successful login by phone number
  {
    const res = await fetch(`${BASE_URL}/api/auth/driver/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: testPhone,
        password: 'password123',
      }),
    });
    const data = await res.json();
    assert(res.status === 200, 'Driver login by phone succeeds with 200');
    assert(data.phone === testPhone, 'Login returns correct driver phone number');
  }

  // 6. Incorrect password failure
  {
    const res = await fetch(`${BASE_URL}/api/auth/driver/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: testEmail,
        password: 'wrong_password_xyz',
      }),
    });
    assert(res.status === 401, 'Login with incorrect password returns 401 Unauthorized');
  }

  // 7. Protected /api/auth/me access with valid JWT token
  {
    const res = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const data = await res.json();
    assert(res.status === 200, '/api/auth/me returns 200 with valid JWT');
    assert(data.email === testEmail, '/api/auth/me returns matching user identity');
    assert(!data.password, '/api/auth/me does not expose password hash');
  }

  // 8. Protected /api/auth/me rejection on invalid token
  {
    const res = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Authorization: 'Bearer invalid_tampered_token_here' },
    });
    assert(res.status === 401, '/api/auth/me returns 401 on invalid token');
  }

  // 9. Protected /api/auth/me rejection on missing token
  {
    const res = await fetch(`${BASE_URL}/api/auth/me`);
    assert(res.status === 401, '/api/auth/me returns 401 on missing token');
  }

  console.log(`\n🎉 All ${passedCount}/${totalCount} driver authentication tests passed successfully!`);
}

if (require.main === module) {
  runDriverAuthTests().catch((err) => {
    console.error('Test execution failed:', err);
    process.exit(1);
  });
}

module.exports = { runDriverAuthTests };
