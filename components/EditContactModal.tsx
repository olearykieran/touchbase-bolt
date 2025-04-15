import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
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
import { Picker } from '@react-native-picker/picker';
import { supabase } from '../lib/supabase';

type FrequencyType = 'daily' | 'weekly' | 'monthly' | 'quarterly';

const FREQUENCY_MAPPINGS: Record<FrequencyType, string> = {
  daily: '1 day',
  weekly: '7 days',
  monthly: '1 month',
  quarterly: '3 months',
};

const FREQUENCY_OPTIONS = [
  { label: 'Daily', value: 'daily' as FrequencyType },
  { label: 'Weekly', value: 'weekly' as FrequencyType },
  { label: 'Monthly', value: 'monthly' as FrequencyType },
  { label: 'Quarterly', value: 'quarterly' as FrequencyType },
];

interface EditContactModalProps {
  visible: boolean;
  onClose: () => void;
  contactId: string | null;
  onContactUpdated: () => void;
}

interface FormData {
  name: string;
  email: string;
  phone: string;
  frequency: FrequencyType;
  birthday: Date;
  nextContactDate: Date;
}

export default function EditContactModal({
  visible,
  onClose,
  contactId,
  onContactUpdated,
}: EditContactModalProps) {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    phone: '',
    frequency: 'weekly',
    birthday: new Date(),
    nextContactDate: new Date(),
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showFrequencyPicker, setShowFrequencyPicker] = useState(false);

  useEffect(() => {
    if (visible && contactId) {
      loadContactData();
    }
  }, [visible, contactId]);

  const loadContactData = async () => {
    try {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('id', contactId)
        .single();

      if (error) throw error;

      if (data) {
        setFormData({
          name: data.name || '',
          email: data.email || '',
          phone: data.phone || '',
          frequency: data.frequency || 'weekly',
          birthday: data.birthday ? new Date(data.birthday) : new Date(),
          nextContactDate: data.next_contact_date
            ? new Date(data.next_contact_date)
            : new Date(),
        });
      }
    } catch (error) {
      console.error('Error loading contact:', error);
      alert('Failed to load contact data');
    }
  };

  const handleSubmit = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { error } = await supabase
        .from('contacts')
        .update({
          name: formData.name,
          phone: formData.phone,
          email: formData.email,
          frequency: formData.frequency,
          reminder_interval: FREQUENCY_MAPPINGS[formData.frequency],
          next_contact: formData.nextContactDate.toISOString(),
          birthday: formData.birthday.toISOString().split('T')[0],
        })
        .eq('id', contactId)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error updating contact:', error);
        Alert.alert('Error', 'Failed to update contact');
        return;
      }

      onContactUpdated();
      onClose();
      Alert.alert('Success', 'Contact updated successfully');
    } catch (error) {
      console.error('Error in handleSubmit:', error);
      Alert.alert('Error', 'Failed to update contact');
    }
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    if (selectedDate) {
      setFormData((prev) => ({ ...prev, birthday: selectedDate }));
    }
  };

  const handleDelete = async () => {
    Alert.alert(
      'Delete Contact',
      'Are you sure you want to delete this contact?',
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
              const { error } = await supabase
                .from('contacts')
                .delete()
                .eq('id', contactId);

              if (error) throw error;
              onContactUpdated();
              onClose();
            } catch (error) {
              console.error('Error deleting contact:', error);
              alert('Failed to delete contact. Please try again.');
            }
          },
        },
      ],
      { cancelable: true }
    );
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
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                  <Text style={styles.closeButtonText}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.modalTitle}>Edit Contact</Text>
                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={handleSubmit}
                >
                  <Text style={styles.saveButtonText}>Save</Text>
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
                    <Text style={styles.label}>Name</Text>
                    <TextInput
                      style={styles.input}
                      value={formData.name}
                      onChangeText={(text) =>
                        setFormData({ ...formData, name: text })
                      }
                      placeholder="Enter name"
                      returnKeyType="done"
                      keyboardType="ascii-capable"
                      onSubmitEditing={Keyboard.dismiss}
                      blurOnSubmit={true}
                    />

                    <Text style={styles.label}>Email</Text>
                    <TextInput
                      style={styles.input}
                      value={formData.email}
                      onChangeText={(text) =>
                        setFormData({ ...formData, email: text })
                      }
                      placeholder="Enter email"
                      keyboardType="ascii-capable"
                      autoCapitalize="none"
                      returnKeyType="done"
                      onSubmitEditing={Keyboard.dismiss}
                      blurOnSubmit={true}
                    />

                    <Text style={styles.label}>Phone</Text>
                    <TextInput
                      style={styles.input}
                      value={formData.phone}
                      onChangeText={(text) =>
                        setFormData({ ...formData, phone: text })
                      }
                      placeholder="Enter phone"
                      keyboardType="phone-pad"
                      returnKeyType="done"
                      onSubmitEditing={Keyboard.dismiss}
                      blurOnSubmit={true}
                    />

                    <Text style={styles.label}>Contact Frequency</Text>
                    <TouchableOpacity
                      onPress={() => {
                        Keyboard.dismiss();
                        setShowFrequencyPicker(true);
                      }}
                      style={styles.pickerButton}
                    >
                      <Text style={styles.pickerButtonText}>
                        {FREQUENCY_OPTIONS.find(
                          (option) => option.value === formData.frequency
                        )?.label || 'Select Frequency'}
                      </Text>
                      <Text style={styles.pickerArrow}>▼</Text>
                    </TouchableOpacity>

                    <Text style={styles.label}>Birthday</Text>
                    <TouchableOpacity
                      style={styles.dateButton}
                      onPress={() => {
                        Keyboard.dismiss();
                        setShowDatePicker(true);
                      }}
                    >
                      <Text style={styles.dateButtonText}>
                        {formData.birthday.toLocaleDateString()}
                      </Text>
                      <Text style={styles.pickerArrow}>▼</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableWithoutFeedback>
              </ScrollView>

              <View style={styles.buttonSection}>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={handleDelete}
                >
                  <Text style={styles.deleteButtonText}>Delete Contact</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>

      {/* Birthday Picker Modal */}
      <Modal visible={showDatePicker} transparent={true} animationType="slide">
        <View style={styles.pickerModalContainer}>
          <View style={styles.pickerModalContent}>
            <View style={styles.pickerHeader}>
              <TouchableOpacity
                onPress={() => setShowDatePicker(false)}
                style={styles.pickerHeaderButton}
              >
                <Text style={styles.pickerHeaderButtonText}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.pickerHeaderTitle}>Select Birthday</Text>
              <TouchableOpacity
                onPress={() => setShowDatePicker(false)}
                style={styles.pickerHeaderButton}
              >
                <Text
                  style={[styles.pickerHeaderButtonText, { color: '#007AFF' }]}
                >
                  Done
                </Text>
              </TouchableOpacity>
            </View>
            {Platform.OS === 'ios' ? (
              <DateTimePicker
                value={formData.birthday}
                mode="date"
                display="spinner"
                onChange={onDateChange}
                style={styles.picker}
                textColor="#000000"
                themeVariant="light"
              />
            ) : (
              showDatePicker && (
                <DateTimePicker
                  value={formData.birthday}
                  mode="date"
                  display="default"
                  onChange={(event, date) => {
                    setShowDatePicker(false);
                    if (date) {
                      setFormData((prev) => ({ ...prev, birthday: date }));
                    }
                  }}
                  themeVariant="light"
                />
              )
            )}
          </View>
        </View>
      </Modal>

      {/* Frequency Picker Modal */}
      <Modal
        visible={showFrequencyPicker}
        transparent={true}
        animationType="slide"
      >
        <View style={styles.pickerModalContainer}>
          <View style={styles.pickerModalContent}>
            <View style={styles.pickerHeader}>
              <TouchableOpacity
                onPress={() => setShowFrequencyPicker(false)}
                style={styles.pickerHeaderButton}
              >
                <Text style={styles.pickerHeaderButtonText}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.pickerHeaderTitle}>Select Frequency</Text>
              <TouchableOpacity
                onPress={() => setShowFrequencyPicker(false)}
                style={styles.pickerHeaderButton}
              >
                <Text
                  style={[styles.pickerHeaderButtonText, { color: '#007AFF' }]}
                >
                  Done
                </Text>
              </TouchableOpacity>
            </View>
            <Picker
              selectedValue={formData.frequency}
              onValueChange={(itemValue) => {
                setFormData((prev) => ({ ...prev, frequency: itemValue }));
              }}
              style={styles.picker}
              itemStyle={{ color: '#000000' }}
            >
              {FREQUENCY_OPTIONS.map((option) => (
                <Picker.Item
                  key={option.value}
                  label={option.label}
                  value={option.value}
                  color="#000000"
                />
              ))}
            </Picker>
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
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    width: '100%',
    margin: 0,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
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
  },
  formSection: {
    width: '100%',
    gap: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    marginBottom: 6,
    fontSize: 15,
    backgroundColor: '#fff',
    height: 36,
  },
  pickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    marginBottom: 6,
    backgroundColor: '#fff',
    height: 36,
  },
  pickerButtonText: {
    fontSize: 16,
    color: '#000',
    flex: 1,
  },
  pickerArrow: {
    fontSize: 14,
    color: '#666',
  },
  dateButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    marginBottom: 6,
    backgroundColor: '#fff',
    height: 36,
  },
  dateButtonText: {
    fontSize: 16,
    color: '#000',
    flex: 1,
  },
  buttonSection: {
    padding: 12,
    paddingTop: 8,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    backgroundColor: '#fff',
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
    padding: 8,
    borderRadius: 8,
    width: '100%',
    height: 36,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 15,
    textAlign: 'center',
    fontWeight: '600',
  },
  pickerModalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'transparent',
  },
  pickerModalContent: {
    backgroundColor: '#fff',
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
    backgroundColor: '#f8f8f8',
  },
  pickerHeaderButton: {
    padding: 4,
  },
  pickerHeaderButtonText: {
    fontSize: 16,
    color: '#666',
  },
  pickerHeaderTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  picker: {
    backgroundColor: '#fff',
    height: 216,
  },
  saveButton: {
    padding: 4,
  },
  saveButtonText: {
    fontSize: 17,
    color: '#007AFF',
    fontWeight: '600',
  },
});
