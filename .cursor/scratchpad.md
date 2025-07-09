# TouchBase App - Stripe to Apple IAP Migration

## Background and Motivation
The app is currently using Stripe for subscription payments but has been rejected by the App Store review team because:
1. In-app purchase products haven't been submitted for review
2. App includes references to subscriptions but associated in-app purchase products haven't been submitted
3. App reviewers couldn't locate in-app purchases within the app

The app offers:
- 3 free AI messages per week
- 3 free contacts in total
- Premium subscription at $2.99/month or $12.99/year

## Key Challenges and Analysis
1. Apple requires all iOS apps to use Apple's In-App Purchase (IAP) system for digital content and subscriptions
2. Direct payment methods like Stripe are not allowed on iOS for this purpose (Apple gets 15-30% cut)
3. We need a hybrid approach: Apple IAP for iOS, Stripe for Android
4. Current implementation uses a Stripe webhook that updates a 'profiles' table in Supabase

## High-level Task Breakdown
1. [x] Analyze the current payment flow and database schema
2. [x] Install and configure React Native IAP package
3. [x] Create platform-specific payment implementation
4. [x] Update the UI to show different payment options based on platform
5. [x] Add subscription management to settings page
6. [ ] Configure in-app purchases in App Store Connect
7. [ ] Test the implementation in sandbox environment
8. [ ] Update submission materials with proper IAP screenshots and instructions

## Project Status Board
- [x] Task 1: Analyze the current payment flow and database schema
- [x] Task 2: Install React Native IAP package
- [x] Task 3: Create platform-specific payment logic
- [x] Task 4: Update UI components to use platform-specific payment
- [x] Task 5: Add subscription management to settings page
- [ ] Task 6: Configure App Store IAP products
- [ ] Task 7: Test IAP in sandbox environment
- [ ] Task 8: Update App Store submission

## Current Status / Progress Tracking
- React Native IAP package has been installed
- Created PaymentService class in `/services/payment.ts` with platform-specific handling
- Implemented iOS IAP integration using react-native-iap while maintaining Stripe for Android
- Updated UI components in both index.tsx and add.tsx to use the new PaymentService
- Added iOS IAP product IDs to app.json configuration
- Enhanced settings page with platform-specific subscription management:
  - iOS: Added "Restore Purchases" and "Manage Subscription" options
  - Android: Maintained existing Stripe cancellation flow
  - Both platforms: Updated to use the new PaymentService
- All code changes necessary for implementation are complete
- Ready for testing and App Store Connect configuration

## Executor's Feedback or Assistance Requests
I've completed all the necessary code changes to meet the App Store requirements:

1. Created a platform-specific payment solution that:
   - Uses Apple IAP on iOS
   - Maintains Stripe for Android
   - Has a consistent API for both platforms

2. Enhanced the subscription management experience:
   - Added "Restore Purchases" option for iOS users to recover previous subscriptions
   - Added direct link to iTunes subscription management for iOS users
   - Maintained the existing cancellation flow for Android users

3. Next steps that you need to take outside of the code:
   - Configure the in-app purchase products in App Store Connect with these exact IDs:
     - com.holygrailstudio.boltexponativewind.monthly
     - com.holygrailstudio.boltexponativewind.yearly
   - Set up sandbox testing accounts in App Store Connect
   - Add screenshots of the IAP flow to your App Store listing
   - Add clear instructions for reviewers on how to find/test the IAP

Would you like help with creating a testing guide or App Store Connect setup instructions?

## Lessons
- Apple requires all digital goods and subscriptions in iOS apps to use their IAP system
- Direct payment providers like Stripe are only allowed for physical goods or services consumed outside the app
