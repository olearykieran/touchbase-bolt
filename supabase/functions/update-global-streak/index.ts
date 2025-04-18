import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts'; // Assuming shared CORS headers

console.log('Update Global Streak function starting...');

// Helper function to get yesterday's date in YYYY-MM-DD format (UTC)
function getYesterdayDate(): string {
  const yesterday = new Date();
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  return yesterday.toISOString().split('T')[0];
}

// Helper function to get today's date in YYYY-MM-DD format (UTC)
function getTodayDate(): string {
  const today = new Date();
  return today.toISOString().split('T')[0];
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('Creating Supabase client...');
    // Create Supabase client using environment variables
    // Ensure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in Edge Function settings
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        global: {
          headers: {
            Authorization: `Bearer ${Deno.env.get(
              'SUPABASE_SERVICE_ROLE_KEY'
            )}`,
          },
        },
      }
    );
    console.log('Supabase client created.');

    const yesterday = getYesterdayDate();
    const today = getTodayDate();
    console.log(`Processing streaks for date: ${yesterday}`);

    // 1. Fetch all user profiles
    console.log('Fetching profiles...');
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, global_streak, global_streak_last_updated');

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      throw profilesError;
    }
    console.log(`Fetched ${profiles?.length ?? 0} profiles.`);

    // 2. Process each profile
    for (const profile of profiles || []) {
      console.log(`Processing profile for user ID: ${profile.id}`);
      const userId = profile.id;
      const currentGlobalStreak = profile.global_streak;
      const lastUpdated = profile.global_streak_last_updated; // YYYY-MM-DD or null

      // Find contacts due yesterday for this user
      // IMPORTANT: Assumes next_contact is DATE. If TIMESTAMPTZ, adjust query.
      const { data: contactsDueYesterday, error: contactsError } =
        await supabase
          .from('contacts')
          .select('id, last_contact')
          .eq('user_id', userId)
          .eq('next_contact', yesterday);

      if (contactsError) {
        console.error(
          `Error fetching contacts due yesterday for user ${userId}:`,
          contactsError
        );
        continue; // Skip this user on error
      }

      let allContactsMet = true;
      if (contactsDueYesterday && contactsDueYesterday.length > 0) {
        console.log(
          `User ${userId} had ${contactsDueYesterday.length} contacts due yesterday.`
        );
        for (const contact of contactsDueYesterday) {
          // Check if last_contact date is also yesterday
          const lastContactDate = contact.last_contact
            ? new Date(contact.last_contact).toISOString().split('T')[0]
            : null;
          if (lastContactDate !== yesterday) {
            allContactsMet = false;
            console.log(
              `User ${userId} MISSED contact ${contact.id} due yesterday. Last contact: ${lastContactDate}`
            );
            break; // No need to check further for this user
          }
        }
      } else {
        console.log(`User ${userId} had no contacts due yesterday.`);
        // If no contacts were due, they didn't fail the streak for *yesterday*.
        // They continue the streak IF the last update was the day before yesterday.
        allContactsMet = true; // Technically met the condition for yesterday (vacuously true)
      }

      // 3. Calculate new streak and update profile
      let newGlobalStreak = currentGlobalStreak;
      let newLastUpdatedDate: string | null = lastUpdated;

      const dayBeforeYesterday = new Date();
      dayBeforeYesterday.setUTCDate(dayBeforeYesterday.getUTCDate() - 2);
      const dayBeforeYesterdayStr = dayBeforeYesterday
        .toISOString()
        .split('T')[0];

      if (allContactsMet) {
        // User met the condition for yesterday
        if (
          lastUpdated === dayBeforeYesterdayStr ||
          (contactsDueYesterday?.length === 0 && !lastUpdated)
        ) {
          // They were up-to-date previously OR had none due and this is their first potential streak day
          newGlobalStreak++;
          newLastUpdatedDate = yesterday; // Mark streak as updated for yesterday
          console.log(
            `User ${userId}: Streak CONTINUED/INCREMENTED to ${newGlobalStreak} for ${yesterday}`
          );
        } else if (lastUpdated === yesterday) {
          // Already processed for yesterday - do nothing (idempotency)
          console.log(
            `User ${userId}: Already processed for ${yesterday}. Streak remains ${newGlobalStreak}`
          );
        } else if (lastUpdated !== yesterday) {
          // Gap in streak or first ever contact (and yesterday wasn't already processed)
          newGlobalStreak = 1; // Start new streak from yesterday
          newLastUpdatedDate = yesterday;
          console.log(
            `User ${userId}: Streak STARTED at 1 for ${yesterday} (gap detected or first time)`
          );
        }
      } else {
        // User MISSED contacts due yesterday
        newGlobalStreak = 0; // Reset streak
        // Keep lastUpdated as is, or set to null? Setting to null indicates broken chain.
        newLastUpdatedDate = null; // Indicate the chain is broken
        console.log(
          `User ${userId}: Streak RESET to 0 due to missed contact on ${yesterday}`
        );
      }

      // Only update if something changed or if lastUpdated needs setting
      if (
        newGlobalStreak !== currentGlobalStreak ||
        newLastUpdatedDate !== lastUpdated
      ) {
        console.log(
          `Updating profile for user ${userId}: New Streak: ${newGlobalStreak}, Last Updated: ${newLastUpdatedDate}`
        );
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            global_streak: newGlobalStreak,
            global_streak_last_updated: newLastUpdatedDate,
            updated_at: new Date().toISOString(), // Update timestamp
          })
          .eq('id', userId);

        if (updateError) {
          console.error(
            `Error updating profile for user ${userId}:`,
            updateError
          );
          // Continue processing other users
        } else {
          console.log(`Successfully updated profile for user ${userId}`);
        }
      } else {
        console.log(`No update needed for user ${userId}.`);
      }
    }

    console.log('Finished processing all profiles.');
    return new Response(
      JSON.stringify({ message: 'Global streaks updated successfully' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Unhandled error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

console.log('Update Global Streak function handler defined.');
