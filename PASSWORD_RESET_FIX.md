# Password Reset Fix Guide

## Current Issues
1. Opening link in email shows "about:blank"
2. Opening on phone shows "invalid link" error
3. Removed confusing OTP code references

## Root Cause
The password reset flow is using PKCE (Proof Key for Code Exchange) which sends a `code` parameter instead of direct tokens. The email link structure from Supabase needs proper configuration.

## Solution Steps

### 1. Check Supabase Email Template
Go to your Supabase dashboard:
1. Navigate to Authentication → Email Templates
2. Select "Reset Password" template
3. Make sure the template uses `{{ .ConfirmationURL }}` variable
4. The default template should look like:
```html
<h2>Reset Password</h2>
<p>Follow this link to reset your password:</p>
<p><a href="{{ .ConfirmationURL }}">Reset Password</a></p>
```

### 2. Verify Redirect URLs in Supabase
In Supabase dashboard → Authentication → URL Configuration:
1. Site URL should be: `http://localhost:3000` (or your web URL)
2. Redirect URLs should include:
   - `touchbasebolt://reset-password`
   - `exp://*/--/reset-password`
   - `http://localhost:*/--/reset-password`

### 3. Debug the Email Link
When you receive the password reset email:
1. Right-click the link and copy the URL
2. It should look like:
   ```
   https://[project-id].supabase.co/auth/v1/verify?token=[token]&type=recovery&redirect_to=touchbasebolt://reset-password
   ```

### 4. Test Different Approaches

#### Option A: Direct Browser Test
1. Copy the link from email
2. Paste in Safari on iPhone (not Chrome)
3. Safari should prompt to open in app

#### Option B: Email Client Configuration
Some email clients open links in embedded browsers that don't support deep links. Try:
1. Long-press the link in email
2. Choose "Open in Safari" or "Copy Link"
3. Paste in Safari if needed

### 5. Alternative Implementation
If deep links continue to fail, implement a web redirect page:

1. Create a simple web page that redirects to the app
2. Use this as your redirect URL
3. The web page extracts the code and redirects to app

### 6. Current Code Status
- ✅ Removed OTP input (not needed for password reset)
- ✅ Deep link handler supports code exchange
- ✅ URL scheme is properly configured
- ⚠️ Email link might need web intermediary

## Testing Checklist
1. [ ] Request password reset
2. [ ] Check email link format
3. [ ] Test in Safari (not in-app browser)
4. [ ] Check console logs for deep link reception
5. [ ] Verify code exchange happens

## If Still Not Working
The "about:blank" issue often indicates:
1. Email client blocking deep links
2. Need for Universal Links (iOS) setup
3. Missing Associated Domains configuration

Consider implementing a web-based password reset flow as fallback.