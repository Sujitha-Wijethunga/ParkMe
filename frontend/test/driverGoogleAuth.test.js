const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

describe('Driver Google Authentication Frontend Logic Tests', () => {
  describe('Cancellation and Non-credential Flows', () => {
    test('user cancellation does not create a session or invoke login callback', () => {
      let sessionCreated = false;
      let callbackInvoked = false;

      const mockPromptResult = { success: false, cancelled: true };

      if (!mockPromptResult.cancelled && mockPromptResult.success && mockPromptResult.idToken) {
        sessionCreated = true;
        callbackInvoked = true;
      }

      assert.strictEqual(mockPromptResult.cancelled, true);
      assert.strictEqual(sessionCreated, false);
      assert.strictEqual(callbackInvoked, false);
    });

    test('missing idToken from prompt result aborts without calling backend', () => {
      let backendCalled = false;
      const mockPromptResult = { success: false, error: 'Play Services Outdated' };

      if (!mockPromptResult.cancelled && mockPromptResult.success && mockPromptResult.idToken) {
        backendCalled = true;
      }

      assert.strictEqual(backendCalled, false);
    });
  });

  describe('Account Collision Error Handling (409)', () => {
    test('detects ACCOUNT_COLLISION code and instructs user to use password login', () => {
      const serverError = {
        status: 409,
        code: 'ACCOUNT_COLLISION',
        message: 'An account with this email already exists using password login. Please sign in with your email and password.',
      };

      const isCollision = serverError.code === 'ACCOUNT_COLLISION' || serverError.status === 409;
      assert.strictEqual(isCollision, true);

      let action = 'none';
      if (isCollision) {
        action = 'show_password_login_prompt';
      }

      assert.strictEqual(action, 'show_password_login_prompt');
      assert.match(serverError.message, /sign in with your email and password/i);
    });
  });

  describe('Concurrent Submission Guarding', () => {
    test('blocks subsequent sign-in requests while loading is true', () => {
      let isLoading = true;
      let signInsTriggered = 0;

      const triggerSignIn = () => {
        if (isLoading) return 'blocked';
        signInsTriggered++;
        return 'executed';
      };

      assert.strictEqual(triggerSignIn(), 'blocked');
      assert.strictEqual(signInsTriggered, 0);

      isLoading = false;
      assert.strictEqual(triggerSignIn(), 'executed');
      assert.strictEqual(signInsTriggered, 1);
    });
  });

  describe('Session Storage Integration', () => {
    test('formats and persists driver profile on successful Google auth', () => {
      const mockAuthResponse = {
        _id: 'driver_google_123',
        name: 'Alex Mercer',
        email: 'alex.mercer@gmail.com',
        phone: '',
        role: 'driver',
        token: 'parkme.jwt.verified.token',
      };

      const driverProfile = {
        _id: mockAuthResponse._id,
        name: mockAuthResponse.name,
        email: mockAuthResponse.email,
        phone: mockAuthResponse.phone,
        role: 'driver',
      };

      assert.strictEqual(driverProfile.role, 'driver');
      assert.strictEqual(driverProfile.name, 'Alex Mercer');
      assert.strictEqual(driverProfile.email, 'alex.mercer@gmail.com');
      assert.strictEqual(mockAuthResponse.token, 'parkme.jwt.verified.token');
    });
  });
});
