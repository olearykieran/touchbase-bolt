import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Stripe from 'npm:stripe@11.11.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Initialize Stripe with the secret key
const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
});

// Initialize Supabase client with admin rights
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// Define CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get auth token from request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Verify the user
    const token = authHeader.replace('Bearer ', '');
    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid user token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Processing subscription cancellation for user: ${user.id}`);

    // Get the user's current subscription
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('subscription_status')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return new Response(JSON.stringify({ error: 'User profile not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if user has an active subscription
    if (profile.subscription_status === 'free') {
      return new Response(
        JSON.stringify({ error: 'No active subscription to cancel' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Find the user's Stripe subscription
    const subscriptions = await stripe.subscriptions.list({
      customer: await findCustomerByUserId(user.id),
      status: 'active',
      limit: 1,
    });

    if (subscriptions.data.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No active Stripe subscription found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Cancel the subscription at period end
    const subscription = await stripe.subscriptions.update(
      subscriptions.data[0].id,
      { cancel_at_period_end: true }
    );

    console.log(
      `Subscription ${subscription.id} will be canceled at period end`
    );

    return new Response(
      JSON.stringify({
        success: true,
        message:
          'Subscription will be canceled at the end of the current billing period',
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (err) {
    console.error('Error canceling subscription:', err);
    return new Response(
      JSON.stringify({ error: 'Failed to cancel subscription' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

// Helper function to find a Stripe customer ID from our user ID
async function findCustomerByUserId(userId: string): Promise<string> {
  // Search for the customer by metadata - using search instead of query
  const customers = await stripe.customers.list({
    limit: 100,
  });

  // Filter customers manually by metadata
  const matchingCustomers = customers.data.filter(
    (customer) => customer.metadata && customer.metadata.user_id === userId
  );

  if (matchingCustomers.length === 0) {
    throw new Error('No Stripe customer found for this user');
  }

  return matchingCustomers[0].id;
}
