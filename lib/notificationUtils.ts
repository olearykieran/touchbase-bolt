import { Platform, Alert } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { supabase } from './supabase'; // Assuming supabase is in the same lib folder
import { Contact } from '../types/Contact';
import {
  NotificationContentInput,
  NotificationTriggerInput,
  DailyTriggerInput,
  TimeIntervalTriggerInput,
  DateTriggerInput,
  SchedulableTriggerInputTypes,
  NotificationCategoryOptions,
} from 'expo-notifications';

// Function to save the push token to Supabase
async function savePushToken(token: string): Promise<void> {
  console.log(
    `[savePushToken] Attempting to save token ${token.substring(0, 10)}...`
  );
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    console.error('User not authenticated. Cannot save push token.');
    return;
  }

  try {
    console.log(
      `[savePushToken] User ${user.id} authenticated, attempting upsert...`
    );
    const { data, error } = await supabase
      .from('push_tokens')
      .upsert(
        {
          user_id: user.id,
          token: token,
        },
        {
          onConflict: 'token', // If token already exists, do nothing (or update timestamp if needed)
        }
      )
      .select();

    if (error) {
      console.error('[savePushToken] Error during upsert:', error);
      // Handle potential duplicate user_id if token is different but user already has one
      if (error.code === '23505') {
        // unique_violation
        console.warn(
          `Push token ${token.substring(
            0,
            10
          )}... already exists or another token exists for this user.`
        );
        // Optionally, you could delete old tokens for the user here
      } else {
        throw error;
      }
    } else {
      console.log('[savePushToken] Upsert successful:', data);
    }
  } catch (error) {
    console.error('Error saving push token to database:', error);
  }
}

// Configure notification handler (can be called once in _layout.tsx)
export function configureNotificationHandler() {
  // Set up notification categories first
  Notifications.setNotificationCategoryAsync(
    'default',
    [
      {
        identifier: 'default',
        buttonTitle: 'OK',
        options: {
          opensAppToForeground: true,
        },
      },
    ],
    {
      showTitle: true,
      showSubtitle: true,
      // showPreview: true, // Not a valid property in current expo-notifications
      allowInCarPlay: true,
      allowAnnouncement: true,
    }
  );

  // Then set up the notification handler
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      priority: Notifications.AndroidNotificationPriority.HIGH,
      presentationOptions: ['alert', 'badge', 'sound'],
      ios: {
        criticalAlert: true,
        provisional: false,
        interruptionLevel: 'active',
      },
    }),
  });

  // Set foreground presentation options
  Notifications.setNotificationChannelAsync('default', {
    name: 'default',
    importance: Notifications.AndroidImportance.MAX,
    enableVibrate: true,
    enableLights: true,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    bypassDnd: true,
    vibrationPattern: [0, 250, 250, 250],
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
    // Explicitly get projectId from expo-constants, primarily from extra.eas.projectId
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;

    if (!projectId) {
      // Added a more specific error log
      console.error(
        'Expo Project ID (extra.eas.projectId) not found in app.json/app.config.js. Check your Expo configuration.'
      );
      throw new Error(
        'Could not find Expo Project ID in app config. Push notifications require a projectId.'
      );
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: projectId, // Pass the explicitly retrieved projectId
    });
    console.log('*************************************');
    console.log('PUSH TOKEN:', tokenData.data); // Log the token!
    console.log('*************************************');

    // Save the token to Supabase
    console.log('[register] Got token, attempting to save...');
    await savePushToken(tokenData.data);

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
          // Calculate trigger time 10 minutes before nextContactDate
          const triggerTime = new Date(
            nextContactDate.getTime() - 15 * 60 * 1000
          );

          // Ensure trigger time is still in the future before scheduling
          if (triggerTime > new Date()) {
            await Notifications.scheduleNotificationAsync({
              content: {
                title: 'Time to reconnect!',
                body: `It's time to reach out to ${contact.name} soon!`,
                data: { contactId: contact.id },
              },
              trigger: triggerTime,
            });
          } else {
            console.log(
              `Skipping past notification trigger for ${
                contact.name
              } (Next Contact: ${nextContactDate.toISOString()})`
            );
          }
        }
      }

      if (contact.birthday) {
        const birthdayDate = new Date(contact.birthday + 'T00:00:00'); // Ensure parsing as local date
        const now = new Date();
        const currentYear = now.getFullYear();
        let nextBirthday = new Date(birthdayDate);
        nextBirthday.setFullYear(currentYear);

        // Set birthday notification for the start of the day (e.g., 8 AM local time)
        nextBirthday.setHours(8, 0, 0, 0);

        if (nextBirthday < now) {
          nextBirthday.setFullYear(currentYear + 1);
        }

        if (nextBirthday > now) {
          // Calculate trigger time 10 minutes before 8 AM on birthday
          // Note: This might be slightly complex if birthday is very soon.
          // A simpler approach is to just trigger *at* 8 AM.
          const birthdayTriggerTime = nextBirthday; // Keep it simple: trigger at 8 AM

          await Notifications.scheduleNotificationAsync({
            content: {
              title: `It's ${contact.name}'s birthday! 🎉`,
              body: `Reach out and wish them a happy birthday!`,
              data: { contactId: contact.id, birthday: true },
            },
            trigger: birthdayTriggerTime,
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

    const content: NotificationContentInput = {
      title: 'Test Notification',
      body: 'This is a test notification',
      data: { test: true },
      sound: true,
    };

    const trigger: NotificationTriggerInput = {
      seconds: 5,
      type: 'timeInterval' as const,
      repeats: false,
    };

    await Notifications.scheduleNotificationAsync({
      content,
      trigger,
    });
    console.log('Test notification scheduled.');
  } catch (error) {
    console.error('Error sending test notification:', error);
  }
}

export async function scheduleNotification(contact: Contact) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Time to reach out! 👋',
      body: `It's been a while since you last contacted ${contact.name}. Why not send them a message?`,
      data: { contactId: contact.id },
    },
    trigger: {
      // type: 'daily',
      hour: 9,
      minute: 0,
      repeats: true,
    },
  });
}

