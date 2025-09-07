
'use server';

import { createSupabaseServerClient } from '@/lib/supabaseServer';
import Razorpay from 'razorpay';
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

  if (profileError && profileError.code !== 'PGRST116') {
    console.error('Error retrieving user profile:', profileError);
    throw new Error('Could not retrieve user profile.');
  }

  let customerId = profile?.razorpay_customer_id;

  // Create a new Razorpay customer if one doesn't exist
  if (!customerId) {
    const customer = await instance.customers.create({
      name: user.user_metadata.name || user.email,
      email: user.email!,
      contact: '', // You might want to collect phone number during signup
      fail_existing: 0
    });
    customerId = customer.id;

    const { error: updateError } = await supabase
      .from('users')
      .update({ razorpay_customer_id: customerId })
      .eq('id', user.id);
      
    if (updateError) {
        console.error("Failed to save new razorpay_customer_id:", updateError);
        throw new Error('Could not update user profile with Razorpay ID.');
    }
  }

  try {
    // Set an expiry date far in the future (e.g., 10 years) to create an ongoing subscription
    // This is the standard way to handle recurring subscriptions without a fixed end.
    const tenYearsFromNow = new Date();
    tenYearsFromNow.setFullYear(tenYearsFromNow.getFullYear() + 10);
    const expireByTimestamp = Math.floor(tenYearsFromNow.getTime() / 1000);

    const subscription = await instance.subscriptions.create({
      plan_id: RAZORPAY_PLAN_ID,
      customer_id: customerId,
      quantity: 1,
      customer_notify: 1,
      expire_by: expireByTimestamp, // Use expire_by instead of total_count
      notes: {
        supabase_user_id: user.id,
      }
    });

    return { 
        subscriptionId: subscription.id,
        customerId: customerId,
        key: process.env.RAZORPAY_KEY_ID!,
        userName: user.user_metadata.name || user.email,
        userEmail: user.email
    };
  } catch (error: any) {
    console.error('Error creating Razorpay subscription:', error);
    throw new Error('Could not create subscription.');
  }
}
