import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

serve(async (req) => {
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

    // Get the JWT token from the request headers
    const token = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { 'Content-Type': 'application/json' }}
      );
    }

    // Request must be a POST
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { 'Content-Type': 'application/json' }}
      );
    }

    // Verify the user exists
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { 'Content-Type': 'application/json' }}
      );
    }
    
    const userId = user.id;

    // Update the user's profile to set them back to free tier
    // However, allow them to keep using premium features until the subscription_end date
    const { data: updateData, error: updateError } = await supabaseClient
      .from('profiles')
      .upsert({
        id: userId,
        subscription_status: 'free',
        // We don't reset subscription_end immediately - this allows users to 
        // continue using premium features until their paid period ends
      })
      .select();

    if (updateError) {
      console.error('Error updating profile:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update subscription status' }),
        { status: 500, headers: { 'Content-Type': 'application/json' }}
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Subscription downgraded successfully (TEST MODE)',
        profile: updateData?.[0]
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' }}
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' }}
    );
  }
});
