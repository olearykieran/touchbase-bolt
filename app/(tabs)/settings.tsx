import { View, Text, StyleSheet, Switch, TouchableOpacity, ScrollView, Platform, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import { Bell, Clock, Share2, HelpCircle, LogOut, Calendar } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';

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
    }
  } catch (error) {
    console.error('Error scheduling notifications:', error);
  }
}

export default function SettingsScreen() {
  const [notifications, setNotifications] = useState(true);
  const [weekendReminders, setWeekendReminders] = useState(false);
  const [morningReminders, setMorningReminders] = useState(true);
  const [notificationStatus, setNotificationStatus] = useState<string>('');

  useEffect(() => {
    if (Platform.OS !== 'web') {
      checkNotificationPermissions();
      
      // Listen for notification responses
      const subscription = Notifications.addNotificationResponseReceivedListener(response => {
        const contactId = response.notification.request.content.data.contactId;
        if (contactId) {
          router.push('/(tabs)/');
        }
      });

      return () => {
        subscription.remove();
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

    switch(setting) {
      case 'notifications':
        setNotifications(value);
        if (!value && Platform.OS !== 'web') {
          await Notifications.cancelAllScheduledNotificationsAsync();
        }
        break;
      case 'weekendReminders':
        setWeekendReminders(value);
        break;
      case 'morningReminders':
        setMorningReminders(value);
        break;
    }
  };

  const handleSignOut = async () => {
    if (Platform.OS !== 'web') {
      await Notifications.cancelAllScheduledNotificationsAsync();
    }
    await supabase.auth.signOut();
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
            onValueChange={(value) => toggleNotificationSetting('notifications', value)}
            trackColor={{ false: '#767577', true: '#81b0ff' }}
            thumbColor={notifications ? '#007AFF' : '#f4f3f4'}
          />
        </View>
        
        {notifications && (
          <>
            <View style={styles.setting}>
              <View style={styles.settingInfo}>
                <Calendar size={24} color="#007AFF" />
                <Text style={styles.settingText}>Weekend Reminders</Text>
              </View>
              <Switch
                value={weekendReminders}
                onValueChange={(value) => toggleNotificationSetting('weekendReminders', value)}
                trackColor={{ false: '#767577', true: '#81b0ff' }}
                thumbColor={weekendReminders ? '#007AFF' : '#f4f3f4'}
              />
            </View>
            
            <View style={styles.setting}>
              <View style={styles.settingInfo}>
                <Clock size={24} color="#007AFF" />
                <Text style={styles.settingText}>Morning Reminders</Text>
              </View>
              <Switch
                value={morningReminders}
                onValueChange={(value) => toggleNotificationSetting('morningReminders', value)}
                trackColor={{ false: '#767577', true: '#81b0ff' }}
                thumbColor={morningReminders ? '#007AFF' : '#f4f3f4'}
              />
            </View>
          </>
        )}
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
      </View>

      <View style={styles.section}>
        <Text style={styles.version}>Version 1.0.0</Text>
      </View>
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
  version: {
    textAlign: 'center',
    color: '#666',
    fontSize: 14,
  },
});