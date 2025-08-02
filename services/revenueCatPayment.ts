import { Platform, Alert, Linking } from 'react-native';
import Purchases, { 
  PurchasesOffering, 
  CustomerInfo,
  LOG_LEVEL
} from 'react-native-purchases';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { supabase } from '../lib/supabase';
import { facebookAds } from './facebookAds';

// RevenueCat API Key - from environment variables
const REVENUECAT_API_KEY = Constants.expoConfig?.extra?.REVENUECAT_API_KEY || process.env.EXPO_PUBLIC_REVENUECAT_API_KEY;

export type SubscriptionPlan = 'monthly' | 'yearly';

export class RevenueCatPaymentService {
  static isConfigured = false;
  static offerings: PurchasesOffering | null = null;

  // Initialize RevenueCat on app startup
  static async initialize() {
    try {
      // Initializing RevenueCat
      
      // Check if API key exists
      if (!REVENUECAT_API_KEY) {
        throw new Error('RevenueCat API key not found in environment variables');
      }
      
      // Configure RevenueCat
      if (Platform.OS === 'ios') {
        await Purchases.configure({ apiKey: REVENUECAT_API_KEY });
        
        // Set log level to reduce verbose logging (especially JWS tokens)
        await Purchases.setLogLevel(LOG_LEVEL.INFO);
      } else {
        // Android key would go here when you add Android support
        console.warn('[RevenueCat] Android not configured yet');
        return;
      }

      this.isConfigured = true;
      // RevenueCat initialized successfully

      // Set up listener for customer info updates
      Purchases.addCustomerInfoUpdateListener(async (info) => {
        // Customer info updated
        await this.handleCustomerInfoUpdate(info);
      });

      // Don't use logIn - just check subscription status
      // This matches the working app's approach
      await this.checkSubscriptionStatus();
      
      // Sync any pending purchases to clear stuck transactions
      // Only run this in sandbox/debug mode to avoid production issues
      if (__DEV__) {
        await this.syncPendingPurchases();
      }
      
    } catch (error) {
      console.error('[RevenueCat] Initialization error:', error);
    }
  }

  // Login user to RevenueCat - DISABLED to match working app pattern
  // The working app doesn't use logIn and it works fine
  static async loginUser(userId: string) {
    // Do nothing - just keep method for compatibility
    // Skipping login (not needed)
  }

  // Get available products
  static async getProducts() {
    try {
      // Fetching offerings...
      
      // Ensure RevenueCat is configured
      if (!this.isConfigured) {
        console.error('[RevenueCat] SDK not configured. Call initialize() first.');
        return [];
      }
      
      const offerings = await Purchases.getOfferings();
      // Offerings loaded successfully
      
      // Check if we have a current offering
      if (offerings.current !== null && offerings.current.availablePackages.length > 0) {
        this.offerings = offerings.current;
        // Current offering loaded
        // Packages available
        
        // Safely map packages with better error handling
        const mappedPackages = offerings.current.availablePackages.map(pkg => {
          try {
            // Processing package
            
            // Check if product exists
            if (!pkg.product) {
              console.error('[RevenueCat] Package missing product:', pkg);
              return null;
            }
            
            return {
              productId: pkg.product.identifier,
              title: pkg.product.title,
              description: pkg.product.description,
              price: pkg.product.price.toString(),
              currency: pkg.product.currencyCode || 'USD',
              localizedPrice: pkg.product.priceString,
              packageType: pkg.packageType,
              identifier: pkg.identifier
            };
          } catch (error) {
            console.error('[RevenueCat] Error processing package:', pkg.identifier, error);
            return null;
          }
        }).filter(Boolean); // Remove any null entries
        
        // Packages mapped successfully
        return mappedPackages;
      }
      
      console.warn('[RevenueCat] No offerings available');
      
      // Fallback: Try to get products directly (for apps without offerings configured)
      try {
        console.log('[RevenueCat] Attempting to fetch products directly...');
        const products = await Purchases.getProducts([
          'com.holygrailstudio.boltexponativewind.monthlysub',
          'com.holygrailstudio.boltexponativewind.yearlysub'
        ]);
        
        console.log('[RevenueCat] Direct products fetch result:', products);
        
        if (products.length > 0) {
          return products.map(product => ({
            productId: product.identifier,
            title: product.title,
            description: product.description,
            price: product.price.toString(),
            currency: product.currencyCode || 'USD',
            localizedPrice: product.priceString,
            packageType: null,
            identifier: product.identifier
          }));
        }
      } catch (error) {
        console.error('[RevenueCat] Error fetching products directly:', error);
      }
      
      return [];
    } catch (error) {
      console.error('[RevenueCat] Error fetching products:', error);
      return [];
    }
  }

