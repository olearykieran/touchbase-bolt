import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Linking, Platform, ActivityIndicator } from 'react-native';
import { useTheme } from './ThemeProvider';
import { PaymentService } from '../services/payment';

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
}

export default function PaywallModal({ visible, onClose, onUpgrade, errorType }: PaywallModalProps) {
  const { colors } = useTheme();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    if (visible) {
      loadProducts();
    }
  }, [visible]);
  
  const loadProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      const loadedProducts = await PaymentService.getProducts();
      setProducts(loadedProducts);
    } catch (err) {
      console.error('Error loading products:', err);
      setError('Unable to load subscription options');
    } finally {
      setLoading(false);
    }
  };
  
  const getProductPrice = (type: 'monthly' | 'yearly') => {
    const product = products.find(p => 
      p.productId.toLowerCase().includes(type)
    );
    return product?.localizedPrice || (type === 'monthly' ? '$4.99/mo' : '$49.99/yr');
  };
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.modal, { backgroundColor: colors.card }]}>  
          <Text style={[styles.title, { color: colors.text }]}>Upgrade to Unlock More!</Text>
          <Text style={[styles.body, { color: colors.secondaryText }]}> 
            {errorType === 'messages'
              ? 'You have reached your free AI messages limit (3/week). Upgrade to send unlimited messages.'
              : 'You have reached your free contacts limit (3 contacts). Upgrade to add unlimited contacts.'}
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
              <TouchableOpacity style={[styles.planButton, { backgroundColor: colors.accent }]} onPress={() => onUpgrade('monthly')}>
                <Text style={styles.planTitle}>{getProductPrice('monthly')}</Text>
                <Text style={styles.planDesc}>Unlimited AI messages & contacts</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.planButton, { backgroundColor: colors.accent }]} onPress={() => onUpgrade('yearly')}>
                <Text style={styles.planTitle}>{getProductPrice('yearly')}</Text>
                <Text style={styles.planDesc}>Best value - save $10/year</Text>
              </TouchableOpacity>
            </View>
          )}
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={[styles.closeText, { color: colors.accent }]}>Not now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
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
});
