
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createSupabaseServerClient } from '@/lib/supabaseServer';

// This is your webhook secret, which you will get from the Razorpay dashboard.
const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET!;

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get('x-razorpay-signature');

  if (!signature) {
    console.error("Webhook Error: No signature found");
    return NextResponse.json({ error: 'No signature found' }, { status: 400 });
  }

  try {
    // Step 1: Verify the webhook signature
    const shasum = crypto.createHmac('sha256', WEBHOOK_SECRET);
    shasum.update(body);
    const digest = shasum.digest('hex');

    if (digest !== signature) {
      console.error("Webhook Error: Invalid signature");
      return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
    }

    // Step 2: Parse the event payload
    const event = JSON.parse(body);
    const eventType = event.event;

    // We only care about the subscription being successfully charged.
    // Razorpay sends this event for both the first payment and subsequent ones.
    if (eventType === 'subscription.charged') {
      const subscription = event.payload.subscription.entity;
      const payment = event.payload.payment.entity;

      // The user ID should be in the subscription notes.
      const supabaseUserId = subscription?.notes?.supabase_user_id;
      const subscriptionId = subscription?.id;
      const customerId = payment?.customer_id;

      if (!supabaseUserId) {
        console.error('Webhook Error: supabase_user_id not found in subscription notes.');
        // Acknowledge receipt to prevent Razorpay from retrying, but log the issue.
        return NextResponse.json({ received: true, message: 'User ID missing from webhook notes.' });
      }

      // Step 3: Find the user and update their status in Supabase
      // Use the admin client to bypass RLS for updating user data
      const supabase = createSupabaseServerClient(true); 

      const { error: updateError } = await supabase
        .from('users')
        .update({ 
            is_gold_member: true,
            razorpay_subscription_id: subscriptionId,
            razorpay_customer_id: customerId,
        })
        .eq('id', supabaseUserId);

      if (updateError) {
        console.error('Webhook Error: Failed to update user status:', updateError);
        // This is a server error, so we should let Razorpay know something went wrong.
        return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
      }
      
      console.log(`Successfully upgraded user ${supabaseUserId} to Gold Member.`);
    }

    // Step 4: Acknowledge the event
    return NextResponse.json({ received: true });

  } catch (error: any) {
    console.error('Webhook processing error:', error.message);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
