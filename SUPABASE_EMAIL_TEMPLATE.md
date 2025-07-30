# Supabase Email Template Configuration

## Problem
Email security systems (Gmail, Outlook, corporate email) prefetch links for security scanning, which consumes the one-time password reset token before the user clicks it.

## Solution: Use Magic Link Token Instead of URL

### Step 1: Update Email Template in Supabase Dashboard

Go to Supabase Dashboard → Authentication → Email Templates → Reset Password

Replace the default template with:

```html
<h2>Reset Your Password</h2>

<p>Hi {{ .Email }},</p>

<p>You requested to reset your password. Use this code in the app:</p>

<div style="background-color: #f4f4f4; padding: 20px; border-radius: 5px; text-align: center; margin: 20px 0;">
  <h1 style="margin: 0; font-family: monospace; letter-spacing: 3px;">{{ .Token }}</h1>
</div>

<p>Or click this link (if the code doesn't work):</p>
<p><a href="{{ .ConfirmationURL }}">Reset Password</a></p>

<p>This code will expire in 1 hour.</p>

<p>If you didn't request this, please ignore this email.</p>
```

### Step 2: Update Supabase Auth Settings

1. Go to Authentication → Providers → Email
2. Enable "Use OTP for magic links"
3. Set OTP expiry to 3600 seconds (1 hour)

### Step 3: Benefits

1. **Token in email body** - Can't be prefetched by security systems
2. **Fallback link** - Still available if needed
3. **Better UX** - Users can manually enter code if link fails
4. **No expiration from prefetching** - Token only consumed when used

### Step 4: Implementation

The app already handles both flows:
- Code parameter in URL (current implementation)
- Future: Add manual code entry screen

This approach solves the prefetching issue while maintaining compatibility.