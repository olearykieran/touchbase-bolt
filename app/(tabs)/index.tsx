import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  Share,
  Linking,
  Platform,
  Alert,
  ActionSheetIOS,
} from 'react-native';
import { useEffect, useState } from 'react';
import {
  Phone,
  Mail,
  Clock,
  MessageCircle,
  Heart,
  Gift,
  PenSquare,
  Trash2,
} from 'lucide-react-native';
import { useContactStore } from '@/lib/store';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '@/lib/supabase';

type LoadingState = {
  contactId: string;
  messageType: 'default' | 'love' | 'gratitude' | 'custom';
};

export default function ContactsScreen() {
  const {
    contacts,
    loading,
    error,
    fetchContacts,
    updateLastContact,
    deleteContact,
  } = useContactStore();
  const [refreshing, setRefreshing] = useState(false);
  const [loadingState, setLoadingState] = useState<LoadingState | null>(null);
  const [customPrompt, setCustomPrompt] = useState('');

  useEffect(() => {
    fetchContacts();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchContacts();
    setRefreshing(false);
  };

  const handleDelete = (contact: any) => {
    Alert.alert(
      'Delete Contact',
      `Are you sure you want to delete ${contact.name}?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteContact(contact.id);
            } catch (error) {
              Alert.alert('Error', 'Failed to delete contact');
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  const handleMessageGeneration = async (
    contact: any,
    messageType: LoadingState['messageType'] = 'default'
  ) => {
    try {
      setLoadingState({ contactId: contact.id, messageType });

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();
      if (sessionError || !session) {
        throw new Error('Please sign in again');
      }

      const response = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/generate-message`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contact: {
              name: contact.name,
              lastContact: contact.last_contact,
              frequency: contact.frequency,
            },
            messageType,
            customPrompt: messageType === 'custom' ? customPrompt : undefined,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate message');
      }

      const { message } = await response.json();

      if (!message) {
        throw new Error('No message was generated');
      }

      await updateLastContact(contact.id);
      await fetchContacts();

      if (Platform.OS === 'web') {
        await Share.share({
          title: 'Message',
          text: message,
        });
      } else {
        if (contact.phone) {
          const smsUrl = `sms:${contact.phone}${
            Platform.OS === 'ios' ? '&' : '?'
          }body=${encodeURIComponent(message)}`;
          const canOpen = await Linking.canOpenURL(smsUrl);

          if (canOpen) {
            await Linking.openURL(smsUrl);
          } else {
            await Share.share({ message });
          }
        } else {
          await Share.share({ message });
        }
      }
    } catch (error: any) {
      console.error('Error generating message:', error);
      Alert.alert(
        'Error',
        'Failed to generate message. Please try again later. ' + error.message
      );
    } finally {
      setLoadingState(null);
      setCustomPrompt('');
    }
  };

  const handlePhonePress = async (phone: string) => {
    if (phone) {
      const phoneUrl = `tel:${phone}`;
      const canOpen = await Linking.canOpenURL(phoneUrl);
      if (canOpen) {
        await Linking.openURL(phoneUrl);
      }
    }
  };

  const handleEmailPress = async (email: string) => {
    if (email) {
      const emailUrl = `mailto:${email}`;
      const canOpen = await Linking.canOpenURL(emailUrl);
      if (canOpen) {
        await Linking.openURL(emailUrl);
      }
    }
  };

  const handleCustomPrompt = (contact: any) => {
    Alert.prompt(
      'Custom Message',
      'Enter a brief prompt for your message (25 chars max):',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Generate',
          onPress: (prompt?: string) => {
            if (prompt && prompt.length <= 25) {
              setCustomPrompt(prompt);
              handleMessageGeneration(contact, 'custom');
            } else {
              Alert.alert('Error', 'Prompt must be 25 characters or less');
            }
          },
        },
      ]
    );
  };

  const showMessageOptions = (contact: any) => {
    const options = [
      'Cancel',
      'Blank Message',
      'Regular Message',
      'Love Message',
      'Gratitude Message',
      'Custom Message',
    ];

    const handleBlankMessage = async (phone: string) => {
      if (Platform.OS === 'ios') {
        const smsUrl = `sms:${phone}`;
        const canOpen = await Linking.canOpenURL(smsUrl);
        if (canOpen) {
          await Linking.openURL(smsUrl);
        }
      } else {
        const smsUrl = `sms:${phone}`;
        await Linking.openURL(smsUrl);
      }
    };

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex: 0,
          title: 'Generate Message',
          message: 'Choose a message type to generate',
        },
        (buttonIndex) => {
          switch (buttonIndex) {
            case 1:
              if (contact.phone) {
                handleBlankMessage(contact.phone);
              }
              break;
            case 2:
              handleMessageGeneration(contact, 'default');
              break;
            case 3:
              handleMessageGeneration(contact, 'love');
              break;
            case 4:
              handleMessageGeneration(contact, 'gratitude');
              break;
            case 5:
              handleCustomPrompt(contact);
              break;
          }
        }
      );
    } else {
      Alert.alert(
        'Generate Message',
        'Choose a message type to generate',
        [
          {
            text: 'Blank Message',
            onPress: () => contact.phone && handleBlankMessage(contact.phone),
          },
          {
            text: 'Regular Message',
            onPress: () => handleMessageGeneration(contact, 'default'),
          },
          {
            text: 'Love Message',
            onPress: () => handleMessageGeneration(contact, 'love'),
          },
          {
            text: 'Gratitude Message',
            onPress: () => handleMessageGeneration(contact, 'gratitude'),
          },
          {
            text: 'Custom Message',
            onPress: () => handleCustomPrompt(contact),
          },
          {
            text: 'Cancel',
            style: 'cancel',
          },
        ],
        { cancelable: true }
      );
    }
  };

  const renderContact = ({ item }) => (
    <TouchableOpacity style={styles.contactCard}>
      <View style={styles.contactInfo}>
        <View style={styles.contactHeader}>
          <Text style={styles.name}>{item.name}</Text>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDelete(item)}
          >
            <Trash2 size={20} color="#FF3B30" />
          </TouchableOpacity>
        </View>
        <View style={styles.contactDetails}>
          {item.phone && <Text style={styles.contactText}>{item.phone}</Text>}
          {item.email && <Text style={styles.contactText}>{item.email}</Text>}
        </View>
        <View style={styles.actionRow}>
          <View style={styles.buttonContainer}>
            <View style={styles.primaryActions}>
              {item.phone && (
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handlePhonePress(item.phone)}
                >
                  <Phone size={20} color="#007AFF" />
                </TouchableOpacity>
              )}
              {item.email && (
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleEmailPress(item.email)}
                >
                  <Mail size={20} color="#007AFF" />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[
                  styles.messageButton,
                  loadingState && styles.messageButtonGenerating,
                ]}
                onPress={() => showMessageOptions(item)}
                disabled={loadingState !== null}
              >
                {loadingState?.contactId === item.id ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <>
                    <MessageCircle size={20} color="white" />
                    <Text style={styles.messageButtonText}>
                      Generate Message
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.nextContact}>
            <Clock size={16} color="#666" />
            <Text style={styles.nextContactText}>
              Next:{' '}
              {formatDistanceToNow(new Date(item.nextContact), {
                addSuffix: true,
              })}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchContacts}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={contacts}
        renderItem={renderContact}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator style={styles.loader} color="#007AFF" />
          ) : (
            <Text style={styles.emptyText}>No contacts yet. Add some!</Text>
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  list: {
    padding: 16,
  },
  contactCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  contactInfo: {
    flex: 1,
  },
  contactHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  contactDetails: {
    marginBottom: 12,
  },
  contactText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  name: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  deleteButton: {
    padding: 8,
  },
  actionRow: {
    marginTop: 12,
  },
  buttonContainer: {
    gap: 8,
  },
  primaryActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  secondaryActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F2F2F7',
  },
  messageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    gap: 6,
    flex: 1,
  },
  messageButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  messageButtonGenerating: {
    opacity: 0.7,
  },
  loveButton: {
    backgroundColor: '#FF2D55',
  },
  gratitudeButton: {
    backgroundColor: '#5856D6',
  },
  customButton: {
    backgroundColor: '#34C759',
  },
  nextContact: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 4,
  },
  nextContactText: {
    fontSize: 14,
    color: '#666',
  },
  loader: {
    marginTop: 32,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 32,
    color: '#666',
    fontSize: 16,
  },
  errorText: {
    color: '#FF3B30',
    marginBottom: 16,
    fontSize: 16,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});
