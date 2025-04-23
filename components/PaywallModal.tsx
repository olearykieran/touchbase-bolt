import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Linking, Platform } from 'react-native';
import { useTheme } from './ThemeProvider';

interface PaywallModalProps {
  visible: boolean;
  onClose: () => void;
  onUpgrade: (plan: 'monthly' | 'yearly') => void;
  errorType?: 'messages' | 'contacts';
}

export default function PaywallModal({ visible, onClose, onUpgrade, errorType }: PaywallModalProps) {
  const { colors } = useTheme();
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
          <View style={styles.plans}>
            <TouchableOpacity style={[styles.planButton, { backgroundColor: colors.accent }]} onPress={() => onUpgrade('monthly')}>
              <Text style={styles.planTitle}>$2.99/mo</Text>
              <Text style={styles.planDesc}>Unlimited AI messages & contacts</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.planButton, { backgroundColor: colors.accent }]} onPress={() => onUpgrade('yearly')}>
              <Text style={styles.planTitle}>$12.99/yr</Text>
              <Text style={styles.planDesc}>Save 64% vs monthly</Text>
            </TouchableOpacity>
          </View>
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
});
