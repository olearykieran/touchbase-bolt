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

// Define the time window (e.g., check for contacts due in the next 5 minutes)
const NOTIFICATION_WINDOW_MINUTES = 15;

serve(async (req: Request) => {
  try {
    console.log('Notification function invoked.');

    // Create a service role client ONLY for querying tokens (bypasses RLS)
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const now = new Date();
    // Look slightly behind to catch jobs that might have been missed by milliseconds
    const windowStart = new Date(now.getTime() - 1 * 60 * 1000); // 1 minute ago
    const windowEnd = new Date(
      now.getTime() + NOTIFICATION_WINDOW_MINUTES * 60 * 1000
    );

    console.log(
      `Checking for contacts due between ${windowStart.toISOString()} and ${windowEnd.toISOString()}`
    );

    // 1. Find contacts due within the adjusted window
    const { data: contacts, error: contactsError } = await supabaseAdmin
      .from('contacts')
      .select('id, name, user_id, next_contact')
      .lte('next_contact', windowEnd.toISOString()) // Due before window end
      .gte('next_contact', windowStart.toISOString()); // Due after window start (catches recently passed)
    // Optional: Add a check to prevent re-sending notifications too quickly
    // .or(`last_notification_sent_at.is.null,last_notification_sent_at.<=${new Date(now.getTime() - NOTIFICATION_WINDOW_MINUTES * 60 * 1000).toISOString()}`)
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

    // 2. Get push tokens for the relevant users using the ADMIN client
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
          status: 200, // Or potentially an error status if expected tokens are missing
        }
      );
    }

    console.log(
      `Found ${tokens.length} tokens for ${userIdsToNotify.length} users.`
    );

    // Map tokens by user_id for easy lookup
    const userTokensMap = new Map<string, string[]>();
    tokens.forEach((t) => {
      const userTokens = userTokensMap.get(t.user_id) || [];
      userTokens.push(t.token);
      userTokensMap.set(t.user_id, userTokens);
    });

    // 3. Prepare notification messages
    for (const contact of contacts) {
      const userTokens = userTokensMap.get(contact.user_id);
      if (!userTokens || userTokens.length === 0) {
        console.log(
          `No token found for user ${contact.user_id} (contact ${contact.id})`
        );
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
          title: 'Time to reconnect!',
          body: `It's time to reach out to ${contact.name} soon!`,
          data: { contactId: contact.id }, // Optional data payload
        });
      }
      // Optional: Update last_notification_sent_at for the contact here
      // await supabase.from('contacts').update({ last_notification_sent_at: new Date().toISOString() }).eq('id', contact.id);
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
