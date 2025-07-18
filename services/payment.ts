import { Platform, Alert, Linking, NativeModules } from 'react-native';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as IAP from 'react-native-iap';
import { supabase } from '../lib/supabase';

// Get IAP product IDs from app.json
const EXTRA = Constants.expoConfig?.extra as Record<string, string>;
const IOS_MONTHLY_PRODUCT_ID = EXTRA.iosMonthlyProductId || 'com.holygrailstudio.boltexponativewind.monthlysub';
const IOS_YEARLY_PRODUCT_ID = EXTRA.iosYearlyProductId || 'com.holygrailstudio.boltexponativewind.yearlysub';

// Define subscription types
export type SubscriptionPlan = 'monthly' | 'yearly' | 'free';

// Helper to detect simulators - IAP doesn't work in simulators
export const isSimulator = () => {
  if (Platform.OS === 'ios') {
    return process.env.NODE_ENV === 'development' && !NativeModules.RNIapIos;
  }
  // For Android simulator detection if needed
  return false;
};

// Payment service to handle platform-specific payments
export class PaymentService {
  static isIAPAvailable = false;
  static purchaseUpdateSubscription: any = null;
  static purchaseErrorSubscription: any = null;
  static loadedProducts: any[] = [];
  static productsLoaded = false;

  // Initialize IAP on app startup
  static async initialize() {
    if (Platform.OS === 'ios') {
      try {
        if (isSimulator()) {
          console.log('Payment service initialized in simulator mode - IAP not available');
          return;
        }
        
        console.log('[PaymentService] Initializing IAP connection...');
        await IAP.initConnection();
        this.isIAPAvailable = true;
        console.log('[PaymentService] IAP connection initialized successfully');
        
        // Pre-load products after initialization
        console.log('[PaymentService] Loading products...');
        const products = await IAP.getProducts({
          skus: [IOS_MONTHLY_PRODUCT_ID, IOS_YEARLY_PRODUCT_ID],
        });
        console.log(`[PaymentService] Loaded ${products.length} products:`, products.map(p => p.productId));
        this.loadedProducts = products;
        this.productsLoaded = products.length > 0;
        
        if (products.length === 0) {
          console.warn('[PaymentService] Warning: No products loaded from App Store. This usually means:');
          console.warn('1. Products are not properly configured in App Store Connect');
          console.warn('2. Products have "Developer Action Needed" status');
          console.warn('3. Products are rejected and need to be resubmitted');
          console.warn('4. Bundle ID mismatch between app and App Store Connect');
        }
        
        // Clear any pending transactions from previous sessions
        console.log('[PaymentService] Checking for pending transactions...');
        try {
          const pending = await IAP.getAvailablePurchases();
          if (pending && pending.length > 0) {
            console.log(`[PaymentService] Found ${pending.length} pending transactions, clearing...`);
            for (const purchase of pending) {
              try {
                await IAP.finishTransaction({ 
                  purchase,
                  isConsumable: false,
                });
                console.log(`[PaymentService] Cleared pending transaction: ${purchase.productId}`);
              } catch (error) {
                console.error(`[PaymentService] Error clearing transaction:`, error);
              }
            }
          }
        } catch (error) {
          console.error('[PaymentService] Error checking pending transactions:', error);
        }
        
        // Set up purchase listeners
        this.setupPurchaseListeners();
      } catch (error) {
        console.error('[PaymentService] Error initializing IAP:', error);
        this.isIAPAvailable = false;
        // Don't throw, just log the error
      }
    }
  }
  
  // Set up listeners for purchase updates
  static setupPurchaseListeners() {
    // Listen for successful purchases
    this.purchaseUpdateSubscription = IAP.purchaseUpdatedListener((purchase: any) => {
      console.log('[PaymentService] Purchase updated:', purchase);
      // Auto-finish any successful purchase to prevent stuck transactions
      if (purchase && purchase.transactionId) {
        IAP.finishTransaction({ 
          purchase,
          isConsumable: false,
        }).catch(error => {
          console.error('[PaymentService] Error auto-finishing transaction:', error);
        });
      }
    });
    
    // Listen for purchase errors
    this.purchaseErrorSubscription = IAP.purchaseErrorListener((error: any) => {
      console.error('[PaymentService] Purchase error listener:', error);
    });
  }

