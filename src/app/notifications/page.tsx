
import React, { Suspense } from 'react';
import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { Loader2 } from 'lucide-react';
import NotificationsClientPage from '@/components/notifications-client-page';

// This function now runs on the server before the page is rendered.
async function markAndFetchNotifications(supabase: any, user: any) {
    if (!user) return [];

    // Directly use an admin client to mark notifications as read.
    // This bypasses RLS and ensures the update happens reliably.
    const supabaseAdmin = createSupabaseServerClient(true);
    const { error: updateError } = await supabaseAdmin
        .from('notifications')
        .update({ is_read: true })
        .eq('recipient_id', user.id)
        .eq('is_read', false);

    if (updateError) {
        console.error('Error marking notifications as read:', updateError);
        // We don't throw an error here, as fetching should still proceed.
    }
    
    // Now fetch the notifications for display
    const { data: notificationsData, error: notificationsError } = await supabase
        .from('notifications')
        .select('*, link_request_id')
        .eq('recipient_id', user.id)
        .order('created_at', { ascending: false })
        .range(0, 14); // Fetch initial page (limit 15)

    if (notificationsError) {
        console.error('Error fetching notifications:', notificationsError);
        throw notificationsError;
    }
    
    if (!notificationsData) return [];

    const actorIds = [...new Set(notificationsData.map(n => n.actor_id))];
    const emojiIds = [...new Set(notificationsData.map(n => n.emoji_id).filter(Boolean))];

    const [
        { data: actorsData, error: actorsError },
        { data: supportStatusData, error: supportStatusError },
        { data: emojisData, error: emojisError }
    ] = await Promise.all([
        supabase.from('users').select('id, name, picture, is_private, is_gold_member').in('id', actorIds),
        supabase.from('supports').select('supported_id, status').eq('supporter_id', user.id).in('supported_id', actorIds),
        emojiIds.length > 0 ? supabase.from('emojis').select('*').in('id', emojiIds) : Promise.resolve({ data: [], error: null })
    ]);

    if (actorsError) throw actorsError;
    if (supportStatusError) throw supportStatusError;
    if (emojisError) throw emojisError;

    const actorsMap = new Map(actorsData?.map(a => [a.id, a]));
    const supportStatusMap = new Map(supportStatusData?.map(s => [s.supported_id, s.status]));
    const emojisMap = new Map(emojisData?.map(e => [e.id, e]));

    return notificationsData.map(n => ({
        ...n,
        created_at: n.created_at,
        actor: actorsMap.get(n.actor_id) || { id: n.actor_id, name: 'Unknown User', picture: '', is_private: false, is_gold_member: false },
        emoji: emojisMap.get(n.emoji_id) || null,
        actor_support_status: supportStatusMap.get(n.actor_id) || null,
        link_request_id: n.link_request_id || null,
    }));
}


export default async function NotificationsPage() {
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    const initialNotifications = await markAndFetchNotifications(supabase, user);

    return (
        <Suspense fallback={<div className="flex h-full w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
            <NotificationsClientPage initialNotifications={initialNotifications as any[]} />
        </Suspense>
    );
}
