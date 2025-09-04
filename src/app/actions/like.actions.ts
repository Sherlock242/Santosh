
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
    
    const { data, error } = await supabase
        .rpc('get_likers_with_details', {
            p_emoji_id: emojiId,
            p_current_user_id: currentUser?.id,
            p_limit: limit,
            p_offset: (page - 1) * limit
        });

    if (error) {
        console.error('Error getting likers:', error);
        return [];
    }
    
    return (data || []) as UserWithSupportStatus[];
}