  // Clean up on app shutdown
  static async endConnection() {
    if (Platform.OS === 'ios' && this.isIAPAvailable) {
      try {
        // Remove listeners
        if (this.purchaseUpdateSubscription) {
          this.purchaseUpdateSubscription.remove();
          this.purchaseUpdateSubscription = null;
        }
        if (this.purchaseErrorSubscription) {
          this.purchaseErrorSubscription.remove();
          this.purchaseErrorSubscription = null;
        }
        
        await IAP.endConnection();
      } catch (error) {
        console.error('Error ending IAP connection:', error);
      }
    }
  }

  // Ensure products are loaded
  static async ensureProductsLoaded() {
    if (Platform.OS !== 'ios' || this.productsLoaded || isSimulator()) {
      return true;
    }
    
    try {
      console.log('[PaymentService] Products not loaded, attempting to load...');
      const products = await IAP.getProducts({
        skus: [IOS_MONTHLY_PRODUCT_ID, IOS_YEARLY_PRODUCT_ID],
      });
      
      if (products && products.length > 0) {
        this.loadedProducts = products;
        this.productsLoaded = true;
        console.log(`[PaymentService] Successfully loaded ${products.length} products`);
        return true;
      } else {
        console.error('[PaymentService] No products returned from getProducts');
        return false;
      }
    } catch (error) {
      console.error('[PaymentService] Error loading products:', error);
      return false;
    }
  }

  // Get available products (IAP or Stripe depending on platform)
  static async getProducts() {
    if (Platform.OS === 'ios') {
      try {
        // In simulator, return mock products
        if (isSimulator() || !this.isIAPAvailable) {
          console.log('Using mock products for simulator');
          return [
            {
              productId: IOS_MONTHLY_PRODUCT_ID,
              title: 'Monthly Premium (Simulator)',
              description: 'Unlimited contacts and messages',
              price: '$2.99',
              currency: 'USD',
              localizedPrice: '$2.99',
            },
            {
              productId: IOS_YEARLY_PRODUCT_ID,
              title: 'Yearly Premium (Simulator)',
              description: 'Unlimited contacts and messages, save 64%',
              price: '$12.99',
              currency: 'USD',
              localizedPrice: '$12.99',
            },
          ];
        }
        
        // Return cached products if available
        if (this.productsLoaded && this.loadedProducts.length > 0) {
          console.log('[PaymentService] Returning cached products');
          return this.loadedProducts;
        }
        
        // Otherwise, load products
        const products = await IAP.getProducts({
          skus: [IOS_MONTHLY_PRODUCT_ID, IOS_YEARLY_PRODUCT_ID],
        });
        
        // Cache the products
        if (products && products.length > 0) {
          this.loadedProducts = products;
          this.productsLoaded = true;
        }
        
        return products;
      } catch (error) {
        console.error('Error loading products:', error);
        // Return mock products on error
        return [
          {
            productId: IOS_MONTHLY_PRODUCT_ID,
            title: 'Monthly Premium (Fallback)',
            description: 'Unlimited contacts and messages',
            price: '$2.99',
            currency: 'USD',
            localizedPrice: '$2.99',
          },
          {
            productId: IOS_YEARLY_PRODUCT_ID,
            title: 'Yearly Premium (Fallback)',
            description: 'Unlimited contacts and messages, save 64%',
            price: '$12.99',
            currency: 'USD',
            localizedPrice: '$12.99',
          },
        ];
      }
    } else {
      // For Android, we'll just return fixed product info as we're using Stripe
      const extra = Constants.expoConfig?.extra as Record<string, string>;
      return [
        {
          productId: extra.stripeMonthlyPriceId,
          title: 'Monthly Premium',
          description: 'Unlimited contacts and messages',
          price: '$2.99',
          currency: 'USD',
          localizedPrice: '$2.99',
        },
        {
          productId: extra.stripeYearlyPriceId,
          title: 'Yearly Premium',
          description: 'Unlimited contacts and messages, save 64%',
          price: '$12.99',
          currency: 'USD',
          localizedPrice: '$12.99',
        },
      ];
    }
  }

