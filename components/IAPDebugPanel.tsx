import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import * as IAP from 'react-native-iap';
import { PaymentService } from '../services/payment';
import Constants from 'expo-constants';

export function IAPDebugPanel({ visible }: { visible: boolean }) {
  const [debugInfo, setDebugInfo] = useState<any>({});
  const [products, setProducts] = useState<any[]>([]);

  useEffect(() => {
    if (visible) {
      loadDebugInfo();
    }
  }, [visible]);

  const loadDebugInfo = async () => {
    try {
      const EXTRA = Constants.expoConfig?.extra as Record<string, string>;
      const info = {
        monthlyProductId: EXTRA.iosMonthlyProductId || 'com.holygrailstudio.boltexponativewind.monthlysub',
        yearlyProductId: EXTRA.iosYearlyProductId || 'com.holygrailstudio.boltexponativewind.yearlysub',
        supabaseUrl: EXTRA.supabaseUrl,
        iapAvailable: PaymentService.isIAPAvailable,
        environment: __DEV__ ? 'development' : 'production',
      };

      setDebugInfo(info);

      // Try to load products
      const prods = await PaymentService.getProducts();
      setProducts(prods);
    } catch (error: any) {
      setDebugInfo(prev => ({ ...prev, error: error.message }));
    }
  };

  const testPurchaseHistory = async () => {
    try {
      const history = await IAP.getPurchaseHistory();
      Alert.alert('Purchase History', JSON.stringify(history, null, 2).substring(0, 500));
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const testAvailablePurchases = async () => {
    try {
      const purchases = await IAP.getAvailablePurchases();
      Alert.alert('Available Purchases', JSON.stringify(purchases, null, 2).substring(0, 500));
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  if (!visible) return null;

  return (
    <ScrollView className="bg-gray-100 dark:bg-gray-900 p-4">
      <Text className="text-lg font-bold mb-4 text-gray-900 dark:text-gray-100">IAP Debug Info</Text>
      
      <View className="bg-white dark:bg-gray-800 p-3 rounded mb-3">
        <Text className="font-semibold text-gray-900 dark:text-gray-100">Configuration:</Text>
        <Text className="text-sm text-gray-600 dark:text-gray-400">Monthly ID: {debugInfo.monthlyProductId}</Text>
        <Text className="text-sm text-gray-600 dark:text-gray-400">Yearly ID: {debugInfo.yearlyProductId}</Text>
        <Text className="text-sm text-gray-600 dark:text-gray-400">IAP Available: {String(debugInfo.iapAvailable)}</Text>
        <Text className="text-sm text-gray-600 dark:text-gray-400">Environment: {debugInfo.environment}</Text>
      </View>

      <View className="bg-white dark:bg-gray-800 p-3 rounded mb-3">
        <Text className="font-semibold text-gray-900 dark:text-gray-100">Products ({products.length}):</Text>
        {products.map((p, i) => (
          <View key={i} className="mt-2">
            <Text className="text-sm text-gray-600 dark:text-gray-400">ID: {p.productId}</Text>
            <Text className="text-sm text-gray-600 dark:text-gray-400">Price: {p.localizedPrice}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity
        onPress={testPurchaseHistory}
        className="bg-blue-500 p-3 rounded mb-2"
      >
        <Text className="text-white text-center">Test Purchase History</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={testAvailablePurchases}
        className="bg-blue-500 p-3 rounded mb-2"
      >
        <Text className="text-white text-center">Test Available Purchases</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={loadDebugInfo}
        className="bg-gray-500 p-3 rounded"
      >
        <Text className="text-white text-center">Refresh Debug Info</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}