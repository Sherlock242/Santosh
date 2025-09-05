
'use server';

import { headers } from 'next/headers';
import { createSupabaseServerClient } from '@/lib/supabaseServer';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

// This is the price ID for the ₹99/month plan in Stripe.
// You would create this price in your Stripe Dashboard.
const STRIPE_PRICE_ID = process.env.STRIPE_PRICE_ID!; 

export async function createStripeCheckoutSession() {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('User not authenticated.');
  }

  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('stripe_customer_id')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    throw new Error('Could not retrieve user profile.');
  }

  let customerId = profile.stripe_customer_id;

  // Create a new Stripe customer if one doesn't exist
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: user.user_metadata.name,
      metadata: {
        supabase_user_id: user.id,
      },
    });
    customerId = customer.id;

    // Save the new customer ID to the user's profile in Supabase
    await supabase
      .from('users')
      .update({ stripe_customer_id: customerId })
      .eq('id', user.id);
  }

  const origin = headers().get('origin')!;

  try {
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: STRIPE_PRICE_ID,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${origin}/gallery?payment=success`,
      cancel_url: `${origin}/plan?payment=cancelled`,
      metadata: {
        supabase_user_id: user.id,
      }
    });

    return { url: session.url };
  } catch (error) {
    console.error('Error creating Stripe session:', error);
    throw new Error('Could not create payment session.');
  }
}
