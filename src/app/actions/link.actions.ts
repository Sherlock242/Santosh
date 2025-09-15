
'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabaseServer';

interface LinkPayload {
    title: string;
    url: string;
    color: string;
}

export async function addLink(payload: LinkPayload) {
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        throw new Error('You must be logged in to add a link.');
    }

    if (!payload.title || !payload.url) {
        throw new Error('Title and URL are required.');
    }

    if (!payload.url.startsWith('https://')) {
        throw new Error('Link must start with https://');
    }

    const { error } = await supabase.from('links').insert({
        user_id: user.id,
        title: payload.title,
        url: payload.url,
        color: payload.color,
    });

    if (error) {
        console.error('Error adding link:', error);
        throw new Error(error.message);
    }

    revalidatePath('/links');
}

export async function getLinks(query: string) {
    const supabase = createSupabaseServerClient();
    
    // Step 1: Fetch the links, including the 'clicks' column, with or without a search query.
    let linksQuery = supabase
        .from('links')
        .select(`
            id,
            title,
            url,
            color,
            created_at,
            user_id,
            clicks
        `)
        .order('created_at', { ascending: false });

    if (query) {
        linksQuery = linksQuery.or(`title.ilike.%${query}%,url.ilike.%${query}%`);
    }

    const { data: links, error: linksError } = await linksQuery;

    if (linksError) {
        console.error('Error fetching links:', linksError);
        throw new Error(linksError.message);
    }
    if (!links || links.length === 0) {
        return [];
    }

    // Step 2: Collect all unique user IDs from the fetched links.
    const userIds = [...new Set(links.map(link => link.user_id))];
    if (userIds.length === 0) {
        // This case shouldn't happen if there are links, but as a safeguard:
        return links.map(link => ({ ...link, user: null }));
    }

    // Step 3: Fetch all the user profiles for those IDs in a single query.
    const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, name, picture')
        .in('id', userIds);

    if (usersError) {
        console.error('Error fetching users for links:', usersError);
        // Return links without user info if this fails
        return links.map(link => ({ ...link, user: null }));
    }

    // Step 4: Create a map of users by their ID for easy lookup.
    const userMap = new Map(users.map(user => [user.id, user]));

    // Step 5: Manually combine the links with their user data.
    return links.map(link => ({
        ...link,
        user: userMap.get(link.user_id) || null
    }));
}


export async function deleteLink(linkId: string) {
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        throw new Error('You must be logged in to delete a link.');
    }

    // Only allow users to delete their own links
    const { error } = await supabase
        .from('links')
        .delete()
        .eq('id', linkId)
        .eq('user_id', user.id);

    if (error) {
        console.error('Error deleting link:', error);
        throw new Error(error.message);
    }

    revalidatePath('/links');
}

export async function incrementLinkClick(linkId: string) {
    const supabase = createSupabaseServerClient();
    // Directly call the RPC function created in Supabase
    const { error } = await supabase.rpc('increment_link_clicks', { link_id: linkId });
    if (error) {
        console.error('Error incrementing link click:', error);
        // We don't throw an error here, as it's not critical for the user experience 
        // if the count fails to update, but we log it for debugging.
    }
}
