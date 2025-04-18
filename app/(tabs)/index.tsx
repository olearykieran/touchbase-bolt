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
  Modal,
  TextInput,
} from 'react-native';
import { useEffect, useState, useCallback } from 'react';
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
import {
  formatDistanceToNow,
  format,
  differenceInCalendarDays,
  addYears,
  isBefore,
  isPast,
  parseISO,
} from 'date-fns';
import { supabase } from '@/lib/supabase';
import React from 'react';
import { useTheme } from '../../components/ThemeProvider';
import EditContactModal from '../../components/EditContactModal';

// Define types if they are not already globally defined
interface ContactItem {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  birthday?: string;
  nextContact: string | Date; // Allow string from DB or Date object
  streak?: number; // Make streak optional if not always present initially
  last_contact: string | Date; // Add missing field
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly'; // Add missing field
}

type LoadingState = {
  contactId: string;
  messageType: 'default' | 'love' | 'gratitude' | 'custom' | 'birthday';
};

// Move CustomPromptModal outside the main component
const CustomPromptModal = ({
  visible,
  onClose,
  onSubmit,
  prompt,
  onChangePrompt,
}: {
  visible: boolean;
  onClose: () => void;
  onSubmit: () => void;
  prompt: string;
  onChangePrompt: (text: string) => void;
}) => (
  <Modal
    visible={visible}
    transparent
    animationType="fade"
    onRequestClose={onClose}
  >
    <View style={styles.modalOverlay}>
      <View style={styles.modalContent}>
        <Text style={styles.modalTitle}>Custom Message</Text>
        <Text style={styles.modalSubtitle}>
          Enter a brief prompt for your message:
        </Text>
        <TextInput
          style={styles.promptInput}
          value={prompt}
          onChangeText={onChangePrompt}
          maxLength={50}
          placeholder="Type your prompt here..."
          autoFocus
        />
        <Text style={styles.characterCount}>{prompt.length}/50 characters</Text>
        <View style={styles.modalButtons}>
          <TouchableOpacity
            style={[styles.modalButton, styles.cancelButton]}
            onPress={onClose}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modalButton, styles.generateButton]}
            onPress={onSubmit}
            disabled={!prompt}
          >
            <Text style={styles.generateButtonText}>Generate</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  </Modal>
);

