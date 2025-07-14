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
import { RevenueCatPaymentService } from '../services/revenueCatPayment';
import Purchases from 'react-native-purchases';
import { StoreKitHelper } from '../services/storeKitHelper';
import Constants from 'expo-constants';
import { supabase } from '../lib/supabase';
import { useTheme } from './ThemeProvider';
import { X, RefreshCw, Trash2, AlertCircle, CheckCircle } from 'lucide-react-native';

interface DebugInfo {
  iapAvailable: boolean;
  products: any[];
  pendingTransactions: any[];
  customerInfo: any;
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
    customerInfo: null,
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
      const iapAvailable = RevenueCatPaymentService.isConfigured;
      
      // Load products
      let products: any[] = [];
      try {
        products = await RevenueCatPaymentService.getProducts();
      } catch (error: any) {
        errors.push(`Product loading error: ${error.message}`);
      }

      // Get customer info from RevenueCat
      let customerInfo: any = null;
      let pendingTransactions: any[] = [];
      try {
        customerInfo = await Purchases.getCustomerInfo();
        console.log('[Debug] Customer info:', customerInfo);
        
        // Extract pending transactions from customer info if any
        if (customerInfo.nonConsumablePurchases) {
          pendingTransactions = customerInfo.nonConsumablePurchases;
        }
      } catch (error: any) {
        errors.push(`Customer info error: ${error.message}`);
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
        customerInfo,
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

  const syncPendingPurchases = async () => {
    Alert.alert(
      'Sync Pending Purchases',
      'This will sync all pending purchases with the App Store and clear stuck transactions. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sync',
          style: 'default',
          onPress: async () => {
            setLoading(true);
            try {
              await RevenueCatPaymentService.syncPendingPurchases();
              Alert.alert('Success', 'Purchases synced successfully');
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

  const restorePurchases = async () => {
    setLoading(true);
    try {
      const restored = await RevenueCatPaymentService.restorePurchases();
      if (restored) {
        Alert.alert('Success', 'Purchases restored successfully');
      } else {
        Alert.alert('Info', 'No purchases to restore');
      }
      await loadDebugInfo();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const reInitializeRevenueCat = async () => {
    setLoading(true);
    try {
      // RevenueCat doesn't need to be re-initialized, but we can sync purchases
      await RevenueCatPaymentService.syncPendingPurchases();
      Alert.alert('Success', 'RevenueCat synced');
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
                <TouchableOpacity onPress={syncPendingPurchases}>
                  <RefreshCw size={20} color={colors.accent} />
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

          {/* Customer Info */}
          <View style={{ marginBottom: 20 }}>
            <Text style={{ fontSize: 16, fontWeight: 'bold', color: colors.text, marginBottom: 8 }}>
              RevenueCat Customer Info
            </Text>
            {debugInfo.customerInfo ? (
              <View style={{
                backgroundColor: colors.card,
                padding: 12,
                borderRadius: 8,
              }}>
                <Text style={{ color: colors.text }}>Customer ID: {debugInfo.customerInfo.originalAppUserId}</Text>
                <Text style={{ color: colors.secondaryText }}>
                  Active Entitlements: {Object.keys(debugInfo.customerInfo.entitlements.active || {}).length}
                </Text>
                {Object.entries(debugInfo.customerInfo.entitlements.active || {}).map(([key, value]: [string, any]) => (
                  <Text key={key} style={{ color: colors.accent, marginTop: 4 }}>
                    • {key}: {value.productIdentifier}
                  </Text>
                ))}
              </View>
            ) : (
              <Text style={{ color: colors.secondaryText }}>No customer info available</Text>
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
              onPress={restorePurchases}
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
                Restore Purchases
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={syncPendingPurchases}
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
                Sync Pending Purchases
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={reInitializeRevenueCat}
              style={{
                backgroundColor: colors.success || '#10b981',
                padding: 16,
                borderRadius: 8,
                alignItems: 'center',
                marginBottom: 12,
              }}
              disabled={loading}
            >
              <Text style={{ color: 'white', fontWeight: 'bold' }}>
                Re-sync RevenueCat
              </Text>
            </TouchableOpacity>

            {/* Nuclear option for stuck transactions */}
            <TouchableOpacity
              onPress={async () => {
                Alert.alert(
                  'Clear All StoreKit Transactions',
                  'This will forcefully clear ALL pending transactions in StoreKit. This is a nuclear option for when transactions are stuck. Continue?',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Clear All',
                      style: 'destructive',
                      onPress: async () => {
                        setLoading(true);
                        try {
                          const result = await StoreKitHelper.clearAllPendingTransactions();
                          Alert.alert('Success', `Cleared ${result.cleared} of ${result.total} transactions`);
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
              }}
              style={{
                backgroundColor: colors.error,
                padding: 16,
                borderRadius: 8,
                alignItems: 'center',
              }}
              disabled={loading}
            >
              <Text style={{ color: 'white', fontWeight: 'bold' }}>
                ⚠️ Clear ALL StoreKit Transactions
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}