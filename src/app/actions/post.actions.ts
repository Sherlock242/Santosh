
'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabaseServer';

export async function deletePost(emojiId: string) {
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        throw new Error('You must be logged in to delete a post.');
    }

    // Use an admin client to fetch the post to check ownership,
    // as RLS might prevent the user from selecting it before deleting.
    const supabaseAdmin = createSupabaseServerClient(true);
    const { data: post, error: fetchError } = await supabaseAdmin
        .from('emojis')
        .select('user_id')
        .eq('id', emojiId)
        .single();

    if (fetchError || !post) {
        console.error('Error fetching post for deletion:', fetchError);
        throw new Error('Post not found or you do not have permission to delete it.');
    }

    if (post.user_id !== user.id) {
        throw new Error('You can only delete your own posts.');
    }

    // Now delete the post using the user's client to respect RLS
    // but the check above ensures they have permission. The admin client will handle the delete.
    const { error: deleteError } = await supabaseAdmin
        .from('emojis')
        .delete()
        .eq('id', emojiId);

    if (deleteError) {
        console.error('Error deleting post:', deleteError);
        throw new Error(deleteError.message);
    }

    revalidatePath('/gallery');
    revalidatePath('/mood');
    revalidatePath('/explore');
}
