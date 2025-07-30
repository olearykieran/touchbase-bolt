import {
  View,
  StyleSheet,
  Switch,
  TouchableOpacity,
  ScrollView,
  Platform,
  Alert,
  Share,
  Linking,
  ImageBackground,
} from 'react-native';
import { useState, useEffect } from 'react';
import {
  Bell,
  Clock,
  Share2,
  HelpCircle,
  LogOut,
  Calendar,
  Trash2,
  CreditCard,
  Ban,
  RefreshCw,
  Download,
} from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import React from 'react';
import { useTheme, ThemeType } from '../../components/ThemeProvider';
import { facebookAds } from '@/services/facebookAds';
import {
  registerForPushNotificationsAsync,
  scheduleNotificationsForContacts,
  sendTestNotification,
} from '../../lib/notificationUtils';
import { useHeaderHeight } from '@react-navigation/elements';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemedText } from '@/components/ThemedText';
import { PaymentService } from '@/services/payment';
import { isSimulator } from '@/services/payment';
import { RevenueCatPaymentService } from '@/services/revenueCatPayment';
import RevenueCatPaywallModal from '@/components/RevenueCatPaywallModal';
import { IAPDebugPanel } from '@/components/IAPDebugPanel';
import { SubscriptionDebugModal } from '@/components/SubscriptionDebugModal';

// Configure notification handler
// Notifications.setNotificationHandler({
//   handleNotification: async () => ({
//     shouldShowAlert: true,
//     shouldPlaySound: true,
//     shouldSetBadge: true,
//   }),
// });

