# RevenueCat Setup Instructions

## ✅ What You've Done
1. Created RevenueCat account and app
2. Added Apple App Store credentials
3. Installed SDK and integrated code

## ⚠️ What You Need to Do in RevenueCat Dashboard

### 1. Create Entitlement
Go to your RevenueCat dashboard → Entitlements → "+ New"
- **Identifier**: `premium`
- **Description**: "Premium Access"

### 2. Import Your Products
Go to Products → Click "Import Products from App Store"
- It should find your two products:
  - `com.holygrailstudio.boltexponativewind.monthlysub`
  - `com.holygrailstudio.boltexponativewind.yearlysub`

### 3. Create Offerings
Go to Offerings → Create a new offering:
- **Identifier**: `default`
- **Display Name**: "Premium Subscription"
- Add two packages:
  - **Monthly**: 
    - Identifier: `$rc_monthly`
    - Product: Select your monthly product
  - **Annual**:
    - Identifier: `$rc_annual`  
    - Product: Select your yearly product

### 4. Attach Products to Entitlement
Go back to your "premium" entitlement and attach both products to it.

### 5. Test Configuration
In RevenueCat dashboard, you should see:
- ✅ Valid App Store credentials
- ✅ Products imported
- ✅ Offering created with packages
- ✅ Entitlement configured

## Testing

1. Make sure you're signed out of production App Store account
2. Use sandbox test account
3. Build and run the app
4. Try purchasing - it should work now!

## Important Notes

- RevenueCat handles all receipt validation automatically
- Subscription status syncs in real-time
- You can see all transactions in RevenueCat dashboard
- Set up webhooks later for server-side events

## If Products Don't Import

If RevenueCat can't import your products, it's because they're still "Developer Action Needed" in App Store Connect. You need to:

1. Go to App Store Connect
2. Fix the rejection issues for each subscription
3. Submit them for review
4. Once approved, return to RevenueCat and import

## Next Steps

After setup is complete:
1. Test purchases on device
2. Verify transactions appear in RevenueCat dashboard
3. Set up RevenueCat webhooks to your Supabase backend (optional)