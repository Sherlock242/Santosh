
import React, { Suspense } from 'react';
import { getExplorePosts } from '@/app/actions';
import { Loader2 } from 'lucide-react';
import ExploreClientPage from '@/components/explore-client-page';
import { createSupabaseServerClient } from '@/lib/supabaseServer';

export const revalidate = 60; // Revalidate the page every 60 seconds

export default async function ExplorePage() {
    const supabase = createSupabaseServerClient();
    const { data: { user: currentUser } } = await supabase.auth.getUser();

    // Fetch initial data on the server
    const initialPostsData = await getExplorePosts({ page: 1, limit: 12 });
    
    // Manually determine liked status if a user is logged in
    // This is a simplified approach. A more robust solution might involve a separate client-side fetch for liked statuses
    // if perfect real-time accuracy is needed without revalidating the whole page.
    let initialPosts = initialPostsData;
    if (currentUser && initialPosts.length > 0) {
        const postIds = initialPosts.map(p => p.id);
        const { data: likedStatuses, error } = await supabase
            .from('likes')
            .select('emoji_id')
            .eq('user_id', currentUser.id)
            .in('emoji_id', postIds);

        if (!error) {
            const likedSet = new Set(likedStatuses.map(l => l.emoji_id));
            initialPosts = initialPosts.map(post => ({
                ...post,
                is_liked: likedSet.has(post.id),
            }));
        }
    }


    return (
        <Suspense fallback={<div className="flex h-full w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
            <ExploreClientPage initialPosts={initialPosts} />
        </Suspense>
    );
}

    