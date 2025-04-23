import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Stripe from 'npm:stripe@11.11.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Environment variables
const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2022-11-15' });
const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

serve(async (req: Request) => {
  console.log('--- Webhook received ---');
  
  // Log all headers for debugging
  console.log('All request headers:');
  const headerEntries = Array.from(req.headers.entries());
  headerEntries.forEach(([key, value]) => {
    // Only show first few chars of values for security
    const safeValue = value.length > 10 ? value.substring(0, 10) + '...' : value;
    console.log(`  ${key}: ${safeValue}`);
  });
  
  // Get body and signature
  const payload = await req.text();
  console.log('Payload length:', payload.length);
  
  const sig = req.headers.get('stripe-signature');
  console.log('Signature present:', sig ? 'Yes' : 'No');
  if (sig) {
    console.log('Signature preview:', sig.substring(0, 15) + '...');
  } else {
    console.log('No signature header found!');
    console.log('Headers received:', Object.keys(Object.fromEntries(req.headers)).join(', '));
  }
  console.log('Using webhook secret:', webhookSecret.substring(0, 4) + '...');
  console.log('Secret length:', webhookSecret.length);
  
  let event;
  try {
    event = stripe.webhooks.constructEvent(payload, sig!, webhookSecret);
    console.log('✅ Signature verified, processing event:', event.type);
  } catch (err) {
    console.error('❌ Webhook signature verification failed:', err.message);
    // More detailed info for debugging
    console.error('Webhook payload first 100 chars:', payload.substring(0, 100));
    return new Response(JSON.stringify({ error: err.message }), { 
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Log a clear message at the start of each event type handler
  console.log(`Starting to process ${event.type} event`);

  switch (event.type) {
    case 'invoice.payment_succeeded': {
      console.log('Processing invoice.payment_succeeded event');
      const invoice = event.data.object as Stripe.Invoice;
      
      const customerId = invoice.customer as string;
      console.log('Customer ID:', customerId);
      
      // Look up the user by their Stripe customer ID
      const { data: profile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('stripe_customer_id', customerId)
        .single();
      
      if (profileError || !profile) {
        console.error('Error finding user by customer ID:', profileError || 'No profile found');
        return new Response(JSON.stringify({ error: 'User not found' }), { status: 200 });
      }
      
      const userId = profile.id;
      console.log('Found user ID from customer:', userId);
      
      const planId = invoice.lines.data[0].plan?.id ?? '';
      const periodEnd = invoice.lines.data[0].period?.end;
      const status = planId.includes('year') ? 'yearly' : 'monthly';
      
      console.log(`Updating subscription for user ${userId} to ${status}`);
      console.log(`Period end: ${periodEnd ? new Date(periodEnd * 1000).toISOString() : 'null'}`);
      
      try {
        const { data, error } = await supabaseAdmin
          .from('profiles')
          .update({
            subscription_status: status,
            subscription_start: new Date().toISOString(),
            subscription_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
            weekly_message_count: 0,
            contact_count: 0,
            last_message_reset: new Date().toISOString(),
          })
          .eq('id', userId);
        
        if (error) {
          console.error('Error updating subscription status:', error);
          // Don't throw - we still want to return 200 to Stripe
        } else {
          console.log('Successfully updated subscription status for user:', userId);
        }
      } catch (updateError) {
        console.error('Exception during database update:', updateError);
      }
      break;
    }
    case 'customer.subscription.deleted': {
      console.log('Processing customer.subscription.deleted event');
      const subscription = event.data.object as Stripe.Subscription;
      const userId = subscription.metadata.user_id;
      
      console.log(`Setting subscription to free for user ${userId}`);
      
      try {
        const { data, error } = await supabaseAdmin
          .from('profiles')
          .update({ subscription_status: 'free', subscription_end: new Date().toISOString() })
          .eq('id', userId);
        
        if (error) {
          console.error('Error updating subscription to free:', error);
        } else {
          console.log('Successfully set subscription to free for user:', userId);
        }
      } catch (updateError) {
        console.error('Exception during free subscription update:', updateError);
      }
      break;
    }
    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  return new Response(JSON.stringify({ received: true }), { status: 200 });
});
