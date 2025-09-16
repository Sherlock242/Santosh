
'use server';

import { createSupabaseServerClient } from '@/lib/supabaseServer';
import type { EmojiState } from '@/app/design/page';

// --- Notification Actions ---
type NotificationPayload = {
    recipient_id: string;
    actor_id: string;
    type: 'new_supporter' | 'new_like' | 'new_support_request' | 'support_request_approved' | 'new_link_response';
    emoji_id?: string;
    link_request_id?: string;
}

interface Actor {
    id: string;
    name: string;
    picture: string;
    is_private: boolean;
}

interface FullNotification {
    id: number;
    type: 'new_supporter' | 'new_like' | 'new_support_request' | 'support_request_approved' | 'new_link_response';
    created_at: string;
    emoji_id: string | null;
    link_request_id: string | null;
    actor: Actor;
    emoji: EmojiState | null;
    actor_support_status: 'approved' | 'pending' | null;
}


export async function createNotification(payload: NotificationPayload) {
    const supabase = createSupabaseServerClient(); 
    const { error } = await supabase.from('notifications').insert(payload);
    if (error) {
        console.error('Error creating notification:', error);
    }
}


export async function getNotifications({ page = 1, limit = 15 }: { page: number, limit: number }): Promise<FullNotification[]> {
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    // 1. Fetch notifications for the current user
    const { data: notificationsData, error: notificationsError } = await supabase
        .from('notifications')
        .select('*')
        .eq('recipient_id', user.id)
        .order('created_at', { ascending: false })
        .range((page - 1) * limit, page * limit - 1);

    if (notificationsError) {
        console.error('Error fetching notifications:', notificationsError);
        throw notificationsError;
    }
    if (!notificationsData) return [];

    // 2. Collect actor and emoji IDs for batch fetching
    const actorIds = [...new Set(notificationsData.map(n => n.actor_id))];
    const emojiIds = [...new Set(notificationsData.map(n => n.emoji_id).filter(Boolean))];

    // 3. Batch fetch actor details, support statuses, and emoji details
    const [
        { data: actorsData, error: actorsError },
        { data: supportStatusData, error: supportStatusError },
        { data: emojisData, error: emojisError }
    ] = await Promise.all([
        supabase.from('users').select('id, name, picture, is_private').in('id', actorIds),
        supabase.from('supports').select('supported_id, status').eq('supporter_id', user.id).in('supported_id', actorIds),
        emojiIds.length > 0 ? supabase.from('emojis').select('*').in('id', emojiIds) : Promise.resolve({ data: [], error: null })
    ]);

    if (actorsError) throw actorsError;
    if (supportStatusError) throw supportStatusError;
    if (emojisError) throw emojisError;

    // 4. Create maps for efficient lookup
    const actorsMap = new Map(actorsData?.map(a => [a.id, a]));
    const supportStatusMap = new Map(supportStatusData?.map(s => [s.supported_id, s.status]));
    const emojisMap = new Map(emojisData?.map(e => [e.id, e]));

    // 5. Assemble the final notification objects
    const fullNotifications = notificationsData.map(n => {
        const actor = actorsMap.get(n.actor_id);
        const emoji = n.emoji_id ? emojisMap.get(n.emoji_id) : null;
        const actorSupportStatus = supportStatusMap.get(n.actor_id) || null;

        return {
            ...n,
            created_at: n.created_at,
            actor: actor || { id: n.actor_id, name: 'Unknown User', picture: '', is_private: false },
            emoji: emoji || null,
            actor_support_status: actorSupportStatus
        } as FullNotification;
    });

    // Mark notifications as read
    await markNotificationsAsRead();
    
    return fullNotifications;
}



export async function markNotificationsAsRead() {
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    // Fetch unread notifications first
    const { data: unreadNotifications, error: fetchError } = await supabase
        .from('notifications')
        .select('id')
        .eq('recipient_id', user.id)
        .eq('is_read', false);

    if (fetchError || !unreadNotifications || unreadNotifications.length === 0) {
        if(fetchError) console.error('Error fetching unread notifications:', fetchError);
        return; // No unread notifications to mark
    }
    
    const idsToUpdate = unreadNotifications.map(n => n.id);

    // Then, update only those notifications
    const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .in('id', idsToUpdate);

    if (error) {
        console.error('Error marking notifications as read:', error);
    }
}
