import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Alert,
  TouchableWithoutFeedback,
  Keyboard,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { supabase } from '../lib/supabase';
import { useTheme } from './ThemeProvider';

interface EditContactModalProps {
  visible: boolean;
  onClose: () => void;
  contactId: string | null;
  onContactUpdated: () => void;
}

interface FormData {
  nextContactDate: Date;
  contactName: string;
}

export default function EditContactModal({
  visible,
  onClose,
  contactId,
  onContactUpdated,
}: EditContactModalProps) {
  const { colorScheme, colors } = useTheme();
  const [formData, setFormData] = useState<FormData>({
    nextContactDate: new Date(),
    contactName: '',
  });
  const [showNextContactDatePicker, setShowNextContactDatePicker] =
    useState(false);

  useEffect(() => {
    if (visible && contactId) {
      loadContactData();
    }
  }, [visible, contactId]);

  const loadContactData = async () => {
    if (!contactId) return;
    try {
      const { data, error } = await supabase
        .from('contacts')
        .select('name, next_contact')
        .eq('id', contactId)
        .single();

      if (error) throw error;

      if (data) {
        setFormData({
          contactName: data.name || '',
          nextContactDate: data.next_contact
            ? new Date(data.next_contact)
            : new Date(),
        });
      }
    } catch (error) {
      console.error('Error loading contact date:', error);
      alert('Failed to load contact data');
    }
  };

  const handleSubmit = async () => {
    if (!contactId) return;
    try {
      const { error } = await supabase
        .from('contacts')
        .update({
          next_contact: formData.nextContactDate.toISOString(),
        })
        .eq('id', contactId);

      if (error) {
        console.error('Error updating next contact date:', error);
        Alert.alert('Error', 'Failed to update next contact date');
        return;
      }

      onContactUpdated();
      onClose();
      Alert.alert('Success', 'Next contact date updated');
    } catch (error) {
      console.error('Error in handleSubmit:', error);
      Alert.alert('Error', 'Failed to update contact date');
    }
  };

  const onNextContactDateChange = (event: any, selectedDate?: Date) => {
    setShowNextContactDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setFormData((prev) => ({ ...prev, nextContactDate: selectedDate }));
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalContainer}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardView}
          >
            <View
              style={[styles.modalContent, { backgroundColor: colors.card }]}
            >
              <View style={styles.modalHeader}>
                <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                  <Text style={styles.closeButtonText}>Cancel</Text>
                </TouchableOpacity>
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  Update Next Contact
                </Text>
                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={handleSubmit}
                >
                  <Text
                    style={[styles.saveButtonText, { color: colors.accent }]}
                  >
                    Save
                  </Text>
                </TouchableOpacity>
              </View>

              <ScrollView
                style={styles.scrollContent}
                contentContainerStyle={styles.scrollContentContainer}
                showsVerticalScrollIndicator={true}
                bounces={true}
                keyboardShouldPersistTaps="handled"
              >
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                  <View style={styles.formSection}>
                    <Text style={[styles.nameDisplay, { color: colors.text }]}>
                      Contact: {formData.contactName}
                    </Text>
                    <Text style={[styles.label, { color: colors.text }]}>
                      Next Contact Date
                    </Text>
                    <TouchableOpacity
                      style={[
                        styles.dateButton,
                        {
                          backgroundColor: colors.background,
                          borderColor: colors.border,
                        },
                      ]}
                      onPress={() => {
                        Keyboard.dismiss();
                        setShowNextContactDatePicker(true);
                      }}
                    >
                      <Text
                        style={[styles.dateButtonText, { color: colors.text }]}
                      >
                        {/* Format to show date and time */}
                        {formData.nextContactDate.toLocaleString([], {
                          year: 'numeric',
                          month: 'numeric',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </Text>
                      <Text
                        style={[
                          styles.pickerArrow,
                          { color: colors.secondaryText },
                        ]}
                      >
                        ▼
                      </Text>
                    </TouchableOpacity>
                  </View>
                </TouchableWithoutFeedback>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>

      <Modal
        visible={showNextContactDatePicker}
        transparent={true}
        animationType="slide"
      >
        <View style={styles.pickerModalContainer}>
          <View
            style={[
              styles.pickerModalContent,
              { backgroundColor: colors.card },
            ]}
          >
            <View style={styles.pickerHeader}>
              <TouchableOpacity
                onPress={() => setShowNextContactDatePicker(false)}
                style={styles.pickerHeaderButton}
              >
                <Text
                  style={[
                    styles.pickerHeaderButtonText,
                    { color: colors.secondaryText },
                  ]}
                >
                  Cancel
                </Text>
              </TouchableOpacity>
              <Text style={[styles.pickerHeaderTitle, { color: colors.text }]}>
                Select Next Contact Date
              </Text>
              <TouchableOpacity
                onPress={() => setShowNextContactDatePicker(false)}
                style={styles.pickerHeaderButton}
              >
                <Text
                  style={[
                    styles.pickerHeaderButtonText,
                    { color: colors.accent },
                  ]}
                >
                  Done
                </Text>
              </TouchableOpacity>
            </View>
            <DateTimePicker
              value={formData.nextContactDate}
              mode="datetime"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={onNextContactDateChange}
              style={styles.picker}
              themeVariant={colorScheme}
              minimumDate={new Date()}
            />
          </View>
        </View>
      </Modal>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'flex-end',
    margin: 0,
  },
  keyboardView: {
    width: '100%',
    margin: 0,
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    width: '100%',
    margin: 0,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: 'transparent',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  closeButton: {
    padding: 4,
  },
  closeButtonText: {
    fontSize: 17,
    color: '#666',
  },
  scrollContent: {
    maxHeight: '70%',
  },
  scrollContentContainer: {
    padding: 12,
    paddingBottom: 30,
  },
  formSection: {
    width: '100%',
    gap: 10,
  },
  nameDisplay: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 10,
    textAlign: 'center',
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  dateButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 6,
    height: 40,
  },
  dateButtonText: {
    fontSize: 16,
    flex: 1,
  },
  pickerArrow: {
    fontSize: 14,
  },
  pickerModalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  pickerModalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: 'transparent',
  },
  pickerHeaderButton: {
    padding: 4,
  },
  pickerHeaderButtonText: {
    fontSize: 16,
  },
  pickerHeaderTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  picker: {
    backgroundColor: 'transparent',
    height: 216,
  },
  saveButton: {
    padding: 4,
  },
  saveButtonText: {
    fontSize: 17,
    fontWeight: '600',
  },
});
