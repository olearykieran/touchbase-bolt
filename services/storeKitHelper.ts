import * as IAP from 'react-native-iap';

export class StoreKitHelper {
  private static clearingInProgress = false;
  
  // Nuclear option - clear all pending transactions
  static async clearAllPendingTransactions() {
    // Prevent multiple simultaneous clears
    if (this.clearingInProgress) {
      console.log('[StoreKit] Clear already in progress, skipping...');
      return { cleared: 0, total: 0 };
    }
    
    this.clearingInProgress = true;
    
    try {
      console.log('[StoreKit] Attempting to clear all pending transactions...');
      
      // First, disconnect and reconnect to force StoreKit to refresh
      try {
        await IAP.endConnection();
        console.log('[StoreKit] Disconnected from StoreKit');
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
        await IAP.initConnection();
        console.log('[StoreKit] Reconnected to StoreKit');
      } catch (error) {
        console.error('[StoreKit] Error reconnecting:', error);
      }
      
      // Get all pending purchases
      const pending = await IAP.getAvailablePurchases();
      console.log(`[StoreKit] Found ${pending.length} pending transactions`);
      
      let cleared = 0;
      const transactionIds = new Set<string>();
      
      for (const purchase of pending) {
        try {
          // Skip if we already processed this transaction ID
          if (transactionIds.has(purchase.transactionId)) {
            console.log(`[StoreKit] Skipping duplicate transaction: ${purchase.transactionId}`);
            continue;
          }
          
          transactionIds.add(purchase.transactionId);
          console.log(`[StoreKit] Clearing transaction: ${purchase.productId} - ${purchase.transactionId}`);
          
          // Force finish with both methods
          await IAP.finishTransaction({ 
            purchase,
            isConsumable: false,
          });
          
          // Also try acknowledge if available
          if (IAP.acknowledgePurchaseAndroid) {
            try {
              await IAP.acknowledgePurchaseAndroid({
                token: purchase.purchaseToken || purchase.transactionId,
              });
            } catch (e) {
              // Ignore, this is Android-only
            }
          }
          
          cleared++;
        } catch (error) {
          console.error(`[StoreKit] Error clearing transaction ${purchase.transactionId}:`, error);
        }
      }
      
      console.log(`[StoreKit] Cleared ${cleared} of ${pending.length} transactions`);
      return { cleared, total: pending.length };
    } catch (error) {
      console.error('[StoreKit] Error getting pending transactions:', error);
      throw error;
    } finally {
      this.clearingInProgress = false;
    }
  }
  
  // Clear specific product transactions
  static async clearProductTransactions(productId: string) {
    try {
      const pending = await IAP.getAvailablePurchases();
      const productTransactions = pending.filter(p => p.productId === productId);
      
      console.log(`[StoreKit] Found ${productTransactions.length} transactions for ${productId}`);
      
      for (const purchase of productTransactions) {
        try {
          await IAP.finishTransaction({ 
            purchase,
            isConsumable: false,
          });
          console.log(`[StoreKit] Cleared transaction: ${purchase.transactionId}`);
        } catch (error) {
          console.error(`[StoreKit] Error clearing transaction:`, error);
        }
      }
      
      return productTransactions.length;
    } catch (error) {
      console.error('[StoreKit] Error clearing product transactions:', error);
      throw error;
    }
  }
}