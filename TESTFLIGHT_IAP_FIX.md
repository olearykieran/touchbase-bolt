# TestFlight IAP Fix Guide

## The Issue
The logs show: `Error: Invalid product ID. code: 'E_DEVELOPER_ERROR'`

This means the IAP products cannot be loaded from App Store Connect.

## Root Causes & Solutions

### 1. Check Product Creation in App Store Connect
Go to App Store Connect → Your App → Features → In-App Purchases

Verify you have created BOTH products with these EXACT IDs:
- `com.holygrailstudio.boltexponativewind.monthlysub`
- `com.holygrailstudio.boltexponativewind.yearlysub`

**IMPORTANT**: The products must be in one of these states:
- "Ready to Submit" 
- "Waiting for Review"
- "Approved"

If they show "Missing Metadata" or similar, you need to:
1. Add localized display name
2. Add description
3. Add review screenshot (REQUIRED!)
4. Set pricing
5. Save

### 2. Banking & Tax Information
Even with an active Paid Apps Agreement, ensure:
1. Banking information is complete
2. Tax forms are completed
3. Contact info is filled out

### 3. TestFlight Specific Issues
For TestFlight, the products need to be submitted with the app at least once:
1. If this is the first time testing IAP, you may need to submit the app to App Store review (can reject after)
2. Products become available in TestFlight after first App Store submission

### 4. Quick Fix Without New Build
Since the current build has the IAP Debug Panel:
1. Open the app in TestFlight
2. Go to Settings
3. Scroll to bottom
4. Tap "Show IAP Debug Info"
5. Check if products show up there

If products show 0, the issue is definitely on App Store Connect side.

### 5. Test with Sandbox Account
1. On your device, go to Settings → App Store
2. Sign out of your regular account
3. Don't sign in here - leave it signed out
4. Open the TestFlight app
5. Try to purchase - it will prompt for Apple ID
6. Use a sandbox tester account (create in App Store Connect → Users and Access → Sandbox Testers)

## Next Steps

1. **First**: Use the IAP Debug Panel in current TestFlight build to see if products load
2. **If products don't load**: Fix the App Store Connect setup above
3. **If products load but purchase fails**: Check the debug panel for more info

## To Submit New Build (Build 16)

The code now has better error handling and will pre-load products on app start. This should help identify issues faster.

```bash
# You already incremented to build 16 in app.json
npx expo prebuild --platform ios --clean
cd ios && pod install && cd ..
eas build --platform ios --profile production
```

## Common TestFlight IAP Issues

1. **Products not showing**: Usually App Store Connect configuration
2. **Purchase fails**: Often sandbox account issues
3. **Receipt validation fails**: Our webhook should now handle this correctly

## Debugging Tips

Watch the Xcode console when running from TestFlight - you'll see:
- `[PaymentService] Initializing IAP connection...`
- `[PaymentService] Loading products...`
- `[PaymentService] Loaded X products: [...]`

If you see "Loaded 0 products", the issue is definitely in App Store Connect.