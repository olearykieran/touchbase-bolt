import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import * as IAP from 'react-native-iap';
import { PaymentService } from '../services/payment';
import Constants from 'expo-constants';
import { supabase } from '../lib/supabase';
import { useTheme } from './ThemeProvider';
import { X, RefreshCw, Trash2, AlertCircle, CheckCircle } from 'lucide-react-native';

interface DebugInfo {
  iapAvailable: boolean;
  products: any[];
  pendingTransactions: any[];
  purchaseHistory: any[];
  availablePurchases: any[];
  subscriptionStatus: string;
  errors: string[];
}

export function SubscriptionDebugModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { colors } = useTheme();
  const [loading, setLoading] = useState(false);
  const [debugInfo, setDebugInfo] = useState<DebugInfo>({
    iapAvailable: false,
    products: [],
    pendingTransactions: [],
    purchaseHistory: [],
    availablePurchases: [],
    subscriptionStatus: 'Unknown',
    errors: [],
  });

  useEffect(() => {
    if (visible) {
      loadDebugInfo();
    }
  }, [visible]);

  const loadDebugInfo = async () => {
    setLoading(true);
    const errors: string[] = [];
    
    try {
      // Check IAP availability
      const iapAvailable = PaymentService.isIAPAvailable;
      
      // Load products
      let products: any[] = [];
      try {
        products = await PaymentService.getProducts();
      } catch (error: any) {
        errors.push(`Product loading error: ${error.message}`);
      }

      // Check pending transactions
      let pendingTransactions: any[] = [];
      try {
        pendingTransactions = await IAP.getAvailablePurchases();
        console.log('[Debug] Pending transactions:', pendingTransactions);
      } catch (error: any) {
        errors.push(`Pending transactions error: ${error.message}`);
      }

      // Get purchase history
      let purchaseHistory: any[] = [];
      try {
        purchaseHistory = await IAP.getPurchaseHistory();
        console.log('[Debug] Purchase history:', purchaseHistory);
      } catch (error: any) {
        errors.push(`Purchase history error: ${error.message}`);
      }

      // Check subscription status from Supabase
      let subscriptionStatus = 'Unknown';
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const { data, error } = await supabase
            .from('profiles')
            .select('subscription_status, subscription_end')
            .eq('id', session.user.id)
            .single();
          
          if (data) {
            subscriptionStatus = `${data.subscription_status}${data.subscription_end ? ` (expires: ${new Date(data.subscription_end).toLocaleDateString()})` : ''}`;
          }
        }
      } catch (error: any) {
        errors.push(`Subscription status error: ${error.message}`);
      }

      setDebugInfo({
        iapAvailable,
        products,
        pendingTransactions,
        purchaseHistory: purchaseHistory.slice(0, 5), // Last 5 for brevity
        availablePurchases: pendingTransactions,
        subscriptionStatus,
        errors,
      });
    } catch (error: any) {
      errors.push(`General error: ${error.message}`);
      setDebugInfo(prev => ({ ...prev, errors }));
    } finally {
      setLoading(false);
    }
  };

  const clearPendingTransactions = async () => {
    Alert.alert(
      'Clear Pending Transactions',
      'This will attempt to finish all pending transactions. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              const pending = await IAP.getAvailablePurchases();
              console.log(`[Debug] Found ${pending.length} pending transactions`);
              
              for (const purchase of pending) {
                try {
                  console.log(`[Debug] Finishing transaction: ${purchase.productId}`);
                  await IAP.finishTransaction({ 
                    purchase,
                    isConsumable: false,
                  });
                } catch (error) {
                  console.error(`[Debug] Error finishing transaction:`, error);
                }
              }
              
              Alert.alert('Success', `Cleared ${pending.length} pending transactions`);
              await loadDebugInfo();
            } catch (error: any) {
              Alert.alert('Error', error.message);
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const testReceiptValidation = async () => {
    setLoading(true);
    try {
      const purchases = await IAP.getPurchaseHistory();
      if (purchases && purchases.length > 0) {
        const latestPurchase = purchases[0];
        if (latestPurchase.transactionReceipt) {
          // Test validation with our webhook
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) {
            Alert.alert('Error', 'Please sign in first');
            return;
          }

          const params = new URLSearchParams();
          params.append('receipt-data', latestPurchase.transactionReceipt);
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

          const result = await response.json();
          Alert.alert(
            'Receipt Validation Result',
            JSON.stringify(result, null, 2).substring(0, 500)
          );
        } else {
          Alert.alert('No Receipt', 'No receipt found in latest purchase');
        }
      } else {
        Alert.alert('No Purchases', 'No purchase history found');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const reInitializeIAP = async () => {
    setLoading(true);
    try {
      await PaymentService.endConnection();
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait a bit
      await PaymentService.initialize();
      Alert.alert('Success', 'IAP re-initialized');
      await loadDebugInfo();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        {/* Header */}
        <View style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: 16,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}>
          <Text style={{ fontSize: 20, fontWeight: 'bold', color: colors.text }}>
            Subscription Debug Info
          </Text>
          <TouchableOpacity onPress={onClose}>
            <X size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <ScrollView style={{ flex: 1, padding: 16 }}>
          {loading && (
            <ActivityIndicator size="large" color={colors.accent} style={{ marginVertical: 20 }} />
          )}

          {/* IAP Status */}
          <View style={{ marginBottom: 20 }}>
            <Text style={{ fontSize: 16, fontWeight: 'bold', color: colors.text, marginBottom: 8 }}>
              IAP Status
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              {debugInfo.iapAvailable ? (
                <CheckCircle size={20} color="#10b981" />
              ) : (
                <AlertCircle size={20} color="#ef4444" />
              )}
              <Text style={{ marginLeft: 8, color: colors.text }}>
                IAP Available: {String(debugInfo.iapAvailable)}
              </Text>
            </View>
            <Text style={{ color: colors.secondaryText, marginTop: 4 }}>
              Subscription Status: {debugInfo.subscriptionStatus}
            </Text>
          </View>

          {/* Products */}
          <View style={{ marginBottom: 20 }}>
            <Text style={{ fontSize: 16, fontWeight: 'bold', color: colors.text, marginBottom: 8 }}>
              Products ({debugInfo.products.length})
            </Text>
            {debugInfo.products.map((product, index) => (
              <View key={index} style={{
                backgroundColor: colors.card,
                padding: 12,
                borderRadius: 8,
                marginBottom: 8,
              }}>
                <Text style={{ color: colors.text, fontWeight: '500' }}>{product.productId}</Text>
                <Text style={{ color: colors.secondaryText }}>{product.title}</Text>
                <Text style={{ color: colors.accent }}>{product.localizedPrice}</Text>
              </View>
            ))}
            {debugInfo.products.length === 0 && (
              <Text style={{ color: colors.error }}>
                No products loaded - Check App Store Connect configuration
              </Text>
            )}
          </View>

          {/* Pending Transactions */}
          <View style={{ marginBottom: 20 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text style={{ fontSize: 16, fontWeight: 'bold', color: colors.text }}>
                Pending Transactions ({debugInfo.pendingTransactions.length})
              </Text>
              {debugInfo.pendingTransactions.length > 0 && (
                <TouchableOpacity onPress={clearPendingTransactions}>
                  <Trash2 size={20} color={colors.error} />
                </TouchableOpacity>
              )}
            </View>
            {debugInfo.pendingTransactions.map((transaction, index) => (
              <View key={index} style={{
                backgroundColor: colors.card,
                padding: 12,
                borderRadius: 8,
                marginBottom: 8,
                borderWidth: 1,
                borderColor: colors.error,
              }}>
                <Text style={{ color: colors.text }}>{transaction.productId}</Text>
                <Text style={{ color: colors.secondaryText }}>
                  {new Date(transaction.transactionDate).toLocaleString()}
                </Text>
              </View>
            ))}
            {debugInfo.pendingTransactions.length === 0 && (
              <Text style={{ color: colors.secondaryText }}>No pending transactions</Text>
            )}
          </View>

          {/* Purchase History */}
          <View style={{ marginBottom: 20 }}>
            <Text style={{ fontSize: 16, fontWeight: 'bold', color: colors.text, marginBottom: 8 }}>
              Recent Purchase History
            </Text>
            {debugInfo.purchaseHistory.map((purchase, index) => (
              <View key={index} style={{
                backgroundColor: colors.card,
                padding: 12,
                borderRadius: 8,
                marginBottom: 8,
              }}>
                <Text style={{ color: colors.text }}>{purchase.productId}</Text>
                <Text style={{ color: colors.secondaryText }}>
                  {new Date(purchase.transactionDate).toLocaleString()}
                </Text>
              </View>
            ))}
            {debugInfo.purchaseHistory.length === 0 && (
              <Text style={{ color: colors.secondaryText }}>No purchase history</Text>
            )}
          </View>

          {/* Errors */}
          {debugInfo.errors.length > 0 && (
            <View style={{ marginBottom: 20 }}>
              <Text style={{ fontSize: 16, fontWeight: 'bold', color: colors.error, marginBottom: 8 }}>
                Errors
              </Text>
              {debugInfo.errors.map((error, index) => (
                <Text key={index} style={{ color: colors.error, marginBottom: 4 }}>
                  • {error}
                </Text>
              ))}
            </View>
          )}

          {/* Actions */}
          <View style={{ marginBottom: 40 }}>
            <Text style={{ fontSize: 16, fontWeight: 'bold', color: colors.text, marginBottom: 8 }}>
              Debug Actions
            </Text>
            
            <TouchableOpacity
              onPress={loadDebugInfo}
              style={{
                backgroundColor: colors.accent,
                padding: 16,
                borderRadius: 8,
                marginBottom: 12,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              disabled={loading}
            >
              <RefreshCw size={20} color="white" />
              <Text style={{ color: 'white', fontWeight: 'bold', marginLeft: 8 }}>
                Refresh Debug Info
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={testReceiptValidation}
              style={{
                backgroundColor: '#3b82f6',
                padding: 16,
                borderRadius: 8,
                marginBottom: 12,
                alignItems: 'center',
              }}
              disabled={loading}
            >
              <Text style={{ color: 'white', fontWeight: 'bold' }}>
                Test Receipt Validation
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={reInitializeIAP}
              style={{
                backgroundColor: '#f59e0b',
                padding: 16,
                borderRadius: 8,
                marginBottom: 12,
                alignItems: 'center',
              }}
              disabled={loading}
            >
              <Text style={{ color: 'white', fontWeight: 'bold' }}>
                Re-initialize IAP
              </Text>
            </TouchableOpacity>

            {debugInfo.pendingTransactions.length > 0 && (
              <TouchableOpacity
                onPress={clearPendingTransactions}
                style={{
                  backgroundColor: colors.error,
                  padding: 16,
                  borderRadius: 8,
                  alignItems: 'center',
                }}
                disabled={loading}
              >
                <Text style={{ color: 'white', fontWeight: 'bold' }}>
                  Clear All Pending Transactions
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}