# Facebook SDK Setup Guide

## Overview
The Facebook SDK has been integrated into the KeepTouch app to enable ad tracking and analytics for Facebook and Instagram advertising campaigns. The app uses `react-native-fbsdk-next` with Expo development builds.

## ⚠️ Important: You Need to Complete Setup

### 1. Create Facebook App
1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Create a new app or use existing one
3. Add iOS and Android platforms to your app

### 2. Get Your App Credentials
In your Facebook app dashboard:
- **App ID**: Found in Settings > Basic
- **Client Token**: Found in Settings > Advanced > Client Token

### 3. Update app.json
Replace the placeholder values in `app.json`:
```json
{
  "appID": "YOUR_FACEBOOK_APP_ID",
  "clientToken": "YOUR_FACEBOOK_CLIENT_TOKEN",
  "displayName": "KeepTouch",
  "scheme": "fbYOUR_FACEBOOK_APP_ID",
  ...
}
```

### 4. iOS Setup
Add your app's bundle identifier (`com.holygrailstudio.boltexponativewind`) in Facebook app settings:
- Facebook App Dashboard > Settings > Basic > iOS > Bundle ID

### 5. Android Setup
Add your app's package name and key hashes:
- Package Name: `com.holygrailstudio.boltexponativewind`
- Generate key hash using: `keytool -exportcert -alias androiddebugkey -keystore ~/.android/debug.keystore | openssl sha1 -binary | openssl base64`

## Events Being Tracked

The app automatically tracks these events:

### 1. App Activation
- Fired when app opens
- Event: `fb_mobile_activate_app`

### 2. User Registration
- Fired when new user signs up
- Event: `fb_mobile_complete_registration`
- Parameters: registration_method (email)

### 3. Purchases
- Fired when user subscribes
- Event: `fb_mobile_purchase`
- Parameters: amount, currency, content_type, content_id

### 4. Custom Events
- Contact added: `AddedContact`
- Reminder set: `SetReminder`

## Building the App

Since Facebook SDK requires native code, you must build the app:

```bash
# For iOS
eas build --platform ios --profile production

# For Android
eas build --platform android --profile production
```

## Testing

### iOS Testing
1. Create sandbox tester in App Store Connect
2. Use physical device (simulator won't work for purchases)
3. Check Facebook Events Manager for event tracking

### Android Testing
1. Use test device with Google Play
2. Add test users in Google Play Console
3. Verify events in Facebook Events Manager

## Verify Integration

1. Go to Facebook Events Manager
2. Select your app
3. Look for test events
4. Use Facebook's Event Testing tool

## Ad Campaign Setup

Once events are flowing:
1. Create Facebook/Instagram ad campaigns
2. Use app install objective
3. Set up conversion tracking for purchases
4. Create custom audiences based on events

## Privacy Compliance

The app includes:
- iOS App Tracking Transparency (ATT) support
- User data clearing on logout
- Advertiser tracking settings respect

## Troubleshooting

### Events not showing up?
- Check app.json has correct App ID and Client Token
- Verify bundle/package IDs match Facebook settings
- Ensure you're using development builds, not Expo Go
- Check Facebook Events Manager debugging tools

### iOS specific issues?
- Ensure Info.plist has Facebook configuration (handled by Expo plugin)
- Check iOS 14.5+ tracking permissions are requested
- Verify scheme is correctly set (fb + your app ID)

### Android specific issues?
- Verify key hashes are added to Facebook app
- Check package name matches exactly
- Ensure Google Play Services are available

## Next Steps

1. Replace placeholder values in app.json
2. Build new version: `eas build --platform ios --profile production`
3. Test event tracking with Facebook Events Manager
4. Create your first ad campaign!