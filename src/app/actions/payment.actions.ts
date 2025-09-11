
'use server';

import { createSupabaseServerClient } from '@/lib/supabaseServer';
import Razorpay from 'razorpay';
import { randomBytes } from 'crypto';

export async function createRazorpaySubscription() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  const planId = process.env.RAZORPAY_PLAN_ID;

  if (!keyId || !keySecret || !planId) {
    console.error('Razorpay environment variables are not set.');
    throw new Error('Payment service is not configured correctly. Please contact support.');
  }

  const instance = new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });
  
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
    const subscriptionRequest = {
      plan_id: planId,
      customer_id: customerId,
      customer_notify: 1,
      quantity: 1,
      total_count: 60, // Standard for 5 years of monthly payments
      notes: {
        supabase_user_id: user.id,
      },
    };

    const subscription = await instance.subscriptions.create(subscriptionRequest as any);
    
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
