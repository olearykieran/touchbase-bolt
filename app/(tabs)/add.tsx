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
  Linking,
  Alert, // Add Alert import
} from 'react-native';
import * as Contacts from 'expo-contacts';
import { useState } from 'react';
import { useContactStore } from '@/lib/store';
import { router } from 'expo-router';
import { UserPlus, Users } from 'lucide-react-native';
import ContactPickerModal from '@/components/ContactPickerModal';
import DateTimePicker from '@react-native-community/datetimepicker';
import React from 'react';
import { useTheme } from '../../components/ThemeProvider';
import Tooltip from 'react-native-walkthrough-tooltip';
import AsyncStorage from '@react-native-async-storage/async-storage';
import PaywallModal from '../../components/PaywallModal';

export default function AddContactScreen() {
  const addContact = useContactStore((state) => state.addContact);
  const loading = useContactStore((state) => state.loading);
  const error = useContactStore((state) => state.error);
  const clearError = useContactStore((state) => state.clearError);
  const [showContactPicker, setShowContactPicker] = useState(false);
  const [showBirthdayPicker, setShowBirthdayPicker] = useState(false);
  const [showFirstContactDatePicker, setShowFirstContactDatePicker] =
    useState(false);
  const [contactPermissionStatus, setContactPermissionStatus] = useState<
    'undetermined' | 'granted' | 'denied'
  >('undetermined');
  const [showContactPermissionPrompt, setShowContactPermissionPrompt] =
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

  React.useEffect(() => {
    if (Platform.OS !== 'web') {
      (async () => {
        const { status } = await Contacts.getPermissionsAsync();
        setContactPermissionStatus(status);
        if (status !== 'granted') {
          setShowContactPermissionPrompt(true);
        }
      })();
    }
  }, []);

  const requestContactPermission = async () => {
    const { status } = await Contacts.requestPermissionsAsync();
    setContactPermissionStatus(status);
    if (status === 'granted') {
      setShowContactPermissionPrompt(false);
    }
  };

  // Onboarding state
  const [showAddOnboarding, setShowAddOnboarding] = useState(false);
  const [addOnboardingStep, setAddOnboardingStep] = useState(0); // 0: none, 1: contacts btn, 2: freq, 3: reminder
  const addOnboardingKey = 'add_contact_onboarding_v1';

  React.useEffect(() => {
    (async () => {
      const shown = await AsyncStorage.getItem(addOnboardingKey);
      if (!shown) {
        setShowAddOnboarding(true);
        setAddOnboardingStep(1);
      }
    })();
  }, []);

  const handleNextAddOnboarding = async () => {
    if (addOnboardingStep === 1) {
      setAddOnboardingStep(2);
    } else if (addOnboardingStep === 2) {
      setAddOnboardingStep(3);
    } else {
      setShowAddOnboarding(false);
      setAddOnboardingStep(0);
      await AsyncStorage.setItem(addOnboardingKey, 'true');
    }
  };

  const [showPaywall, setShowPaywall] = useState(false);
  const [paywallType, setPaywallType] = useState<'contacts' | 'messages'>(
    'contacts'
  );

  // Error message constant for message limit
  const MESSAGE_LIMIT_ERROR =
    'Free tier limited to 3 AI messages per week. Subscribe to unlock more.';

  React.useEffect(() => {
    console.log('[AddContactScreen] useEffect triggered with error:', error);
    if (
      error === 'Free tier limited to 3 contacts. Subscribe to unlock more.'
    ) {
      setShowPaywall(true);
      setPaywallType('contacts');
    } else if (error === MESSAGE_LIMIT_ERROR) {
      setShowPaywall(true);
      setPaywallType('messages');
    } else {
      setShowPaywall(false);
    }
  }, [error]);

  const handleClosePaywall = () => {
    console.log(
      '[AddContactScreen] handleClosePaywall called, clearing error.'
    );
    clearError(); // Clear the error in the store
    // Let the useEffect handle hiding the modal when the error becomes null
    // setShowPaywall(false);
  };

  const handleUpgrade = async (plan: 'monthly' | 'yearly') => {
    const monthlyLink = 'https://buy.stripe.com/6oEcNFb5l2D34rm5kk';
    const yearlyLink = 'https://buy.stripe.com/8wM7tl1uLelL1fa7st';
    const url = plan === 'monthly' ? monthlyLink : yearlyLink;

    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert(`Don't know how to open this URL: ${url}`);
      }
    } catch (error) {
      console.error('Failed to open payment link:', error);
      Alert.alert('Error', 'Could not open payment page.');
    }

    // Keep modal closing logic
    setShowPaywall(false);
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <View style={styles.form}>
        {error && error !== MESSAGE_LIMIT_ERROR && (
          <Text
            style={[
              styles.errorText,
              {
                color: colors.error,
                backgroundColor: colorScheme === 'dark' ? '#232526' : '#fff',
                padding: 12,
                borderRadius: 8,
                textAlign: 'center',
              },
            ]}
          >
            {' '}
            {error}{' '}
          </Text>
        )}
        <PaywallModal
          visible={showPaywall}
          onClose={handleClosePaywall}
          onUpgrade={handleUpgrade}
          errorType={paywallType}
        />
        {Platform.OS !== 'web' &&
          (showAddOnboarding && addOnboardingStep === 1 ? (
            <Tooltip
              isVisible={true}
              content={
                <Text>
                  You can add contacts from your phone by clicking the "Add from
                  Contacts" button.
                </Text>
              }
              placement="bottom"
              onClose={handleNextAddOnboarding}
              showChildInTooltip={false}
              useInteractionManager={true}
            >
              <TouchableOpacity
                style={[
                  styles.contactPickerButton,
                  { backgroundColor: colors.card },
                ]}
                onPress={() => setShowContactPicker(true)}
              >
                <Users size={24} color={colors.accent} />
                <Text
                  style={[styles.contactPickerText, { color: colors.accent }]}
                >
                  Add from Contacts
                </Text>
              </TouchableOpacity>
            </Tooltip>
          ) : (
            <TouchableOpacity
              style={[
                styles.contactPickerButton,
                { backgroundColor: colors.card },
              ]}
              onPress={() => setShowContactPicker(true)}
            >
              <Users size={24} color={colors.accent} />
              <Text
                style={[styles.contactPickerText, { color: colors.accent }]}
              >
                Add from Contacts
              </Text>
            </TouchableOpacity>
          ))}

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
        {showAddOnboarding && addOnboardingStep === 2 ? (
          <Tooltip
            isVisible={true}
            content={
              <Text>
                You can choose how often you want to be reminded to reach out to
                this person by selecting contact frequency.
              </Text>
            }
            placement="bottom"
            onClose={handleNextAddOnboarding}
            showChildInTooltip={false}
            useInteractionManager={true}
          >
            <View style={styles.frequencyButtons}>
              {frequencies.map((freq) => (
                <TouchableOpacity
                  key={freq}
                  style={[
                    styles.frequencyButton,
                    formData.frequency === freq && {
                      backgroundColor: colors.accent,
                    },
                  ]}
                  onPress={() => setFormData({ ...formData, frequency: freq })}
                >
                  <Text
                    style={[
                      styles.frequencyButtonText,
                      formData.frequency === freq && { color: '#fff' },
                    ]}
                  >
                    {freq.charAt(0).toUpperCase() + freq.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </Tooltip>
        ) : (
          <View style={styles.frequencyButtons}>
            {frequencies.map((freq) => (
              <TouchableOpacity
                key={freq}
                style={[
                  styles.frequencyButton,
                  formData.frequency === freq && {
                    backgroundColor: colors.accent,
                  },
                ]}
                onPress={() => setFormData({ ...formData, frequency: freq })}
              >
                <Text
                  style={[
                    styles.frequencyButtonText,
                    formData.frequency === freq && { color: '#fff' },
                  ]}
                >
                  {freq.charAt(0).toUpperCase() + freq.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

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
          First Reminder Time
        </Text>
        {showAddOnboarding && addOnboardingStep === 3 ? (
          <Tooltip
            isVisible={true}
            content={
              <Text>
                You can specify when you want to first be reminded to reach out
                to this contact here.
              </Text>
            }
            placement="bottom"
            onClose={handleNextAddOnboarding}
            showChildInTooltip={false}
            useInteractionManager={true}
          >
            <TouchableOpacity
              style={[
                styles.input,
                { backgroundColor: colors.card, marginBottom: 16 },
              ]}
              onPress={() => setShowFirstContactDatePicker(true)}
            >
              <Text style={{ color: colors.text }}>
                {formData.firstContactDate
                  ? formData.firstContactDate.toLocaleString()
                  : 'Select Date & Time'}
              </Text>
            </TouchableOpacity>
          </Tooltip>
        ) : (
          <TouchableOpacity
            style={[
              styles.input,
              { backgroundColor: colors.card, marginBottom: 16 },
            ]}
            onPress={() => setShowFirstContactDatePicker(true)}
          >
            <Text style={{ color: colors.text }}>
              {formData.firstContactDate
                ? formData.firstContactDate.toLocaleString()
                : 'Select Date & Time'}
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[
            styles.submitButton,
            { backgroundColor: colors.accent },
            loading && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={loading} // Add this prop
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

      <Modal
        visible={showContactPermissionPrompt}
        transparent={true}
        animationType="fade"
      >
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: 'rgba(0,0,0,0.4)',
          }}
        >
          <View
            style={{
              backgroundColor: colors.card,
              padding: 24,
              borderRadius: 16,
              alignItems: 'center',
              maxWidth: 340,
            }}
          >
            <Text
              style={{
                fontSize: 20,
                fontWeight: '600',
                marginBottom: 12,
                color: colors.text,
              }}
            >
              Access Contacts
            </Text>
            <Text
              style={{
                color: colors.secondaryText,
                fontSize: 15,
                textAlign: 'center',
                marginBottom: 20,
              }}
            >
              To easily add people from your device, please allow Everloop to
              access your contacts.
            </Text>
            <TouchableOpacity
              style={{
                backgroundColor: colors.accent,
                paddingVertical: 10,
                paddingHorizontal: 30,
                borderRadius: 8,
                marginBottom: 8,
              }}
              onPress={requestContactPermission}
            >
              <Text
                style={{
                  color: '#fff',
                  fontWeight: '600',
                  fontSize: 16,
                }}
              >
                Enable Contacts Access
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShowContactPermissionPrompt(false)}
            >
              <Text
                style={{
                  color: colors.secondaryText,
                  fontSize: 15,
                  marginTop: 4,
                }}
              >
                Maybe later
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    backgroundColor: '#9d9e9e',
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
    marginBottom: 16,
    fontSize: 14,
  },
});
