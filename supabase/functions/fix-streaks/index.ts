import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  
  try {
    // Create a Supabase client with the Auth context of the logged in user
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Verify the user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
      );
    }

    // Get all contacts for this user
    const { data: contacts, error: contactsError } = await supabaseClient
      .from('contacts')
      .select('id, next_contact, streak')
      .eq('user_id', user.id);

    if (contactsError) {
      throw contactsError;
    }

    const now = new Date();
    let hasAnyLateContact = false;
    const updates = [];

    // Check each contact
    for (const contact of contacts || []) {
      const nextContactDate = new Date(contact.next_contact);
      const isLate = nextContactDate < now;

      if (isLate) {
        hasAnyLateContact = true;
        // Reset streak to 0 for late contacts
        if (contact.streak > 0) {
          updates.push({
            id: contact.id,
            streak: 0
          });
        }
      }
    }

    // Update all late contacts' streaks to 0
    if (updates.length > 0) {
      for (const update of updates) {
        await supabaseClient
          .from('contacts')
          .update({ streak: update.streak })
          .eq('id', update.id);
      }
    }

    // Reset global streak if any contact is late
    if (hasAnyLateContact) {
      const { error: updateError } = await supabaseClient
        .from('profiles')
        .update({ 
          global_streak: 0,
          global_streak_last_updated: null 
        })
        .eq('id', user.id);
      
      if (updateError) {
        console.error('Error updating global streak:', updateError);
        throw updateError;
      }
    }

    return new Response(
      JSON.stringify({ 
        message: 'Streaks fixed successfully',
        lateContacts: updates.length,
        globalStreakReset: hasAnyLateContact
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error fixing streaks:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error', details: error }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
    );
  }
});