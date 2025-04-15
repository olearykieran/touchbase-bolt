import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  ScrollView,
  Platform,
  Alert,
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
} from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import React from 'react';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

async function registerForPushNotificationsAsync() {
  if (Platform.OS === 'web') return null;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return null;
  }

  const token = await Notifications.getExpoPushTokenAsync({
    projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
  });

  return token;
}

async function scheduleNotificationsForContacts() {
  if (Platform.OS === 'web') return;

  try {
    // First, cancel all existing notifications
    await Notifications.cancelAllScheduledNotificationsAsync();

    // Get all contacts
    const { data: contacts, error } = await supabase
      .from('contacts')
      .select('*');

    if (error) throw error;

    // Schedule new notifications for each contact
    for (const contact of contacts) {
      const nextContact = new Date(contact.next_contact);
      const now = new Date();

      // Only schedule if next_contact is in the future
      if (nextContact > now) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Time to reconnect!',
            body: `It's time to reach out to ${contact.name}`,
            data: { contactId: contact.id },
          },
          trigger: {
            date: nextContact,
          },
        });
      }

      // --- Birthday Notification Logic ---
      if (contact.birthday) {
        const birthday = new Date(contact.birthday);
        // Set year to this year
        const nowYear = now.getFullYear();
        let nextBirthday = new Date(birthday);
        nextBirthday.setFullYear(nowYear);
        // If birthday this year has already passed, set to next year
        if (nextBirthday < now) {
          nextBirthday.setFullYear(nowYear + 1);
        }
        // Only schedule if nextBirthday is in the future
        if (nextBirthday > now) {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: `It's ${contact.name}'s birthday! 🎉`,
              body: `Reach out and wish them a happy birthday!`,
              data: { contactId: contact.id, birthday: true },
            },
            trigger: {
              date: nextBirthday,
            },
          });
        }
      }
      // --- End Birthday Notification Logic ---
    }
  } catch (error) {
    console.error('Error scheduling notifications:', error);
  }
}

async function sendTestNotification() {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      return;
    }
    const now = new Date();
    const triggerDate = new Date(now.getTime() + 10 * 1000); // 10 seconds from now
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Test Notification',
        body: 'This is a test notification scheduled 10 seconds ago.',
        data: { test: true },
      },
      trigger: {
        date: triggerDate,
      },
    });
  } catch (error) {
    // Optionally, you can handle errors here
  }
}

export default function SettingsScreen() {
  const [notifications, setNotifications] = useState(true);
  const [notificationStatus, setNotificationStatus] = useState<string>('');

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
          Alert.alert(
            notification.request.content.title || 'Notification',
            notification.request.content.body || ''
          );
        });

      return () => {
        responseSubscription.remove();
        receivedSubscription.remove();
      };
    }
  }, []);

  const checkNotificationPermissions = async () => {
    const { status } = await Notifications.getPermissionsAsync();
    setNotificationStatus(status);
  };

  const toggleNotificationSetting = async (setting: string, value: boolean) => {
    if (setting === 'notifications' && value && Platform.OS !== 'web') {
      const token = await registerForPushNotificationsAsync();
      if (!token) {
        Alert.alert(
          'Permission Required',
          'Please enable notifications in your device settings to receive reminders.',
          [{ text: 'OK' }]
        );
        return;
      }
      await scheduleNotificationsForContacts();
    }

    switch (setting) {
      case 'notifications':
        setNotifications(value);
        if (!value && Platform.OS !== 'web') {
          await Notifications.cancelAllScheduledNotificationsAsync();
        }
        break;
    }
  };

  const handleSignOut = async () => {
    if (Platform.OS !== 'web') {
      await Notifications.cancelAllScheduledNotificationsAsync();
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

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notifications</Text>
        <View style={styles.setting}>
          <View style={styles.settingInfo}>
            <Bell size={24} color="#007AFF" />
            <Text style={styles.settingText}>Enable Notifications</Text>
          </View>
          <Switch
            value={notifications}
            onValueChange={(value) =>
              toggleNotificationSetting('notifications', value)
            }
            trackColor={{ false: '#767577', true: '#81b0ff' }}
            thumbColor={notifications ? '#007AFF' : '#f4f3f4'}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>General</Text>
        <TouchableOpacity style={styles.setting}>
          <View style={styles.settingInfo}>
            <Share2 size={24} color="#007AFF" />
            <Text style={styles.settingText}>Share App</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={styles.setting}>
          <View style={styles.settingInfo}>
            <HelpCircle size={24} color="#007AFF" />
            <Text style={styles.settingText}>Help & Support</Text>
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <LogOut size={24} color="#FF3B30" />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
        {/* Delete Account Button */}
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={handleDeleteAccount}
        >
          <Trash2 size={24} color="#FF3B30" />
          <Text style={styles.deleteText}>Delete Account</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.version}>Version 1.0.0</Text>
      </View>

      {/* Test Notification Button - Only in development mode */}
      {process.env.NODE_ENV === 'development' && (
        <View style={styles.section}>
          <TouchableOpacity
            style={{
              backgroundColor: '#007AFF',
              borderRadius: 8,
              padding: 16,
              alignItems: 'center',
              marginTop: 16,
            }}
            onPress={sendTestNotification}
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
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  signOutText: {
    fontSize: 16,
    marginLeft: 12,
    color: '#FF3B30',
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
    color: '#FF3B30',
    fontWeight: '600',
  },
  version: {
    textAlign: 'center',
    color: '#666',
    fontSize: 14,
  },
});
