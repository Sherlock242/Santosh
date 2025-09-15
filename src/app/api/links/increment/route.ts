
import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { linkId } = await req.json();

    if (!linkId) {
      return new NextResponse(JSON.stringify({ error: 'Link ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // This uses a dedicated RPC function with `security definer`
    // to bypass RLS for this specific, safe, atomic update.
    const supabase = createSupabaseServerClient(true); // Use admin client to call security definer function
    const { error } = await supabase.rpc('increment_link_clicks', { link_id_arg: linkId });

    if (error) {
      console.error('Error incrementing link click via RPC:', error);
      // Even if it fails, we don't want to block the user. Log and return success.
      return new NextResponse(JSON.stringify({ message: 'Logged, but failed to increment.' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new NextResponse(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (e: any) {
    console.error('Server error in increment route:', e);
    return new NextResponse(JSON.stringify({ error: e.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
  }
}
