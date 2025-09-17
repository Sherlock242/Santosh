
'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabaseServer';
import type { UserWithSupportStatus } from './support.actions';
import { createNotification } from './notification.actions';

// --- Like Actions ---

export async function likePost(emojiId: string) {
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated.");

    // First, find the owner of the post
    const { data: emoji, error: emojiError } = await supabase
        .from('emojis')
        .select('user_id')
        .eq('id', emojiId)
        .single();
    
    if (emojiError) {
        console.error('Error finding post owner:', emojiError);
        throw emojiError;
    }

    const { error } = await supabase
        .from('likes')
        .insert({ user_id: user.id, emoji_id: emojiId });

    if (error) {
        if (error.code === '23505') { // Ignore unique constraint violation
            return;
        }
        console.error('Error liking post:', error);
        throw error;
    }
    
    // Create notification if not liking your own post
    if (user.id !== emoji.user_id) {
        await createNotification({
            recipient_id: emoji.user_id,
            actor_id: user.id,
            type: 'new_like',
            emoji_id: emojiId
        });
    }

    revalidatePath('/mood');
    revalidatePath('/explore');
    revalidatePath('/gallery');
}

export async function unlikePost(emojiId: string) {
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated.");

    const { error } = await supabase
        .from('likes')
        .delete()
        .eq('user_id', user.id)
        .eq('emoji_id', emojiId);
    
    if (error) {
        console.error('Error unliking post:', error);
        throw error;
    }
    revalidatePath('/mood');
    revalidatePath('/explore');
    revalidatePath('/gallery');
}

export async function getLikeCount(emojiId: string) {
    const supabase = createSupabaseServerClient();
    const { count, error } = await supabase
        .from('likes')
        .select('*', { count: 'exact', head: true })
        .eq('emoji_id', emojiId);
    
    if (error) {
        console.error('Error getting like count:', error);
        return 0;
    }
    return count || 0;
}

export async function getIsLiked(emojiId: string) {
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { count } = await supabase
        .from('likes')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('emoji_id', emojiId);

    return (count ?? 0) > 0;
}

export async function getLikers({ emojiId, page = 1, limit = 15 }: { emojiId: string, page: number, limit: number }): Promise<UserWithSupportStatus[]> {
    const supabase = createSupabaseServerClient();
    const { data: { user: currentUser } } = await supabase.auth.getUser();

    // 1. Fetch the user IDs of the likers with pagination
    const { data: likersData, error: likersError } = await supabase
        .from('likes')
        .select('user_id')
        .eq('emoji_id', emojiId)
        .order('created_at', { ascending: false })
        .range((page - 1) * limit, page * limit - 1);

    if (likersError) {
        console.error('Error getting likers user_ids:', likersError);
        return [];
    }

    const userIds = likersData.map(l => l.user_id);
    if (userIds.length === 0) return [];

    // 2. Fetch profile details and support statuses in parallel
    const [usersResult, supportStatusesResult] = await Promise.all([
        supabase.from('users').select('id, name, picture, is_private, is_gold_member').in('id', userIds),
        currentUser ? supabase.from('supports').select('supported_id, status').eq('supporter_id', currentUser.id).in('supported_id', userIds) : Promise.resolve({ data: [], error: null })
    ]);

    if (usersResult.error) {
        console.error('Error fetching liker profiles:', usersResult.error);
        return [];
    }
    
    if (supportStatusesResult.error) {
        console.error('Error fetching support statuses:', supportStatusesResult.error);
        // Continue without this data if it fails
    }

    // 3. Combine the data
    const supportStatusMap = new Map(supportStatusesResult.data?.map(s => [s.supported_id, s.status]));

    return usersResult.data.map(user => ({
        ...user,
        support_status: supportStatusMap.get(user.id) || null,
        has_mood: false // Note: We can't easily get has_mood here, default to false.
    })) as UserWithSupportStatus[];
}
