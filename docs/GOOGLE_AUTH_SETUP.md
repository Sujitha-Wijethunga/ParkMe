# Google Authentication & Native Build Setup Guide for ParkMe

This document outlines the required configuration for real Google Sign-In in ParkMe.

---

## 1. Application Identifiers

- **Android Package Name:** `com.parkme.app`
- **iOS Bundle Identifier:** `com.parkme.app`

These are configured in `frontend/app.json`:
```json
{
  "expo": {
    "ios": {
      "bundleIdentifier": "com.parkme.app"
    },
    "android": {
      "package": "com.parkme.app"
    }
  }
}
```

---

## 2. Google Cloud Console Configuration

To enable native Google Sign-In, configure three OAuth 2.0 Client IDs in the [Google Cloud Console](https://console.cloud.google.com/apis/credentials):

### Client 1: Web Application Client (Required for Backend Verification)
- **Type:** Web application
- **Name:** ParkMe Web Client
- **Authorized JavaScript Origins:** (Optional for mobile: e.g. `http://localhost:5000`)
- **Authorized Redirect URIs:** (Not required for native token flow)
- **Use:** This Client ID is used as the **target audience (`aud`)** when requesting the ID token in the app and verifying it on the backend server.

### Client 2: Android Client (Required for Android Devices / Emulators)
- **Type:** Android
- **Name:** ParkMe Android App
- **Package name:** `com.parkme.app`
- **SHA-1 certificate fingerprint:** Development & Production fingerprints (see Section 3).

### Client 3: iOS Client (Required for iOS Devices / Simulators)
- **Type:** iOS
- **Name:** ParkMe iOS App
- **Bundle ID:** `com.parkme.app`
- **URL Scheme:** Derived from client ID (e.g. `com.googleusercontent.apps.CLIENT_ID`). Configured in `app.json` plugins.

---

## 3. Obtaining the Android SHA-1 Fingerprint

Google Sign-In on Android strictly requires matching the app's signing certificate SHA-1 fingerprint against the Google Cloud Console Android OAuth client.

### For Local Android Development (Default Debug Keystore)
Run this command from your terminal:

**Windows (PowerShell):**
```powershell
keytool -list -v -keystore "$env:USERPROFILE\.android\debug.keystore" -alias androiddebugkey -storepass android -keypass android
```

**macOS / Linux:**
```bash
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
```

Alternatively, if an `android/` folder has been generated:
```bash
cd android && ./gradlew signingReport
```

Look for the line:
```text
Certificate fingerprints:
    SHA1: AA:BB:CC:...
```
Copy this SHA-1 fingerprint and paste it into your Google Cloud Console Android OAuth Client.

### For EAS Cloud Builds
Run:
```bash
npx eas-cli credentials
```
Select **Android** > **Keystore** to view the remote build SHA-1 fingerprint.

> **Important:** Google Play App Signing generates an additional signing key when publishing to the Play Store. You must also add the Play Console SHA-1 fingerprint to the Android OAuth client before production release.

---

## 4. Environment Variables

### Backend (`backend/.env`)
```env
PORT=5000
MONGO_URI=mongodb+srv://...
JWT_SECRET=your_jwt_secret

# Google OAuth Configuration
GOOGLE_WEB_CLIENT_ID=your_google_web_client_id.apps.googleusercontent.com
GOOGLE_IOS_CLIENT_ID=your_google_ios_client_id.apps.googleusercontent.com
```

### Frontend (`frontend/.env`)
```env
EXPO_PUBLIC_API_URL=http://<YOUR_LAN_IP>:5000
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your_google_web_client_id.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=your_google_ios_client_id.apps.googleusercontent.com
```

> **Security Note:** Never expose the Google OAuth Client Secret in frontend code or in `EXPO_PUBLIC_` variables. The native Google Sign-In flow only requires the public Client ID to retrieve a cryptographically signed Google ID token.

---

## 5. Development Build vs. Expo Go

`@react-native-google-signin/google-signin` contains **custom native code** (Play Services Auth on Android and GoogleSignIn SDK on iOS).

### Runtime Behavior in Expo Go
- When tapped in standard Expo Go, ParkMe detects the Expo Go environment and displays an alert explaining that native Google Sign-In requires an Expo development build, preventing native crashes.

### Creating a Development Build
To test the real Google Sign-In flow on a physical device or emulator:

1. **Local Prebuild & Run:**
   ```bash
   cd frontend
   npx expo run:android
   # or for iOS:
   npx expo run:ios
   ```

2. **Cloud Build via EAS:**
   ```bash
   cd frontend
   npx eas-cli build --profile development --platform android
   ```

---

## 6. Architecture & Security Flow

```
+------------------+         +-----------------------+         +----------------------+
|  ParkMe Mobile   |         |      Google Auth      |         |    ParkMe Backend    |
|   Driver App     |         |        Servers        |         |     (Express/DB)     |
+------------------+         +-----------------------+         +----------------------+
         |                               |                                |
         |--- 1. Native Prompt --------->|                                |
         |    (openid, email, profile)   |                                |
         |<-- 2. Signed ID Token --------|                                |
         |                                                                |
         |--- 3. POST /api/auth/google { idToken } ---------------------->|
         |                                                                |-- 4. Verify Signature,
         |                                                                |   Issuer, Exp, Aud
         |                                                                |-- 5. Match sub claim
         |                                                                |-- 6. Issue ParkMe JWT
         |<-- 7. { user, token } -----------------------------------------|
         |
         |-- 8. Save session in SecureStore
         |-- 9. Navigate to Driver Home
```

- **Identification:** Stable `sub` claim is used as the primary identity key, stored in a sparse unique index (`googleId`).
- **Collision Protection:** If an account exists with the same email under password authentication, the server rejects silent linking with HTTP 409 `ACCOUNT_COLLISION`.
- **Role Enforcement:** Server guarantees all new Google accounts through this flow receive the `driver` role.
