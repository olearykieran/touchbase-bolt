import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { useTheme } from './ThemeProvider';
import { RevenueCatPaymentService } from '../services/revenueCatPayment';

interface PaywallModalProps {
  visible: boolean;
  onClose: () => void;
  onUpgrade: (plan: 'monthly' | 'yearly') => void;
  errorType?: 'messages' | 'contacts';
}

interface Product {
  productId: string;
  localizedPrice: string;
  title: string;
  description: string;
  identifier?: string;
}

export default function RevenueCatPaywallModal({ visible, onClose, onUpgrade, errorType }: PaywallModalProps) {
  const { colors } = useTheme();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  
  useEffect(() => {
    if (visible) {
      loadProducts();
    }
  }, [visible]);
  
  const loadProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      const loadedProducts = await RevenueCatPaymentService.getProducts();
      setProducts(loadedProducts);
      
      if (loadedProducts.length === 0) {
        setError('No subscription options available. Please check your internet connection.');
      }
    } catch (err) {
      console.error('Error loading products:', err);
      setError('Unable to load subscription options');
    } finally {
      setLoading(false);
    }
  };
  
  const getProductPrice = (type: 'monthly' | 'yearly') => {
    const product = products.find(p => {
      // Match by package type or product ID
      if (p.identifier === (type === 'monthly' ? '$rc_monthly' : '$rc_annual')) {
        return true;
      }
      // Fallback to matching by product ID
      return p.productId.toLowerCase().includes(type);
    });
    return product?.localizedPrice || (type === 'monthly' ? '$4.99/mo' : '$49.99/yr');
  };

  const handlePurchase = async (plan: 'monthly' | 'yearly') => {
    setPurchasing(true);
    try {
      await onUpgrade(plan);
    } finally {
      setPurchasing(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.modal, { backgroundColor: colors.card }]}>  
          <Text style={[styles.title, { color: colors.text }]}>Upgrade to Unlock More!</Text>
          <Text style={[styles.body, { color: colors.secondaryText }]}> 
            {errorType === 'messages'
              ? 'You have reached your free AI messages limit (3/week). Upgrade to send unlimited messages.'
              : errorType === 'contacts'
              ? 'You have reached your free contacts limit (3 contacts). Upgrade to add unlimited contacts.'
              : 'Unlock unlimited contacts and AI messages with KeepTouch Premium.'}
          </Text>
          
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.accent} />
              <Text style={[styles.loadingText, { color: colors.secondaryText }]}>Loading subscription options...</Text>
            </View>
          ) : error ? (
            <View style={styles.errorContainer}>
              <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
              <TouchableOpacity style={[styles.retryButton, { backgroundColor: colors.accent }]} onPress={loadProducts}>
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.plans}>
              <TouchableOpacity 
                style={[styles.planButton, { backgroundColor: colors.accent, opacity: purchasing ? 0.6 : 1 }]} 
                onPress={() => handlePurchase('monthly')}
                disabled={purchasing}
              >
                <Text style={styles.planTitle}>{getProductPrice('monthly')}</Text>
                <Text style={styles.planDesc}>Unlimited AI messages & contacts</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.planButton, { backgroundColor: colors.accent, opacity: purchasing ? 0.6 : 1 }]} 
                onPress={() => handlePurchase('yearly')}
                disabled={purchasing}
              >
                <Text style={styles.planTitle}>{getProductPrice('yearly')}</Text>
                <Text style={styles.planDesc}>Best value - save $10/year</Text>
              </TouchableOpacity>
            </View>
          )}
          
          {purchasing && (
            <View style={styles.purchasingContainer}>
              <ActivityIndicator size="small" color={colors.accent} />
              <Text style={[styles.purchasingText, { color: colors.secondaryText }]}>Processing purchase...</Text>
            </View>
          )}
          
          <TouchableOpacity style={styles.closeButton} onPress={onClose} disabled={purchasing}>
            <Text style={[styles.closeText, { color: colors.accent }]}>Not now</Text>
          </TouchableOpacity>
          
          {Platform.OS === 'ios' && (
            <TouchableOpacity style={styles.restoreButton} onPress={handleRestore} disabled={purchasing}>
              <Text style={[styles.restoreText, { color: colors.secondaryText }]}>Restore Purchases</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
  
  async function handleRestore() {
    setPurchasing(true);
    try {
      const restored = await RevenueCatPaymentService.restorePurchases();
      if (restored) {
        onClose();
      }
    } finally {
      setPurchasing(false);
    }
  }
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    width: '85%',
    borderRadius: 18,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  body: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  plans: {
    width: '100%',
    gap: 12,
    marginBottom: 18,
  },
  planButton: {
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 18,
    marginBottom: 10,
    alignItems: 'center',
  },
  planTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  planDesc: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
    marginTop: 2,
  },
  closeButton: {
    marginTop: 8,
    padding: 8,
  },
  closeText: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  restoreButton: {
    marginTop: 8,
    padding: 8,
  },
  restoreText: {
    fontSize: 14,
    textAlign: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  errorText: {
    fontSize: 14,
    marginBottom: 12,
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
  },
  retryText: {
    color: '#fff',
    fontWeight: '600',
  },
  purchasingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  purchasingText: {
    marginLeft: 8,
    fontSize: 14,
  },
});