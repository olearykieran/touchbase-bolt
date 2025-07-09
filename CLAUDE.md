# KeepTouch - React Native Expo App

## Project Overview
KeepTouch is a React Native app built with Expo that helps users maintain connections with important people in their lives. The app uses contact integration, notifications, and AI-generated messages to remind users to stay in touch.

## Tech Stack
- **Framework**: React Native with Expo (SDK 52)
- **Architecture**: Expo Development Build (NOT ejected)
- **Router**: Expo Router
- **Backend**: Supabase (auth, database, edge functions)
- **Payments**: 
  - iOS: Apple In-App Purchase (react-native-iap)
  - Android: Stripe (planned)
- **Analytics**: Sentry
- **State Management**: Zustand

## Important Files & Directories
- `app/` - Expo Router app directory
- `components/` - Shared React components
- `services/payment.ts` - Payment service handling IAP
- `supabase/functions/` - Edge functions for backend
- `ios/` - iOS native project files
- `android/` - Android native project files

## Product IDs
- **iOS Monthly**: `com.holygrailstudio.boltexponativewind.monthlysub`
- **iOS Yearly**: `com.holygrailstudio.boltexponativewind.yearlysub`
- **Bundle ID**: `com.holygrailstudio.boltexponativewind`

## Key Commands
```bash
# Development
npm run dev              # Start Expo dev server
npm run ios             # Run on iOS simulator
npm run android         # Run on Android emulator

# Build & Deploy
eas build --platform ios --profile production  # Build for iOS production
eas submit --platform ios                      # Submit to App Store
```

## Apple Submission Issues (Critical - Fix Before Resubmitting!)

### Issue 1: In-App Purchase Products Not Submitted
**Problem**: The app includes subscription code but the IAP products haven't been created/submitted in App Store Connect.

**Solution**:
1. Log into App Store Connect
2. Go to your app → Features → In-App Purchases
3. Create two auto-renewable subscriptions:
   - Monthly subscription: `com.holygrailstudio.boltexponativewind.monthlysub`
   - Yearly subscription: `com.holygrailstudio.boltexponativewind.yearlysub`
4. For each subscription:
   - Set pricing ($2.99/month, $12.99/year)
   - Add localized descriptions
   - **IMPORTANT**: Add review screenshots
   - Submit for review

### Issue 2: Missing IAP Entitlement
**Problem**: The iOS entitlements file doesn't include In-App Purchase capability.

**Solution**:
1. Update `ios/KeepTouch/KeepTouch.entitlements` to include:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <dict>
    <key>aps-environment</key>
    <string>development</string>
    <key>com.apple.developer.in-app-payments</key>
    <array/>
  </dict>
</plist>
```

2. In Xcode:
   - Open the project
   - Select the target → Signing & Capabilities
   - Add "In-App Purchase" capability if not present
   - Ensure it's enabled for both Debug and Release

### Issue 3: Provide Steps to Locate IAP
**Problem**: Apple reviewers can't find where to purchase subscriptions.

**Solution**: Reply to Apple with:
```
The in-app purchases can be accessed as follows:
1. Launch the app
2. Complete sign-up/sign-in
3. Navigate to the Settings tab (bottom navigation)
4. Tap on "Upgrade to Premium" or similar option
5. The paywall modal will display with Monthly ($2.99) and Yearly ($12.99) options
6. Select a subscription plan to initiate the purchase flow

Note: The subscriptions are available to all users regardless of region or device configuration.
```

## Testing In-App Purchases

### Sandbox Testing
1. Create sandbox tester accounts in App Store Connect
2. Sign out of production App Store account on device
3. Run the app in development/TestFlight
4. Sign in with sandbox account when prompted during purchase

### Simulator Testing
The app includes simulator detection and shows mock UI for testing. Real purchases can only be tested on physical devices.

## Environment Variables
Check `app.json` extra field for:
- Supabase URL and keys
- Sentry DSN
- Product IDs
- Stripe price IDs (for future Android implementation)

## Edge Functions
Located in `supabase/functions/`:
- `app-store-webhook/` - Handles Apple receipt validation
- `test-upgrade-subscription/` - Test endpoint for simulator
- `generate-message/` - AI message generation
- `send-notifications/` - Push notification scheduling

## Common Issues

### IAP Not Working
1. Check entitlements file includes IAP capability
2. Verify products are created in App Store Connect
3. Ensure products are in "Ready to Submit" state
4. Check bundle ID matches exactly
5. Verify shared secret is set in Supabase env vars

### Build Failures
- Run `cd ios && pod install` after package changes
- Clear derived data if Xcode build fails
- Check `eas.json` for correct build configuration

## Next Steps for Apple Submission
1. Fix the entitlements file (add IAP capability)
2. Create IAP products in App Store Connect with screenshots
3. Submit IAP products for review
4. Build new version with `eas build --platform ios --profile production`
5. Submit to App Store with clear instructions on finding IAP
6. Monitor for any additional feedback

## Additional Notes
- The app uses Expo development builds, NOT bare workflow
- Push notifications require APN key configuration
- Sentry is configured for error tracking
- The app supports iOS 12.0+ as minimum version

## Recent Fixes

### Streak Logic (Fixed)
- Personal streaks now properly reset to 0 when a contact is late
- Global streak resets to 0 if ANY contact is late
- Added `fix-streaks` Supabase function that runs on app load to fix existing broken streaks
- Updated `updateLastContact` to check and reset global streak when contacts are late

### Dark Mode UI (Fixed)
- Updated theme colors for better readability
- Fixed text input visibility in dark mode
- Applied theme colors to modals and inputs
- Final dark mode accent color: zinc gray (#71717a)