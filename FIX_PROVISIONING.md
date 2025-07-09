# Fix Provisioning Profile for IAP

The build failed because the provisioning profile doesn't include the In-App Purchase capability. Here's how to fix it:

## Option 1: Via Xcode (Easiest)

1. Open Xcode:
   ```bash
   open ios/KeepTouch.xcworkspace
   ```

2. Select the `KeepTouch` project in navigator

3. Go to the **Signing & Capabilities** tab

4. Under **Signing**:
   - Make sure "Automatically manage signing" is checked ✓
   - Team should be "JM6RWFSRJ9"
   - Bundle Identifier: `com.holygrailstudio.boltexponativewind`

5. Add the In-App Purchase capability:
   - Click the **"+"** button
   - Search for "In-App Purchase"
   - Add it

6. Xcode will automatically update your provisioning profile

7. Build again from terminal:
   ```bash
   npx expo run:ios --device
   ```

## Option 2: Remove IAP from Entitlements (Quick Test)

If you just want to test the app without IAP:

1. Edit the entitlements file to remove IAP:
   ```xml
   <?xml version="1.0" encoding="UTF-8"?>
   <!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
   <plist version="1.0">
     <dict>
       <key>aps-environment</key>
       <string>development</string>
     </dict>
   </plist>
   ```

2. Build again

## Option 3: Manual Provisioning Profile Update

1. Go to Apple Developer Portal
2. Edit your App ID to include In-App Purchase
3. Regenerate provisioning profiles
4. Download and install in Xcode

## Why This Happened

When we added the IAP entitlement to your `KeepTouch.entitlements` file, it created a mismatch with your automatically generated provisioning profile. The profile needs to be updated to include the IAP capability.

## After Fixing

Once you've added the IAP capability in Xcode and it updates the provisioning profile, the build should work!