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
import { UserPlus, Users } from 'lucide-react-native';
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
          setAddOnboardingStep(1);
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
        const amount = plan === 'monthly' ? 2.99 : 12.99;
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
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            flexGrow: 1,
            paddingTop: 16,
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
        {Platform.OS !== 'web' &&
          (showAddOnboarding && addOnboardingStep === 1 ? (
            <Tooltip
              isVisible={
                tooltipVisible && showAddOnboarding && addOnboardingStep === 1
              }
              content={
                <View style={{ padding: 8 }}>
                  <ThemedText
                    style={{ color: '#fff', fontWeight: '500', fontSize: 16 }}
                  >
                    Use this to add from your contacts
                  </ThemedText>
                  <TouchableOpacity
                    style={{
                      backgroundColor: colors.card,
                      paddingVertical: 8,
                      paddingHorizontal: 16,
                      borderRadius: 8,
                      marginTop: 8,
                      alignSelf: 'flex-end',
                    }}
                    onPress={handleNextAddOnboarding}
                  >
                    <ThemedText style={{ color: colors.accent, fontWeight: '600' }}>
                      Next
                    </ThemedText>
                  </TouchableOpacity>
                </View>
              }
              placement="bottom"
              onClose={handleCloseTooltip}
              contentStyle={{ backgroundColor: colors.accent }}
              arrowStyle={{ borderTopColor: colors.accent }}
              backgroundColor="rgba(0,0,0,0.4)"
            >
              <TouchableOpacity
                style={[
                  styles.contactPickerButton,
                  {
                    backgroundColor: colors.accent,
                    borderColor: colors.accent,
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
                <Users size={20} color="#ffffff" />
                <ThemedText
                  style={[
                    styles.contactPickerText,
                    { color: '#ffffff', fontWeight: '600' },
                  ]}
                >
                  Import from Contacts
                </ThemedText>
              </TouchableOpacity>
            </Tooltip>
          ) : (
            <TouchableOpacity
              style={[
                styles.contactPickerButton,
                {
                  backgroundColor: colors.accent,
                  borderWidth: 0,
                  borderColor: colors.accent,
                },
              ]}
              onPress={() => setShowContactPicker(true)}
            >
              <Users size={24} color="#ffffff" />
              <ThemedText
                style={[styles.contactPickerText, { color: '#ffffff', fontWeight: '600' }]}
              >
                Import from Contacts
              </ThemedText>
            </TouchableOpacity>
          ))}

        <ThemedText style={[styles.label, { color: colors.text }]}>
          Name
        </ThemedText>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: colors.secondaryBackground,
              borderWidth: 1,
              borderColor: colors.border,
              color: colors.text,
            },
          ]}
          placeholder="Name"
          placeholderTextColor={colors.mutedText}
          value={formData.name}
          onChangeText={(text) => setFormData({ ...formData, name: text })}
        />

        <ThemedText style={[styles.label, { color: colors.text }]}>
          Email
        </ThemedText>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: colors.secondaryBackground,
              borderWidth: 1,
              borderColor: colors.border,
              color: colors.text,
            },
          ]}
          placeholder="Email"
          placeholderTextColor={colors.mutedText}
          keyboardType="email-address"
          autoCapitalize="none"
          value={formData.email}
          onChangeText={(text) => setFormData({ ...formData, email: text })}
        />

        <ThemedText style={[styles.label, { color: colors.text }]}>
          Phone
        </ThemedText>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: colors.secondaryBackground,
              borderWidth: 1,
              borderColor: colors.border,
              color: colors.text,
            },
          ]}
          placeholder="Phone"
          placeholderTextColor={colors.mutedText}
          keyboardType="phone-pad"
          value={formData.phone}
          onChangeText={(text) => setFormData({ ...formData, phone: text })}
        />

        <ThemedText style={[styles.label, { color: colors.text }]}>
          Contact Frequency
        </ThemedText>
        {showAddOnboarding && addOnboardingStep === 2 ? (
          <Tooltip
            isVisible={
              tooltipVisible && showAddOnboarding && addOnboardingStep === 2
            }
            content={
              <View style={{ padding: 8 }}>
                <ThemedText
                  style={{ color: '#fff', fontWeight: '500', fontSize: 16 }}
                >
                  Choose how often to be in touch
                </ThemedText>
                <TouchableOpacity
                  style={{
                    backgroundColor: colors.card,
                    paddingVertical: 8,
                    paddingHorizontal: 16,
                    borderRadius: 8,
                    marginTop: 8,
                    alignSelf: 'flex-end',
                  }}
                  onPress={handleNextAddOnboarding}
                >
                  <ThemedText style={{ color: '#007AFF', fontWeight: '600' }}>
                    Next
                  </ThemedText>
                </TouchableOpacity>
              </View>
            }
            placement="top"
            onClose={handleCloseTooltip}
            contentStyle={{ backgroundColor: '#007AFF' }}
            arrowStyle={{ borderTopColor: '#007AFF' }}
            backgroundColor="rgba(0,0,0,0.4)"
          >
            <View style={styles.frequencyButtons}>
              {frequencies.map((frequency) => (
                <TouchableOpacity
                  key={frequency}
                  style={[
                    styles.frequencyButton,
                    formData.frequency === frequency &&
                      styles.frequencyButtonActive,
                    {
                      backgroundColor:
                        formData.frequency === frequency
                          ? colors.accent
                          : colors.secondaryBackground,
                    },
                  ]}
                  onPress={() => {
                    setFormData({ ...formData, frequency });
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                >
                  <ThemedText
                    style={[
                      styles.frequencyButtonText,
                      formData.frequency === frequency &&
                        styles.frequencyButtonTextActive,
                      {
                        color:
                          formData.frequency === frequency
                            ? '#fff'
                            : colors.mutedText,
                      },
                    ]}
                  >
                    {frequency.charAt(0).toUpperCase() + frequency.slice(1)}
                  </ThemedText>
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
                <ThemedText
                  style={[
                    styles.frequencyButtonText,
                    formData.frequency === freq && { color: '#fff' },
                  ]}
                >
                  {freq.charAt(0).toUpperCase() + freq.slice(1)}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <ThemedText style={[styles.label, { color: colors.text }]}>
          Birthday (optional)
        </ThemedText>
        <TouchableOpacity
          style={[
            styles.datePickerButton,
            {
              backgroundColor: colors.secondaryBackground,
              borderWidth: 1,
              borderColor: colors.border,
            },
          ]}
          onPress={() => setShowBirthdayPicker(true)}
        >
          <ThemedText
            style={{
              color: formData.birthday ? colors.text : colors.secondaryText,
            }}
          >
            {formData.birthday
              ? formData.birthday.toLocaleDateString()
              : 'Select birthday (optional)'}
          </ThemedText>
        </TouchableOpacity>

        <ThemedText style={[styles.label, { color: colors.text }]}>
          First Reminder Time
        </ThemedText>
        {showAddOnboarding && addOnboardingStep === 3 ? (
          <Tooltip
            isVisible={
              tooltipVisible && showAddOnboarding && addOnboardingStep === 3
            }
            content={
              <View style={{ padding: 8 }}>
                <ThemedText
                  style={{ color: '#fff', fontWeight: '500', fontSize: 16 }}
                >
                  Use the button when you're ready
                </ThemedText>
                <TouchableOpacity
                  style={{
                    backgroundColor: colors.card,
                    paddingVertical: 8,
                    paddingHorizontal: 16,
                    borderRadius: 8,
                    marginTop: 8,
                    alignSelf: 'flex-end',
                  }}
                  onPress={handleNextAddOnboarding}
                >
                  <ThemedText style={{ color: colors.accent, fontWeight: '600' }}>
                    Got it!
                  </ThemedText>
                </TouchableOpacity>
              </View>
            }
            placement="top"
            onClose={handleCloseTooltip}
            contentStyle={{ backgroundColor: '#007AFF' }}
            arrowStyle={{ borderTopColor: '#007AFF' }}
            backgroundColor="rgba(0,0,0,0.4)"
          >
            <TouchableOpacity
              style={[
                styles.datePickerButton,
                {
                  backgroundColor: colors.secondaryBackground,
                  borderWidth: 1,
                  borderColor: colors.border,
                },
              ]}
              onPress={() => setShowFirstContactDatePicker(true)}
            >
              <ThemedText style={{ color: colors.text }}>
                {formData.firstContactDate
                  ? formData.firstContactDate.toLocaleString()
                  : 'Select Date & Time'}
              </ThemedText>
            </TouchableOpacity>
          </Tooltip>
        ) : (
          <TouchableOpacity
            style={[
              styles.datePickerButton,
              {
                backgroundColor: colors.secondaryBackground,
                borderWidth: 1,
                borderColor: colors.border,
              },
            ]}
            onPress={() => setShowFirstContactDatePicker(true)}
          >
            <ThemedText style={{ color: colors.text }}>
              {formData.firstContactDate
                ? formData.firstContactDate.toLocaleString()
                : 'Select Date & Time'}
            </ThemedText>
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
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
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
    borderWidth: 1,
    borderColor: '#ccc',
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
    marginTop: 24,
    marginBottom: 20,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 5,
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
    borderRadius: 8,
    marginBottom: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ccc',
  },
});
