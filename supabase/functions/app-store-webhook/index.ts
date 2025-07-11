import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import * as base64 from 'https://deno.land/std@0.168.0/encoding/base64.ts';

// Helper function to get human-readable status messages
function getStatusMessage(status: number): string {
  const statusMessages: Record<number, string> = {
    0: 'Valid receipt',
    21000: 'App Store could not read JSON',
    21002: 'Receipt data property was malformed',
    21003: 'Receipt could not be authenticated',
    21004: 'Shared secret does not match',
    21005: 'Receipt server is not currently available',
    21006: 'Receipt is valid but subscription has expired',
    21007: 'Sandbox receipt sent to production',
    21008: 'Production receipt sent to sandbox',
    21009: 'Internal data access error',
    21010: 'User account not found'
  };
  return statusMessages[status] || `Unknown status: ${status}`;
}

// Environment variables
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

// Apple App Store shared secret for receipt validation
// This should be set in your Supabase secrets
const appleSharedSecret = Deno.env.get('APPLE_SHARED_SECRET')!;

// App Store production verification URL
const verificationUrl = 'https://buy.itunes.apple.com/verifyReceipt';
// Use for sandbox testing: https://sandbox.itunes.apple.com/verifyReceipt

// Product IDs for your subscriptions
const monthlyProductId = Deno.env.get('IOS_MONTHLY_PRODUCT_ID') || 'com.holygrailstudio.boltexponativewind.monthlysub';
const yearlyProductId = Deno.env.get('IOS_YEARLY_PRODUCT_ID') || 'com.holygrailstudio.boltexponativewind.yearlysub';

/**
 * Verify receipt with Apple App Store
 */
async function verifyReceipt(receiptData: string, isProduction = true): Promise<any> {
  try {
    const url = isProduction ? verificationUrl : 'https://sandbox.itunes.apple.com/verifyReceipt';
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        'receipt-data': receiptData,
        'password': appleSharedSecret,
        'exclude-old-transactions': false
      }),
    });

    if (!response.ok) {
      throw new Error(`Receipt verification failed: ${await response.text()}`);
    }

    const result = await response.json();
    
    // Status 21007 means this is a sandbox receipt, try sandbox environment
    if (result.status === 21007 && isProduction) {
      console.log('Detected sandbox receipt, retrying with sandbox environment');
      return verifyReceipt(receiptData, false);
    }
    
    // Log any non-zero status for debugging
    if (result.status !== 0) {
      console.error(`Receipt validation returned status ${result.status}:`, getStatusMessage(result.status));
    }
    
    return result;
  } catch (error) {
    console.error('Error verifying receipt:', error);
    throw error;
  }
}

/**
 * Update user subscription in database
 */
async function updateUserSubscription(
  userId: string, 
  status: 'monthly' | 'yearly' | 'free',
  expiresDate: string | null
): Promise<void> {
  console.log(`Updating user ${userId} subscription to ${status}, expires: ${expiresDate}`);
  
  try {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update({
        subscription_status: status,
        subscription_start: new Date().toISOString(),
        subscription_end: expiresDate,
        // Reset counters since this is a premium account
        weekly_message_count: 0,
        last_message_reset: new Date().toISOString(),
      })
      .eq('id', userId)
      .select();

    if (error) {
      console.error('Error updating subscription in database:', error);
      throw error;
    }
    
    if (!data || data.length === 0) {
      console.error(`No profile found for user ID: ${userId}`);
      throw new Error(`Profile not found for user: ${userId}`);
    }
    
    console.log('Successfully updated subscription for user:', userId, 'Updated data:', data[0]);
  } catch (error) {
    console.error('Exception during database update:', error);
    throw error;
  }
}

/**
 * Handle server-to-server notification from App Store
 */
async function handleAppStoreNotification(payload: any): Promise<void> {
  // Handle different notification types
  // https://developer.apple.com/documentation/appstoreservernotifications/notificationtype
  const notificationType = payload.notification_type;
  
  console.log('Processing notification:', notificationType);
  
  switch (notificationType) {
    case 'INITIAL_BUY':
    case 'INTERACTIVE_RENEWAL':
    case 'DID_RENEW':
      // A new purchase or subscription renewal
      await processSubscriptionPurchase(payload);
      break;
      
    case 'CANCEL':
      // Subscription was canceled by Apple customer support
      await processSubscriptionCancellation(payload);
      break;
      
    case 'DID_FAIL_TO_RENEW':
      // Subscription failed to renew due to billing issue
      console.log('Subscription failed to renew:', payload);
      break;
      
    case 'PRICE_INCREASE_CONSENT':
    case 'REFUND':
    case 'REVOKE':
    case 'CONSUMPTION_REQUEST':
    default:
      console.log(`Unhandled notification type: ${notificationType}`);
      break;
  }
}

/**
 * Process a subscription purchase/renewal
 */
