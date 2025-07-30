# Password Reset Setup Guide

## Overview
This guide explains how to configure password reset for the KeepTouch mobile app using Supabase and Expo Linking.

## Implementation Details

### 1. Dynamic Redirect URL Generation
The app now uses Expo Linking to generate dynamic redirect URLs based on the user's device:
- iOS: `touchbasebolt://reset-password`
- Android: `touchbasebolt://reset-password`
- Expo Go: `exp://[your-local-ip]:8081/--/reset-password`

### 2. Files Modified

#### `/app/(auth)/sign-in.tsx`
- Added `import * as Linking from 'expo-linking'`
- Updated password reset to use dynamic redirect URL:
```typescript
const redirectUrl = Linking.createURL('reset-password');
const { error } = await supabase.auth.resetPasswordForEmail(email, {
  redirectTo: redirectUrl,
});
```

#### `/app/_layout.tsx`
- Enhanced deep link handler to process password reset links
- Extracts token from hash parameters (Supabase format)
- Sets recovery session and navigates to reset-password screen

#### `/app/(auth)/reset-password.tsx`
- Added session validation on mount
- Verifies user has valid recovery session
- Signs out user after successful password reset

### 3. Supabase Dashboard Configuration

You need to configure the following in your Supabase dashboard:

1. Go to Authentication → URL Configuration
2. Add these Redirect URLs:
   - `touchbasebolt://reset-password` (for production iOS/Android)
   - `exp://*/--/reset-password` (for Expo Go development)
   - `http://localhost:*/--/reset-password` (for web development)

3. In Email Templates → Reset Password:
   - The template should use the `{{ .ConfirmationURL }}` variable
   - Supabase will automatically use the correct redirect URL

### 4. Testing the Password Reset Flow

1. **Request Reset**:
   - Enter email in sign-in screen
   - Tap "Forgot Password?"
   - Check email for reset link

2. **Click Reset Link**:
   - Opens app with deep link
   - App extracts token from URL
   - Sets recovery session
   - Navigates to reset-password screen

3. **Set New Password**:
   - Enter and confirm new password
   - Submit to update password
   - User is signed out and redirected to sign-in

### 5. Troubleshooting

#### "Invalid or expired reset link"
- Link may have expired (default 1 hour)
- User needs to request new reset link

#### Link opens browser instead of app
- Ensure URL scheme is registered in app.json
- Check that redirect URLs are configured in Supabase

#### Testing in Development
- Use Expo Go URL format: `exp://*/--/reset-password`
- Make sure your development URL is added to Supabase

### 6. URL Scheme Configuration
The app is configured with the URL scheme `touchbasebolt` in `app.json`:
```json
"scheme": "touchbasebolt"
```

This enables deep linking for:
- Password reset: `touchbasebolt://reset-password`
- Payment success: `touchbasebolt://payment-success`
- Payment cancel: `touchbasebolt://payment-cancel`