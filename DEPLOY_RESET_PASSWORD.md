# Deploy Password Reset Page to KeepTouch.app

## File Created
I've created the password reset page at:
`/Users/kieran/Desktop/KeepTouch Web/project 2/app/reset-password/page.tsx`

## Build and Deploy Steps

1. **Build the Next.js project:**
   ```bash
   cd "/Users/kieran/Desktop/KeepTouch Web/project 2"
   npm run build
   ```

2. **Deploy to your hosting:**
   - If using Vercel: `vercel --prod`
   - If using manual hosting: Upload the contents of the `out` directory

## Verify Deployment
After deployment, test the password reset page at:
`https://keeptouch.app/reset-password`

## Update Supabase Configuration

1. Go to your Supabase Dashboard
2. Navigate to **Authentication → URL Configuration**
3. Add these URLs to the **Redirect URLs** list:
   ```
   https://keeptouch.app/reset-password
   ```
4. Click **Save**

## Test the Complete Flow

1. In the KeepTouch app, request a password reset
2. Check your email for the reset link
3. Click the link - it should go to `https://keeptouch.app/reset-password?code=xxx`
4. Enter your new password on the web page
5. After success, return to the app and sign in with your new password

## What the Page Does

- Handles the authorization code from Supabase
- Exchanges the code for a session
- Allows users to set a new password
- Shows appropriate error messages for expired links
- Matches your KeepTouch branding

## Troubleshooting

If the page doesn't load after deployment:
1. Check that the build completed successfully
2. Verify the page exists at `/reset-password`
3. Check browser console for any errors
4. Ensure Supabase redirect URLs are configured correctly

The password reset flow should now work seamlessly!