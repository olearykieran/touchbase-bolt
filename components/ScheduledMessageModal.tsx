import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { useTheme } from './ThemeProvider';
import { ThemedText } from './ThemedText';
import { X, MessageCircle, Send } from 'lucide-react-native';
import * as SMS from 'expo-sms';
import { Share } from 'react-native';

interface ScheduledMessageModalProps {
  visible: boolean;
  contactName: string;
  contactPhone?: string;
  message: string;
  onClose: () => void;
  onSent: () => void;
}

export default function ScheduledMessageModal({
  visible,
  contactName,
  contactPhone,
  message,
  onClose,
  onSent,
}: ScheduledMessageModalProps) {
  const { colors, colorScheme } = useTheme();
  const [sending, setSending] = useState(false);

  const handleSendMessage = async () => {
    setSending(true);
    try {
      if (contactPhone) {
        const isAvailable = await SMS.isAvailableAsync();
        if (isAvailable) {
          // Open the native SMS composer
          const { result } = await SMS.sendSMSAsync(
            [contactPhone], // Recipients array
            message // Message body
          );
          console.log('SMS Composer Result:', result);
          
          if (result === 'sent') {
            onSent();
            onClose();
          }
        } else {
          // SMS not available on device (e.g., iPad), fallback to Share
          console.warn('SMS not available, falling back to Share.');
          await Share.share({ message });
          onSent();
          onClose();
        }
      } else {
        // No phone number, use Share
        console.warn('No phone number for contact, using Share.');
        await Share.share({ message });
        onSent();
        onClose();
      }
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View
          style={[
            styles.modalContent,
            {
              backgroundColor: colorScheme === 'dark' ? '#1c1c1e' : '#ffffff',
            },
          ]}
        >
          <View style={styles.header}>
            <ThemedText style={styles.title}>Scheduled Message</ThemedText>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.contactInfo}>
            <ThemedText style={[styles.contactName, { color: colors.text }]}>
              To: {contactName}
            </ThemedText>
          </View>

          <View style={[styles.messageContainer, { 
            backgroundColor: colorScheme === 'dark' 
              ? 'rgba(255, 255, 255, 0.05)' 
              : 'rgba(0, 0, 0, 0.05)',
            borderColor: colors.border,
          }]}>
            <MessageCircle size={20} color={colors.accent} />
            <ThemedText style={[styles.messageText, { color: colors.text }]}>
              {message}
            </ThemedText>
          </View>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[
                styles.sendButton,
                {
                  backgroundColor: colors.accent,
                  opacity: sending ? 0.7 : 1,
                },
              ]}
              onPress={handleSendMessage}
              disabled={sending}
            >
              {sending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Send size={20} color="#fff" />
                  <ThemedText style={styles.sendButtonText}>
                    Send Message
                  </ThemedText>
                </>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.cancelButton,
                {
                  borderColor: colors.border,
                },
              ]}
              onPress={onClose}
            >
              <ThemedText style={{ color: colors.text }}>
                Cancel
              </ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    borderRadius: 20,
    padding: 20,
    width: '90%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  contactInfo: {
    marginBottom: 16,
  },
  contactName: {
    fontSize: 16,
    opacity: 0.8,
  },
  messageContainer: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 24,
    gap: 12,
  },
  messageText: {
    fontSize: 16,
    flex: 1,
    lineHeight: 22,
  },
  footer: {
    gap: 12,
  },
  sendButton: {
    flexDirection: 'row',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
});