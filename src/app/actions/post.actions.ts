
'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabaseServer';

export async function deletePost(emojiId: string) {
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        throw new Error('You must be logged in to delete a post.');
    }

    // RLS policy should ensure that the user can only delete their own post.
    const { error } = await supabase
        .from('emojis')
        .delete()
        .eq('id', emojiId)
        .eq('user_id', user.id);

    if (error) {
        console.error('Error deleting post:', error);
        throw new Error('Failed to delete the post. ' + error.message);
    }

    revalidatePath('/gallery');
    revalidatePath('/mood');
    revalidatePath('/explore');
}
