
'use server';

import { revalidateTag } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabaseServer';

export async function deletePost(emojiId: string) {
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        throw new Error("You must be logged in to delete a post.");
    }
    
    // RLS policy will ensure the user can only delete their own post.
    const { error } = await supabase
        .from('emojis')
        .delete()
        .eq('id', emojiId)
        .eq('user_id', user.id);

    if (error) {
        console.error('Error deleting post:', error);
        throw new Error('Could not delete the post.');
    }
    
    // Revalidate all the pages where posts might appear.
    revalidateTag(`gallery:${user.id}`);
    revalidateTag('explore');
}

