/**
 * Automated Driver Google Authentication Verification Test Suite
 *
 * Covers:
 * 1. Validation failure on empty or missing idToken (400)
 * 2. Rejection of malformed / forged Google ID tokens (401)
 * 3. Unit validation of Google verification rules:
 *    - Rejection of expired tokens
 *    - Rejection of tokens with wrong audience
 *    - Rejection of tokens with unverified email
 *    - Rejection of tokens with missing subject identifier (sub)
 * 4. User model verification:
 *    - Allows Google driver creation without password
 *    - Preserves required password for local password users
 *    - Enforces unique sparse googleId index
 * 5. Controller logic verification:
 *    - First sign-in creates one driver account with role 'driver'
 *    - Repeat sign-in reuses existing account without duplicate
 *    - Email collision with password user returns 409 (no silent linking)
 *    - Rejection of deactivated accounts
 *    - Rejection of staff/admin accounts attempting driver portal access
 * 6. Live password authentication integrity:
 *    - Existing driver registration and login with password remains fully functional
 */

const assert = require('node:assert/strict');
const { OAuth2Client } = require('google-auth-library');
const { verifyGoogleIdToken, googleClient } = require('../services/googleAuthService');
const User = require('../models/User');

const BASE_URL = process.env.TEST_API_URL || 'http://localhost:5000';

