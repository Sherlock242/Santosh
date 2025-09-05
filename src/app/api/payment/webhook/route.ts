
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createSupabaseServerClient } from '@/lib/supabaseServer';

// This is your webhook secret, which you will get from the Razorpay dashboard.
const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET!;

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get('x-razorpay-signature');

  if (!signature) {
    return NextResponse.json({ error: 'No signature found' }, { status: 400 });
  }

  try {
    // Step 1: Verify the webhook signature
    const shasum = crypto.createHmac('sha256', WEBHOOK_SECRET);
    shasum.update(body);
    const digest = shasum.digest('hex');

    if (digest !== signature) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
    }

    // Step 2: Parse the event payload
    const event = JSON.parse(body);

    // We only care about the subscription being successfully charged.
    if (event.event === 'subscription.charged') {
      const subscription = event.payload.subscription.entity;
      const customerId = subscription.customer_id;
      const subscriptionId = subscription.id;

      // Step 3: Find the user and update their status in Supabase
      const supabase = createSupabaseServerClient(true); // Use admin client to update user data

      // Find the user by their Razorpay customer ID
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('razorpay_customer_id', customerId)
        .single();

      if (userError || !user) {
        console.error('Webhook Error: User not found for customer ID:', customerId);
        // Return a 200 OK to Razorpay so it doesn't keep retrying, but log the error.
        return NextResponse.json({ received: true, message: 'User not found' });
      }

      // Update the user's profile to mark them as a gold member
      const { error: updateError } = await supabase
        .from('users')
        .update({ 
            is_gold_member: true,
            razorpay_subscription_id: subscriptionId // Store the subscription ID for future management
        })
        .eq('id', user.id);

      if (updateError) {
        console.error('Webhook Error: Failed to update user status:', updateError);
        // This is a server error, so we should let Razorpay know something went wrong.
        return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
      }
      
      console.log(`Successfully upgraded user ${user.id} to Gold Member.`);
    }

    // Step 4: Acknowledge the event
    return NextResponse.json({ received: true });

  } catch (error: any) {
    console.error('Webhook processing error:', error.message);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
