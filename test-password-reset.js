// Test script to debug password reset flow
// Run with: node test-password-reset.js

const SUPABASE_URL = 'https://nocqcvnmmoadxhhjgnys.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'YOUR_ANON_KEY_HERE';

async function testPasswordReset() {
  console.log('Testing password reset flow...\n');
  
  // Test email - replace with your test email
  const testEmail = 'your-test-email@example.com';
  
  console.log('1. Sending password reset request for:', testEmail);
  console.log('   Redirect URL: touchbasebolt://reset-password\n');
  
  const response = await fetch(`${SUPABASE_URL}/auth/v1/recover`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({
      email: testEmail,
      redirect_to: 'touchbasebolt://reset-password',
    }),
  });
  
  const result = await response.json();
  console.log('2. Response:', result);
  
  if (response.ok) {
    console.log('\n✅ Password reset email sent successfully!');
    console.log('\n3. Check your email and inspect the link structure');
    console.log('   Expected format:');
    console.log('   https://[project].supabase.co/auth/v1/verify?token=[token]&type=recovery&redirect_to=touchbasebolt://reset-password');
    console.log('\n4. When you click the link, it should:');
    console.log('   a) Open in browser first');
    console.log('   b) Redirect to touchbasebolt://reset-password?code=[code]');
    console.log('   c) Open your app with the code parameter');
  } else {
    console.log('\n❌ Error sending password reset:', result);
  }
}

// Run the test
testPasswordReset().catch(console.error);

console.log('\nDebugging tips:');
console.log('1. If link shows "about:blank" - email client is blocking deep links');
console.log('2. Try copying link and opening in Safari directly');
console.log('3. Check Supabase dashboard for redirect URL configuration');
console.log('4. Ensure app is installed on device (deep links won\'t work in simulator)');