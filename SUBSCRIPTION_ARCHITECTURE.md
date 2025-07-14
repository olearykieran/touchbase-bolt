# Subscription Architecture - RevenueCat Integration

## Overview
KeepTouch uses RevenueCat as the single source of truth for subscription management. This architecture correctly handles account mismatches and provides a simplified, reliable subscription system.

## How Account Mismatch is Handled

### The Scenario
- User logs into app with account A (e.g., user@example.com)
- User purchases subscription with Apple ID B (e.g., different@apple.com)
- Subscription should be tied to account A, not Apple ID B

### RevenueCat Solution
1. **User Login**: When user logs into the app, we call `Purchases.logIn(supabaseUserId)`
2. **Purchase Flow**: User purchases with their Apple ID
3. **Attribution**: RevenueCat automatically links the purchase to the app user ID (Supabase account)
4. **Result**: Subscription follows the app account, regardless of which Apple ID paid

## Architecture Flow

```
User Action          RevenueCat             Supabase
-----------          ----------             --------
Login to App    →    logIn(userId)     
                     Create/update 
                     app user alias

Purchase Sub    →    Purchase linked
                     to app user ID
                     ↓
                     CustomerInfo 
                     updated
                     ↓
                     Webhook fired    →    Update profile
                                          subscription_status
                                          subscription_end

Check Status    →    getCustomerInfo
                     Returns sub for
                     app user ID      →    Read from profile
```

## Key Components

### 1. RevenueCatPaymentService
- Handles all subscription operations
- Syncs subscription status to Supabase in real-time
- Properly detects monthly vs yearly subscriptions

### 2. Customer Info Sync
When subscription status changes:
```typescript
// Automatically called on purchase/restore/change
handleCustomerInfoUpdate(customerInfo) {
  // Determine subscription type from product ID
  // Update Supabase profile with:
  // - subscription_status: 'free' | 'monthly' | 'yearly'
  // - subscription_end: expiration date
  // - Reset message counts for premium users
}
```

### 3. Subscription Status Sources
- **Primary**: RevenueCat CustomerInfo (real-time)
- **Cached**: Supabase profile (for offline/quick checks)
- **Local**: AsyncStorage (for immediate UI updates)

## Migration from Edge Function

### Why Remove Edge Function?
1. **Can't Extract User ID**: Apple receipts don't contain custom user data
2. **Redundant**: RevenueCat already validates receipts
3. **Conflict Risk**: Two systems updating same data
4. **Complexity**: Harder to debug and maintain

### Migration Steps for Existing Users
1. On app launch, check if user has `subscription_status` but no RevenueCat data
2. Call `RevenueCatPaymentService.restorePurchases()`
3. RevenueCat will find their Apple purchases and sync

## Testing Account Mismatch

### Test Scenario
1. Create test user A in your app
2. Login as user A
3. Purchase subscription with Apple test account B
4. Verify subscription appears under user A in Supabase
5. Logout and login as different user C
6. Verify user C shows as free tier
7. Login back as user A - subscription still active

### Expected Behavior
- Subscription always follows the logged-in app user
- Switching Apple IDs doesn't affect subscription ownership
- Multiple app accounts can't share one Apple subscription

## Error Handling

### Purchase Failures
- User cancellation: Silent return, no error shown
- Payment failed: Show Apple's error message
- Network issues: Prompt to try again

### Restore Issues
- No subscription found: Clear message to user
- Network error: Suggest checking connection
- Always safe to retry - idempotent operation

## Security Considerations

1. **User ID Validation**: RevenueCat validates that user is logged in
2. **Receipt Validation**: Automatic by RevenueCat servers
3. **Webhook Security**: RevenueCat signs webhooks (if using)
4. **No Client Manipulation**: All validation server-side

## Future Enhancements

### Optional: RevenueCat Webhooks
For additional reliability, set up RevenueCat webhooks:
1. Create endpoint: `supabase/functions/revenuecat-webhook`
2. Handle events: `INITIAL_PURCHASE`, `RENEWAL`, `CANCELLATION`
3. Verify webhook signature
4. Update Supabase profile as backup sync

### Benefits of Webhooks
- Catch edge cases where app isn't running
- Handle server-side subscription changes
- Audit trail of all subscription events

## Troubleshooting

### Subscription Not Showing
1. Check RevenueCat dashboard for purchase
2. Verify `Purchases.logIn()` was called with correct user ID
3. Try `restorePurchases()`
4. Check Supabase logs for sync errors

### Wrong Subscription Type
1. Verify product IDs in RevenueCat match app
2. Check product identifier detection logic
3. Look at RevenueCat dashboard for actual product purchased

### Account Mismatch Issues
1. Ensure `logIn()` called on every app user login
2. Don't call `logOut()` unless user explicitly signs out
3. RevenueCat maintains user aliases automatically