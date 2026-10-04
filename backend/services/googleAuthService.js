const { OAuth2Client } = require('google-auth-library');

const googleClient = new OAuth2Client();

/**
 * Verifies a Google ID token using Google's official OAuth2Client.
 *
 * Checks:
 * 1. Cryptographic signature and authenticity with Google certificates.
 * 2. Audience matches the configured Web Client ID (or configured iOS client ID).
 * 3. Token is not expired.
 * 4. Token issuer is accounts.google.com or https://accounts.google.com.
 * 5. Email has been verified by Google.
 *
 * @param {string} idToken - The JWT ID token issued by Google
 * @returns {Promise<{ sub: string, email: string, name: string, picture: string }>}
 */
async function verifyGoogleIdToken(idToken) {
  if (!idToken || typeof idToken !== 'string' || !idToken.trim()) {
    const error = new Error('Google ID token is required');
    error.status = 400;
    throw error;
  }

  const webClientId = process.env.GOOGLE_WEB_CLIENT_ID;
  const iosClientId = process.env.GOOGLE_IOS_CLIENT_ID;

  const validAudiences = [webClientId, iosClientId].filter(Boolean);

  if (validAudiences.length === 0) {
    console.warn('[googleAuthService] Warning: GOOGLE_WEB_CLIENT_ID environment variable is not configured');
  }

  let ticket;
  try {
    ticket = await googleClient.verifyIdToken({
      idToken,
      audience: validAudiences.length > 0 ? validAudiences : undefined,
    });
  } catch (err) {
    const error = new Error(`Google token verification failed: ${err.message}`);
    error.status = 401;
    throw error;
  }

  const payload = ticket.getPayload();

  if (!payload) {
    const error = new Error('Invalid Google token: payload could not be decoded');
    error.status = 401;
    throw error;
  }

  // Verify stable subject identifier
  if (!payload.sub || typeof payload.sub !== 'string') {
    const error = new Error('Invalid Google token: missing stable subject identifier (sub)');
    error.status = 401;
    throw error;
  }

  // Verify email and email_verified claim
  if (!payload.email) {
    const error = new Error('Invalid Google token: email claim is missing');
    error.status = 401;
    throw error;
  }

  if (payload.email_verified !== true) {
    const error = new Error('Google account email has not been verified by Google');
    error.status = 403;
    throw error;
  }

  // Verify issuer
  const validIssuers = ['accounts.google.com', 'https://accounts.google.com'];
  if (!validIssuers.includes(payload.iss)) {
    const error = new Error(`Invalid Google token issuer: ${payload.iss}`);
    error.status = 401;
    throw error;
  }

  // Verify expiry
  const nowSec = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp < nowSec) {
    const error = new Error('Google ID token has expired');
    error.status = 401;
    throw error;
  }

  return {
    sub: payload.sub,
    email: payload.email.toLowerCase().trim(),
    name: payload.name ? payload.name.trim() : (payload.email.split('@')[0] || 'Driver'),
    picture: payload.picture || '',
  };
}

module.exports = {
  verifyGoogleIdToken,
  googleClient,
};
