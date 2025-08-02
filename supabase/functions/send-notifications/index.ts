/// <reference types="https://deno.land/x/deno/cli/types/dts/lib.deno.d.ts" />
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
// Import namespace
import * as ExpoSdk from 'npm:expo-server-sdk@3.7.0';

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!; // Use anon key for RLS
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Initialize Expo SDK using namespace property
const expo = new ExpoSdk.Expo({
  accessToken: Deno.env.get('EXPO_ACCESS_TOKEN')!,
});

// Define the time windows for different notification types
const NOTIFICATION_WINDOWS = {
  '60min': { minutes: 60, message: 'You have 1 hour to reach out to' },
  '15min': { minutes: 15, message: 'Time to reach out to' },
  '5min': { minutes: 5, message: 'Last reminder! Don\'t forget to reach out to' }
};

serve(async (req: Request) => {
  try {
    console.log('Notification function invoked.');

    // Create a service role client ONLY for querying tokens (bypasses RLS)
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const now = new Date();
    // Look for contacts due in the next 65 minutes (to catch all notification windows)
    const windowStart = new Date(now.getTime() - 5 * 60 * 1000); // 5 minutes ago
    const windowEnd = new Date(now.getTime() + 65 * 60 * 1000); // 65 minutes ahead

    console.log(
      `Checking for contacts due between ${windowStart.toISOString()} and ${windowEnd.toISOString()}`
    );

    // 1. Find contacts due within the window
    const { data: contacts, error: contactsError } = await supabaseAdmin
      .from('contacts')
      .select('id, name, user_id, next_contact')
      .lte('next_contact', windowEnd.toISOString())
      .gte('next_contact', windowStart.toISOString());
      
    if (contactsError) throw contactsError;
    if (!contacts || contacts.length === 0) {
      console.log('No contacts due for notification.');
      return new Response(JSON.stringify({ message: 'No contacts due.' }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    console.log(`Found ${contacts.length} contacts due.`);

    const messages = [];
    const userIdsToNotify = [...new Set(contacts.map((c) => c.user_id))]; // Unique user IDs

    // 2. Get push tokens AND notification preferences for the relevant users
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('id, notify_1hr, notify_15min, notify_5min')
      .in('id', userIdsToNotify);
      
    if (profilesError) throw profilesError;
    
    const { data: tokens, error: tokensError } = await supabaseAdmin
      .from('push_tokens')
      .select('user_id, token')
      .in('user_id', userIdsToNotify);

    if (tokensError) throw tokensError;
    if (!tokens || tokens.length === 0) {
      console.log('No push tokens found for the users to be notified.');
      return new Response(
        JSON.stringify({ message: 'No push tokens found for users.' }),
        {
          headers: { 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    console.log(
      `Found ${tokens.length} tokens for ${userIdsToNotify.length} users.`
    );

    // Map tokens and preferences by user_id for easy lookup
    const userTokensMap = new Map<string, string[]>();
    tokens.forEach((t) => {
      const userTokens = userTokensMap.get(t.user_id) || [];
      userTokens.push(t.token);
      userTokensMap.set(t.user_id, userTokens);
    });
    
    const userPrefsMap = new Map<string, any>();
    profiles?.forEach((p) => {
      userPrefsMap.set(p.id, {
        notify_1hr: p.notify_1hr,
        notify_15min: p.notify_15min,
        notify_5min: p.notify_5min
      });
    });

    // 3. Prepare notification messages based on time windows
    for (const contact of contacts) {
      const userTokens = userTokensMap.get(contact.user_id);
      const userPrefs = userPrefsMap.get(contact.user_id);
      
      if (!userTokens || userTokens.length === 0) {
        console.log(
          `No token found for user ${contact.user_id} (contact ${contact.id})`
        );
        continue;
      }
      
      if (!userPrefs) {
        console.log(`No preferences found for user ${contact.user_id}`);
        continue;
      }

      const contactTime = new Date(contact.next_contact);
      const minutesUntilDue = Math.floor((contactTime.getTime() - now.getTime()) / (60 * 1000));
      
      // Determine which notification to send based on time until due
      let notificationType: string | null = null;
      let title = '';
      let body = '';
      
      // Check 60-minute window (between 55-65 minutes)
      if (minutesUntilDue >= 55 && minutesUntilDue <= 65 && userPrefs.notify_1hr) {
        notificationType = '60min';
        title = 'Reminder: Contact coming up';
        body = `${NOTIFICATION_WINDOWS['60min'].message} ${contact.name}`;
      }
      // Check 15-minute window (between 10-20 minutes)
      else if (minutesUntilDue >= 10 && minutesUntilDue <= 20 && userPrefs.notify_15min) {
        notificationType = '15min';
        title = 'Time to reconnect!';
        body = `${NOTIFICATION_WINDOWS['15min'].message} ${contact.name} in the next 15 minutes`;
      }
      // Check 5-minute window (between 0-10 minutes)
      else if (minutesUntilDue >= 0 && minutesUntilDue <= 10 && userPrefs.notify_5min) {
        notificationType = '5min';
        title = 'Last reminder!';
        body = `${NOTIFICATION_WINDOWS['5min'].message} ${contact.name} - only ${minutesUntilDue} minutes left!`;
      }
      
      // Skip if no notification should be sent at this time
      if (!notificationType) {
        console.log(`Contact ${contact.name} not in any notification window (${minutesUntilDue} minutes until due)`);
        continue;
      }

      for (const pushToken of userTokens) {
        if (!ExpoSdk.Expo.isExpoPushToken(pushToken)) {
          console.error(
            `Push token ${pushToken} is not a valid Expo push token`
          );
          continue;
        }

        messages.push({
          to: pushToken,
          sound: 'default',
          title,
          body,
          data: { 
            contactId: contact.id, 
            contactName: contact.name,
            notificationType,
            reminderType: notificationType 
          },
        });
      }
    }

    if (messages.length === 0) {
      console.log('No valid messages to send.');
      return new Response(
        JSON.stringify({ message: 'No valid messages prepared.' }),
        {
          headers: { 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // 4. Send notifications in chunks
    console.log(`Sending ${messages.length} notifications...`);
    const chunks = expo.chunkPushNotifications(messages);
    const tickets = [];
    for (const chunk of chunks) {
      try {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);
        console.log('Sent chunk:', ticketChunk);
      } catch (error) {
        console.error('Error sending push notification chunk:', error);
      }
    }

    // TODO: Handle receipts (check tickets for errors like DeviceNotRegistered)

    return new Response(JSON.stringify({ success: true, tickets }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Error in notification function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
