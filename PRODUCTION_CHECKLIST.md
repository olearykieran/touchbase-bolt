# Production Build Checklist for KeepTouch

## Before Building for Production

### 1. ✅ Remove Debug Code
- [ ] Debug UI only shows in `__DEV__` mode (DONE)
- [ ] Error messages don't reference debug tools (DONE)
- [ ] Remove console.log statements: `node scripts/remove-console-logs.js`

### 2. ✅ Environment Configuration
- [ ] Set RevenueCat to production mode (automatic based on environment)
- [ ] Verify all API endpoints point to production
- [ ] Check Supabase URL is production URL
- [ ] Ensure Sentry DSN is configured

### 3. ✅ Test Edge Functions
- [ ] Remove `test-upgrade-subscription` function
- [ ] Remove `test-downgrade-subscription` function
- [ ] Deploy only production edge functions

### 4. ✅ In-App Purchases
- [ ] Ensure products are approved in App Store Connect
- [ ] RevenueCat products are properly configured
- [ ] Test with real sandbox account (not corrupted one)

### 5. ✅ App Store Requirements
- [ ] Privacy policy URL is valid
- [ ] Terms of service URL is valid
- [ ] App Store screenshots ready
- [ ] App description updated
- [ ] Keywords optimized

### 6. ✅ Build Commands
```bash
# Clean build
cd ios && pod install && cd ..

# Remove console logs
node scripts/remove-console-logs.js

# Build for production
eas build --platform ios --profile production

# Submit to App Store
eas submit --platform ios
```

### 7. ✅ Post-Build Verification
- [ ] Test on real device
- [ ] Verify no debug UI appears
- [ ] Test purchase flow
- [ ] Check crash reporting works
- [ ] Verify push notifications

## Production Environment Variables

Ensure these are set in `app.json`:
- `SUPABASE_URL`: Production Supabase URL
- `SUPABASE_ANON_KEY`: Production Supabase key
- `SENTRY_DSN`: Production Sentry DSN
- `REVENUECAT_API_KEY`: Should be in code (iOS specific)

## Final Steps

1. Run `node scripts/remove-console-logs.js`
2. Commit all changes
3. Tag release: `git tag v1.0.0`
4. Build with EAS: `eas build --platform ios --profile production`
5. Submit to App Store: `eas submit --platform ios`