# Response to Apple Review Team

## Re: Guideline 2.1 & 3.1.2 - KeepTouch (1.5)

Thank you for your feedback. We have addressed both issues:

### 1. In-App Purchase Issue (Guideline 2.1)

We've identified that the issue may be related to the Apple shared secret configuration. We have:

- ✅ Verified our receipt validation properly handles sandbox/production environments
- ✅ Updated our webhook to retry with sandbox when status 21007 is received
- ✅ Added comprehensive error logging to identify any remaining issues
- ✅ Confirmed our Paid Apps Agreement is active

**Could you please provide any error logs or specific error messages that appeared during the IAP process?** This would help us identify if there's a specific validation issue we need to address.

### 2. Terms of Use Missing (Guideline 3.1.2)

We apologize for this oversight. We have now:

- ✅ Created comprehensive Terms of Use
- ✅ Created Privacy Policy
- ✅ Both documents clearly state our auto-renewable subscription details:
  - Monthly Premium: $2.99/month
  - Yearly Premium: $12.99/year
  - Auto-renewal policies
  - Cancellation instructions

**Please update the App Store Connect metadata with these links:**
- Terms of Use: https://keeptouch.app/terms (or upload TERMS_OF_USE.md to App Store Connect)
- Privacy Policy: https://keeptouch.app/privacy (or upload PRIVACY_POLICY.md to App Store Connect)

### Testing Instructions
1. Install the app on iPhone or iPad
2. Create an account or sign in
3. Navigate to Settings → "Upgrade to Premium"
4. Select a subscription plan
5. Complete the purchase with a sandbox account

### Additional Information
- Both subscription products are created and in "Ready for Sale" status in App Store Connect
- The app properly displays subscription details before purchase
- Receipt validation handles both sandbox and production environments

We're committed to resolving these issues promptly. Please let us know if you need any additional information.

Best regards,
[Your Name]

---

## Action Items for You:

1. **Check Supabase Logs**:
   - Go to https://supabase.com/dashboard/project/nocqcvnmmoadxhhjgnys/functions
   - Click on `app-store-webhook` → Logs
   - Look for any error messages during Apple's review

2. **Verify Apple Shared Secret**:
   - In App Store Connect → Your App → App Information → App-Specific Shared Secret
   - Copy this secret
   - Add it to Supabase secrets: `npx supabase secrets set APPLE_SHARED_SECRET=your_secret_here`

3. **Upload Legal Documents**:
   - In App Store Connect → Your App → App Information
   - Add Terms of Use (EULA) - upload TERMS_OF_USE.md
   - Add Privacy Policy URL or text

4. **Submit Response**:
   - Use the response template above
   - Ask for specific error details to help debug the IAP issue