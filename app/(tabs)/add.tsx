import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
  Modal,
} from 'react-native';
import { useState } from 'react';
import { useContactStore } from '@/lib/store';
import { router } from 'expo-router';
import { UserPlus, Users } from 'lucide-react-native';
import ContactPickerModal from '@/components/ContactPickerModal';
import DateTimePicker from '@react-native-community/datetimepicker';
import React from 'react';
import { useTheme } from '../../components/ThemeProvider';

export default function AddContactScreen() {
  const addContact = useContactStore((state) => state.addContact);
  const loading = useContactStore((state) => state.loading);
  const error = useContactStore((state) => state.error);
  const [showContactPicker, setShowContactPicker] = useState(false);
  const [showBirthdayPicker, setShowBirthdayPicker] = useState(false);
  const [showFirstContactDatePicker, setShowFirstContactDatePicker] =
    useState(false);
  const { colors, colorScheme } = useTheme();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    frequency: 'weekly',
    birthday: undefined as Date | undefined,
    firstContactDate: undefined as Date | undefined,
  });

  const frequencies = ['daily', 'weekly', 'monthly', 'quarterly'];

  const handleSubmit = async () => {
    const submitData: any = {
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      frequency: formData.frequency,
    };
    if (formData.birthday) {
      submitData.birthday = formData.birthday.toISOString().split('T')[0];
    }
    if (formData.firstContactDate) {
      submitData.firstContactDate = formData.firstContactDate;
    }

    console.log('Submitting contact data:', submitData);

    await addContact(submitData);
    if (!error) {
      router.push('/(tabs)/' as any);
    }
  };

  const handleContactSelect = (contact: {
    name: string;
    email?: string;
    phone?: string;
  }) => {
    setFormData({
      ...formData,
      name: contact.name,
      email: contact.email || '',
      phone: contact.phone || '',
    });
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <View style={styles.form}>
        {error && (
          <Text style={[styles.errorText, { color: colors.error }]}>
            {error}
          </Text>
        )}

        {Platform.OS !== 'web' && (
          <TouchableOpacity
            style={[
              styles.contactPickerButton,
              { backgroundColor: colors.card },
            ]}
            onPress={() => setShowContactPicker(true)}
          >
            <Users size={24} color={colors.accent} />
            <Text style={[styles.contactPickerText, { color: colors.accent }]}>
              Add from Contacts
            </Text>
          </TouchableOpacity>
        )}

        <Text style={[styles.label, { color: colors.text }]}>Name</Text>
        <TextInput
          style={[
            styles.input,
            { backgroundColor: colors.card, color: colors.text },
          ]}
          value={formData.name}
          onChangeText={(text) => setFormData({ ...formData, name: text })}
          placeholder="Enter name"
        />

        <Text style={[styles.label, { color: colors.text }]}>Email</Text>
        <TextInput
          style={[
            styles.input,
            { backgroundColor: colors.card, color: colors.text },
          ]}
          value={formData.email}
          onChangeText={(text) => setFormData({ ...formData, email: text })}
          placeholder="Enter email"
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Text style={[styles.label, { color: colors.text }]}>Phone</Text>
        <TextInput
          style={[
            styles.input,
            { backgroundColor: colors.card, color: colors.text },
          ]}
          value={formData.phone}
          onChangeText={(text) => setFormData({ ...formData, phone: text })}
          placeholder="Enter phone number"
          keyboardType="phone-pad"
        />

        <Text style={[styles.label, { color: colors.text }]}>
          Contact Frequency
        </Text>
        <View style={styles.frequencyButtons}>
          {frequencies.map((freq) => (
            <TouchableOpacity
              key={freq}
              style={[
                styles.frequencyButton,
                {
                  backgroundColor:
                    formData.frequency === freq ? colors.accent : colors.border,
                },
              ]}
              onPress={() => setFormData({ ...formData, frequency: freq })}
            >
              <Text
                style={[
                  styles.frequencyButtonText,
                  { color: formData.frequency === freq ? '#fff' : colors.text },
                ]}
              >
                {freq.charAt(0).toUpperCase() + freq.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.label, { color: colors.text }]}>
          Birthday (optional)
        </Text>
        <TouchableOpacity
          style={[styles.input, { backgroundColor: colors.card }]}
          onPress={() => setShowBirthdayPicker(true)}
        >
          <Text
            style={{
              color: formData.birthday ? colors.text : colors.secondaryText,
            }}
          >
            {formData.birthday
              ? formData.birthday.toLocaleDateString()
              : 'Select birthday (optional)'}
          </Text>
        </TouchableOpacity>

        <Text style={[styles.label, { color: colors.text }]}>
          First Reminder (Optional)
        </Text>
        <TouchableOpacity
          style={[styles.input, { backgroundColor: colors.card }]}
          onPress={() => setShowFirstContactDatePicker(true)}
        >
          <Text
            style={{
              color: formData.firstContactDate
                ? colors.text
                : colors.secondaryText,
            }}
          >
            {formData.firstContactDate
              ? formData.firstContactDate.toLocaleString([], {
                  year: 'numeric',
                  month: 'numeric',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                })
              : 'Default (Based on Frequency)'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.submitButton,
            { backgroundColor: colors.accent },
            loading && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <UserPlus size={24} color="#fff" />
              <Text style={[styles.submitButtonText, { color: '#fff' }]}>
                Add Contact
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <ContactPickerModal
        visible={showContactPicker}
        onClose={() => setShowContactPicker(false)}
        onSelectContact={handleContactSelect}
      />

      <Modal
        visible={showBirthdayPicker}
        transparent={true}
        animationType="slide"
      >
        <View
          style={{
            flex: 1,
            justifyContent: 'flex-end',
            backgroundColor: 'rgba(0,0,0,0.2)',
          }}
        >
          <View
            style={{
              backgroundColor: colors.card,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              padding: 16,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 8,
              }}
            >
              <TouchableOpacity onPress={() => setShowBirthdayPicker(false)}>
                <Text style={{ color: colors.accent, fontSize: 16 }}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <Text
                style={{ fontWeight: '600', fontSize: 16, color: colors.text }}
              >
                Select Birthday
              </Text>
              <TouchableOpacity onPress={() => setShowBirthdayPicker(false)}>
                <Text style={{ color: colors.accent, fontSize: 16 }}>Done</Text>
              </TouchableOpacity>
            </View>
            <DateTimePicker
              value={formData.birthday || new Date()}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(event, date) => {
                setShowBirthdayPicker(Platform.OS === 'ios');
                if (date) setFormData({ ...formData, birthday: date });
              }}
              themeVariant={colorScheme}
            />
          </View>
        </View>
      </Modal>

      <Modal
        visible={showFirstContactDatePicker}
        transparent={true}
        animationType="slide"
      >
        <View
          style={{
            flex: 1,
            justifyContent: 'flex-end',
            backgroundColor: 'rgba(0,0,0,0.2)',
          }}
        >
          <View
            style={{
              backgroundColor: colors.card,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              padding: 16,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 8,
              }}
            >
              <TouchableOpacity
                onPress={() => setShowFirstContactDatePicker(false)}
              >
                <Text style={{ color: colors.accent, fontSize: 16 }}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <Text
                style={{ fontWeight: '600', fontSize: 16, color: colors.text }}
              >
                First Reminder Time
              </Text>
              <TouchableOpacity
                onPress={() => setShowFirstContactDatePicker(false)}
              >
                <Text style={{ color: colors.accent, fontSize: 16 }}>Done</Text>
              </TouchableOpacity>
            </View>
            <DateTimePicker
              value={formData.firstContactDate || new Date()}
              mode="datetime"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(event, date) => {
                setShowFirstContactDatePicker(Platform.OS === 'ios');
                if (date) {
                  setFormData({ ...formData, firstContactDate: date });
                }
              }}
              themeVariant={colorScheme}
              minimumDate={new Date()}
            />
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  form: {
    padding: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#000',
  },
  input: {
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    fontSize: 16,
  },
  contactPickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
    gap: 8,
  },
  contactPickerText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  frequencyButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
  },
  frequencyButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#E5E5EA',
  },
  frequencyButtonActive: {
    backgroundColor: '#007AFF',
  },
  frequencyButtonText: {
    color: '#000',
    fontSize: 14,
  },
  frequencyButtonTextActive: {
    color: 'white',
  },
  submitButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    color: '#FF3B30',
    marginBottom: 16,
    fontSize: 14,
  },
});
