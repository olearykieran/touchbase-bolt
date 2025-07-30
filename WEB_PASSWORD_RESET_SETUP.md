# Web-Based Password Reset Setup

## Overview
This solution uses a web page hosted on keeptouch.app to handle password resets, completely bypassing the mobile deep linking issues.

## Setup Steps

### 1. Upload the Web Page
Upload `web-reset-password.html` to your keeptouch.app website:
- Rename it to `reset-password.html`
- Place it at: `https://keeptouch.app/reset-password.html`

### 2. Update Supabase Configuration
1. Go to Supabase Dashboard
2. Navigate to Authentication → URL Configuration
3. Add to Redirect URLs:
   ```
   https://keeptouch.app/reset-password
   https://keeptouch.app/reset-password.html
   ```
4. Save changes

### 3. How It Works
1. User requests password reset in app
2. Email link goes to: `https://keeptouch.app/reset-password?code=xxx`
3. Web page handles the code exchange
4. User enters new password on web page
5. Success! User can sign in with new password in app

## Benefits
- ✅ No deep linking issues
- ✅ No email prefetching problems
- ✅ Works on all devices
- ✅ Professional user experience
- ✅ Follows Supabase best practices

## Testing
1. Request password reset from app
2. Check email
3. Click link - should open keeptouch.app
4. Enter new password
5. Return to app and sign in

## Customization
The web page matches KeepTouch branding:
- Background: `#f8f5ed` (cream)
- Primary color: `#9d9e9e` (gray)
- Clean, minimal design

## Alternative: If You Can't Host the Page
If you can't add this to keeptouch.app immediately, you can:
1. Host on Vercel/Netlify (free)
2. Use GitHub Pages
3. Create a simple subdomain

## Important Notes
- The Supabase anon key in the HTML is safe to expose (it's public)
- The page handles all error cases
- Works with Supabase's PKCE flow
- No app changes needed beyond the redirect URL