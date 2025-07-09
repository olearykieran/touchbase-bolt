# KeepTouch Testing Checklist

## Pre-flight Checks
- [ ] Environment variables set (.env file)
- [ ] Supabase project running
- [ ] iOS entitlements updated
- [ ] IAP products created in App Store Connect

## Run Tests
```bash
# Start dev server
npm run dev

# Run on iOS simulator
npm run ios

# Check for TypeScript errors
npx tsc --noEmit

# Run linter
npm run lint
```

## Feature Testing

### 1. Authentication
- [ ] Sign up with new email
- [ ] Email verification
- [ ] Sign in
- [ ] Sign out
- [ ] Error handling (wrong password, etc.)

### 2. Contacts (Free Tier: 3 max)
- [ ] Request permissions
- [ ] Import from phone
- [ ] Add 3 contacts successfully
- [ ] 4th contact triggers paywall
- [ ] Edit contact
- [ ] Delete contact
- [ ] Search contacts

### 3. AI Messages (Free Tier: 3/week)
- [ ] Generate default message
- [ ] Try all message types:
  - [ ] Default
  - [ ] Love
  - [ ] Gratitude
  - [ ] Birthday
  - [ ] Joke
  - [ ] Fact
  - [ ] Custom
- [ ] Send 3 messages
- [ ] 4th message triggers paywall
- [ ] Message history saved

### 4. Notifications
- [ ] Permission request
- [ ] Schedule reminder
- [ ] Receive notification
- [ ] Different frequencies work

### 5. Paywall & IAP
- [ ] Paywall appears at limits
- [ ] Correct prices shown
- [ ] Monthly purchase flow
- [ ] Yearly purchase flow
- [ ] Restore purchases
- [ ] Cancel subscription

### 6. Settings
- [ ] Profile loads
- [ ] Subscription status correct
- [ ] Theme switching
- [ ] Logout works

### 7. Streak Feature
- [ ] Daily check-in
- [ ] Streak counter updates
- [ ] Missed day resets

## Performance & Edge Cases
- [ ] Large contact list (50+)
- [ ] Offline mode
- [ ] Network errors handled
- [ ] Special characters in names
- [ ] Very long messages
- [ ] Rapid button clicks
- [ ] Background/foreground transitions

## Pre-Submission
- [ ] Remove console.logs
- [ ] Test on real device
- [ ] Check crash reports in Sentry
- [ ] Verify all env vars set
- [ ] Screenshots for App Store