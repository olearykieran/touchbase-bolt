import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  ScrollView,
  Platform,
  Alert,
  Share,
  Linking,
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
} from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import React from 'react';
import { useTheme, ThemeType } from '../../components/ThemeProvider';
import {
  registerForPushNotificationsAsync,
  scheduleNotificationsForContacts,
  sendTestNotification,
} from '../../lib/notificationUtils';
import { useHeaderHeight } from '@react-navigation/elements';

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
  }, []);

  useEffect(() => {
    // Fetch subscription status whenever refreshTrigger changes
    fetchSubscriptionStatus();
  }, [refreshTrigger]);

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

              // Log out and redirect
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

              const {
                data: { session },
              } = await supabase.auth.getSession();
              if (!session) throw new Error('Please sign in again');

              const response = await fetch(
                `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/cancel-subscription`,
                {
                  method: 'POST',
                  headers: {
                    Authorization: `Bearer ${session.access_token}`,
                    'Content-Type': 'application/json',
                  },
                }
              );

              if (!response.ok) {
                const errorData = await response.json();
                throw new Error(
                  errorData.error || 'Failed to cancel subscription'
                );
              }

              Alert.alert(
                'Success',
                'Your subscription has been canceled. You will still have access until the end of your current billing period.'
              );

              // Refresh the subscription status
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

  return (
    <ScrollView
      style={[
        styles.container,
        { backgroundColor: colors.background, paddingTop: headerHeight },
      ]}
    >
      <View style={[styles.section, { backgroundColor: colors.card }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Notifications
        </Text>
        <View style={styles.setting}>
          <View style={styles.settingInfo}>
            <Bell size={24} color={colors.accent} />
            <Text style={[styles.settingText, { color: colors.text }]}>
              Enable Notifications
            </Text>
          </View>
          <Switch
            value={notifications}
            onValueChange={(value) =>
              toggleNotificationSetting('notifications', value)
            }
            trackColor={{ false: '#767577', true: colors.accent + '33' }}
            thumbColor={notifications ? colors.accent : '#f4f3f4'}
          />
        </View>
      </View>

      {/* Theme Section */}
      <View style={[styles.section, { backgroundColor: colors.card }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Appearance
        </Text>
        <View style={styles.setting}>
          <Text style={[styles.settingText, { color: colors.text }]}>
            Theme
          </Text>
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
                backgroundColor: theme === option ? colors.accent : colors.card,
                borderRadius: 8,
                padding: 12,
                alignItems: 'center',
                borderWidth: theme === option ? 0 : 1,
                borderColor: colors.border,
              }}
              onPress={() => setTheme(option)}
            >
              <Text
                style={{
                  color: theme === option ? '#fff' : colors.text,
                  fontWeight: '600',
                  textTransform: 'capitalize',
                }}
              >
                {option === 'system'
                  ? 'System Default'
                  : option.charAt(0).toUpperCase() + option.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={[styles.section, { backgroundColor: colors.card }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          General
        </Text>
        <TouchableOpacity
          style={styles.setting}
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
            <Text style={[styles.settingText, { color: colors.text }]}>
              Share App
            </Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.setting}
          onPress={() => {
            Linking.openURL(
              'https://olearykieran.github.io/touchbase-bolt/support.html'
            );
          }}
        >
          <View style={styles.settingInfo}>
            <HelpCircle size={24} color={colors.accent} />
            <Text style={[styles.settingText, { color: colors.text }]}>
              Help & Support
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      <View style={[styles.section, { backgroundColor: colors.card }]}>
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <LogOut size={24} color="#64403E" />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.section, { backgroundColor: colors.card }]}>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={handleDeleteAccount}
        >
          <Trash2 size={24} color="#64403E" />
          <Text style={styles.deleteText}>Delete Account</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.section, { backgroundColor: colors.card }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Subscription
        </Text>
        <View style={styles.setting}>
          <View style={styles.settingInfo}>
            <CreditCard size={24} color={colors.accent} />
            <Text style={[styles.settingText, { color: colors.text }]}>
              Current Plan
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text
              style={[styles.settingValue, { color: colors.secondaryText }]}
            >
              {isLoading ? 'Refreshing...' : subscriptionStatus}
            </Text>
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

        {subscriptionEnd && subscriptionStatus !== 'Free' && (
          <View style={styles.setting}>
            <View style={styles.settingInfo}>
              <Calendar size={24} color={colors.accent} />
              <Text style={[styles.settingText, { color: colors.text }]}>
                Active Until
              </Text>
            </View>
            <Text
              style={[styles.settingValue, { color: colors.secondaryText }]}
            >
              {subscriptionEnd}
            </Text>
          </View>
        )}

        {subscriptionStatus !== 'Free' &&
          subscriptionStatus !== 'Loading...' &&
          subscriptionStatus !== 'Error' && (
            <TouchableOpacity
              style={[
                styles.cancelSubscription,
                { opacity: isLoading ? 0.5 : 1 },
              ]}
              onPress={handleCancelSubscription}
              disabled={isLoading}
            >
              <Ban size={24} color="#64403E" />
              <Text style={styles.cancelText}>Cancel Subscription</Text>
            </TouchableOpacity>
          )}
      </View>

      <View style={[styles.section, { backgroundColor: colors.card }]}>
        <Text style={[styles.version, { color: colors.secondaryText }]}>
          Version 1.0.0
        </Text>
      </View>

      {/* Test Notification Button - Only in development mode */}
      {process.env.NODE_ENV === 'development' && (
        <View style={[styles.section, { backgroundColor: colors.card }]}>
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
            <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>
              Send Test Notification
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
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
    borderRadius: 12,
    marginHorizontal: 16,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
    color: '#000',
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
    color: '#000',
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
  version: {
    textAlign: 'center',
    color: '#666',
    fontSize: 14,
  },
});