  // Purchase subscription
  static async purchaseSubscription(plan: SubscriptionPlan): Promise<boolean> {
    try {
      if (!this.isConfigured) {
        Alert.alert('Error', 'Payment system not initialized. Please restart the app.');
        return false;
      }

      // Get the offerings if we don't have them
      if (!this.offerings) {
        const offerings = await Purchases.getOfferings();
        this.offerings = offerings.current;
      }

      // If we have offerings, try to find the package
      if (this.offerings && this.offerings.availablePackages.length > 0) {
        // Find package using flexible logic like the working app
        let packageToPurchase;
        
        if (plan === 'monthly') {
          packageToPurchase = this.offerings.availablePackages.find(
            pkg => pkg.packageType === 'MONTHLY' ||
                   pkg.identifier === '$rc_monthly' ||
                   pkg.identifier === 'monthly' ||
                   pkg.product.identifier.includes('monthly')
          );
        } else {
          packageToPurchase = this.offerings.availablePackages.find(
            pkg => pkg.packageType === 'ANNUAL' ||
                   pkg.identifier === '$rc_annual' ||
                   pkg.identifier === 'annual' ||
                   pkg.product.identifier.includes('yearly') ||
                   pkg.product.identifier.includes('annual')
          );
        }

        if (packageToPurchase) {
          // Purchasing package
          const result = await Purchases.purchasePackage(packageToPurchase);
          return await this.handlePurchaseResult(result);
        }
      }
      
      // No offerings available - try direct product purchase
      console.log('[RevenueCat] No offerings - attempting direct product purchase');
      const productId = plan === 'monthly' 
        ? 'com.holygrailstudio.boltexponativewind.monthlysub'
        : 'com.holygrailstudio.boltexponativewind.yearlysub';
      
      try {
        const result = await Purchases.purchaseProduct(productId);
        return await this.handlePurchaseResult(result);
      } catch (error: any) {
        if (error.userCancelled) {
          console.log('[RevenueCat] User cancelled purchase');
          return false;
        }
        throw error;
      }

    } catch (error: any) {
      console.error('[RevenueCat] Purchase error:', error);
      
      // Handle specific error cases
      if (error.userCancelled) {
        console.log('[RevenueCat] User cancelled purchase');
        return false;
      }
      
      // Handle invalid receipt error specifically
      if (error.code === 'INVALID_RECEIPT' || error.message?.includes('receipt is not valid')) {
        Alert.alert(
          'Purchase Error', 
          'There was an issue processing your purchase. Please try again later or contact support if the problem persists.',
          [
            { text: 'OK' }
          ]
        );
        return false;
      }
      
      const errorMessage = error.message || 'There was an error processing your purchase.';
      Alert.alert('Purchase Error', errorMessage);
      return false;
    }
  }