// Helper to calculate days until next birthday
function getBirthdayCountdown(birthdayStr: string | undefined): number | null {
  if (!birthdayStr) return null;
  const today = new Date();
  let birthday = parseISO(birthdayStr);
  // Set birthday to this year
  birthday.setFullYear(today.getFullYear());
  // If birthday already passed this year, use next year
  if (isBefore(birthday, today)) {
    birthday = addYears(birthday, 1);
  }
  const days = differenceInCalendarDays(birthday, today);
  return days;
}

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
  const [isCustomPromptModalVisible, setIsCustomPromptModalVisible] =
    useState(false);
  const [selectedContact, setSelectedContact] = useState<ContactItem | null>(
    null
  );
  const [tempPrompt, setTempPrompt] = useState('');
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(
    null
  );
  const { colors } = useTheme();

  useEffect(() => {
    fetchContacts();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchContacts();
    setRefreshing(false);
  };

  const handleDelete = (contact: ContactItem) => {
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
    contact: ContactItem,
    messageType: LoadingState['messageType'] = 'default',
    prompt?: string
  ) => {
    try {
      setLoadingState({ contactId: contact.id, messageType });

      const customPromptToUse = prompt || customPrompt;

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
            customPrompt:
              messageType === 'custom' ? customPromptToUse : undefined,
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
          message,
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

  const handlePhonePress = async (phone?: string) => {
    if (phone) {
      const phoneUrl = `tel:${phone}`;
      const canOpen = await Linking.canOpenURL(phoneUrl);
      if (canOpen) {
        await Linking.openURL(phoneUrl);
      }
    } else {
      console.warn('Attempted to call undefined phone number');
    }
  };

  const handleEmailPress = async (email?: string) => {
    if (email) {
      const emailUrl = `mailto:${email}`;
      const canOpen = await Linking.canOpenURL(emailUrl);
      if (canOpen) {
        await Linking.openURL(emailUrl);
      }
    } else {
      console.warn('Attempted to mail undefined email address');
    }
  };

  const handleCustomPrompt = useCallback((contact: ContactItem) => {
    setSelectedContact(contact);
    setTempPrompt('');
    setIsCustomPromptModalVisible(true);
  }, []);

  const handleCustomPromptSubmit = useCallback(() => {
    if (tempPrompt && selectedContact) {
      handleMessageGeneration(selectedContact, 'custom', tempPrompt);
      setIsCustomPromptModalVisible(false);
      setSelectedContact(null);
      setTempPrompt('');
    }
  }, [tempPrompt, selectedContact, handleMessageGeneration]);

  const handleCloseModal = useCallback(() => {
    setIsCustomPromptModalVisible(false);
    setSelectedContact(null);
    setTempPrompt('');
  }, []);

  const handlePromptChange = useCallback((text: string) => {
    setTempPrompt(text);
  }, []);

  const handleEditPress = (contactId: string) => {
    setSelectedContactId(contactId);
    setIsEditModalVisible(true);
  };

  const showMessageOptions = (contact: ContactItem) => {
    const options = [
      'Cancel',
      'Blank Message',
      'Regular Message',
      'Love Message',
      'Gratitude Message',
      'Birthday Message',
      'Custom Message',
    ];

    const handleBlankMessage = async (contact: ContactItem) => {
      const phone = contact.phone;
      if (!phone) {
        Alert.alert('Error', 'Contact does not have a phone number.');
        return;
      }
      try {
        const smsUrl = `sms:${phone}${Platform.OS === 'ios' ? '&' : '?'}body=`; // Empty body
        const canOpen = await Linking.canOpenURL(smsUrl);
        if (canOpen) {
          await Linking.openURL(smsUrl);
          setLoadingState({ contactId: contact.id, messageType: 'default' }); // Show loading briefly
          await updateLastContact(contact.id);
          await fetchContacts();
          setLoadingState(null);
        } else {
          Alert.alert('Error', 'Cannot open messaging app.');
        }
      } catch (error) {
        console.error('Error opening SMS app:', error);
        Alert.alert('Error', 'Failed to open messaging app.');
        setLoadingState(null);
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
              handleBlankMessage(contact);
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
              handleMessageGeneration(contact, 'birthday');
              break;
            case 6:
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
            onPress: () => handleBlankMessage(contact),
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
            text: 'Birthday Message',
            onPress: () => handleMessageGeneration(contact, 'birthday'),
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

  const renderContact = ({ item }: { item: ContactItem }) => {
    const nextContactDate = new Date(item.nextContact);
    const isContactLate = isPast(nextContactDate);

    let streakBadge = null;
    const currentStreak = item.streak || 0;
    if (currentStreak >= 365) streakBadge = '1 Year+ 🔥';
    else if (currentStreak >= 180) streakBadge = '6 Mo+ 🔥';
    else if (currentStreak >= 30) streakBadge = '30 Day+ 🔥';
    else if (currentStreak >= 7) streakBadge = '7 Day+ 🔥';
    else if (currentStreak > 0) streakBadge = `${currentStreak} Day 🔥`;

    return (
      <TouchableOpacity
        style={[styles.contactCard, { backgroundColor: colors.card }]}
      >
        <View style={styles.contactInfo}>
          <View style={styles.contactHeader}>
            <Text
              style={[
                styles.name,
                { color: colors.text, flex: 1, marginRight: 8 },
              ]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {item.name}
            </Text>
            <View style={styles.headerActions}>
              {streakBadge && (
                <View
                  style={[
                    styles.badgeContainer,
                    { backgroundColor: colors.accent + '20' },
                  ]}
                >
                  <Text style={[styles.badgeText, { color: colors.accent }]}>
                    {streakBadge}
                  </Text>
                </View>
              )}
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => handleEditPress(item.id)}
              >
                <PenSquare size={20} color={colors.secondaryText} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleDelete(item)}
              >
                <Trash2 size={20} color="#FF3B30" />
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.contactDetails}>
            {item.phone && (
              <Text
                style={[styles.contactText, { color: colors.secondaryText }]}
              >
                {item.phone}
                {item.birthday && (
                  <Text style={styles.birthdayText}>
                    {`  🎂 ${format(parseISO(item.birthday), 'MMM d')}`}
                    {(() => {
                      const days = getBirthdayCountdown(item.birthday);
                      if (days === null) return '';
                      if (days === 0) return ' (Today!)';
                      if (days === 1) return ' (Tomorrow)';
                      if (days > 0) return ` (${days} days left)`;
                      return '';
                    })()}
                  </Text>
                )}
              </Text>
            )}
            {item.email && (
              <Text
                style={[styles.contactText, { color: colors.secondaryText }]}
              >
                {item.email}
              </Text>
            )}
          </View>
          <View style={styles.actionRow}>
            <View style={styles.buttonContainer}>
              <View style={styles.primaryActions}>
                {item.phone && (
                  <TouchableOpacity
                    style={[
                      styles.actionButton,
                      { backgroundColor: colors.background },
                    ]}
                    onPress={() => handlePhonePress(item.phone)}
                  >
                    <Phone size={20} color={colors.accent} />
                  </TouchableOpacity>
                )}
                {item.email && (
                  <TouchableOpacity
                    style={[
                      styles.actionButton,
                      { backgroundColor: colors.background },
                    ]}
                    onPress={() => handleEmailPress(item.email)}
                  >
                    <Mail size={20} color={colors.accent} />
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[
                    styles.messageButton,
                    { backgroundColor: colors.accent },
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
              <Clock
                size={16}
                color={isContactLate ? colors.error : colors.secondaryText}
              />
              <Text
                style={[
                  styles.nextContactText,
                  {
                    color: isContactLate ? colors.error : colors.secondaryText,
                  },
                ]}
              >
                {isContactLate ? 'Late: ' : 'Next: '}
                {formatDistanceToNow(nextContactDate, {
                  addSuffix: true,
                })}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
        <TouchableOpacity
          style={[styles.retryButton, { backgroundColor: colors.accent }]}
          onPress={fetchContacts}
        >
          <Text style={[styles.retryButtonText, { color: '#fff' }]}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={
          [...contacts].sort((a, b) => {
            const aDate = new Date(a.nextContact);
            const bDate = new Date(b.nextContact);
            const aIsLate = isPast(aDate);
            const bIsLate = isPast(bDate);

            if (aIsLate && !bIsLate) return -1;
            if (!aIsLate && bIsLate) return 1;

            return aDate.getTime() - bDate.getTime();
          }) as unknown as ContactItem[]
        }
        renderItem={renderContact}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator style={styles.loader} color={colors.accent} />
          ) : (
            <Text style={[styles.emptyText, { color: colors.secondaryText }]}>
              No contacts yet. Add some!
            </Text>
          )
        }
      />
      <CustomPromptModal
        visible={isCustomPromptModalVisible}
        onClose={handleCloseModal}
        onSubmit={handleCustomPromptSubmit}
        prompt={tempPrompt}
        onChangePrompt={handlePromptChange}
      />
      <EditContactModal
        visible={isEditModalVisible}
        onClose={() => {
          setIsEditModalVisible(false);
          setSelectedContactId(null);
        }}
        contactId={selectedContactId}
        onContactUpdated={fetchContacts}
      />
    </View>
  );
}

// Define styles within the component scope to access 'colors'
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
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    gap: 6,
    flex: 1,
    backgroundColor: '#007AFF',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    width: '100%',
    maxWidth: 500,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
    color: '#000',
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  promptInput: {
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 8,
  },
  characterCount: {
    fontSize: 14,
    color: '#666',
    textAlign: 'right',
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F2F2F7',
  },
  generateButton: {
    backgroundColor: '#007AFF',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  generateButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  birthdayText: {
    color: '#FF9500',
    fontSize: 13,
    marginLeft: 4,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editButton: {
    padding: 8,
  },
  badgeContainer: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginRight: 8,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