async function processSubscriptionPurchase(payload: any): Promise<void> {
  try {
    // Extract the receipt data
    const receiptData = payload.unified_receipt?.latest_receipt;
    if (!receiptData) {
      console.error('No receipt data found in notification');
      return;
    }
    
    // Verify receipt with Apple
    const verificationResult = await verifyReceipt(receiptData);
    
    if (verificationResult.status !== 0) {
      console.error(`Receipt verification failed: ${verificationResult.status}`);
      return;
    }
    
    // Process the latest receipt info
    const latestReceiptInfo = verificationResult.latest_receipt_info;
    if (!latestReceiptInfo || latestReceiptInfo.length === 0) {
      console.error('No latest receipt info found');
      return;
    }
    
    // Get the most recent transaction
    const latestTransaction = latestReceiptInfo.sort((a: any, b: any) => 
      parseInt(b.purchase_date_ms) - parseInt(a.purchase_date_ms)
    )[0];
    
    // Extract user ID from the original transaction - needs to be set during purchase
    const metadata = JSON.parse(latestTransaction.original_transaction_id || '{}');
    const userId = metadata.user_id || latestTransaction.original_transaction_id;
    
    if (!userId) {
      console.error('No user ID found in transaction');
      return;
    }
    
    // Determine subscription type based on product ID
    let subscriptionType: 'monthly' | 'yearly' = 'monthly';
    if (latestTransaction.product_id === yearlyProductId) {
      subscriptionType = 'yearly';
    }
    
    // Calculate expiration date
    const expiresDateMs = parseInt(latestTransaction.expires_date_ms);
    const expiresDate = expiresDateMs ? new Date(expiresDateMs).toISOString() : null;
    
    // Update user subscription in database
    await updateUserSubscription(userId, subscriptionType, expiresDate);
    
  } catch (error) {
    console.error('Error processing subscription purchase:', error);
  }
}

/**
 * Process a subscription cancellation
 */
async function processSubscriptionCancellation(payload: any): Promise<void> {
  try {
    // Extract transaction info
    const metadata = JSON.parse(payload.auto_renew_status_change_date_ms || '{}');
    const userId = metadata.user_id;
    
    if (!userId) {
      console.error('No user ID found in cancellation');
      return;
    }
    
    // Update subscription to free (will take effect after current period)
    await updateUserSubscription(userId, 'free', null);
    
  } catch (error) {
    console.error('Error processing subscription cancellation:', error);
  }
}

/**
 * Process receipt data directly from the app
 */
async function processAppReceipt(receiptData: string, userId: string): Promise<any> {
  try {
    console.log(`Processing receipt for user: ${userId}`);
    console.log(`Receipt data length: ${receiptData?.length || 0}`);
    
    // Verify receipt with Apple
    const verificationResult = await verifyReceipt(receiptData);
    
    if (verificationResult.status !== 0) {
      console.error(`Receipt verification failed with status: ${verificationResult.status}`);
      console.error(`Verification result:`, JSON.stringify(verificationResult).substring(0, 500));
      return {
        success: false,
        message: `Receipt verification failed: ${verificationResult.status}`,
        status: verificationResult.status
      };
    }
    
    // Process the receipt info
    const latestReceiptInfo = verificationResult.latest_receipt_info;
    if (!latestReceiptInfo || latestReceiptInfo.length === 0) {
      return {
        success: false,
        message: 'No receipt information found'
      };
    }
    
    // Get the most recent transaction
    const latestTransaction = latestReceiptInfo.sort((a: any, b: any) => 
      parseInt(b.purchase_date_ms) - parseInt(a.purchase_date_ms)
    )[0];
    
    // Determine subscription type based on product ID
    let subscriptionType: 'monthly' | 'yearly' = 'monthly';
    if (latestTransaction.product_id === yearlyProductId) {
      subscriptionType = 'yearly';
    }
    
    // Calculate expiration date
    const expiresDateMs = parseInt(latestTransaction.expires_date_ms);
    const expiresDate = expiresDateMs ? new Date(expiresDateMs).toISOString() : null;
    
    // Update user subscription in database
    await updateUserSubscription(userId, subscriptionType, expiresDate);
    
    return {
      success: true,
      subscriptionType,
      expiresDate,
      transaction: latestTransaction
    };
    
  } catch (error) {
    console.error('Error processing app receipt:', error);
    return {
      success: false,
      message: error.message
    };
  }
}

// Main server function
serve(async (req: Request) => {
  console.log('--- App Store webhook received ---');
  
  try {
    // Handle different request methods
    if (req.method === 'POST') {
      const contentType = req.headers.get('content-type') || '';
      
      // App Store server notifications come as JSON
      if (contentType.includes('application/json')) {
        const payload = await req.json();
        console.log('Received App Store notification:', JSON.stringify(payload).substring(0, 200) + '...');
        
        // Process the notification
        await handleAppStoreNotification(payload);
        
        return new Response(JSON.stringify({ received: true }), { 
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // Direct receipt validation from the app
      else if (contentType.includes('application/x-www-form-urlencoded')) {
        const body = await req.text();
        const params = new URLSearchParams(body);
        const receiptData = params.get('receipt-data');
        const userId = params.get('user-id');
        
        if (!receiptData || !userId) {
          return new Response(JSON.stringify({ 
            error: 'Missing receipt data or user ID' 
          }), { 
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        
        // Process the receipt
        const result = await processAppReceipt(receiptData, userId);
        
        return new Response(JSON.stringify(result), { 
          status: result.success ? 200 : 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
    
    // For GET requests, return a simple status page
    if (req.method === 'GET') {
      return new Response(JSON.stringify({ 
        status: 'App Store webhook is active' 
      }), { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Any other method is not allowed
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { 
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Unexpected error in webhook handler:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});
