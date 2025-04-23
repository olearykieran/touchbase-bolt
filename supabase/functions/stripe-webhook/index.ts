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
  const payload = await req.text();
  const sig = req.headers.get('stripe-signature')!;
  let event;
  try {
    event = stripe.webhooks.constructEvent(payload, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return new Response('Webhook Error', { status: 400 });
  }

  switch (event.type) {
    case 'invoice.payment_succeeded': {
      const invoice = event.data.object as Stripe.Invoice;
      const userId = invoice.metadata.user_id;
      const planId = invoice.lines.data[0].plan?.id ?? '';
      const periodEnd = invoice.lines.data[0].period?.end;
      const status = planId.includes('year') ? 'yearly' : 'monthly';
      await supabaseAdmin
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
      break;
    }
    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      const userId = subscription.metadata.user_id;
      await supabaseAdmin
        .from('profiles')
        .update({ subscription_status: 'free', subscription_end: new Date().toISOString() })
        .eq('id', userId);
      break;
    }
    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  return new Response(JSON.stringify({ received: true }), { status: 200 });
});
