# Testing on Your iPhone - Quick Guide

## Option 1: Direct USB Testing (Recommended)
Since your phone is plugged in via USB:

```bash
# 1. Build and run directly on your device
npx expo run:ios --device

# This will:
# - Build a development version
# - Install directly on your connected iPhone
# - Open the app automatically
```

## Option 2: Development Build with EAS (If Option 1 fails)

```bash
# 1. Create a development build
eas build --platform ios --profile development --local

# 2. Once built, install on your device
# The .ipa file will be in your project directory
# Drag it to Xcode's Devices window to install
```

## Option 3: Quick TestFlight Build

```bash
# 1. Build for internal testing
eas build --platform ios --profile preview

# 2. Upload to TestFlight
eas submit -p ios

# 3. Install via TestFlight app on your phone
```

## Network Setup Tips

Since you're on your phone's hotspot:
1. Your laptop and phone are on the same network ✓
2. The Metro bundler URL should work automatically
3. If not, you can manually set it:
   - Shake device → "Settings" → "Debug server host"
   - Enter your laptop's IP:8081

## Testing Checklist

### Free Tier Testing:
- [ ] Sign up with new account
- [ ] Import contacts (should allow 3)
- [ ] Try adding 4th contact → paywall appears
- [ ] Generate 3 AI messages
- [ ] Try 4th message → paywall appears
- [ ] Test notification permissions

### Premium Testing (Sandbox):
- [ ] Click purchase on paywall
- [ ] Complete sandbox purchase
- [ ] Verify unlimited contacts work
- [ ] Verify unlimited messages work

### UI/UX Testing:
- [ ] Light mode appearance
- [ ] Dark mode appearance (much better now!)
- [ ] All buttons responsive
- [ ] Haptic feedback working
- [ ] Smooth animations

## Quick Start Commands

```bash
# Make sure your iPhone is unlocked and trusts this computer
# Then run:
npx expo run:ios --device

# If you see build errors, try:
cd ios && pod install && cd ..
npx expo run:ios --device --no-build-cache
```

## Troubleshooting

**"No devices found"**
- Unlock your iPhone
- Trust this computer when prompted
- Check cable connection

**Build fails**
- Open Xcode, select your device as target
- Try building from Xcode directly

**Network issues**
- Since you're on hotspot, the connection should work
- If not, check firewall settings on your Mac

**IAP not working**
- Normal in development builds
- Use TestFlight for real IAP testing