export async function scheduleNotificationForContact(contact: Contact) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Time to reach out! 👋',
      body: `It's been a while since you last contacted ${contact.name}. Why not send them a message?`,
      data: { contactId: contact.id },
    },
    trigger: {
      // type: 'daily',
      hour: 9,
      minute: 0,
      repeats: true,
    },
  });
}

export async function scheduleNotificationForNewContact(contact: Contact) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Time to reach out! 👋',
      body: `It's been a while since you last contacted ${contact.name}. Why not send them a message?`,
      data: { contactId: contact.id },
    },
    trigger: {
      // type: 'daily',
      hour: 9,
      minute: 0,
      repeats: true,
    },
  });
}

export async function sendImmediateTestNotification() {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Immediate Test Notification',
        body: 'This should show up right away!',
        sound: true,
        badge: 1,
      },
      trigger: null, // null trigger means show immediately
    });
    console.log('Immediate test notification sent.');
  } catch (error) {
    console.error('Error sending immediate test notification:', error);
  }
}

export async function testDirectNotification() {
  await Notifications.presentNotificationAsync({
    content: {
      title: 'Direct Test',
      body: 'This is a direct notification test',
      sound: 'default' as const,
      badge: 1,
    },
  });
}

// Function to schedule a notification for a specific date
export async function scheduleNotificationForDate(
  date: Date,
  title: string,
  body: string
) {
  const content: NotificationContentInput = {
    title,
    body,
    sound: true,
  };

  const trigger: DateTriggerInput = {
    type: SchedulableTriggerInputTypes.DATE,
    date,
  };

  return await Notifications.scheduleNotificationAsync({
    content,
    trigger,
  });
}

// Function to schedule a notification with a time interval
export async function scheduleNotificationWithInterval(
  seconds: number,
  title: string,
  body: string
) {
  const content: NotificationContentInput = {
    title,
    body,
    sound: true,
  };

  const trigger: TimeIntervalTriggerInput = {
    type: SchedulableTriggerInputTypes.TIME_INTERVAL,
    seconds,
    repeats: false,
  };

  return await Notifications.scheduleNotificationAsync({
    content,
    trigger,
  });
}

// Function to schedule a daily notification
export async function scheduleDailyNotification(
  hour: number,
  minute: number,
  title: string,
  body: string
) {
  const content: NotificationContentInput = {
    title,
    body,
    sound: true,
  };

  const trigger: DailyTriggerInput = {
    type: SchedulableTriggerInputTypes.DAILY,
    hour,
    minute,
    repeats: true,
  };

  return await Notifications.scheduleNotificationAsync({
    content,
    trigger,
  });
}