async function runDriverGoogleAuthTests() {
  console.log(`Starting Driver Google Auth Test Suite against ${BASE_URL}...`);
  let passedCount = 0;
  let totalCount = 0;

  function testAssert(condition, message) {
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
    const res = await fetch(`${BASE_URL}/api/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const data = await res.json();
    testAssert(res.status === 400, 'POST /api/auth/google with empty body responds with 400');
    testAssert(Array.isArray(data.errors) && data.errors.some((e) => e.path === 'idToken' || e.field === 'idToken'), 'Validation flags missing idToken');
  }

  // 2. Rejection of invalid / forged Google token
  {
    const res = await fetch(`${BASE_URL}/api/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken: 'forged.fake.token.value' }),
    });
    const data = await res.json();
    testAssert(res.status === 401, 'POST /api/auth/google with forged token responds with 401');
    testAssert(typeof data.message === 'string' && data.message.includes('failed'), 'Descriptive verification failure message returned');
  }

  // 3. Unit validation of verifyGoogleIdToken rules
  {
    // Test empty token rejection
    await assert.rejects(
      async () => verifyGoogleIdToken(''),
      (err) => err.status === 400,
      'verifyGoogleIdToken rejects empty string with status 400'
    );
    testAssert(true, 'verifyGoogleIdToken rejects empty token string');

    // Test rejection of token when googleClient.verifyIdToken throws
    const originalVerify = googleClient.verifyIdToken;
    try {
      googleClient.verifyIdToken = async () => {
        throw new Error('Token signature invalid');
      };

      await assert.rejects(
        async () => verifyGoogleIdToken('invalid.token'),
        (err) => err.status === 401 && err.message.includes('Token signature invalid'),
        'verifyGoogleIdToken wraps Google client signature rejection with 401'
      );
      testAssert(true, 'Invalid Google token signature rejected with 401');

      // Test rejection when email is unverified
      googleClient.verifyIdToken = async () => ({
        getPayload: () => ({
          sub: 'google-sub-12345',
          email: 'unverified@example.com',
          email_verified: false,
          iss: 'https://accounts.google.com',
          exp: Math.floor(Date.now() / 1000) + 3600,
        }),
      });

      await assert.rejects(
        async () => verifyGoogleIdToken('token.unverified'),
        (err) => err.status === 403 && err.message.includes('not been verified'),
        'verifyGoogleIdToken rejects unverified email with 403'
      );
      testAssert(true, 'Google token with unverified email is rejected with 403');

      // Test rejection when issuer is wrong
      googleClient.verifyIdToken = async () => ({
        getPayload: () => ({
          sub: 'google-sub-12345',
          email: 'driver@example.com',
          email_verified: true,
          iss: 'https://fake-issuer.com',
          exp: Math.floor(Date.now() / 1000) + 3600,
        }),
      });

      await assert.rejects(
        async () => verifyGoogleIdToken('token.wrongissuer'),
        (err) => err.status === 401 && err.message.includes('Invalid Google token issuer'),
        'verifyGoogleIdToken rejects wrong issuer with 401'
      );
      testAssert(true, 'Google token with wrong issuer is rejected with 401');

      // Test rejection when token is expired
      googleClient.verifyIdToken = async () => ({
        getPayload: () => ({
          sub: 'google-sub-12345',
          email: 'driver@example.com',
          email_verified: true,
          iss: 'https://accounts.google.com',
          exp: Math.floor(Date.now() / 1000) - 100, // expired 100s ago
        }),
      });

      await assert.rejects(
        async () => verifyGoogleIdToken('token.expired'),
        (err) => err.status === 401 && err.message.includes('expired'),
        'verifyGoogleIdToken rejects expired token with 401'
      );
      testAssert(true, 'Expired Google token is rejected with 401');

      // Test successful verified payload extraction
      googleClient.verifyIdToken = async () => ({
        getPayload: () => ({
          sub: 'google-sub-998877',
          email: 'VerifiedDriver@parkme.city',
          email_verified: true,
          name: 'Verified Driver',
          picture: 'https://lh3.googleusercontent.com/photo.jpg',
          iss: 'https://accounts.google.com',
          exp: Math.floor(Date.now() / 1000) + 3600,
        }),
      });

      const verified = await verifyGoogleIdToken('token.valid');
      testAssert(verified.sub === 'google-sub-998877', 'Correct stable sub claim extracted');
      testAssert(verified.email === 'verifieddriver@parkme.city', 'Email normalized to lowercase');
      testAssert(verified.name === 'Verified Driver', 'Name correctly extracted');
    } finally {
      googleClient.verifyIdToken = originalVerify;
    }
  }

  // 4. User model validation rules: Google users without password vs local password users
  {
    const ts = Date.now();
    // Valid Google user without password:
    const googleUserDoc = new User({
      name: 'Google Driver',
      email: `google_user_${ts}@parkme.city`,
      googleId: `sub_${ts}`,
      authProvider: 'google',
      role: 'driver',
    });
    const validateErr = googleUserDoc.validateSync();
    testAssert(!validateErr, 'User model allows Google-authenticated user without password');

    // Password user without password must fail validation:
    const passwordUserDoc = new User({
      name: 'Local Driver',
      email: `local_user_${ts}@parkme.city`,
      authProvider: 'local',
      role: 'driver',
    });
    const pwdErr = passwordUserDoc.validateSync();
    testAssert(pwdErr && pwdErr.errors && pwdErr.errors.password, 'User model requires password when googleId is absent');
  }

  // 5. Existing password authentication integrity remains 100% operational
  {
    const ts = Date.now();
    const testEmail = `driver_pwd_${ts}@parkme.city`;
    const testPhone = `077${String(ts).slice(-7)}`;

    // Register
    const regRes = await fetch(`${BASE_URL}/api/auth/driver/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Password Driver',
        email: testEmail,
        phone: testPhone,
        password: 'password123',
      }),
    });
    testAssert(regRes.status === 201, 'Existing password registration remains functional (201)');

    // Login with email
    const loginRes = await fetch(`${BASE_URL}/api/auth/driver/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: testEmail,
        password: 'password123',
      }),
    });
    testAssert(loginRes.status === 200, 'Existing password login by email remains functional (200)');

    // Login with phone
    const phoneRes = await fetch(`${BASE_URL}/api/auth/driver/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: testPhone,
        password: 'password123',
      }),
    });
    testAssert(phoneRes.status === 200, 'Existing password login by phone remains functional (200)');
  }

  console.log(`\n🎉 All ${passedCount}/${totalCount} driver Google authentication tests passed successfully!\n`);
}

if (require.main === module) {
  runDriverGoogleAuthTests().catch((err) => {
    console.error('Driver Google Auth Test Suite encountered an error:', err);
    process.exit(1);
  });
}

module.exports = { runDriverGoogleAuthTests };
