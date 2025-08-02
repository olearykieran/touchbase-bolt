import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
  TextInput,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from './ThemeProvider';
import { ThemedText } from './ThemedText';
import { X, Clock, MessageCircle, Calendar, AlertCircle } from 'lucide-react-native';
import { ContactItem } from '@/types/Contact';
import { supabase } from '@/lib/supabase';
import * as Notifications from 'expo-notifications';

interface ScheduleMessageModalProps {
  visible: boolean;
  contact: ContactItem | null;
  onClose: () => void;
  onSchedule: (scheduledTime: Date, messageType: string, customPrompt?: string) => void;
}

const MESSAGE_TYPES = [
  { id: 'default', label: 'Regular Message', icon: '💬' },
  { id: 'love', label: 'Love Message', icon: '❤️' },
  { id: 'gratitude', label: 'Gratitude Message', icon: '🙏' },
  { id: 'birthday', label: 'Birthday Message', icon: '🎂' },
  { id: 'joke', label: 'Random Joke', icon: '😄' },
  { id: 'fact', label: 'Random Fact', icon: '🧠' },
  { id: 'custom', label: 'Custom Message', icon: '✏️' },
];

const QUICK_TIMES = [
  { label: 'In 15 minutes', minutes: 15 },
  { label: 'In 30 minutes', minutes: 30 },
  { label: 'In 1 hour', minutes: 60 },
  { label: 'In 2 hours', minutes: 120 },
  { label: 'Tomorrow 9 AM', special: 'tomorrow9am' },
  { label: 'Custom time', special: 'custom' },
];

