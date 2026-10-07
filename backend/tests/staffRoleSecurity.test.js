/**
 * Automated Staff Role Security & Authorization Verification Test Suite
 *
 * Covers:
 * 1. Public registration cannot grant staff role without valid facility staff code (403)
 * 2. Rejection of invalid / tampered staff codes (403)
 * 3. Authorized staff registration with correct staff code succeeds (201)
 * 4. Driver user cannot access protected staff endpoints (/api/attendance, /api/leave-requests) (403)
 * 5. Authorized staff user can access staff endpoints with their JWT token (200)
 */

const BASE_URL = process.env.TEST_API_URL || 'http://localhost:5000';

async function runStaffRoleSecurityTests() {
  console.log(`Starting Staff Role Security Test Suite against ${BASE_URL}...`);
  const ts = Date.now();
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

  // 1. Rejection of staff registration when staff code is missing
  {
    const res = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Unauthorized User',
        email: `unauth_${ts}@parkme.city`,
        phone: '0771234567',
        password: 'Password123!',
        // No staffCode provided
      }),
    });
    assert(res.status === 400, 'Staff registration without staff code rejected with 400 validation error');
    const data = await res.json();
    assert(
      Array.isArray(data.errors) && data.errors.some((err) => err.field === 'staffCode'),
      'Returns descriptive staffCode validation field error'
    );
  }

  // 2. Rejection of staff registration with wrong staff code
  {
    const res = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Hacker User',
        email: `hacker_${ts}@parkme.city`,
        phone: '0771234568',
        password: 'Password123!',
        staffCode: 'INVALID_STAFF_SECRET',
      }),
    });
    assert(res.status === 403, 'Staff registration with invalid staff code rejected with 403');
  }

  // 3. Authorized staff registration with valid staff code succeeds
  let staffToken = '';
  const validStaffEmail = `staff_${ts}@parkme.city`;
  {
    const expectedCode = process.env.STAFF_REGISTRATION_CODE || 'PARKME_STAFF_2026';
    const res = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Kamal Perera',
        email: validStaffEmail,
        phone: '0771234569',
        password: 'Password123!',
        staffCode: expectedCode,
      }),
    });
    assert(res.status === 201, 'Staff registration with valid staff code succeeds with 201');
    const data = await res.json();
    assert(data.role === 'staff' || data.role === 'Parking Staff', 'Staff user registered with role "Parking Staff"');
    assert(typeof data.token === 'string' && data.token.length > 20, 'Staff registration returns JWT token');
    staffToken = data.token;
  }

  // 4. Create a driver account to test endpoint authorization enforcement
  let driverToken = '';
  {
    const res = await fetch(`${BASE_URL}/api/auth/driver/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Driver Kasun',
        email: `driver_rbac_${ts}@parkme.city`,
        phone: `075${String(ts).slice(-7)}`,
        password: 'Password123!',
      }),
    });
    assert(res.status === 201, 'Driver registered successfully for RBAC test');
    const data = await res.json();
    assert(data.role === 'driver', 'Driver role confirmed');
    driverToken = data.token;
  }

  // 5. Driver user cannot access /api/attendance (RBAC enforcement)
  {
    const res = await fetch(`${BASE_URL}/api/attendance`, {
      headers: { Authorization: `Bearer ${driverToken}` },
    });
    assert(res.status === 403, 'Driver access to /api/attendance rejected with 403 Forbidden');
  }

  // 6. Driver user cannot access /api/leave-requests (RBAC enforcement)
  {
    const res = await fetch(`${BASE_URL}/api/leave-requests`, {
      headers: { Authorization: `Bearer ${driverToken}` },
    });
    assert(res.status === 403, 'Driver access to /api/leave-requests rejected with 403 Forbidden');
  }

  // 7. Authorized staff user CAN access /api/attendance
  {
    const res = await fetch(`${BASE_URL}/api/attendance`, {
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    assert(res.status === 200, 'Authorized staff access to /api/attendance responds with 200 OK');
  }

  // 8. Authorized staff user CAN access /api/leave-requests
  {
    const res = await fetch(`${BASE_URL}/api/leave-requests`, {
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    assert(res.status === 200, 'Authorized staff access to /api/leave-requests responds with 200 OK');
  }

  console.log(`\n🎉 All ${passedCount}/${totalCount} staff role security tests passed successfully!\n`);
}

runStaffRoleSecurityTests().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
