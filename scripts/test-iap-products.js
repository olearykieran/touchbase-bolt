#!/usr/bin/env node

// This script checks if IAP products are correctly configured
// Run with: node scripts/test-iap-products.js

const fs = require('fs');
const path = require('path');

console.log('🔍 Checking IAP Product Configuration...\n');

// Read app.json
const appJsonPath = path.join(__dirname, '..', 'app.json');
const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));

const monthlyId = appJson.expo.extra.iosMonthlyProductId || 'com.holygrailstudio.boltexponativewind.monthlysub';
const yearlyId = appJson.expo.extra.iosYearlyProductId || 'com.holygrailstudio.boltexponativewind.yearlysub';
const bundleId = appJson.expo.ios.bundleIdentifier;

console.log('Bundle ID:', bundleId);
console.log('Monthly Product ID:', monthlyId);
console.log('Yearly Product ID:', yearlyId);

console.log('\n✅ Product IDs should be created in App Store Connect with these exact values.');
console.log('\n📋 Checklist for App Store Connect:');
console.log('1. Go to App Store Connect > Your App > Features > In-App Purchases');
console.log('2. Create two Auto-Renewable Subscriptions:');
console.log(`   - Reference Name: Monthly Subscription`);
console.log(`   - Product ID: ${monthlyId}`);
console.log(`   - Price: $2.99`);
console.log('');
console.log(`   - Reference Name: Yearly Subscription`);
console.log(`   - Product ID: ${yearlyId}`);
console.log(`   - Price: $12.99`);
console.log('\n3. For each subscription:');
console.log('   - Add localized display name and description');
console.log('   - Add review screenshots (required!)');
console.log('   - Set subscription duration (1 month / 1 year)');
console.log('   - Submit for review');
console.log('\n4. Make sure subscriptions are in "Ready to Submit" or "Approved" state');
console.log('\n5. In App Information > Paid Apps Agreement:');
console.log('   - Ensure the agreement is active (you confirmed this)');

console.log('\n🔧 Debugging in TestFlight:');
console.log('1. Use the IAP Debug Panel in Settings to check:');
console.log('   - If products are loading correctly');
console.log('   - Purchase history');
console.log('   - Available purchases');
console.log('2. Check Xcode console logs when running on device');
console.log('3. Ensure you are signed in with a sandbox account on the device');