  // Purchase subscription based on platform
  static async purchaseSubscription(plan: SubscriptionPlan): Promise<boolean> {
    try {
      // Get user session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        Alert.alert('Error', 'Please sign in again');
        return false;
      }

      if (Platform.OS === 'ios') {
        // iOS: Use Apple In-App Purchase
        const productId = plan === 'monthly' ? IOS_MONTHLY_PRODUCT_ID : IOS_YEARLY_PRODUCT_ID;
        console.log(`[PaymentService] Plan selected: ${plan}`);
        console.log(`[PaymentService] Product ID to purchase: ${productId}`);
        console.log(`[PaymentService] Monthly ID: ${IOS_MONTHLY_PRODUCT_ID}`);
        console.log(`[PaymentService] Yearly ID: ${IOS_YEARLY_PRODUCT_ID}`);
        
        // Handle simulator case
        if (isSimulator() || !this.isIAPAvailable) {
          Alert.alert(
            'Test Mode',
            'Running in simulator/test environment. IAP is not available here. Simulating successful purchase.',
            [{ text: 'OK' }]
          );
          
          // Simulate successful purchase in simulator
          try {
            // Update the user record via Supabase function
            const response = await fetch(
              `${Constants.expoConfig?.extra?.supabaseUrl}/functions/v1/test-upgrade-subscription`,
              {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${session.access_token}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                  plan, 
                  userId: session.user.id 
                }),
              }
            );
            
            if (!response.ok) {
              console.error('Error in test subscription update');
            } else {
              // Set flag to refresh profile on next app focus
              await AsyncStorage.setItem('need_profile_refresh', 'true');
            }
            
            return true;
          } catch (error) {
            console.error('Error in test purchase:', error);
            return false;
          }
        }
        
        // Ensure products are loaded before attempting purchase
        const productsLoaded = await this.ensureProductsLoaded();
        if (!productsLoaded) {
          Alert.alert(
            'Error',
            'Unable to load products from the App Store. Please check your internet connection and try again.',
            [{ text: 'OK' }]
          );
          return false;
        }
        
        // Check if NO products were loaded at all (likely App Store Connect issue)
        if (this.loadedProducts.length === 0) {
          console.error('[PaymentService] No products loaded - likely App Store Connect configuration issue');
          Alert.alert(
            'Subscription Setup Required',
            'Subscriptions are not yet available. The developer needs to complete setup in App Store Connect.\n\nStatus: Products need to be configured and approved.',
            [{ text: 'OK' }]
          );
          return false;
        }
        
        // Verify the specific product exists
        const productExists = this.loadedProducts.some(p => p.productId === productId);
        if (!productExists) {
          console.error(`[PaymentService] Product ${productId} not found in loaded products:`, this.loadedProducts.map(p => p.productId));
          Alert.alert(
            'Error',
            'The selected subscription is not available. Please try again later.',
            [{ text: 'OK' }]
          );
          return false;
        }
        
