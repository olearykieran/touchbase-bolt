# Supabase Password Reset Implementation Guide

## The Problem
Email providers (Gmail, Outlook) prefetch links for security scanning, which consumes the one-time password reset token before users can click it.

## Solution: Use a Web Intermediary Page

Since direct deep links are being consumed by email prefetching, the best solution is to use a web page that handles the token exchange server-side.

### Option 1: Use Supabase's Built-in Web Flow (Recommended)

1. **Update Supabase Settings**:
   - Go to Supabase Dashboard → Authentication → URL Configuration
   - Set Site URL to a web page you control (e.g., `https://yourapp.com/reset-password`)
   - This page will handle the token and redirect to your app

2. **Create a Simple Web Handler**:
   ```html
   <!-- Host this at https://yourapp.com/reset-password.html -->
   <!DOCTYPE html>
   <html>
   <head>
       <title>Reset Password - KeepTouch</title>
       <meta name="viewport" content="width=device-width, initial-scale=1">
   </head>
   <body>
       <script>
           // Get the full URL including hash
           const url = window.location.href;
           
           // Redirect to app with all parameters
           // The app will handle the token exchange
           window.location.href = url.replace('https://yourapp.com/reset-password', 'touchbasebolt://reset-password');
       </script>
   </body>
   </html>
   ```

3. **Update Email Request**:
   ```javascript
   const { error } = await supabase.auth.resetPasswordForEmail(email, {
     redirectTo: 'https://yourapp.com/reset-password',
   });
   ```

### Option 2: Use Supabase Auth Helpers

Install Supabase Auth Helpers for better handling:

```bash
npm install @supabase/auth-helpers-react
```

Then implement a more robust flow:

```javascript
// In your app
import { createClient } from '@supabase/supabase-js';
import { SessionContextProvider } from '@supabase/auth-helpers-react';

// Wrap your app
<SessionContextProvider supabaseClient={supabase}>
  <App />
</SessionContextProvider>
```

### Option 3: Server-Side Token Exchange

Create an API endpoint that handles the token exchange:

```javascript
// API endpoint (e.g., Vercel function)
export default async function handler(req, res) {
  const { access_token, refresh_token } = req.query;
  
  // Store tokens temporarily (Redis, etc.)
  const tempId = generateTempId();
  await storeTokens(tempId, { access_token, refresh_token });
  
  // Redirect to app with temp ID
  res.redirect(`touchbasebolt://reset-password?tempId=${tempId}`);
}
```

## Current Implementation Issues

1. **Email Prefetching**: Gmail and other providers consume the token
2. **Deep Link Limitations**: Mobile browsers don't always handle deep links well
3. **PKCE Flow**: The `code` parameter needs to be exchanged, but this often fails due to timing

## Recommended Approach

1. **For Production**: Use a web intermediary page (Option 1)
2. **For Development**: Use Expo development URLs
3. **Alternative**: Implement magic link login instead of password reset

## Testing Password Reset

1. Use a fresh email address
2. Open links in Safari (not Chrome) on iOS
3. Use airplane mode to prevent prefetching (temporarily)
4. Check Supabase logs for token consumption

## Alternative: Magic Link Login

Instead of password reset, consider using passwordless login:

```javascript
const { error } = await supabase.auth.signInWithOtp({
  email: email,
  options: {
    emailRedirectTo: Linking.createURL('login'),
  },
});
```

This avoids the password reset flow entirely and provides better UX.