  // Handle purchase result
  private static async handlePurchaseResult(result: any): Promise<boolean> {
    // Purchase successful
    
    // Track purchase in Facebook Ads
    try {
      // Determine the plan type and amount from the product identifier
      const productId = result.productIdentifier || result.product?.identifier;
      let plan: 'monthly' | 'yearly' = 'monthly';
      let amount = 4.99;
      
      if (productId) {
        if (productId.includes('yearly') || productId.includes('annual')) {
          plan = 'yearly';
          amount = 49.99;
        }
      }
      
      // Track the purchase event
      await facebookAds.trackPurchase(amount, 'USD', plan);
      console.log('[RevenueCat] Facebook purchase event tracked:', { plan, amount });
    } catch (error) {
      console.error('[RevenueCat] Error tracking Facebook purchase event:', error);
    }
    
    // Set flag to refresh profile
    await AsyncStorage.setItem('need_profile_refresh', 'true');
    
    // Immediately sync the new subscription status
    try {
      const customerInfo = await Purchases.getCustomerInfo();
      await this.handleCustomerInfoUpdate(customerInfo);
    } catch (error) {
      console.error('[RevenueCat] Error syncing after purchase:', error);
    }
    
    return true;
  }

  // Handle customer info updates
  private static async handleCustomerInfoUpdate(customerInfo: CustomerInfo) {
    try {
      // Check if user has active entitlement
      const isPremium = this.hasActiveSubscription(customerInfo);
      
      // Update local storage
      await AsyncStorage.setItem('is_premium', isPremium.toString());
      
      // Sync with Supabase backend
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        // Get subscription details
        let subscriptionStatus: 'free' | 'monthly' | 'yearly' = 'free';
        let subscriptionEnd: string | null = null;
        
        if (isPremium) {
          // Find active subscription details (matching working app pattern)
          const activeEntitlements = Object.values(customerInfo.entitlements.active);
          if (activeEntitlements.length > 0) {
            // Use the first active entitlement
            const entitlement = activeEntitlements[0];
            
            // Determine subscription type from product ID
            const productId = entitlement.productIdentifier;
            if (productId.includes('monthly')) {
              subscriptionStatus = 'monthly';
            } else if (productId.includes('yearly') || productId.includes('annual')) {
              subscriptionStatus = 'yearly';
            } else {
              // Default to monthly if can't determine
              subscriptionStatus = 'monthly';
              console.log('[RevenueCat] Could not determine subscription type from product:', productId);
            }
            
            // Set expiration date
            subscriptionEnd = entitlement.expirationDate || null;
            
            console.log('[RevenueCat] Active subscription:', {
              productId,
              type: subscriptionStatus,
              expires: subscriptionEnd
            });
          }
        }
        
        // Syncing to Supabase
        
        // Update user profile in Supabase
        const { error } = await supabase
          .from('profiles')
          .update({ 
            subscription_status: subscriptionStatus,
            subscription_start: isPremium ? new Date().toISOString() : null,
            subscription_end: subscriptionEnd,
            // Reset message count for premium users
            weekly_message_count: 0,
            last_message_reset: new Date().toISOString()
          })
          .eq('id', session.user.id);
          
        if (error) {
          console.error('[RevenueCat] Error updating Supabase profile:', error);
        } else {
          console.log('[RevenueCat] Successfully synced subscription to Supabase');
        }
      }
    } catch (error) {
      console.error('[RevenueCat] Error handling customer info update:', error);
    }
  }

  // Check if user has active subscription
  static hasActiveSubscription(customerInfo: CustomerInfo): boolean {
    // Check for any active entitlement (like the working app)
    const activeEntitlements = customerInfo.entitlements.active;
    
    // If user has any active entitlements, they have a subscription
    if (Object.keys(activeEntitlements).length > 0) {
      console.log('[RevenueCat] Found active entitlements:', Object.keys(activeEntitlements));
      return true;
    }
    
    return false;
  }

  // Check current subscription status
  static async checkSubscriptionStatus(): Promise<boolean> {
    try {
      // Checking subscription status
      const customerInfo = await Purchases.getCustomerInfo();
      
      const isPremium = this.hasActiveSubscription(customerInfo);
      // Subscription status checked
      
      // Update local storage
      await AsyncStorage.setItem('is_premium', isPremium.toString());
      
      return isPremium;
    } catch (error) {
      console.error('[RevenueCat] Error checking subscription status:', error);
      return false;
    }
  }

  // Restore purchases
  static async restorePurchases(): Promise<boolean> {
    try {
      console.log('[RevenueCat] Restoring purchases...');
      const customerInfo = await Purchases.restorePurchases();
      
      const isPremium = this.hasActiveSubscription(customerInfo);
      
      if (isPremium) {
        Alert.alert('Success', 'Your subscription has been restored!');
        await AsyncStorage.setItem('need_profile_refresh', 'true');
        
        // Sync restored subscription to Supabase
        await this.handleCustomerInfoUpdate(customerInfo);
      } else {
        Alert.alert('No Subscription Found', 'No active subscription found to restore.');
      }
      
      return isPremium;
    } catch (error) {
      console.error('[RevenueCat] Restore error:', error);
      Alert.alert('Error', 'Failed to restore purchases. Please try again.');
      return false;
    }
  }

  // Get current subscription info
  static async getCurrentSubscription() {
    try {
      const customerInfo = await Purchases.getCustomerInfo();
      
      // Find active subscription
      for (const [key, entitlement] of Object.entries(customerInfo.entitlements.active)) {
        if (entitlement.isActive) {
          return {
            identifier: key,
            productIdentifier: entitlement.productIdentifier,
            expirationDate: entitlement.expirationDate,
            willRenew: entitlement.willRenew,
          };
        }
      }
      
      return null;
    } catch (error) {
      console.error('[RevenueCat] Error getting current subscription:', error);
      return null;
    }
  }

  // Sync pending purchases - call this on app startup to clear stuck transactions
  static async syncPendingPurchases() {
    try {
      // Syncing pending purchases
      
      // First, try to invalidate customer info cache
      try {
        await Purchases.invalidateCustomerInfoCache();
        // Invalidated customer info cache
      } catch (error) {
        console.log('[RevenueCat] Could not invalidate cache:', error);
      }
      
      // This will cause RevenueCat to sync with the App Store and finish any pending transactions
      const syncResult = await Purchases.syncPurchases();
      // Sync complete
      
      // Get the latest customer info after sync
      const customerInfo = await Purchases.getCustomerInfo();
      // Customer info synced
      
      // Process the updated customer info
      await this.handleCustomerInfoUpdate(customerInfo);
      
      return true;
    } catch (error) {
      console.error('[RevenueCat] Error syncing purchases:', error);
      return false;
    }
  }

  // Cancel subscription - directs to iOS subscription management
  static async cancelSubscription(): Promise<boolean> {
    try {
      if (Platform.OS === 'ios') {
        // For iOS, direct user to iTunes subscription management
        // Check if we're in a simulator
        if (Constants.appOwnership === 'expo' || !Device.isDevice) {
          Alert.alert(
            'Test Mode',
            'Running in simulator/Expo Go. This would normally open iTunes subscription settings.',
            [{ text: 'OK' }]
          );
          return true;
        }
        
        // In a real device, try to open the iTunes URL
        try {
          await Linking.openURL('itms-apps://apps.apple.com/account/subscriptions');
        } catch (error) {
          console.error('Error opening subscription URL:', error);
          Alert.alert(
            'Subscription Management',
            'Please open Settings > iTunes & App Store > Your Apple ID > Subscriptions to manage your subscription.',
            [{ text: 'OK' }]
          );
        }
        
        return true;
      } else {
        // For Android, you might handle this differently
        Alert.alert('Not Available', 'Cancel subscription is only available on iOS devices');
        return false;
      }
    } catch (err: any) {
      Alert.alert('Error', err.message);
      console.error('Cancel subscription error:', err);
      return false;
    }
  }
}