import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Updates from 'expo-updates';

export const initSentry = () => {
  const dsn = Constants.expoConfig?.extra?.SENTRY_DSN;
  if (!dsn || dsn.includes('REPLACE_WITH_YOUR')) {
    console.warn('Sentry DSN not configured or still using placeholder');
    return;
  }

  Sentry.init({
    dsn,
    // No longer using enableInExpoDevelopment
    enabled: true, // Enable in all environments for crash detection
    debug: __DEV__,
    tracesSampleRate: 1.0,
    environment: __DEV__ ? 'development' : 'production',
  });

  // Add Expo-specific context that was previously added automatically
  try {
    // Add device info
    if (Device) {
      Sentry.setTag(
        'deviceYearClass',
        Device.deviceYearClass?.toString() || 'unknown'
      );
      Sentry.setTag('deviceName', Device.deviceName || 'unknown');
      Sentry.setTag('deviceType', Device.deviceType || 'unknown');
    }

    // Add app info
    Sentry.setTag('appVersion', Constants.expoConfig?.version || 'unknown');

    // Add update info if available
    if (Updates.channel) {
      Sentry.setTag('expoChannel', Updates.channel);
    }

    // Add runtime info
    Sentry.setTag(
      'hermes',
      typeof (global as any).HermesInternal !== 'undefined' ? 'true' : 'false'
    );
  } catch (err) {
    console.warn('Error setting Sentry tags:', err);
  }
};

// Helper to capture any error and log additional context
export const captureException = (error: any, context?: Record<string, any>) => {
  if (context) {
    // Use the correct API for adding context
    Object.entries(context).forEach(([key, value]) => {
      Sentry.setExtra(key, value);
    });
  }
  Sentry.captureException(error);
};
