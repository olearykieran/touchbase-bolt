import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { captureException } from './sentry';

/**
 * Checks that required environment variables are set
 * Call this on app startup to verify the build configuration
 */
export function checkEnvironmentVariables() {
  // These are critical and always required
  const criticalVars = [
    'EXPO_PUBLIC_SUPABASE_URL',
    'EXPO_PUBLIC_SUPABASE_ANON_KEY',
  ];

  // These are only checked in production builds
  const productionOnlyVars: string[] = [
    // Add any production-only env vars here
  ];

  // Only check critical vars in development
  const varsToCheck = __DEV__
    ? criticalVars
    : [...criticalVars, ...productionOnlyVars];

  const missingVars = varsToCheck.filter((key) => !process.env[key]);

  if (missingVars.length > 0) {
    console.error('Missing environment variables:', missingVars);

    // Get additional build info for troubleshooting
    const buildInfo = {
      appVersion: Constants.expoConfig?.version || 'unknown',
      buildType: __DEV__ ? 'development' : 'production',
      platform: Platform.OS,
      nodeEnv: process.env.NODE_ENV,
      expoConstants: Constants ? 'available' : 'unavailable',
    };

    // Log to Sentry if not in development mode
    if (!__DEV__) {
      const error = new Error(
        `Missing environment variables: ${missingVars.join(', ')}`
      );
      captureException(error, {
        ...buildInfo,
        missingVars,
      });
    }

    return { success: false, missingVars, buildInfo };
  }

  // Also check for Sentry DSN if we're in production
  if (!__DEV__) {
    const sentryDsn = Constants.expoConfig?.extra?.SENTRY_DSN;
    if (!sentryDsn || sentryDsn.includes('REPLACE_WITH_YOUR')) {
      console.warn('Sentry DSN not configured for production build');
      // We don't block the app for this, just warn
    }
  }

  return { success: true };
}
