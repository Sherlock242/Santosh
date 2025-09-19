
'use server';

import { createSupabaseServerClient } from '@/lib/supabaseServer';
import type { EmojiState } from '@/app/design/page';
import { unstable_cache as cache } from 'next/cache';
import { supabase as supabaseAdmin } from '@/lib/supabaseClient'; // A client that doesn't use cookies


// --- Feed & Gallery & Explore Actions ---

export async function getFeedMoods() {
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    // 1. Get IDs of users the current user is following
    const { data: supportedUsers, error: supportedError } = await supabase
        .from('supports')
        .select('supported_id')
        .eq('supporter_id', user.id)
        .eq('status', 'approved');

    if (supportedError) {
        console.error('Error fetching supported users for moods:', supportedError);
        throw supportedError;
    }
    
    const supportedIds = supportedUsers.map(s => s.supported_id);
    const moodFeedUserIds = [user.id, ...supportedIds];

    // 2. Fetch moods from those users created within the last 24 hours
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
        .from('moods')
        .select(`
            mood_id:id,
            mood_created_at:created_at,
            mood_user_id:user_id,
            mood_user:users (id, name, picture, is_gold_member),
            emojis (
                id, created_at, user_id, model, expression, background_color, emoji_color, show_sunglasses, show_mustache,
                selected_filter, animation_type, shape, eye_style, mouth_style, eyebrow_style, feature_offset_x,
                feature_offset_y, caption
            )
        `)
        .in('user_id', moodFeedUserIds)
        .gte('created_at', twentyFourHoursAgo)
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Failed to fetch moods", error);
        throw error;
    }
    if (!data) return [];
    
    // Un-nest the emoji data and filter out moods with no associated emoji
    const flattenedData = data.map(m => {
        const { emojis, ...mood } = m;
        if (!emojis) return null; // If emoji is null, this mood is invalid.
        return { ...mood, ...(emojis as any) };
    }).filter(Boolean); // This removes any null entries.

    // 3. Check which moods have been viewed by the current user
    const moodIds = flattenedData.map(m => m.mood_id);
    if (moodIds.length === 0) {
        return flattenedData.map(mood => ({ ...mood, is_viewed: false }));
    }

    const { data: viewedMoods, error: viewedError } = await supabase
        .from('mood_views')
        .select('mood_id')
        .eq('viewer_id', user.id)
        .in('mood_id', moodIds);

    if (viewedError) {
        console.error("Failed to fetch viewed moods:", viewedError);
        // Continue without view status if this fails
    }

    const viewedMoodsSet = new Set(viewedMoods?.map(vm => vm.mood_id) || []);

    const result = flattenedData.map(mood => ({
        ...mood,
        is_viewed: viewedMoodsSet.has(mood.mood_id)
    })).sort((a, b) => {
        // Sort own mood to the front, then by creation date
        if (a.mood_user_id === user.id) return -1;
        if (b.mood_user_id === user.id) return 1;
        return new Date(b.mood_created_at).getTime() - new Date(a.mood_created_at).getTime();
    });

    return result;
}

export async function getFeedPosts({ page = 1, limit = 5 }: { page: number, limit: number }) {
    const supabase = createSupabaseServerClient();
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) throw new Error("Not authenticated");

    // 1. Get the IDs of the current user and the users they follow
    const { data: supportedUsers, error: supportedError } = await supabase
        .from('supports')
        .select('supported_id')
        .eq('supporter_id', currentUser.id)
        .eq('status', 'approved');

    if (supportedError) {
        console.error('Error fetching supported users:', supportedError);
        throw supportedError;
    }
    const supportedIds = supportedUsers.map(s => s.supported_id);
    const feedUserIds = [currentUser.id, ...supportedIds];

    // 2. Fetch the posts from those users
    const { data: posts, error: postsError } = await supabase
        .from('emojis')
        .select('*, user:users(id, name, picture, is_gold_member, moods(user_id))')
        .in('user_id', feedUserIds)
        .order('created_at', { ascending: false })
        .range((page - 1) * limit, page * limit - 1);
        
    if (postsError) {
        console.error('Error fetching feed posts:', postsError);
        throw postsError;
    }
    if (!posts || posts.length === 0) return [];

    const emojiIds = posts.map(p => p.id);
    
    // 3. Get like counts and liked statuses in parallel for efficiency
    const [likeCountsResult, likedStatusesResult] = await Promise.all([
        supabase.rpc('get_like_counts_for_emojis', { p_emoji_ids: emojiIds }),
        supabase.from('likes').select('emoji_id').eq('user_id', currentUser.id).in('emoji_id', emojiIds)
    ]);
    
    if (likeCountsResult.error) console.error("Error getting like counts:", likeCountsResult.error);
    if (likedStatusesResult.error) console.error("Error getting liked status:", likedStatusesResult.error);

    // 4. Create maps for quick lookups
    const likeCountsMap = new Map(likeCountsResult.data?.map((l: any) => [l.emoji_id, l.like_count]) || []);
    const likedSet = new Set(likedStatusesResult.data?.map(l => l.emoji_id) || []);

    // 5. Combine all data, ensuring correct types
    return posts.map(post => ({
        ...(post as unknown as EmojiState),
        user: { 
            ...post.user, 
            has_mood: post.user?.moods?.length > 0 
        } as any,
        like_count: Number(likeCountsMap.get(post.id) || 0), // Ensure this is a number
        is_liked: likedSet.has(post.id), // Ensure this is a boolean
    }));
}

