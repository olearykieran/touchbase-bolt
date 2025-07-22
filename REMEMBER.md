new build make sure run

npx expo prebuild --platform ios --clean
cd ios && pod install && cd ..

then build

then submit

test ios subscription:

Run a build in development, use sandbox account on iphone

## Facebook SDK Setup
- Replace YOUR_FACEBOOK_APP_ID and YOUR_FACEBOOK_CLIENT_TOKEN in app.json before building
- Build with EAS after updating Facebook credentials (Expo Go won't work)
- See FACEBOOK_SDK_SETUP.md for complete setup guide
