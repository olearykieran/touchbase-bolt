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
import { X, Clock, MessageCircle, Calendar } from 'lucide-react-native';
import { ContactItem } from '@/types/Contact';
import { supabase } from '@/lib/supabase';

interface ScheduleMessageModalProps {
  visible: boolean;
  contact: ContactItem | null;
  onClose: () => void;
  onSchedule: (scheduledTime: Date, messageType: string, customPrompt?: string) => void;
}

const MESSAGE_TYPES = [
  { id: 'default', label: 'Check-in', icon: '👋' },
  { id: 'birthday', label: 'Birthday', icon: '🎂' },
  { id: 'holiday', label: 'Holiday', icon: '🎄' },
  { id: 'congratulations', label: 'Congratulations', icon: '🎉' },
  { id: 'thinking_of_you', label: 'Thinking of You', icon: '💭' },
  { id: 'custom', label: 'Custom', icon: '✏️' },
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
  const [selectedTime, setSelectedTime] = useState<Date>(new Date());
  const [selectedMessageType, setSelectedMessageType] = useState('default');
  const [customPrompt, setCustomPrompt] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleQuickTimeSelect = (option: typeof QUICK_TIMES[0]) => {
    if (option.special === 'custom') {
      setShowDatePicker(true);
    } else if (option.special === 'tomorrow9am') {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0);
      setSelectedTime(tomorrow);
    } else if (option.minutes) {
      const futureTime = new Date();
      futureTime.setMinutes(futureTime.getMinutes() + option.minutes);
      setSelectedTime(futureTime);
    }
  };

  const handleSchedule = async () => {
    if (!contact) return;

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

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
                {QUICK_TIMES.map((option) => (
                  <TouchableOpacity
                    key={option.label}
                    style={[
                      styles.timeOption,
                      {
                        backgroundColor:
                          colorScheme === 'dark'
                            ? 'rgba(255, 255, 255, 0.1)'
                            : 'rgba(0, 0, 0, 0.05)',
                        borderColor: colors.border,
                      },
                    ]}
                    onPress={() => handleQuickTimeSelect(option)}
                  >
                    <ThemedText style={{ color: colors.text, fontSize: 14 }}>
                      {option.label}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </View>
              <ThemedText style={[styles.selectedTime, { color: colors.accent }]}>
                <Calendar size={16} /> {selectedTime.toLocaleString()}
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

      {showDatePicker && (
        <DateTimePicker
          value={selectedTime}
          mode="datetime"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event, date) => {
            setShowDatePicker(Platform.OS === 'android');
            if (date) setSelectedTime(date);
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
});