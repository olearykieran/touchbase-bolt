# Password Reset Debugging Guide

## Recent Updates to Fix "Invalid or Expired Token" Error

### 1. Enhanced Deep Link Handler
The deep link handler in `_layout.tsx` now:
- Logs detailed information about received URLs
- Tries multiple parsing strategies (hash fragments and query parameters)
- Handles error parameters in the URL
- Provides specific error messages for different failure scenarios
- Checks for existing sessions as a fallback

### 2. PASSWORD_RECOVERY Event Listener
Added listener for Supabase's PASSWORD_RECOVERY auth event which:
- Automatically detects when a password recovery session is established
- Navigates directly to the reset password screen
- Works even if the deep link parsing fails

### 3. OTP Fallback Option
Added OTP (One-Time Password) support in sign-in screen:
- Users can enter a 6-digit code from their email
- Uses `supabase.auth.verifyOtp()` with type 'recovery'
- Provides an alternative if the link doesn't work

## Debugging Steps

### 1. Check Console Logs
When testing password reset, check the console for:
```
Deep link received: [URL]
Hash params: { access_token, refresh_token, type, error_code }
Query params: { access_token, refresh_token, type, error_code }
PASSWORD_RECOVERY event detected
```

### 2. Common Issues and Solutions

#### Email Prefetching
**Issue**: Enterprise email systems prefetch links, consuming the token
**Solution**: Use the OTP code option instead of clicking the link

#### Missing Tokens
**Issue**: URL doesn't contain access_token or refresh_token
**Solution**: 
- Check if PASSWORD_RECOVERY event fires
- Try the OTP code option
- Request a new reset link

#### Development Build URLs
**Issue**: Development builds may have different URL structures
**Solution**: The enhanced handler tries multiple parsing strategies

### 3. Testing Checklist
1. Request password reset
2. Check email for both link and 6-digit code
3. Try clicking the link first
4. If link fails, use "Enter Code" option
5. Check console logs for debugging info

### 4. Supabase Configuration
Ensure these URLs are in your Supabase dashboard:
- `touchbasebolt://reset-password`
- `exp://*/--/reset-password`
- `http://localhost:*/--/reset-password`

### 5. Email Template
Consider updating your Supabase email template to include:
```
Click here to reset your password: {{ .ConfirmationURL }}

Or use this code: {{ .Token }}
```

This gives users both options for password reset.