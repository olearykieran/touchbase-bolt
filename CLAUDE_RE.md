# KeepTouch Real Estate - Project Instructions

## Project Overview
KeepTouch Real Estate (KeepTouch RE) is a professional relationship management app specifically designed for real estate agents to maintain connections with clients, prospects, and referral partners.

## Product Details
- **App Name**: KeepTouch Real Estate
- **Home Screen Name**: KeepTouch RE
- **Bundle ID**: com.holygrailstudio.keeptouchre
- **Package Name**: com.holygrailstudio.keeptouchre

## Tech Stack
- **Framework**: React Native with Expo (SDK 52)
- **Architecture**: Expo Development Build (NOT ejected)
- **Router**: Expo Router
- **Backend**: Supabase (auth, database, edge functions)
- **Payments**: 
  - iOS: RevenueCat SDK
  - Android: RevenueCat SDK (planned)
- **Analytics**: Sentry
- **State Management**: Zustand

## Pricing
- **Monthly**: $9.99
- **Yearly**: $99.99

## Key Differences from Personal Version

### Message Types
Real estate-focused message types:
- **Client Check-in** (replaces Regular Message)
- **Market Update** (replaces Love Message)
- **Home Anniversary** (replaces Gratitude)
- **Birthday Message** (keep from personal)
- **Home Maintenance Tip** (replaces Random Joke)
- **Neighborhood News** (replaces Random Fact)
- **Custom Message** (keep from personal)

### Additional Real Estate Message Types
- **Just Closed** - Congratulations on closing
- **Referral Touch** - Soft ask for referrals
- **Holiday Greeting** - Real estate themed
- **Open House Invite** - Personalized invitations
- **Listing Alert** - New listings in their area

### Contact Fields Enhancement
Additional fields for real estate contacts:
- **Client Type**: buyer, seller, prospect, referral_partner, past_client
- **Property Address**
- **Transaction Date**
- **Transaction Type**: purchase, sale, both
- **Property Type**: single_family, condo, townhouse, land, commercial
- **Price Range**
- **Notes**: For additional context

## Branding
- **Primary Color**: Professional blue (#2563eb) instead of pink
- **Accent Color**: Gold/amber (#f59e0b) for premium feel
- **Background**: Keep light theme similar but more professional

## Configuration Steps

### 1. RevenueCat Setup
- Create new RevenueCat project for KeepTouch RE
- Product IDs:
  - Monthly: `com.holygrailstudio.keeptouchre.monthlysub`
  - Yearly: `com.holygrailstudio.keeptouchre.yearlysub`

### 2. Supabase Setup
- Create new Supabase project for real estate version
- Copy schema from personal version
- Add real estate specific fields to contacts table
- Update edge functions with real estate message templates

### 3. Apple Developer Setup
- Create new app ID with bundle identifier
- Create In-App Purchase products
- Configure push notifications

### 4. Facebook SDK
- Create new Facebook app for KeepTouch RE
- Update app ID and client token in configuration

## Development Workflow
```bash
# Install dependencies
cd ~/Desktop/RealEstateTouch
npm install

# Run on iOS
npm run ios

# Run on Android
npm run android

# Build for production
eas build --platform ios --profile production
```

## Important Notes
- Keep the same technical architecture as personal version
- Focus on professional branding and messaging
- Maintain separate Supabase projects for data isolation
- Use professional language in all user-facing text
- Price point reflects professional tool value