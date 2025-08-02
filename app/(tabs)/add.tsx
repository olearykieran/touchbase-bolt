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
  Alert,
  SafeAreaView,
  KeyboardAvoidingView,
  ImageBackground,
} from 'react-native';
import * as Contacts from 'expo-contacts';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../components/ThemeProvider';
import Tooltip from 'react-native-walkthrough-tooltip';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RevenueCatPaywallModal from '../../components/RevenueCatPaywallModal';
import Constants from 'expo-constants';
import { supabase } from '@/lib/supabase';
import { RevenueCatPaymentService } from '@/services/revenueCatPayment';
import { facebookAds } from '@/services/facebookAds';
import { useHeaderHeight } from '@react-navigation/elements';
import { ThemedText } from '@/components/ThemedText';
import DateTimePicker from '@react-native-community/datetimepicker';
import React from 'react';
import { useContactStore } from '@/lib/store';
import { router } from 'expo-router';
import { UserPlus, Users, User, Phone, Mail, Info } from 'lucide-react-native';
import ContactPickerModal from '@/components/ContactPickerModal';
import Notifications from 'expo-notifications';

export default function AddContactScreen() {
  const addContact = useContactStore((state) => state.addContact);
  const loading = useContactStore((state) => state.loading);
  const error = useContactStore((state) => state.error);
  const clearError = useContactStore((state) => state.clearError);
  const [showContactPicker, setShowContactPicker] = React.useState(false);
  const [showBirthdayPicker, setShowBirthdayPicker] = React.useState(false);
  const [showFirstContactDatePicker, setShowFirstContactDatePicker] =
    React.useState(false);
  const [contactPermissionStatus, setContactPermissionStatus] = React.useState<
    'undetermined' | 'granted' | 'denied'
  >('undetermined');
  const [showContactPermissionPrompt, setShowContactPermissionPrompt] =
    React.useState(false);
  const { colors, colorScheme } = useTheme();
  const headerHeight = useHeaderHeight();

  const [formData, setFormData] = React.useState({
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
    // Don't navigate if there's an error - let paywall show
    const currentError = useContactStore.getState().error;
    if (!currentError) {
      // Clear the form data after successful submission
      setFormData({
        name: '',
        email: '',
        phone: '',
        frequency: 'weekly',
        birthday: undefined,
        firstContactDate: undefined,
      });
      router.push('/(tabs)/' as any);
    } else {
      console.log('[AddContactScreen] Error after addContact:', currentError);
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
    setShowContactPermissionPrompt(false);
  };

  // Onboarding state
  const [showAddOnboarding, setShowAddOnboarding] = React.useState(false);
  const [addOnboardingStep, setAddOnboardingStep] = React.useState(0); // 0: none, 1: contacts btn, 2: freq, 3: reminder
  const addOnboardingKey = 'add_contact_onboarding_v1';

  // Add state for tooltip visibility explicitly to ensure tooltips can be turned off
  const [tooltipVisible, setTooltipVisible] = React.useState(false);

  React.useEffect(() => {
    (async () => {
      const shown = await AsyncStorage.getItem(addOnboardingKey);
      if (!shown) {
        setTimeout(() => {
          setShowAddOnboarding(true);
          setAddOnboardingStep(3); // Skip to step 3 since we removed steps 1 and 2
          setTooltipVisible(true);
        }, 1000);
      }
    })();
  }, []);

  const handleNextAddOnboarding = () => {
    if (addOnboardingStep < 3) {
      setAddOnboardingStep(addOnboardingStep + 1);
      setTooltipVisible(true);
    } else {
      // Close all tooltips
      setShowAddOnboarding(false);
      setAddOnboardingStep(0);
      setTooltipVisible(false);
      AsyncStorage.setItem(addOnboardingKey, 'true');
    }
  };

  // Explicit handler for closing tooltips
  const handleCloseTooltip = () => {
    setTooltipVisible(false);
  };

  // Ensure tooltips are closed when navigating away
  React.useEffect(() => {
    return () => {
      setTooltipVisible(false);
      setShowAddOnboarding(false);
    };
  }, []);

  const [showPaywall, setShowPaywall] = React.useState(false);
  const [paywallType, setPaywallType] = React.useState<'contacts' | 'messages'>(
    'contacts'
  );

  // Error message constant for message limit
  const MESSAGE_LIMIT_ERROR =
    'Free tier limited to 3 AI messages per week. Subscribe to unlock more.';
  const CONTACT_LIMIT_ERROR =
    'Free tier limited to 3 contacts. Subscribe to unlock more.';

  // Single useEffect to handle error states and paywall
  React.useEffect(() => {
    console.log('[AddContactScreen] Error state changed:', error);
    if (error) {
      // Check for contact limit error (exact match or contains)
      if (error === CONTACT_LIMIT_ERROR || error.toLowerCase().includes('free tier limited to 3 contacts')) {
        console.log('[AddContactScreen] Showing contact limit paywall');
        setShowPaywall(true);
        setPaywallType('contacts');
      } 
      // Check for message limit error
      else if (error === MESSAGE_LIMIT_ERROR) {
        console.log('[AddContactScreen] Showing message limit paywall');
        setShowPaywall(true);
        setPaywallType('messages');
      }
      // Check for generic payment required errors
      else if (error.toLowerCase().includes('payment') || error.toLowerCase().includes('subscribe')) {
        console.log('[AddContactScreen] Showing generic paywall');
        setShowPaywall(true);
        setPaywallType('contacts');
      }
    }
  }, [error]);

  const handleClosePaywall = () => {
    console.log(
      '[AddContactScreen] handleClosePaywall called, closing paywall.'
    );
    setShowPaywall(false);
    // Clear error after a delay to prevent immediate re-triggering
    setTimeout(() => {
      clearError();
    }, 100);
  };

  const handleUpgrade = async (plan: 'monthly' | 'yearly') => {
    try {
      // Use RevenueCat for all subscription handling
      const success = await RevenueCatPaymentService.purchaseSubscription(plan);

      if (success) {
        console.log(
          `RevenueCat purchase initiated successfully for ${plan} plan`
        );
        
        // Track purchase in Facebook Ads
        const amount = plan === 'monthly' ? 4.99 : 49.99;
        await facebookAds.trackPurchase(amount, 'USD', plan);
        
        // Show success message
        Alert.alert(
          'Success!', 
          'Your subscription has been activated. You can now add unlimited contacts!',
          [{ text: 'OK' }]
        );
      }
    } catch (err: any) {
      Alert.alert('Error', err.message);
      console.error('Subscription Error:', err);
    } finally {
      // Don't clear error immediately to allow paywall to show
      setShowPaywall(false);
      setTimeout(() => {
        clearError();
      }, 100);
    }
  };

  return (
    <ImageBackground 
      source={{ uri: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==' }}
      style={[styles.container, { backgroundColor: colors.background }]}
      imageStyle={{ opacity: 0.02 }}
    >
    <SafeAreaView style={[styles.container, { backgroundColor: 'transparent' }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            flexGrow: 1,
            paddingTop: 32,
            paddingBottom: 20,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={true}
        >
      <View style={styles.form}>
        {error && error !== MESSAGE_LIMIT_ERROR && (
          <ThemedText
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
          </ThemedText>
        )}
        <RevenueCatPaywallModal
          visible={showPaywall}
          onClose={handleClosePaywall}
          onUpgrade={handleUpgrade}
          errorType={paywallType}
        />
        {Platform.OS !== 'web' && (
          <TouchableOpacity
            style={[
              styles.contactPickerButton,
              {
                backgroundColor: 'transparent',
                borderWidth: 1,
                borderColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.2)',
              },
            ]}
            onPress={() => {
              if (contactPermissionStatus !== 'granted') {
                setShowContactPermissionPrompt(true);
              } else {
                setShowContactPicker(true);
              }
            }}
          >
            <Users size={20} color={colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)'} />
            <ThemedText
              style={[styles.contactPickerText, { 
                color: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)', 
                fontWeight: '500', 
                fontSize: 14 
              }]}
            >
              Click here to import from Contacts
            </ThemedText>
          </TouchableOpacity>
        )}

        <View style={styles.row}>
          <View style={styles.column}>
            <ThemedText style={[styles.label, { color: colors.text }]}>
              Name
            </ThemedText>
            <View style={styles.inputContainer}>
              <User size={18} color={colors.mutedText} style={styles.inputIcon} />
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
                    borderBottomWidth: 2,
                    borderBottomColor: colors.border,
                    color: colors.text,
                    paddingLeft: 36,
                  },
                ]}
                placeholder="Name"
                placeholderTextColor={colors.mutedText}
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
              />
            </View>
          </View>
          <View style={styles.column}>
            <ThemedText style={[styles.label, { color: colors.text }]}>
              Phone
            </ThemedText>
            <View style={styles.inputContainer}>
              <Phone size={18} color={colors.mutedText} style={styles.inputIcon} />
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
                    borderBottomWidth: 2,
                    borderBottomColor: colors.border,
                    color: colors.text,
                    paddingLeft: 36,
                  },
                ]}
                placeholder="Phone"
                placeholderTextColor={colors.mutedText}
                keyboardType="phone-pad"
                value={formData.phone}
                onChangeText={(text) => setFormData({ ...formData, phone: text })}
              />
            </View>
          </View>
        </View>

        <ThemedText style={[styles.label, { color: colors.text }]}>
          Email (optional)
        </ThemedText>
        <View style={styles.inputContainer}>
          <Mail size={18} color={colors.mutedText} style={styles.inputIcon} />
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
                borderBottomWidth: 2,
                borderBottomColor: colors.border,
                color: colors.text,
                paddingLeft: 36,
              },
            ]}
            placeholder="Email (optional)"
            placeholderTextColor={colors.mutedText}
            keyboardType="email-address"
            autoCapitalize="none"
            value={formData.email}
            onChangeText={(text) => setFormData({ ...formData, email: text })}
          />
        </View>

        <ThemedText style={[styles.label, { color: colors.text }]}>
          Contact Frequency
        </ThemedText>
        <View style={styles.frequencyButtons}>
          {frequencies.map((freq) => (
              <View key={freq} style={styles.frequencyButtonContainer}>
                <TouchableOpacity
                  style={[
                    styles.frequencyButton,
                    formData.frequency === freq && styles.frequencyButtonActive,
                    {
                      backgroundColor:
                        formData.frequency === freq
                          ? colorScheme === 'dark' ? 'rgba(113, 113, 122, 0.5)' : 'rgba(113, 113, 122, 0.4)'
                          : colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.15)',
                      borderWidth: 1,
                      borderColor: 
                        formData.frequency === freq
                          ? colors.accent
                          : colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)',
                      backdropFilter: 'blur(20px)',
                      shadowColor: formData.frequency === freq ? colors.accent : 'transparent',
                      shadowOffset: { width: 0, height: 0 },
                      shadowOpacity: formData.frequency === freq ? 0.3 : 0,
                      shadowRadius: 10,
                      elevation: formData.frequency === freq ? 5 : 0,
                    },
                  ]}
                  onPress={() => setFormData({ ...formData, frequency: freq })}
                >
                  <ThemedText
                    style={[
                      styles.frequencyButtonText,
                      formData.frequency === freq && styles.frequencyButtonTextActive,
                      {
                        color:
                          formData.frequency === freq
                            ? '#fff'
                            : colorScheme === 'dark' ? '#ffffff' : '#000000',
                        opacity: formData.frequency === freq ? 1 : 0.9,
                      },
                    ]}
                  >
                    {freq.charAt(0).toUpperCase() + freq.slice(1)}
                  </ThemedText>
                </TouchableOpacity>
              </View>
            ))}
          </View>

        <View style={styles.row}>
          <View style={styles.column}>
            <ThemedText style={[styles.label, { color: colors.text }]}>
              Birthday (optional)
            </ThemedText>
            <TouchableOpacity
              style={[
                styles.datePickerButton,
                {
                  backgroundColor: colorScheme === 'dark' ? 'rgba(113, 113, 122, 0.3)' : 'rgba(113, 113, 122, 0.25)',
                  borderWidth: 1,
                  borderColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.4)',
                  backdropFilter: 'blur(10px)',
                },
              ]}
              onPress={() => setShowBirthdayPicker(true)}
            >
              <ThemedText
                style={{
                  color: formData.birthday ? colors.text : colors.secondaryText,
                  opacity: 0.9,
                  fontSize: 14,
                }}
                numberOfLines={1}
              >
                {formData.birthday
                  ? formData.birthday.toLocaleDateString()
                  : 'Select birthday'}
              </ThemedText>
            </TouchableOpacity>
          </View>
          <View style={styles.column}>
            <ThemedText style={[styles.label, { color: colors.text }]}>
              First Reminder (optional)
            </ThemedText>
            <TouchableOpacity
                style={[
                  styles.datePickerButton,
                  {
                    backgroundColor: colorScheme === 'dark' ? 'rgba(113, 113, 122, 0.3)' : 'rgba(113, 113, 122, 0.25)',
                    borderWidth: 1,
                    borderColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.4)',
                    backdropFilter: 'blur(10px)',
                  },
                ]}
                onPress={() => setShowFirstContactDatePicker(true)}
              >
                <ThemedText style={{ color: colors.text, opacity: 0.9 }}>
                  {formData.firstContactDate
                    ? formData.firstContactDate.toLocaleString()
                    : 'Select Date & Time'}
                </ThemedText>
              </TouchableOpacity>
          </View>
        </View>

        <View style={styles.noteContainer}>
          <View style={styles.noteContent}>
            <Info size={16} color={colors.secondaryText} style={styles.noteIcon} />
            <ThemedText style={[styles.noteText, { color: colors.secondaryText }]}>
              Note: The "First Reminder" time sets when reminders will be sent. If not specified, reminders will be scheduled at the current time when you add the contact.
            </ThemedText>
          </View>
        </View>
      </View>
        </ScrollView>
        
      <View style={styles.bottomButtonContainer}>
        <TouchableOpacity
          style={[
            styles.submitButton,
            { 
              backgroundColor: colorScheme === 'dark' ? 'rgba(113, 113, 122, 0.6)' : 'rgba(113, 113, 122, 0.5)',
              borderWidth: 1,
              borderColor: colors.accent,
              backdropFilter: 'blur(20px)',
              shadowColor: colors.accent,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 12,
              elevation: 8,
            },
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
              <ThemedText style={[styles.submitButtonText, { color: '#fff' }]}>
                Add Contact
              </ThemedText>
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
                <ThemedText style={{ color: colors.accent, fontSize: 16 }}>
                  Cancel
                </ThemedText>
              </TouchableOpacity>
              <ThemedText
                style={{ fontWeight: '600', fontSize: 16, color: colors.text }}
              >
                Select Birthday
              </ThemedText>
              <TouchableOpacity onPress={() => setShowBirthdayPicker(false)}>
                <ThemedText style={{ color: colors.accent, fontSize: 16 }}>
                  Done
                </ThemedText>
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
                <ThemedText style={{ color: colors.accent, fontSize: 16 }}>
                  Cancel
                </ThemedText>
              </TouchableOpacity>
              <ThemedText
                style={{ fontWeight: '600', fontSize: 16, color: colors.text }}
              >
                First Reminder Time
              </ThemedText>
              <TouchableOpacity
                onPress={() => setShowFirstContactDatePicker(false)}
              >
                <ThemedText style={{ color: colors.accent, fontSize: 16 }}>
                  Done
                </ThemedText>
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
            <ThemedText
              style={{
                fontSize: 20,
                fontWeight: '600',
                marginBottom: 12,
                color: colors.text,
              }}
            >
              Access Contacts
            </ThemedText>
            <ThemedText
              style={{
                color: colors.secondaryText,
                fontSize: 15,
                textAlign: 'center',
                marginBottom: 20,
              }}
            >
              To easily add people from your device, please allow KeepTouch to
              access your contacts.
            </ThemedText>
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
              <ThemedText
                style={{
                  color: '#fff',
                  fontWeight: '600',
                  fontSize: 16,
                }}
              >
                Continue
              </ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  form: {
    padding: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 0,
  },
  column: {
    flex: 1,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#000',
  },
  inputContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  inputIcon: {
    position: 'absolute',
    left: 10,
    top: 14,
    zIndex: 1,
  },
  input: {
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
    borderWidth: 0,
  },
  contactPickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    gap: 8,
    borderWidth: 1,
    borderColor: '#ccc',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  contactPickerText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  frequencyButtons: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 24,
  },
  frequencyButtonContainer: {
    flex: 1,
  },
  frequencyButton: {
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 10,
    backgroundColor: '#E5E5EA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  frequencyButtonActive: {
    backgroundColor: '#9d9e9e',
  },
  frequencyButtonText: {
    color: '#000',
    fontSize: 13,
    fontWeight: '500',
  },
  frequencyButtonTextActive: {
    color: 'white',
  },
  bottomButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    backgroundColor: 'transparent',
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
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  noteContainer: {
    backgroundColor: 'rgba(113, 113, 122, 0.1)',
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 4,
    marginBottom: 16,
  },
  noteContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  noteIcon: {
    marginRight: 8,
    marginTop: 1,
  },
  noteText: {
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },
});
