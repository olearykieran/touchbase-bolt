import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

interface SubscriptionRequest {
  plan: 'monthly' | 'yearly';
  userId: string;
}

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

    // Parse the request body
    const body: SubscriptionRequest = await req.json();
    const { plan, userId } = body;

    if (!plan || !userId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { 'Content-Type': 'application/json' }}
      );
    }

    // Verify the user exists and is the same as the authenticated user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { 'Content-Type': 'application/json' }}
      );
    }
    
    if (user.id !== userId) {
      return new Response(
        JSON.stringify({ error: 'User ID mismatch' }),
        { status: 403, headers: { 'Content-Type': 'application/json' }}
      );
    }

    // Calculate subscription end date - 1 month for monthly, 1 year for yearly
    const now = new Date();
    const endDate = new Date(now);
    
    if (plan === 'monthly') {
      endDate.setMonth(endDate.getMonth() + 1);
    } else if (plan === 'yearly') {
      endDate.setFullYear(endDate.getFullYear() + 1);
    } else {
      return new Response(
        JSON.stringify({ error: 'Invalid plan type' }),
        { status: 400, headers: { 'Content-Type': 'application/json' }}
      );
    }

    // Update the user's profile with the new subscription status
    const { data: updateData, error: updateError } = await supabaseClient
      .from('profiles')
      .upsert({
        id: userId,
        subscription_status: plan,
        subscription_end: endDate.toISOString(),
        // Reset counters since this is a premium account now
        weekly_message_count: 0,
        last_message_reset: new Date().toISOString(),
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
        message: 'Subscription upgraded successfully (TEST MODE)',
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
