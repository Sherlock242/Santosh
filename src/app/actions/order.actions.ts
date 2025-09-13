
'use server';

import 'dotenv/config';
import { createSupabaseServerClient } from '@/lib/supabaseServer';
import Razorpay from 'razorpay';
import { randomBytes } from 'crypto';
import crypto from 'crypto';

const keyId = process.env.RAZORPAY_KEY_ID;
const keySecret = process.env.RAZORPAY_KEY_SECRET;

if (!keyId || !keySecret) {
  console.error('Razorpay environment variables are not set.');
  throw new Error('Payment service is not configured correctly. Please contact support.');
}

const instance = new Razorpay({
  key_id: keyId,
  key_secret: keySecret,
});

export async function createRazorpayOrder() {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('User not authenticated.');
  }
  
  // Check if user is already a gold member
  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('is_gold_member, gold_member_expires_at')
    .eq('id', user.id)
    .single();

  if (profileError) {
    console.error('Error fetching user profile:', profileError);
    throw new Error('Could not retrieve user profile.');
  }
  
  const isGold = profile.is_gold_member || (profile.gold_member_expires_at && new Date(profile.gold_member_expires_at) > new Date());

  if (isGold) {
    throw new Error('You are already a Gold Member.');
  }


  const options = {
    amount: 9900, // amount in the smallest currency unit (99 * 100)
    currency: "INR",
    receipt: `receipt_order_${randomBytes(8).toString('hex')}`,
    notes: {
      supabase_user_id: user.id
    }
  };

  try {
    const order = await instance.orders.create(options);
    return {
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      key: keyId,
      userName: user.user_metadata.name || user.email,
      userEmail: user.email
    };
  } catch (error: any) {
    console.error('Error creating Razorpay order:', error);
    const description = error.error?.description || 'Could not create payment order.';
    throw new Error(description);
  }
}

export async function verifyPayment(data: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
}) {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = data;

    const body = razorpay_order_id + "|" + razorpay_payment_id;

    const expectedSignature = crypto
        .createHmac('sha256', keySecret!)
        .update(body.toString())
        .digest('hex');

    const isAuthentic = expectedSignature === razorpay_signature;

    if (!isAuthentic) {
        throw new Error('Payment verification failed. Signature mismatch.');
    }
    
    // Fetch order details from Razorpay first to get the user ID from notes
    let supabaseUserId;
    try {
        const order = await instance.orders.fetch(razorpay_order_id);
        supabaseUserId = order.notes?.supabase_user_id;
    } catch (error: any) {
         console.error('Razorpay API error fetching order:', error);
         throw new Error('Could not fetch order details from payment gateway.');
    }

    if (!supabaseUserId) {
        console.error('Verification Error: supabase_user_id not found in order notes.');
        throw new Error('Could not find user ID for this order.');
    }

    // Calculate the expiration date (30 days from now)
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + 30);

    // Now, create an admin Supabase client to update the user's status
    const supabaseAdmin = createSupabaseServerClient(true);
    const { error: updateError } = await supabaseAdmin
        .from('users')
        .update({ 
            is_gold_member: true,
            gold_member_expires_at: expirationDate.toISOString() 
        })
        .eq('id', supabaseUserId);

    if (updateError) {
        console.error('Verification Error: Failed to update user status:', updateError);
        throw new Error('Failed to update user status in the database.');
    }

    console.log(`Successfully upgraded user ${supabaseUserId} to Gold Member until ${expirationDate.toISOString()}.`);
    return { success: true, message: "Payment verified and user upgraded." };
}