// Caches public post data (post + user + like count) for 60 seconds
const getCachedGalleryPosts = (userId: string) => cache(
    async () => {
        const { data: posts, error: postsError } = await supabaseAdmin
            .from('emojis')
            .select('*, user:users!inner(id, name, picture, is_gold_member)')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });
        
        if (postsError) {
            console.error('Error fetching gallery posts for cache:', postsError);
            throw postsError;
        }
        if (!posts) return [];

        const emojiIds = posts.map(p => p.id);
        if (emojiIds.length === 0) return posts.map(p => ({ ...p, like_count: 0 }));
        
        const { data: likeCounts, error: likesError } = await supabaseAdmin
            .rpc('get_like_counts_for_emojis', { p_emoji_ids: emojiIds });
        
        if (likesError) {
            console.error('Error fetching like counts for cache:', likesError);
            // Return posts without counts if this fails
            return posts.map(p => ({ ...p, like_count: 0 }));
        }

        const likeCountsMap = new Map(likeCounts.map((l: any) => [l.emoji_id, l.like_count]));

        return posts.map(post => ({
            ...(post as unknown as EmojiState),
            user: post.user as any,
            like_count: likeCountsMap.get(post.id) || 0,
        }));
    },
    [`gallery-posts-${userId}`],
    { revalidate: 60, tags: [`gallery:${userId}`] }
);


export async function getGalleryPosts({ userId }: { userId: string }) {
    // 1. Fetch cached public data (posts, user info, like counts)
    const publicPosts = await getCachedGalleryPosts(userId)();
    if (!publicPosts || publicPosts.length === 0) return [];
    
    // 2. Fetch dynamic, user-specific data (is_liked status)
    const supabase = createSupabaseServerClient();
    const { data: { user: currentUser } } = await supabase.auth.getUser();

    if (!currentUser) {
        return publicPosts.map(post => ({ ...post, is_liked: false }));
    }

    const emojiIds = publicPosts.map(p => p.id);
    const { data: likedStatuses, error: likedError } = await supabase
        .from('likes')
        .select('emoji_id')
        .eq('user_id', currentUser.id)
        .in('emoji_id', emojiIds);

    if (likedError) {
        console.error('Error fetching liked statuses for gallery:', likedError);
        // Return with is_liked as false if this fails
        return publicPosts.map(post => ({ ...post, is_liked: false }));
    }
    
    const likedSet = new Set(likedStatuses.map(l => l.emoji_id));

    // 3. Combine cached public data with dynamic user data
    return publicPosts.map(post => ({
        ...post,
        is_liked: likedSet.has(post.id)
    }));
}


// Caches public post data (post + user + like count) for 60 seconds
const getCachedExplorePosts = (page: number, limit: number) => cache(
    async () => {
        const { data: posts, error: postsError } = await supabaseAdmin
            .from('emojis')
            .select('*, user:users!inner(id, name, picture, is_private, is_gold_member, moods(user_id))')
            .eq('user.is_private', false)
            .order('created_at', { ascending: false })
            .range((page - 1) * limit, page * limit - 1);
        
        if (postsError) {
            console.error('Error fetching explore posts for cache:', postsError);
            throw postsError;
        }
        if (!posts) return [];

        const emojiIds = posts.map(p => p.id);
        if (emojiIds.length === 0) return [];

        const { data: likeCounts, error: likesError } = await supabaseAdmin
            .rpc('get_like_counts_for_emojis', { p_emoji_ids: emojiIds });

        if (likesError) {
            console.error('Error fetching like counts for cache:', likesError);
            return posts.map(p => ({ ...p, like_count: 0, user: { ...p.user, has_mood: p.user?.moods?.length > 0 } }));
        }

        const likeCountsMap = new Map(likeCounts.map((l: any) => [l.emoji_id, l.like_count]));

        return posts.map(post => ({
            ...(post as unknown as EmojiState),
            like_count: likeCountsMap.get(post.id) || 0,
            user: { ...post.user, has_mood: post.user?.moods?.length > 0 } as any,
        }));
    },
    [`explore-posts-${page}-${limit}`],
    { revalidate: 60, tags: ['explore'] }
);

export async function getExplorePosts({ page = 1, limit = 12 }: { page: number, limit: number }) {
    // 1. Fetch cached public data
    const publicPosts = await getCachedExplorePosts(page, limit)();
    if (!publicPosts || publicPosts.length === 0) return [];

    // 2. Fetch dynamic user data
    const supabase = createSupabaseServerClient();
    const { data: { user: currentUser } } = await supabase.auth.getUser();

    if (!currentUser) {
        return publicPosts.map(post => ({ ...post, is_liked: false }));
    }
    
    const emojiIds = publicPosts.map(p => p.id);
    const { data: likedStatuses, error: likedError } = await supabase
        .from('likes')
        .select('emoji_id')
        .eq('user_id', currentUser.id)
        .in('emoji_id', emojiIds);

    if (likedError) {
        console.error('Error fetching liked statuses for explore:', likedError);
        return publicPosts.map(post => ({ ...post, is_liked: false }));
    }

    const likedSet = new Set(likedStatuses.map(l => l.emoji_id));

    // 3. Combine
    return publicPosts.map(post => ({
        ...post,
        is_liked: likedSet.has(post.id),
    }));
}

    

    