export default function ScheduleMessageModal({
  visible,
  contact,
  onClose,
  onSchedule,
}: ScheduleMessageModalProps) {
  const { colors, colorScheme } = useTheme();
  const [selectedTime, setSelectedTime] = useState<Date>(() => {
    // Default to 15 minutes from now
    const defaultTime = new Date();
    defaultTime.setTime(defaultTime.getTime() + (15 * 60 * 1000));
    return defaultTime;
  });
  const [selectedTimeOption, setSelectedTimeOption] = useState<string | null>('In 15 minutes');
  const [selectedMessageType, setSelectedMessageType] = useState('default');
  const [customPrompt, setCustomPrompt] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);

  // Reset state when modal opens
  React.useEffect(() => {
    if (visible) {
      // Reset to default 15 minutes from now
      const defaultTime = new Date();
      defaultTime.setTime(defaultTime.getTime() + (15 * 60 * 1000));
      setSelectedTime(defaultTime);
      setSelectedTimeOption('In 15 minutes');
      setSelectedMessageType('default');
      setCustomPrompt('');
      
      console.log('Modal opened, reset time to:', defaultTime.toISOString());
    }
  }, [visible]);


  const handleQuickTimeSelect = (option: typeof QUICK_TIMES[0]) => {
    setSelectedTimeOption(option.label); // Track which option was selected
    
    if (option.special === 'custom') {
      setShowDatePicker(true);
    } else if (option.special === 'tomorrow9am') {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0);
      setSelectedTime(tomorrow);
    } else if (option.minutes) {
      const now = new Date();
      const futureTime = new Date();
      futureTime.setTime(futureTime.getTime() + (option.minutes * 60 * 1000));
      setSelectedTime(futureTime);
      
      console.log('Time selection:', {
        now: now.toISOString(),
        selected: futureTime.toISOString(),
        minutesAdded: option.minutes,
        actualDifference: (futureTime.getTime() - now.getTime()) / (60 * 1000)
      });
    }
  };

  const handleSchedule = async () => {
    if (!contact) return;

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Debug logging
      console.log('Current time:', new Date().toISOString());
      console.log('Selected time:', selectedTime.toISOString());
      console.log('Time difference (minutes):', (selectedTime.getTime() - new Date().getTime()) / (60 * 1000));

      const { error } = await supabase
        .from('scheduled_messages')
        .insert({
          user_id: user.id,
          contact_id: contact.id,
          message_type: selectedMessageType,
          custom_prompt: selectedMessageType === 'custom' ? customPrompt : null,
          scheduled_time: selectedTime.toISOString(),
          status: 'pending',
        });

      if (error) throw error;

      // Always update contact immediately when scheduling
      const { error: updateError } = await supabase
        .from('contacts')
        .update({ 
          last_contact: new Date().toISOString(),
        })
        .eq('id', contact.id);
        
      if (updateError) {
        console.error('Error updating contact:', updateError);
        // Don't fail the whole operation
      } else {
        console.log(`Updated contact ${contact.name} timer immediately upon scheduling`);
      }
      
      // Cancel any existing notifications for this contact
      try {
        // Get all scheduled notifications
        const allNotifications = await Notifications.getAllScheduledNotificationsAsync();
        
        // Cancel notifications for this contact
        for (const notification of allNotifications) {
          if (notification.content.data?.contactId === contact.id) {
            await Notifications.cancelScheduledNotificationAsync(notification.identifier);
            console.log(`Cancelled notification ${notification.identifier} for contact ${contact.id}`);
          }
        }
      } catch (notifError) {
        console.error('Error cancelling notifications:', notifError);
        // Don't fail the whole operation if notification cancellation fails
      }

      // Call the onSchedule callback
      onSchedule(selectedTime, selectedMessageType, customPrompt);
      
      Alert.alert(
        'Success',
        `Message scheduled for ${selectedTime.toLocaleString()}`,
        [{ text: 'OK', onPress: onClose }]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!contact) return null;

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
            <ThemedText style={styles.title}>Schedule Message</ThemedText>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ThemedText style={[styles.contactName, { color: colors.text }]}>
            To: {contact.name}
          </ThemedText>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Time Selection */}
            <View style={styles.section}>
              <ThemedText style={[styles.sectionTitle, { color: colors.text }]}>
                <Clock size={18} color={colors.text} /> When to send
              </ThemedText>
              <View style={styles.timeOptions}>
                {QUICK_TIMES.map((option) => {
                  // Check if this option is selected based on the label
                  const isSelected = selectedTimeOption === option.label;

                  return (
                    <TouchableOpacity
                      key={option.label}
                      style={[
                        styles.timeOption,
                        {
                          backgroundColor: isSelected
                            ? colors.accent
                            : colorScheme === 'dark'
                            ? 'rgba(255, 255, 255, 0.1)'
                            : 'rgba(0, 0, 0, 0.05)',
                          borderColor: isSelected
                            ? colors.accent
                            : colors.border,
                        },
                      ]}
                      onPress={() => handleQuickTimeSelect(option)}
                    >
                      <ThemedText style={{ 
                        color: isSelected ? '#fff' : colors.text, 
                        fontSize: 14 
                      }}>
                        {option.label}
                      </ThemedText>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <ThemedText style={[styles.selectedTime, { color: colors.accent }]}>
                <Calendar size={16} /> {selectedTime.toLocaleString()}
              </ThemedText>
            </View>

            {/* Info about scheduling */}
            <View style={[styles.infoBox, { backgroundColor: colorScheme === 'dark' ? 'rgba(113, 113, 122, 0.1)' : 'rgba(113, 113, 122, 0.1)', borderColor: colors.border }]}>
              <AlertCircle size={16} color={colors.secondaryText} style={{ marginRight: 8 }} />
              <ThemedText style={[styles.infoText, { color: colors.secondaryText, flex: 1 }]}>
                Scheduling a message counts as contacting this person and will update their reminder timer.
              </ThemedText>
            </View>

            {/* Message Type Selection */}
            <View style={styles.section}>
              <ThemedText style={[styles.sectionTitle, { color: colors.text }]}>
                <MessageCircle size={18} color={colors.text} /> Message type
              </ThemedText>
              <View style={styles.messageTypes}>
                {MESSAGE_TYPES.map((type) => (
                  <TouchableOpacity
                    key={type.id}
                    style={[
                      styles.messageType,
                      {
                        backgroundColor:
                          selectedMessageType === type.id
                            ? colors.accent
                            : colorScheme === 'dark'
                            ? 'rgba(255, 255, 255, 0.1)'
                            : 'rgba(0, 0, 0, 0.05)',
                        borderColor:
                          selectedMessageType === type.id
                            ? colors.accent
                            : colors.border,
                      },
                    ]}
                    onPress={() => setSelectedMessageType(type.id)}
                  >
                    <ThemedText
                      style={{
                        color:
                          selectedMessageType === type.id
                            ? '#fff'
                            : colors.text,
                        fontSize: 14,
                      }}
                    >
                      {type.icon} {type.label}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Custom Prompt (if custom selected) */}
            {selectedMessageType === 'custom' && (
              <View style={styles.section}>
                <ThemedText style={[styles.sectionTitle, { color: colors.text }]}>
                  Custom prompt (optional)
                </ThemedText>
                <TextInput
                  style={[
                    styles.customPromptInput,
                    {
                      backgroundColor:
                        colorScheme === 'dark'
                          ? 'rgba(255, 255, 255, 0.05)'
                          : 'rgba(0, 0, 0, 0.05)',
                      color: colors.text,
                      borderColor: colors.border,
                    },
                  ]}
                  placeholder="E.g., Ask about their new job..."
                  placeholderTextColor={colors.mutedText}
                  value={customPrompt}
                  onChangeText={setCustomPrompt}
                  multiline
                />
              </View>
            )}
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[
                styles.scheduleButton,
                {
                  backgroundColor: colors.accent,
                  opacity: loading ? 0.7 : 1,
                },
              ]}
              onPress={handleSchedule}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <ThemedText style={styles.scheduleButtonText}>
                  Schedule Message
                </ThemedText>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {showDatePicker && Platform.OS === 'ios' && (
        <View style={[
          styles.datePickerContainer,
          {
            backgroundColor: colorScheme === 'dark' ? '#1c1c1e' : '#ffffff',
          }
        ]}>
          <View style={styles.datePickerHeader}>
            <TouchableOpacity 
              onPress={() => setShowDatePicker(false)}
              style={styles.datePickerButton}
            >
              <ThemedText style={{ color: colors.accent }}>Cancel</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => setShowDatePicker(false)}
              style={styles.datePickerButton}
            >
              <ThemedText style={{ color: colors.accent, fontWeight: '600' }}>Done</ThemedText>
            </TouchableOpacity>
          </View>
          <DateTimePicker
            value={selectedTime}
            mode="datetime"
            display="spinner"
            onChange={(event, date) => {
              if (date) {
                setSelectedTime(date);
                setSelectedTimeOption('Custom time'); // Mark custom time as selected
              }
            }}
            minimumDate={new Date()}
            textColor={colors.text}
          />
        </View>
      )}
      
      {showDatePicker && Platform.OS === 'android' && (
        <DateTimePicker
          value={selectedTime}
          mode="datetime"
          display="default"
          onChange={(event, date) => {
            setShowDatePicker(false);
            if (date) {
              setSelectedTime(date);
              setSelectedTimeOption('Custom time'); // Mark custom time as selected
            }
          }}
          minimumDate={new Date()}
        />
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 34,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  contactName: {
    fontSize: 16,
    marginBottom: 20,
    opacity: 0.8,
  },
  content: {
    marginBottom: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  timeOption: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
  selectedTime: {
    marginTop: 12,
    fontSize: 14,
    textAlign: 'center',
  },
  messageTypes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  messageType: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
  customPromptInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  footer: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
  },
  scheduleButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  scheduleButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  datePickerContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  datePickerButton: {
    padding: 4,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  infoText: {
    fontSize: 13,
    lineHeight: 18,
  },
});