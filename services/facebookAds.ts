import { AppEventsLogger, Settings } from 'react-native-fbsdk-next';
import { Platform } from 'react-native';
import * as Application from 'expo-application';
import { requestTrackingPermissionsAsync } from 'expo-tracking-transparency';

class FacebookAdsService {
  private initialized = false;

  async initialize() {
    if (this.initialized) return;

    try {
      // Request tracking permission on iOS 14.5+
      if (Platform.OS === 'ios') {
        const { status } = await requestTrackingPermissionsAsync();
        if (status === 'granted') {
          await Settings.setAdvertiserTrackingEnabled(true);
        }
      }

      // Initialize Facebook SDK
      await Settings.initializeSDK();
      
      // Set data processing options for California Consumer Privacy Act (CCPA)
      Settings.setDataProcessingOptions(['LDU'], 1, 1000);
      
      this.initialized = true;
      console.log('Facebook SDK initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Facebook SDK:', error);
    }
  }

  // Track app activation
  async trackAppActivation() {
    try {
      AppEventsLogger.logEvent('fb_mobile_activate_app');
    } catch (error) {
      console.error('Failed to track app activation:', error);
    }
  }

  // Track user registration
  async trackRegistration(method: string = 'email') {
    try {
      AppEventsLogger.logEvent('fb_mobile_complete_registration', {
        fb_registration_method: method,
      });
    } catch (error) {
      console.error('Failed to track registration:', error);
    }
  }

  // Track purchase event (for subscription tracking)
  async trackPurchase(amount: number, currency: string = 'USD', subscriptionType: string) {
    try {
      AppEventsLogger.logPurchase(amount, currency, {
        fb_content_type: 'subscription',
        fb_content_id: subscriptionType,
      });
    } catch (error) {
      console.error('Failed to track purchase:', error);
    }
  }

  // Track subscription trial start
  async trackStartTrial(subscriptionType: string) {
    try {
      AppEventsLogger.logEvent('StartTrial', {
        fb_content_type: 'subscription',
        fb_content_id: subscriptionType,
      });
    } catch (error) {
      console.error('Failed to track trial start:', error);
    }
  }

  // Track custom events
  async trackCustomEvent(eventName: string, parameters?: Record<string, any>) {
    try {
      AppEventsLogger.logEvent(eventName, parameters);
    } catch (error) {
      console.error(`Failed to track custom event ${eventName}:`, error);
    }
  }

  // Track contact added
  async trackContactAdded() {
    try {
      AppEventsLogger.logEvent('AddedContact', {
        fb_content_type: 'contact',
      });
    } catch (error) {
      console.error('Failed to track contact added:', error);
    }
  }

  // Track reminder set
  async trackReminderSet(frequency: string) {
    try {
      AppEventsLogger.logEvent('SetReminder', {
        fb_content_type: 'reminder',
        reminder_frequency: frequency,
      });
    } catch (error) {
      console.error('Failed to track reminder set:', error);
    }
  }

  // Track app open
  async trackAppOpen() {
    try {
      AppEventsLogger.logEvent('fb_mobile_activate_app');
    } catch (error) {
      console.error('Failed to track app open:', error);
    }
  }

  // Get advertiser ID for debugging
  async getAdvertiserID(): Promise<string | null> {
    try {
      const id = await Settings.getAdvertiserID();
      return id;
    } catch (error) {
      console.error('Failed to get advertiser ID:', error);
      return null;
    }
  }

  // Set user data for better ad targeting
  async setUserData(userId: string, email?: string) {
    try {
      // Facebook SDK will hash this data automatically
      AppEventsLogger.setUserID(userId);
      
      if (email) {
        AppEventsLogger.setUserData({
          email,
        });
      }
    } catch (error) {
      console.error('Failed to set user data:', error);
    }
  }

  // Clear user data on logout
  async clearUserData() {
    try {
      // Only clearUserID is available in the SDK
      if (typeof AppEventsLogger.clearUserID === 'function') {
        AppEventsLogger.clearUserID();
      }
      // Note: clearUserData doesn't exist in react-native-fbsdk-next
      // User data will be cleared when a new user signs in with setUserData
    } catch (error) {
      // Silently fail - this is not critical for logout
      console.log('Facebook SDK clearUserID not available');
    }
  }

  // Flush any pending events
  async flush() {
    try {
      AppEventsLogger.flush();
    } catch (error) {
      console.error('Failed to flush events:', error);
    }
  }
}

export const facebookAds = new FacebookAdsService();