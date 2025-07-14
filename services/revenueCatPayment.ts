import { Platform, Alert } from 'react-native';
import Purchases, { 
  PurchasesOffering, 
  PurchasesPackage,
  CustomerInfo,
  PurchasesEntitlementInfo 
} from 'react-native-purchases';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';

// RevenueCat API Key - from your RevenueCat dashboard
const REVENUECAT_API_KEY = 'appl_uQuEWLwAuYjhYWhtEmNbarnyiob';

// Entitlement identifier from RevenueCat dashboard
const ENTITLEMENT_ID = 'premium'; // You'll need to create this in RevenueCat

export type SubscriptionPlan = 'monthly' | 'yearly';

export class RevenueCatPaymentService {
  static isConfigured = false;
  static offerings: PurchasesOffering | null = null;

  // Initialize RevenueCat on app startup
  static async initialize() {
    try {
      console.log('[RevenueCat] Initializing...');
      
      // Configure RevenueCat
      if (Platform.OS === 'ios') {
        await Purchases.configure({ apiKey: REVENUECAT_API_KEY });
      } else {
        // Android key would go here when you add Android support
        console.warn('[RevenueCat] Android not configured yet');
        return;
      }

      this.isConfigured = true;
      console.log('[RevenueCat] Initialized successfully');

      // Set up listener for customer info updates
      Purchases.addCustomerInfoUpdateListener(async (info) => {
        console.log('[RevenueCat] Customer info updated:', info);
        await this.handleCustomerInfoUpdate(info);
      });

      // Don't use logIn - just check subscription status
      // This matches the working app's approach
      await this.checkSubscriptionStatus();
      
    } catch (error) {
      console.error('[RevenueCat] Initialization error:', error);
    }
  }

  // Login user to RevenueCat - DISABLED to match working app pattern
  // The working app doesn't use logIn and it works fine
  static async loginUser(userId: string) {
    // Do nothing - just keep method for compatibility
    console.log('[RevenueCat] Skipping login (not needed)');
  }

  // Get available products
  static async getProducts() {
    try {
      console.log('[RevenueCat] Fetching offerings...');
      
      // Ensure RevenueCat is configured
      if (!this.isConfigured) {
        console.error('[RevenueCat] SDK not configured. Call initialize() first.');
        return [];
      }
      
      const offerings = await Purchases.getOfferings();
      console.log('[RevenueCat] Raw offerings response:', JSON.stringify(offerings, null, 2));
      
      // Check if we have a current offering
      if (offerings.current !== null && offerings.current.availablePackages.length > 0) {
        this.offerings = offerings.current;
        console.log('[RevenueCat] Current offering:', offerings.current.identifier);
        console.log('[RevenueCat] Available packages count:', offerings.current.availablePackages.length);
        
        // Safely map packages with better error handling
        const mappedPackages = offerings.current.availablePackages.map(pkg => {
          try {
            console.log('[RevenueCat] Processing package:', pkg.identifier);
            
            // Check if storeProduct exists
            if (!pkg.storeProduct) {
              console.error('[RevenueCat] Package missing storeProduct:', pkg);
              return null;
            }
            
            return {
              productId: pkg.storeProduct.identifier,
              title: pkg.storeProduct.title,
              description: pkg.storeProduct.description,
              price: pkg.storeProduct.price.toString(),
              currency: pkg.storeProduct.currencyCode || 'USD',
              localizedPrice: pkg.storeProduct.priceString,
              packageType: pkg.packageType,
              identifier: pkg.identifier
            };
          } catch (error) {
            console.error('[RevenueCat] Error processing package:', pkg.identifier, error);
            return null;
          }
        }).filter(Boolean); // Remove any null entries
        
        console.log('[RevenueCat] Mapped packages:', mappedPackages);
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
                   pkg.storeProduct.identifier.includes('monthly')
          );
        } else {
          packageToPurchase = this.offerings.availablePackages.find(
            pkg => pkg.packageType === 'ANNUAL' ||
                   pkg.identifier === '$rc_annual' ||
                   pkg.identifier === 'annual' ||
                   pkg.storeProduct.identifier.includes('yearly') ||
                   pkg.storeProduct.identifier.includes('annual')
          );
        }

        if (packageToPurchase) {
          console.log('[RevenueCat] Purchasing package:', packageToPurchase.identifier);
          console.log('[RevenueCat] Product:', packageToPurchase.storeProduct.identifier);
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
      
      const errorMessage = error.message || 'There was an error processing your purchase.';
      Alert.alert('Purchase Error', errorMessage);
      return false;
    }
  }

  // Handle purchase result
  private static async handlePurchaseResult(result: any): Promise<boolean> {
    console.log('[RevenueCat] Purchase successful:', result);
    
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
          // Find active subscription details
          const activeEntitlements = Object.values(customerInfo.entitlements.active);
          if (activeEntitlements.length > 0) {
            const entitlement = activeEntitlements[0];
            
            // Determine subscription type from product ID
            if (entitlement.productIdentifier.includes('monthly')) {
              subscriptionStatus = 'monthly';
            } else if (entitlement.productIdentifier.includes('yearly') || entitlement.productIdentifier.includes('annual')) {
              subscriptionStatus = 'yearly';
            } else {
              // Fallback: check by identifier or default to monthly
              subscriptionStatus = entitlement.identifier.includes('annual') ? 'yearly' : 'monthly';
            }
            
            // Set expiration date
            subscriptionEnd = entitlement.expirationDate || null;
          }
        }
        
        console.log('[RevenueCat] Syncing to Supabase:', {
          userId: session.user.id,
          subscriptionStatus,
          subscriptionEnd
        });
        
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
    // Check if the user has the premium entitlement
    if (ENTITLEMENT_ID in customerInfo.entitlements.active) {
      const entitlement = customerInfo.entitlements.active[ENTITLEMENT_ID];
      return entitlement.isActive;
    }
    
    // Fallback: check if any entitlement is active
    return Object.keys(customerInfo.entitlements.active).length > 0;
  }

  // Check current subscription status
  static async checkSubscriptionStatus(): Promise<boolean> {
    try {
      console.log('[RevenueCat] Checking subscription status...');
      const customerInfo = await Purchases.getCustomerInfo();
      
      const isPremium = this.hasActiveSubscription(customerInfo);
      console.log('[RevenueCat] Subscription status:', isPremium ? 'Premium' : 'Free');
      
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
}