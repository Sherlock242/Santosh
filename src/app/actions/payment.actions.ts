
'use server';

import { createSupabaseServerClient } from '@/lib/supabaseServer';
import Razorpay from 'razorpay';
import type { SubscriptionCreateRequestBody } from 'razorpay/dist/types/subscription';
import { randomBytes } from 'crypto';

const instance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

// This is the plan ID for the ₹99/month plan in Razorpay.
// You would create this subscription plan in your Razorpay Dashboard.
const RAZORPAY_PLAN_ID = process.env.RAZORPAY_PLAN_ID!;

export async function createRazorpaySubscription() {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('User not authenticated.');
  }

  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('razorpay_customer_id')
    .eq('id', user.id)
    .single();

  if (profileError && profileError.code !== 'PGRST116') { // PGRST116 means no rows found, which is fine
    console.error('Error retrieving user profile:', profileError);
    throw new Error('Could not retrieve user profile.');
  }

  let customerId = profile?.razorpay_customer_id;

  // Create a new Razorpay customer only if one doesn't exist
  if (!customerId) {
    try {
      const customer = await instance.customers.create({
        name: user.user_metadata.name || user.email,
        email: user.email!,
        fail_existing: 0
      });
      customerId = customer.id;

      const { error: updateError } = await supabase
        .from('users')
        .update({ razorpay_customer_id: customerId })
        .eq('id', user.id);
        
      if (updateError) {
        console.error("Failed to save new razorpay_customer_id:", updateError);
        // Don't throw here, as the customer was created. Proceed with subscription.
      }
    } catch(error: any) {
        console.error('Error creating or fetching Razorpay customer:', error);
        // Provide a more specific error message if available
        const description = error.error?.description ? `Razorpay Error: ${error.error.description}` : 'Could not create a payment customer.';
        throw new Error(description);
    }
  }

  try {
    const subscriptionRequest: SubscriptionCreateRequestBody = {
      plan_id: RAZORPAY_PLAN_ID,
      customer_notify: 1,
      quantity: 1,
      total_count: 60, // Standard for 5 years of monthly payments
      notes: {
        supabase_user_id: user.id,
      },
    };

    const subscription = await instance.subscriptions.create(subscriptionRequest);
    
    return { 
        subscriptionId: subscription.id,
        customerId: customerId, // Return the customerId we created/retrieved
        key: process.env.RAZORPAY_KEY_ID!,
        userName: user.user_metadata.name || user.email,
        userEmail: user.email
    };

  } catch (error: any) {
    console.error('Error creating Razorpay subscription:', error);
    const description = error.error?.description ? `Razorpay Error: ${error.error.description}` : 'Could not create subscription. Please ensure the Razorpay plan is active and configured correctly.';
    throw new Error(description);
  }
}
