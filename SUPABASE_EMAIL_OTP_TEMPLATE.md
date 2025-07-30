# Supabase Email Template with OTP Solution

## The Problem
Email security systems (Gmail, Outlook, enterprise email) are prefetching your password reset links, which consumes the one-time token before users can click them.

## Solution 1: Update Your Web Page (Already Done)
I've updated your reset-password page to show a confirmation button first. This prevents automated systems from consuming the token.

## Solution 2: Use OTP in Email Template (Recommended)

### Update Your Supabase Email Template

1. Go to Supabase Dashboard → Authentication → Email Templates
2. Select "Reset Password" template
3. Replace with this template that includes BOTH a link and an OTP code:

```html
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #333;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .code-box {
      background-color: #f4f4f4;
      border: 2px solid #9d9e9e;
      border-radius: 8px;
      padding: 20px;
      text-align: center;
      margin: 20px 0;
    }
    .code {
      font-size: 32px;
      font-weight: bold;
      letter-spacing: 5px;
      color: #9d9e9e;
      font-family: monospace;
    }
    .button {
      display: inline-block;
      background-color: #9d9e9e;
      color: white;
      padding: 12px 24px;
      text-decoration: none;
      border-radius: 6px;
      margin: 20px 0;
    }
    .warning {
      background-color: #fff3cd;
      border: 1px solid #ffeaa7;
      padding: 15px;
      border-radius: 6px;
      margin: 20px 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <h2>Reset Your Password</h2>
    
    <p>Hi {{ .Email }},</p>
    
    <p>You requested to reset your password for KeepTouch.</p>
    
    <div class="warning">
      <strong>⚠️ Important:</strong> If clicking the button below shows "link expired", use the 6-digit code instead.
    </div>
    
    <div class="code-box">
      <p style="margin: 0 0 10px 0;">Your password reset code:</p>
      <div class="code">{{ .Token }}</div>
      <p style="margin: 10px 0 0 0; font-size: 14px; color: #666;">This code expires in 1 hour</p>
    </div>
    
    <p style="text-align: center;">
      <a href="{{ .ConfirmationURL }}" class="button">Reset Password</a>
    </p>
    
    <h3>Having trouble?</h3>
    <ol>
      <li>If the button shows "link expired", your email security may have scanned it</li>
      <li>Instead, go to the KeepTouch app</li>
      <li>Tap "Forgot Password"</li>
      <li>Enter the 6-digit code shown above</li>
    </ol>
    
    <p>If you didn't request this password reset, please ignore this email.</p>
    
    <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
    
    <p style="font-size: 12px; color: #666;">
      This email was sent by KeepTouch. For support, visit keeptouch.app
    </p>
  </div>
</body>
</html>
```

### Enable OTP in Supabase

1. Go to Authentication → Providers → Email
2. Find "Email OTP Expiration"
3. Set to 3600 seconds (1 hour)
4. Save changes

## Solution 3: Update Your App to Handle OTP

Add this to your sign-in screen (already partially implemented):

```javascript
// After user requests password reset
Alert.alert(
  'Password Reset Email Sent',
  'Check your email for a reset link or a 6-digit code.\n\nIf the link doesn\'t work, tap "Enter Code" to use the code from your email.',
  [
    { text: 'Enter Code', onPress: () => setShowOtpInput(true) },
    { text: 'OK' }
  ]
);

// Handle OTP verification
const { data, error } = await supabase.auth.verifyOtp({
  email: email,
  token: otpCode,
  type: 'email_change' // Use 'email_change' for password reset OTP
});
```

## Why This Works

1. **Confirmation Button**: Prevents automated scanning from consuming the token
2. **OTP Code**: Provides a fallback that can't be consumed by email scanners
3. **Clear Instructions**: Helps users understand what to do when links fail

## Testing

1. Update your email template
2. Request a new password reset
3. Try the link first - it should work with the confirmation button
4. If it fails, use the 6-digit code in the app

This dual approach ensures password reset works for ALL users, regardless of their email security settings.