export default function SettingsScreen() {
  const { theme, colorScheme, setTheme, colors } = useTheme();
  const headerHeight = useHeaderHeight();
  const [notifications, setNotifications] = useState(true);
  const [notificationStatus, setNotificationStatus] = useState<string>('');
  const [subscriptionStatus, setSubscriptionStatus] =
    useState<string>('Loading...');
  const [subscriptionEnd, setSubscriptionEnd] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0); // To force re-fetch
  const [showPaywall, setShowPaywall] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const [showDebugModal, setShowDebugModal] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web') {
      checkNotificationPermissions();

      // Listen for notification responses
      const responseSubscription =
        Notifications.addNotificationResponseReceivedListener((response) => {
          const contactId =
            response.notification.request.content.data.contactId;
          if (contactId) {
            router.push('/');
          }
        });

      // Listen for notification receipt (foreground)
      const receivedSubscription =
        Notifications.addNotificationReceivedListener((notification) => {
          // Let the notification handler show the banner instead of using Alert
          console.log('Received foreground notification:', notification);
        });

      return () => {
        responseSubscription.remove();
        receivedSubscription.remove();
      };
    }

    // Fetch subscription status on mount
    fetchSubscriptionStatus();
    
    // Fetch user email
    fetchUserEmail();
  }, []);

  useEffect(() => {
    // Fetch subscription status whenever refreshTrigger changes
    fetchSubscriptionStatus();
  }, [refreshTrigger]);

  // Check for profile refresh flag when screen gains focus
  useFocusEffect(
    React.useCallback(() => {
      const checkProfileRefresh = async () => {
        try {
          const needsRefresh = await AsyncStorage.getItem('need_profile_refresh');
          if (needsRefresh === 'true') {
            console.log('[Settings] Profile refresh needed, fetching subscription status...');
            await AsyncStorage.removeItem('need_profile_refresh');
            await fetchSubscriptionStatus();
          }
        } catch (error) {
          console.error('[Settings] Error checking profile refresh flag:', error);
        }
      };
      
      checkProfileRefresh();
    }, [])
  );

  const checkNotificationPermissions = async () => {
    const { status } = await Notifications.getPermissionsAsync();
    setNotificationStatus(status);
  };

  const toggleNotificationSetting = async (setting: string, value: boolean) => {
    if (setting === 'notifications' && value && Platform.OS !== 'web') {
      // Request permissions if needed, but token retrieval is handled elsewhere
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please enable notifications in settings.'
        );
        setNotifications(false); // Keep switch off if permission denied
        return;
      }
      // await scheduleNotificationsForContacts(); // Use imported function - COMMENTED OUT
    }

    switch (setting) {
      case 'notifications':
        setNotifications(value);
        if (!value && Platform.OS !== 'web') {
          // await Notifications.cancelAllScheduledNotificationsAsync(); // COMMENTED OUT
        }
        break;
      default:
        // For other settings, just update the state
        // await Notifications.cancelAllScheduledNotificationsAsync(); // COMMENTED OUT
        break;
    }
  };

  const handleSignOut = async () => {
    if (Platform.OS !== 'web') {
      // await Notifications.cancelAllScheduledNotificationsAsync(); // COMMENTED OUT
    }
    
    // Clear Facebook user data before signing out
    await facebookAds.clearUserData();
    
    await supabase.auth.signOut();
  };

  const handleDeleteAccount = async () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to permanently delete your account and all your contacts? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // Get current session for auth
              const {
                data: { session },
                error: sessionError,
              } = await supabase.auth.getSession();
              if (sessionError || !session)
                throw new Error('Please sign in again.');

              // Call the edge function to delete user and contacts
              const response = await fetch(
                `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/delete-user`,
                {
                  method: 'POST',
                  headers: {
                    Authorization: `Bearer ${session.access_token}`,
                    'Content-Type': 'application/json',
                  },
                }
              );

              if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Failed to delete account.');
              }

              // Clear Facebook data and log out
              await facebookAds.clearUserData();
              await supabase.auth.signOut();
              router.replace('/');
            } catch (error: any) {
              Alert.alert(
                'Error',
                error.message || 'Failed to delete account.'
              );
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  const handleTestNotification = async () => {
    try {
      console.log('Testing notifications...');

      // Method 1: Direct presentation
      await Notifications.presentNotificationAsync({
        title: 'Direct Test',
        body: 'This is a direct notification test',
        sound: true,
        badge: 1,
      });

      // Method 2: Immediate schedule
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Immediate Schedule Test',
          body: 'This is an immediate scheduled notification',
          sound: true,
          badge: 2,
        },
        trigger: null,
      });

      // Method 3: Delayed schedule (5 seconds)
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Delayed Test',
          body: 'This is a delayed notification (5 seconds)',
          sound: true,
          badge: 3,
          priority: 'max',
          categoryIdentifier: 'reminder',
        },
        trigger: {
          seconds: 5,
          repeats: false,
          type: 'timeInterval' as const,
        },
      });

      console.log('All test notifications sent');
      Alert.alert(
        'Success',
        'Test notifications sent. Check your notification center.'
      );
    } catch (error) {
      console.error('Error sending test notifications:', error);
      Alert.alert(
        'Error',
        'Could not send test notifications. Check console for details.'
      );
    }
  };

  const fetchUserEmail = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        setUserEmail(user.email);
      }
    } catch (error) {
      console.error('Error fetching user email:', error);
    }
  };

  const fetchSubscriptionStatus = async () => {
    try {
      setIsLoading(true); // Start loading indicator
      console.log('Fetching subscription status...');
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        console.error('Session error:', sessionError);
        setSubscriptionStatus('Error (Session)');
        setIsLoading(false);
        return;
      }

      if (!session) {
        console.error('No active session');
        setSubscriptionStatus('Not signed in');
        setIsLoading(false);
        return;
      }

      console.log('User ID:', session.user.id);

      const { data, error } = await supabase
        .from('profiles')
        .select(
          'subscription_status, subscription_end, weekly_message_count, contact_count'
        )
        .eq('id', session.user.id)
        .single();

      if (error) {
        console.error('Error fetching subscription:', error);
        setSubscriptionStatus('Error (DB)');
        setIsLoading(false);
        return;
      }

      if (!data) {
        console.error('No data returned');
        setSubscriptionStatus('No data');
        setIsLoading(false);
        return;
      }

      console.log('Profile data:', data);

      // Format the subscription status nicely
      let displayStatus = 'Free';
      if (data.subscription_status === 'monthly') {
        displayStatus = 'Monthly ($2.99/month)';
      } else if (data.subscription_status === 'yearly') {
        displayStatus = 'Yearly ($12.99/year)';
      }

      console.log('Setting subscription status to:', displayStatus);
      setSubscriptionStatus(displayStatus);

      // Format the end date if it exists
      if (data.subscription_end) {
        const endDate = new Date(data.subscription_end);
        console.log('Subscription ends:', endDate.toLocaleDateString());
        setSubscriptionEnd(endDate.toLocaleDateString());
      }
    } catch (err) {
      console.error('Failed to fetch subscription status:', err);
      setSubscriptionStatus('Error (Exception)');
    } finally {
      setIsLoading(false); // End loading regardless of outcome
    }
  };

  const handleCancelSubscription = async () => {
    Alert.alert(
      'Cancel Subscription',
      'Are you sure you want to cancel your subscription? You will still have access until the end of your current billing period.',
      [
        { text: 'No, Keep It', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsLoading(true);
              
              // Use RevenueCat for subscription management
              const success = await RevenueCatPaymentService.cancelSubscription();
              
              if (success && Platform.OS === 'android') {
                Alert.alert(
                  'Success',
                  'Your subscription has been canceled. You will still have access until the end of your current billing period.'
                );
              }
              
              // Refresh the subscription status regardless of platform
              fetchSubscriptionStatus();
            } catch (err: any) {
              Alert.alert(
                'Error',
                err.message || 'Failed to cancel subscription'
              );
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  // Handle restore purchases (iOS only)
  const handleRestorePurchases = async () => {
    if (Platform.OS !== 'ios') {
      Alert.alert('Not Available', 'Restore purchases is only available on iOS devices');
      return;
    }
    
    try {
      setIsLoading(true);
      const success = await RevenueCatPaymentService.restorePurchases();
      
      if (success) {
        Alert.alert('Success', 'Your purchases have been restored.');
        fetchSubscriptionStatus();
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to restore purchases. Please try again.');
      console.error('Restore purchases error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle opening iTunes subscription management
  const handleManageSubscription = async () => {
    if (Platform.OS === 'ios') {
      // Check if we're in a simulator
      if (isSimulator()) {
        Alert.alert(
          'Test Mode',
          'Running in simulator. iTunes subscription management is not available in the simulator.',
          [{ text: 'OK' }]
        );
        return;
      }
      
      // In a real device, try to open the iTunes URL
      try {
        await Linking.openURL('itms-apps://apps.apple.com/account/subscriptions');
      } catch (error) {
        console.error('Error opening subscription URL:', error);
        Alert.alert(
          'Subscription Management',
          'Please open Settings > iTunes & App Store > Your Apple ID > Subscriptions to manage your subscription.',
          [{ text: 'OK' }]
        );
      }
    } else {
      Alert.alert('Not Available', 'This option is only available on iOS devices');
    }
  };

  return (
  <ImageBackground 
    source={{ uri: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==' }}
    style={[styles.container, { backgroundColor: colors.background }]}
    imageStyle={{ opacity: 0.02 }}
  >
    <ScrollView
      style={{ flex: 1, backgroundColor: 'transparent' }}
      contentContainerStyle={{ 
        paddingBottom: Platform.OS === 'ios' ? 100 : 80, 
        paddingTop: headerHeight + 16 
      }}
    >
      {userEmail && (
        <View style={[styles.section, { 
          backgroundColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.6)',
          borderWidth: 1,
          borderColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.8)',
          marginBottom: 8,
          backdropFilter: 'blur(20px)',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.05,
          shadowRadius: 4,
          elevation: 2,
        }]}>
          <View style={styles.setting}>
            <ThemedText style={[styles.settingText, { fontSize: 14, color: colors.secondaryText }]}>
              Signed in as
            </ThemedText>
            <ThemedText style={[styles.settingValue, { fontSize: 16, fontWeight: '500', marginTop: 4 }]}>
              {userEmail}
            </ThemedText>
          </View>
        </View>
      )}
      
      <View style={[styles.section, { 
        backgroundColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.6)',
        borderWidth: 1,
        borderColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.8)',
        backdropFilter: 'blur(20px)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
      }]}>
        <ThemedText style={[styles.sectionTitle]}>Notifications</ThemedText>
        <View style={styles.setting}>
          <View style={styles.settingInfo}>
            <Bell size={24} color={colors.accent} />
            <ThemedText style={[styles.settingText]}>Enable Notifications</ThemedText>
          </View>
          <Switch
            value={notifications}
            onValueChange={(value) =>
              toggleNotificationSetting('notifications', value)
            }
            trackColor={{ false: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)', true: colors.accent + '55' }}
            thumbColor={notifications ? colors.accent : colorScheme === 'dark' ? '#e5e5ea' : '#f4f3f4'}
          />
        </View>
      </View>

      {/* Theme Section */}
      <View style={[styles.section, { 
        backgroundColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.6)',
        borderWidth: 1,
        borderColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.8)',
        backdropFilter: 'blur(20px)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
      }]}>
        <ThemedText style={[styles.sectionTitle]}>Appearance</ThemedText>
        <View style={styles.setting}>
          <ThemedText style={[styles.settingText]}>Theme</ThemedText>
        </View>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginTop: 8,
          }}
        >
          {(['system', 'light', 'dark'] as ThemeType[]).map((option) => (
            <TouchableOpacity
              key={option}
              style={{
                flex: 1,
                marginHorizontal: 4,
                backgroundColor: theme === option ? colors.accent : colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.4)',
                borderRadius: 10,
                padding: 12,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: theme === option ? colors.accent : colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.6)',
                backdropFilter: 'blur(10px)',
                shadowColor: theme === option ? colors.accent : 'transparent',
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: theme === option ? 0.3 : 0,
                shadowRadius: 10,
                elevation: theme === option ? 3 : 0,
              }}
              onPress={() => setTheme(option)}
            >
              <ThemedText
                style={{
                  color: theme === option ? '#fff' : colors.text,
                  fontWeight: '600',
                  textTransform: 'capitalize',
                }}
              >
                {option === 'system'
                  ? 'System Default'
                  : option.charAt(0).toUpperCase() + option.slice(1)}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={[styles.section, { 
        backgroundColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.6)',
        borderWidth: 1,
        borderColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.8)',
        backdropFilter: 'blur(20px)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
      }]}>
        <ThemedText style={[styles.sectionTitle]}>General</ThemedText>
        <TouchableOpacity
          style={[styles.setting, {
            backgroundColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
            borderRadius: 10,
            marginVertical: 4,
            paddingHorizontal: 12,
          }]}
          onPress={async () => {
            try {
              await Share.share({
                title: 'KeepTouch',
                message:
                  'Stay in touch with the people who matter most! Download KeepTouch: https://apps.apple.com/app/id6501184872',
                url: 'https://apps.apple.com/app/id6501184872',
              });
            } catch (error) {
              Alert.alert('Error', 'Unable to share the app.');
            }
          }}
        >
          <View style={styles.settingInfo}>
            <Share2 size={24} color={colors.accent} />
            <ThemedText style={[styles.settingText]}>Share App</ThemedText>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.setting, {
            backgroundColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
            borderRadius: 10,
            marginVertical: 4,
            paddingHorizontal: 12,
          }]}
          onPress={() => {
            Linking.openURL(
              'https://olearykieran.github.io/touchbase-bolt/support.html'
            );
          }}
        >
          <View style={styles.settingInfo}>
            <HelpCircle size={24} color={colors.accent} />
            <ThemedText style={[styles.settingText]}>Help & Support</ThemedText>
          </View>
        </TouchableOpacity>
      </View>

      <View style={[styles.section, { 
        backgroundColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.6)',
        borderWidth: 1,
        borderColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.8)',
        backdropFilter: 'blur(20px)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
      }]}>
        <TouchableOpacity 
          style={[styles.signOutButton, {
            backgroundColor: colorScheme === 'dark' ? 'rgba(255, 107, 107, 0.15)' : 'rgba(100, 64, 62, 0.1)',
            borderRadius: 10,
            paddingVertical: 14,
            paddingHorizontal: 16,
            borderWidth: 1,
            borderColor: colorScheme === 'dark' ? 'rgba(255, 107, 107, 0.3)' : 'rgba(100, 64, 62, 0.2)',
          }]} 
          onPress={handleSignOut}
        >
          <LogOut size={24} color={colorScheme === 'dark' ? '#ff6b6b' : '#64403E'} />
          <ThemedText style={[styles.signOutText, { color: colorScheme === 'dark' ? '#ff6b6b' : '#64403E' }]}>Sign Out</ThemedText>
        </TouchableOpacity>
      </View>

      <View style={[styles.section, { 
        backgroundColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.6)',
        borderWidth: 1,
        borderColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.8)',
        backdropFilter: 'blur(20px)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
      }]}>
        <TouchableOpacity
          style={[styles.deleteButton, {
            backgroundColor: colorScheme === 'dark' ? 'rgba(255, 107, 107, 0.15)' : 'rgba(100, 64, 62, 0.1)',
            borderRadius: 10,
            paddingVertical: 14,
            paddingHorizontal: 16,
            borderWidth: 1,
            borderColor: colorScheme === 'dark' ? 'rgba(255, 107, 107, 0.3)' : 'rgba(100, 64, 62, 0.2)',
          }]}
          onPress={handleDeleteAccount}
        >
          <Trash2 size={24} color={colorScheme === 'dark' ? '#ff6b6b' : '#64403E'} />
          <ThemedText style={[styles.deleteText, { color: colorScheme === 'dark' ? '#ff6b6b' : '#64403E' }]}>Delete Account</ThemedText>
        </TouchableOpacity>
      </View>

      <View style={[styles.section, { 
        backgroundColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.6)',
        borderWidth: 1,
        borderColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.8)',
        backdropFilter: 'blur(20px)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
      }]}>
        <ThemedText style={[styles.sectionTitle]}>Subscription</ThemedText>
        <View style={styles.setting}>
          <View style={styles.settingInfo}>
            <CreditCard size={24} color={colors.accent} />
            <ThemedText style={[styles.settingText]}>Current Plan</ThemedText>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <ThemedText
              style={[styles.settingValue, { color: colors.secondaryText }]}
            >
              {isLoading ? 'Refreshing...' : subscriptionStatus}
            </ThemedText>
            <TouchableOpacity
              style={{ marginLeft: 8 }}
              onPress={() => {
                console.log('Manual refresh initiated');
                // Increment refresh trigger to force a new fetch
                setRefreshTrigger((prev) => prev + 1);
              }}
              disabled={isLoading}
            >
              <RefreshCw
                size={18}
                color={isLoading ? colors.secondaryText : colors.accent}
              />
            </TouchableOpacity>
          </View>
        </View>

        {subscriptionStatus === 'Free' && (
          <TouchableOpacity
            style={[{
              backgroundColor: colorScheme === 'dark' ? 'rgba(113, 113, 122, 0.6)' : 'rgba(113, 113, 122, 0.5)',
              paddingHorizontal: 20,
              paddingVertical: 12,
              borderRadius: 12,
              marginTop: 16,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              borderWidth: 1,
              borderColor: colors.accent,
              backdropFilter: 'blur(20px)',
              shadowColor: colors.accent,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 12,
              elevation: 5,
            }, { opacity: isLoading ? 0.5 : 1 }]}
            onPress={() => setShowPaywall(true)}
            disabled={isLoading}
          >
            <CreditCard size={20} color="white" />
            <ThemedText style={{ color: 'white', fontSize: 16, fontWeight: '600' }}>
              Upgrade to Premium
            </ThemedText>
          </TouchableOpacity>
        )}

        {subscriptionEnd && subscriptionStatus !== 'Free' && (
          <View style={styles.setting}>
            <View style={styles.settingInfo}>
              <Calendar size={24} color={colors.accent} />
              <ThemedText style={[styles.settingText]}>Active Until</ThemedText>
            </View>
            <ThemedText
              style={[styles.settingValue, { color: colors.secondaryText }]}
            >
              {subscriptionEnd}
            </ThemedText>
          </View>
        )}

        {subscriptionStatus !== 'Free' &&
          subscriptionStatus !== 'Loading...' &&
          subscriptionStatus !== 'Error' && (
            <TouchableOpacity
              style={[
                styles.cancelSubscription,
                { 
                  opacity: isLoading ? 0.5 : 1,
                  backgroundColor: colorScheme === 'dark' ? 'rgba(255, 107, 107, 0.15)' : 'rgba(100, 64, 62, 0.1)',
                  borderRadius: 10,
                  paddingVertical: 14,
                  paddingHorizontal: 16,
                  borderWidth: 1,
                  borderColor: colorScheme === 'dark' ? 'rgba(255, 107, 107, 0.3)' : 'rgba(100, 64, 62, 0.2)',
                  marginTop: 16,
                  borderTopWidth: 1,
                },
              ]}
              onPress={handleCancelSubscription}
              disabled={isLoading}
            >
              <Ban size={24} color={colorScheme === 'dark' ? '#ff6b6b' : '#64403E'} />
              <ThemedText style={[styles.cancelText, { color: colorScheme === 'dark' ? '#ff6b6b' : '#64403E' }]}>Cancel Subscription</ThemedText>
            </TouchableOpacity>
          )}

        {/* iOS-specific subscription management options */}
        {Platform.OS === 'ios' && (
          <>
            <TouchableOpacity
              style={[
                styles.subscriptionOption,
                { 
                  opacity: isLoading ? 0.5 : 1,
                  backgroundColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
                  borderRadius: 10,
                  paddingVertical: 14,
                  paddingHorizontal: 16,
                  marginTop: 16,
                  borderTopWidth: 0,
                },
              ]}
              onPress={handleRestorePurchases}
              disabled={isLoading}
            >
              <Download size={24} color={colors.accent} />
              <ThemedText style={styles.optionText}>Restore Purchases</ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.subscriptionOption,
                { 
                  opacity: isLoading ? 0.5 : 1,
                  backgroundColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
                  borderRadius: 10,
                  paddingVertical: 14,
                  paddingHorizontal: 16,
                  marginTop: 12,
                  borderTopWidth: 0,
                },
              ]}
              onPress={handleManageSubscription}
              disabled={isLoading}
            >
              <CreditCard size={24} color={colors.accent} />
              <ThemedText style={styles.optionText}>Manage Subscription</ThemedText>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Legal Links Section */}
      <View style={[styles.section, { 
        backgroundColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.6)',
        borderWidth: 1,
        borderColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.8)',
        backdropFilter: 'blur(20px)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
      }]}>
        <ThemedText style={[styles.sectionTitle]}>Legal</ThemedText>
        
        <TouchableOpacity
          style={[styles.option, {
            backgroundColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
            borderRadius: 10,
            paddingVertical: 12,
            paddingHorizontal: 16,
            marginVertical: 4,
          }]}
          onPress={() => Linking.openURL('https://keeptouch.app/terms')}
        >
          <ThemedText style={styles.optionText}>Terms of Use</ThemedText>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.option, {
            backgroundColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
            borderRadius: 10,
            paddingVertical: 12,
            paddingHorizontal: 16,
            marginVertical: 4,
          }]}
          onPress={() => Linking.openURL('https://keeptouch.app/privacy')}
        >
          <ThemedText style={styles.optionText}>Privacy Policy</ThemedText>
        </TouchableOpacity>
      </View>

      <View style={[styles.section, { 
        backgroundColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.6)',
        borderWidth: 1,
        borderColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.8)',
        backdropFilter: 'blur(20px)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
      }]}>
        <ThemedText style={[styles.version, { color: colors.secondaryText }]}>
          Version 1.0.0
        </ThemedText>
      </View>

      {/* Test Notification Button - Only in development mode */}
      {process.env.NODE_ENV === 'development' && (
        <View style={[styles.section, { 
          backgroundColor: colors.card,
          borderWidth: 1,
          borderColor: colors.border
        }]}>
          <TouchableOpacity
            style={{
              backgroundColor: '#007AFF',
              borderRadius: 8,
              padding: 16,
              alignItems: 'center',
              marginTop: 16,
            }}
            onPress={handleTestNotification}
          >
            <ThemedText style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>
              Send Test Notification
            </ThemedText>
          </TouchableOpacity>
        </View>
      )}

      {/* IAP Debug Buttons - Only in development/TestFlight */}
      {__DEV__ && (
        <>
          <View style={[styles.section, { 
            backgroundColor: colors.card,
            borderWidth: 1,
            borderColor: colors.border
          }]}>
            <ThemedText style={[styles.sectionTitle]}>Debug Tools</ThemedText>
            
            <TouchableOpacity
              style={{
                backgroundColor: '#3b82f6',
                borderRadius: 8,
                padding: 16,
                alignItems: 'center',
                marginTop: 12,
              }}
              onPress={() => setShowDebugModal(true)}
            >
              <ThemedText style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>
                Open Subscription Debug Modal
              </ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                backgroundColor: '#FF6B6B',
                borderRadius: 8,
                padding: 16,
                alignItems: 'center',
                marginTop: 12,
              }}
              onPress={() => setShowDebugPanel(!showDebugPanel)}
            >
              <ThemedText style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>
                {showDebugPanel ? 'Hide' : 'Show'} IAP Debug Info
              </ThemedText>
            </TouchableOpacity>
          </View>

          {showDebugPanel && (
            <IAPDebugPanel visible={showDebugPanel} />
          )}
        </>
      )}
    </ScrollView>
    
    <RevenueCatPaywallModal
      visible={showPaywall}
      onClose={() => setShowPaywall(false)}
      onUpgrade={async (plan: 'monthly' | 'yearly') => {
        try {
          const success = await RevenueCatPaymentService.purchaseSubscription(plan);
          
          if (success) {
            console.log(`RevenueCat purchase successful for ${plan} plan`);
            
            // Track purchase in Facebook Ads
            const amount = plan === 'monthly' ? 2.99 : 12.99;
            await facebookAds.trackPurchase(amount, 'USD', plan);
            
            // Show success message
            Alert.alert(
              'Success!', 
              'Your subscription has been activated. Thank you for upgrading!',
              [{ text: 'OK' }]
            );
            // Refresh subscription status after successful purchase
            setRefreshTrigger((prev) => prev + 1);
          }
        } catch (err: any) {
          Alert.alert('Error', err.message);
          console.error('Subscription Error:', err);
        } finally {
          setShowPaywall(false);
        }
      }}
      errorType={'contacts'}
    />
    
    <SubscriptionDebugModal 
      visible={showDebugModal} 
      onClose={() => setShowDebugModal(false)} 
    />
  </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  section: {
    marginTop: 24,
    backgroundColor: 'white',
    borderRadius: 14,
    marginHorizontal: 16,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
  },
  setting: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingText: {
    fontSize: 16,
    marginLeft: 12,
  },
  settingValue: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  signOutText: {
    fontSize: 16,
    marginLeft: 12,
    color: '#64403E',
    fontWeight: '600',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 8,
  },
  deleteText: {
    fontSize: 16,
    marginLeft: 12,
    color: '#64403E',
    fontWeight: '600',
  },
  cancelSubscription: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  cancelText: {
    fontSize: 16,
    marginLeft: 12,
    color: '#64403E',
    fontWeight: '600',
  },
  subscriptionOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  optionText: {
    fontSize: 16,
    marginLeft: 12,
    fontWeight: '600',
  },
  version: {
    textAlign: 'center',
    color: '#666',
    fontSize: 14,
  },
});