        try {
          console.log(`[PaymentService] Requesting purchase for product: ${productId}`);
          console.log(`[PaymentService] Available products:`, this.loadedProducts.map(p => ({ productId: p.productId, price: p.localizedPrice })));
          
          // Request subscription - for auto-renewable subscriptions, use requestSubscription
          const purchaseResult = await IAP.requestSubscription({ sku: productId });
          
          console.log('[PaymentService] Purchase result:', JSON.stringify(purchaseResult));
          
          // requestSubscription can return an array, so handle both cases
          const purchase = Array.isArray(purchaseResult) ? purchaseResult[0] : purchaseResult;
          
          if (!purchase) {
            throw new Error('No purchase result returned');
          }
          
          // Here we would validate the purchase with our backend
          // For now, we'll directly update the local flag to refresh on next focus
          await AsyncStorage.setItem('need_profile_refresh', 'true');
          
          // Finish the transaction
          if (purchase && purchase.transactionId) {
            
            // Validate receipt with our backend
            try {
              const receiptData = purchase.transactionReceipt;
              console.log(`[PaymentService] Receipt data exists: ${!!receiptData}, length: ${receiptData?.length || 0}`);
              
              if (receiptData) {
                const params = new URLSearchParams();
                params.append('receipt-data', receiptData);
                params.append('user-id', session.user.id);
                
                const bodyString = params.toString();
                console.log(`[PaymentService] Sending receipt to: ${Constants.expoConfig?.extra?.supabaseUrl}/functions/v1/app-store-webhook`);
                console.log(`[PaymentService] Request body length: ${bodyString.length}`);
                console.log(`[PaymentService] Purchase product ID: ${purchase.productId}`);
                
                const response = await fetch(
                  `${Constants.expoConfig?.extra?.supabaseUrl}/functions/v1/app-store-webhook`,
                  {
                    method: 'POST',
                    headers: {
                      Authorization: `Bearer ${session.access_token}`,
                      'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: bodyString,
                  }
                );
                
                if (response.ok) {
                  const result = await response.json();
                  console.log('Receipt validation result:', result);
                  
                  // If backend validation succeeded, we can finish the transaction
                  await IAP.finishTransaction({ 
                    purchase,
                    isConsumable: false,
                  });
                  
                  return true;
                } else {
                  const errorText = await response.text();
                  console.error('Receipt validation failed:', errorText);
                  
                  // Try to parse error as JSON
                  try {
                    const errorData = JSON.parse(errorText);
                    if (errorData.status === 21007) {
                      Alert.alert('Error', 'Receipt validation failed. Please ensure you are using the production App Store account (not sandbox).');
                    } else {
                      Alert.alert('Error', `Receipt validation failed: ${errorData.message || 'Unknown error'}`);
                    }
                  } catch (e) {
                    Alert.alert('Error', 'Receipt validation failed. Please try again.');
                  }
                  
                  // Still finish the transaction to avoid leaving it in a pending state
                  await IAP.finishTransaction({ 
                    purchase,
                    isConsumable: false,
                  });
                  
                  // But return false to indicate failure to the app
                  return false;
                }
              } else {
                console.log('No transaction receipt available');
                
                await IAP.finishTransaction({ 
                  purchase,
                  isConsumable: false,
                });
              }
            } catch (validationError) {
              console.error('Error validating receipt:', validationError);
              
              // Still finish the transaction
              await IAP.finishTransaction({ 
                purchase,
                isConsumable: false,
              });
            }
          }
          
          return true;
        } catch (error: any) {
          console.error('[PaymentService] IAP purchase error:', error);
          console.error('[PaymentService] Error details:', {
            message: error.message,
            code: error.code,
            stack: error.stack
          });
          
          // More specific error messages
          let errorMessage = 'There was an error processing your purchase. Please try again.';
          
          // Handle specific error types
          if (error.message && error.message.includes('right operand of \'in\' is not an object')) {
            errorMessage = 'Unable to connect to the App Store. Please ensure you are signed in to the App Store and try again.';
            console.error('[PaymentService] IAP not properly initialized or products not loaded');
          } else if (error.code === 'E_UNKNOWN') {
            errorMessage = 'Purchase failed. Please check your payment method and try again.';
          } else if (error.code === 'E_USER_CANCELLED') {
            errorMessage = 'Purchase cancelled.';
          } else if (error.code === 'E_ITEM_UNAVAILABLE') {
            errorMessage = 'This subscription is not available. Please try again later.';
          } else if (error.code === 'E_NETWORK_ERROR') {
            errorMessage = 'Network error. Please check your connection and try again.';
          } else if (error.code === 'E_DEFERRED') {
            errorMessage = 'Purchase is pending approval. You will be notified when it\'s complete.';
          } else if (error.code === 'E_ALREADY_OWNED') {
            errorMessage = 'You already own this subscription.';
          } else if (error.code === 'E_DEVELOPER_ERROR') {
            errorMessage = 'Configuration error. Please contact support.';
          }
          
          Alert.alert('Purchase Error', errorMessage);
          return false;
        }
      } else {
        // Android: Use Stripe
        const extra = Constants.expoConfig?.extra as Record<string, string>;
        const priceId = plan === 'monthly' ? extra.stripeMonthlyPriceId : extra.stripeYearlyPriceId;
        
        const response = await fetch(
          `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/create-checkout-session`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${session.access_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ priceId, userId: session.user.id }),
          }
        );
        
        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || 'Checkout session failed');
        }
        
        const { url } = await response.json();
        await Linking.openURL(url);
        
        // Set flag to refresh profile on next app focus
        await AsyncStorage.setItem('need_profile_refresh', 'true');
        return true;
      }
    } catch (err: any) {
      Alert.alert('Error', err.message);
      console.error('Purchase Error:', err);
      return false;
    }
  }

  // Restore purchases (only relevant for iOS)
  static async restorePurchases(): Promise<boolean> {
    if (Platform.OS !== 'ios') {
      Alert.alert('Not Available', 'Restore purchases is only available on iOS devices.');
      return false;
    }

    // Handle simulator case
    if (isSimulator() || !this.isIAPAvailable) {
      Alert.alert(
        'Test Mode',
        'Running in simulator/test environment. Restore purchases is not available. Please use a real device for this functionality.',
        [{ text: 'OK' }]
      );
      return false;
    }

    try {
      const purchases = await IAP.getPurchaseHistory();
      
      if (purchases && purchases.length > 0) {
        // Find the most recent valid subscription
        const validPurchases = purchases.filter(
          purchase => purchase.transactionReceipt && (
            purchase.productId === IOS_MONTHLY_PRODUCT_ID || 
            purchase.productId === IOS_YEARLY_PRODUCT_ID
          )
        );
        
        if (validPurchases.length > 0) {
          // Get the current user session
          const { data: { session }, error: sessionError } = await supabase.auth.getSession();
          if (sessionError || !session) {
            Alert.alert('Error', 'Please sign in again');
            return false;
          }
          
          // Validate the most recent receipt with our backend
          try {
            const recentPurchase = validPurchases[0];
            const receiptData = recentPurchase.transactionReceipt;
            
            if (receiptData) {
              const params = new URLSearchParams();
              params.append('receipt-data', receiptData);
              params.append('user-id', session.user.id);
              
              const response = await fetch(
                `${Constants.expoConfig?.extra?.supabaseUrl}/functions/v1/app-store-webhook`,
                {
                  method: 'POST',
                  headers: {
                    Authorization: `Bearer ${session.access_token}`,
                    'Content-Type': 'application/x-www-form-urlencoded',
                  },
                  body: params,
                }
              );
              
              if (response.ok) {
                const result = await response.json();
                console.log('Restore validation result:', result);
                
                if (result.success) {
                  await AsyncStorage.setItem('need_profile_refresh', 'true');
                  Alert.alert('Success', 'Your purchases have been restored.');
                  return true;
                } else {
                  Alert.alert('No Valid Subscription', 'We couldn\'t find any active subscriptions to restore.');
                  return false;
                }
              } else {
                console.error('Restore validation failed:', await response.text());
                Alert.alert('Error', 'There was an error validating your purchase. Please try again.');
                return false;
              }
            }
          } catch (validationError) {
            console.error('Error validating restore receipt:', validationError);
          }
          
          // Fallback if the validation fails
          await AsyncStorage.setItem('need_profile_refresh', 'true');
          Alert.alert('Success', 'Your purchases have been restored.');
          return true;
        } else {
          Alert.alert('No Purchases Found', 'We couldn\'t find any active subscriptions to restore.');
          return false;
        }
      } else {
        Alert.alert('No Purchases Found', 'We couldn\'t find any active subscriptions to restore.');
        return false;
      }
    } catch (error) {
      console.error('Error restoring purchases:', error);
      Alert.alert('Error', 'There was an error restoring your purchases. Please try again.');
      return false;
    }
  }

  // Cancel subscription
  static async cancelSubscription(): Promise<boolean> {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        throw new Error('Please sign in again');
      }

      if (Platform.OS === 'ios') {
        // For iOS, direct user to iTunes subscription management
        // Handle simulator case
        if (isSimulator()) {
          Alert.alert(
            'Test Mode',
            'Running in simulator. This would normally open iTunes subscription settings. Simulating successful cancellation.',
            [
              { text: 'Cancel', style: 'cancel' },
              { 
                text: 'Simulate Cancellation', 
                onPress: async () => {
                  try {
                    // Call test downgrade function
                    const response = await fetch(
                      `${Constants.expoConfig?.extra?.supabaseUrl}/functions/v1/test-downgrade-subscription`,
                      {
                        method: 'POST',
                        headers: {
                          Authorization: `Bearer ${session.access_token}`,
                          'Content-Type': 'application/json',
                        },
                      }
                    );
                    
                    if (!response.ok) {
                      throw new Error('Failed to simulate cancellation');
                    }
                    
                    await AsyncStorage.setItem('need_profile_refresh', 'true');
                    Alert.alert('Success', 'Your subscription has been canceled for testing purposes.');
                  } catch (error) {
                    console.error('Error in test cancellation:', error);
                    Alert.alert('Error', 'Failed to simulate cancellation.');
                  }
                } 
              }
            ]
          );
          return true;
        }
        
        // Try to open subscription management in real device
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
        // For Android, use your existing cancel endpoint
        const response = await fetch(
          `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/cancel-subscription`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${session.access_token}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || 'Failed to cancel subscription');
        }

        const data = await response.json();
        Alert.alert('Success', data.message || 'Subscription cancellation processed');
        return true;
      }
    } catch (err: any) {
      Alert.alert('Error', err.message);
      console.error('Cancel subscription error:', err);
      return false;
    }
  }
}
