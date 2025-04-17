import { Platform, Alert } from 'react-native';
import * as Notifications from 'expo-notifications';
import { supabase } from './supabase'; // Assuming supabase is in the same lib folder

// Configure notification handler (can be called once in _layout.tsx)
export function configureNotificationHandler() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

// Register for push notifications and get token
export async function registerForPushNotificationsAsync(): Promise<
  string | null
> {
  if (Platform.OS === 'web') return null;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    // Alert removed, handle permission denial in UI if needed
    console.log('Push notification permission denied.');
    return null;
  }

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
    });
    console.log('*************************************');
    console.log('PUSH TOKEN:', tokenData.data); // Log the token!
    console.log('*************************************');
    return tokenData.data;
  } catch (error) {
    console.error('Error getting push token:', error);
    return null;
  }
}

// Schedule notifications for all contacts
export async function scheduleNotificationsForContacts() {
  if (Platform.OS === 'web') return;

  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    const { data: contacts, error } = await supabase
      .from('contacts')
      .select('*');
    if (error) throw error;

    for (const contact of contacts) {
      if (contact.next_contact) {
        const nextContactDate = new Date(contact.next_contact);
        if (nextContactDate > new Date()) {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: 'Time to reconnect!',
              body: `It's time to reach out to ${contact.name}`,
              data: { contactId: contact.id },
            },
            trigger: { date: nextContactDate },
          });
        }
      }

      if (contact.birthday) {
        const birthdayDate = new Date(contact.birthday + 'T00:00:00'); // Ensure parsing as local date
        const now = new Date();
        const currentYear = now.getFullYear();
        let nextBirthday = new Date(birthdayDate);
        nextBirthday.setFullYear(currentYear);

        if (nextBirthday < now) {
          nextBirthday.setFullYear(currentYear + 1);
        }

        if (nextBirthday > now) {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: `It's ${contact.name}'s birthday! 🎉`,
              body: `Reach out and wish them a happy birthday!`,
              data: { contactId: contact.id, birthday: true },
            },
            trigger: { date: nextBirthday },
          });
        }
      }
    }
    console.log('Notifications scheduled for contacts.');
  } catch (error) {
    console.error('Error scheduling notifications:', error);
  }
}

// Optional: Send a test notification (mainly for development)
export async function sendTestNotification() {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      console.log('Cannot send test notification, permission not granted.');
      return;
    }
    const now = new Date();
    const triggerDate = new Date(now.getTime() + 5 * 1000); // 5 seconds from now
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Test Notification',
        body: 'This is a test notification scheduled 5 seconds ago.',
        data: { test: true },
      },
      trigger: { date: triggerDate },
    });
    console.log('Test notification scheduled.');
  } catch (error) {
    console.error('Error sending test notification:', error);
  }
}
