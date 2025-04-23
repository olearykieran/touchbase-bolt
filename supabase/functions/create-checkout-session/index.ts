import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Stripe from 'npm:stripe@11.11.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Initialize Stripe and Supabase Admin Client
const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2022-11-15' });
const supabaseUrl = Deno.env.get('PROJECT_URL')!;
const supabaseServiceRoleKey = Deno.env.get('SERVICE_ROLE_KEY')!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

// Deep link URLs to redirect back to the mobile app
const SUCCESS_URL = 'https://redirect-pages-2qxuawwdm-kieran-olearys-projects.vercel.app/payment-success.html';
const CANCEL_URL = 'https://redirect-pages-2qxuawwdm-kieran-olearys-projects.vercel.app/payment-cancel.html';

serve(async (req: Request) => {
  try {
    const { priceId, userId, email } = await req.json();
    
    // First, check if customer already exists for this user
    let customerId;
    const { data: profiles } = await supabaseAdmin
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', userId)
      .single();
      
    if (profiles?.stripe_customer_id) {
      customerId = profiles.stripe_customer_id;
      console.log('Found existing customer:', customerId);
    } else {
      // Create a new customer with user_id in metadata
      const customer = await stripe.customers.create({
        metadata: { user_id: userId },
        email: email || undefined
      });
      customerId = customer.id;
      
      // Save the customer ID to the user's profile
      await supabaseAdmin
        .from('profiles')
        .update({ 
          stripe_customer_id: customerId 
        })
        .eq('id', userId);
        
      console.log('Created new customer:', customerId);
    }
    
    // Create checkout session with proper parameters and the customer ID
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: SUCCESS_URL,
      cancel_url: CANCEL_URL,
      metadata: { user_id: userId },
      subscription_data: { 
        metadata: { user_id: userId } 
      }
    });
    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('Checkout Session Error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
