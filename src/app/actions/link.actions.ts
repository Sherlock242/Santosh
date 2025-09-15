
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
    
    let linksQuery = supabase
        .from('links')
        .select(`*, user:users(id, name, picture)`)
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

    // Extract user IDs to fetch user profiles in a single batch
    const userIds = [...new Set(links.map(link => link.user_id))];

    const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, name, picture')
        .in('id', userIds);

    if (usersError) {
        console.error('Error fetching users for links:', usersError);
        // Return links without user info if this fails
        return links.map(link => ({ ...link, user: null }));
    }

    // Create a map for easy lookup
    const usersMap = new Map(users.map(user => [user.id, user]));

    // Combine links with their user profiles
    const combinedLinks = links.map(link => ({
        ...link,
        user: usersMap.get(link.user_id) || null
    }));

    return combinedLinks;
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
    const supabase = createSupabaseServerClient(true); // Use admin client to bypass RLS for this internal operation
    
    // This RPC function should be created in your Supabase SQL Editor
    const { error } = await supabase.rpc('increment_link_clicks', { link_id_arg: linkId });

    if (error) {
        console.error('Error incrementing link click via RPC:', error);
        // Do not throw an error, as it's not critical for the user experience,
        // but log it for debugging. This might indicate the RPC function is missing.
    }
}
