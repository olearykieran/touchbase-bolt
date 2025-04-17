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
      await scheduleNotificationsForContacts(); // Use imported function
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
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
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
                title: 'TouchBase',
                message:
                  'Stay in touch with the people who matter most! Download TouchBase: https://apps.apple.com/app/id6501184872',
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
          <LogOut size={24} color="#FF3B30" />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.section, { backgroundColor: colors.card }]}>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={handleDeleteAccount}
        >
          <Trash2 size={24} color="#FF3B30" />
          <Text style={styles.deleteText}>Delete Account</Text>
        </TouchableOpacity>
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
