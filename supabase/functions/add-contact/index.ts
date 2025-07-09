import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    // Get Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authentication required');
    }
    const token = authHeader.replace('Bearer ', '');

    // Verify user
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser(token);
    if (authError || !user) {
      throw new Error('Authentication failed');
    }
    console.log('DEBUG_USER_AUTH', { userId: user.id, userRole: user.role });

    // Fetch user profile for quota enforcement
    // Fetch user profile using the database function
    // Note: rpc calls might return an array, but we expect a single profile object here.
    const { data: profileData, error: profileError } = await supabaseClient
      .rpc('get_user_profile', { p_user_id: user.id })
      .single(); // Use .single() as the function is designed to return one row for the user

    // Check if the profile was fetched successfully
    const profile = profileData; // Assign to profile variable for consistency

    console.log('DEBUG_PROFILE_FETCH', { userId: user.id, profileError, profile });
    if (profileError || !profile) {
      console.error('Error fetching profile or profile not found:', profileError);
      throw new Error('User profile not found or error fetching profile');
    }

    // Log the count being checked
    console.log(`[add-contact] Checking limit for user ${user.id}. Current count from profile: ${profile.contact_count}`);

    const isFreeTier = profile.subscription_status === 'free';
    let { contact_count } = profile;
    if (isFreeTier && contact_count >= 3) {
      return new Response(
        JSON.stringify({
          error: 'PaymentRequiredError',
          details: 'Free tier limited to 3 contacts. Subscribe to unlock more.',
        }),
        {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Get contact data from request
    const payload = await req.json(); // The payload now contains calculated fields

    // Validate required fields from the payload
    if (!payload || !payload.name || !payload.frequency || !payload.last_contact || !payload.next_contact || !payload.reminder_interval) {
      console.error('Validation failed. Missing required fields in payload:', payload);
      throw new Error('Contact data (name, frequency, last_contact, next_contact, reminder_interval) is required');
    }

    // Check for duplicate contacts
    console.log(`[add-contact] Checking for duplicate contacts for user ${user.id}`);
    
    // Build query to check for duplicates
    let duplicateQuery = supabaseClient
      .from('contacts')
      .select('id, name, phone')
      .eq('user_id', user.id);
    
    // Check by name (case-insensitive)
    duplicateQuery = duplicateQuery.ilike('name', payload.name.trim());
    
    // If phone number provided, also check by phone
    if (payload.phone) {
      // Normalize phone number (remove spaces, dashes, parentheses)
      const normalizedPhone = payload.phone.replace(/[\s\-\(\)]/g, '');
      duplicateQuery = duplicateQuery.or(`phone.eq.${payload.phone},phone.eq.${normalizedPhone}`);
    }
    
    const { data: duplicates, error: duplicateError } = await duplicateQuery;
    
    if (duplicateError) {
      console.error('Error checking for duplicates:', duplicateError);
      // Continue anyway - better to allow adding than to fail
    } else if (duplicates && duplicates.length > 0) {
      console.log(`[add-contact] Found duplicate contact(s):`, duplicates);
      const duplicate = duplicates[0];
      return new Response(
        JSON.stringify({
          error: 'DuplicateContactError',
          details: `A contact named "${duplicate.name}" already exists. Please use a different name or update the existing contact.`,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Log the full payload being sent to the RPC
    console.log('DEBUG_RPC_PARAMS (sending to insert_contact)', {
      p_user_id: user.id,
      p_name: payload.name,
      p_frequency: payload.frequency,
      p_last_contact: payload.last_contact,
      p_next_contact: payload.next_contact,
      p_reminder_interval: payload.reminder_interval,
      p_phone: payload.phone, // Optional
      p_email: payload.email, // Optional
      p_birthday: payload.birthday // Optional
    });

    // Insert the new contact using the RPC function (call updated with all params)
    const { data: newContact, error: insertError } = await supabaseClient
      .rpc('insert_contact', {
        p_user_id: user.id,
        p_name: payload.name,
        p_frequency: payload.frequency,
        p_last_contact: payload.last_contact,
        p_next_contact: payload.next_contact,
        p_reminder_interval: payload.reminder_interval,
        p_phone: payload.phone,
        p_email: payload.email,
        p_birthday: payload.birthday,
      })
      .single();

    if (insertError) {
      console.error('!!! ERROR FROM insert_contact RPC CALL:', insertError); // Added specific marker
      throw new Error('Failed to add contact via RPC: ' + insertError.message);
    }

    // Increment contact_count for free tier
    if (isFreeTier) {
      const { error: incError } = await supabaseClient
        .rpc('increment_contact_count', { p_user_id: user.id }); // Call the new function

      if (incError) {
        // Throw error if the RPC call fails
        console.error('!!! CRITICAL: Failed to increment contact_count via RPC:', incError);
        throw new Error(`Contact added, but failed to update profile count via RPC: ${incError.message}`);
      } else {
        console.log(`Successfully called increment_contact_count RPC for user ${user.id}`);
      }
    }

    return new Response(JSON.stringify({ contact: newContact }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error details:', {
      message: error.message,
      name: error.name,
      stack: error.stack?.split('\n')[0],
    });
    return new Response(
      JSON.stringify({
        error: 'Failed to add contact',
        details: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
