
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
        .select(`
            id,
            title,
            url,
            color,
            created_at,
            user_id,
            clicks,
            user:users (id, name, picture)
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
    
    return links || [];
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
    
    // Use the supabase-js built-in rpc method to call the function
    const { error } = await supabase.rpc('increment_link_clicks', { link_id: linkId });

    if (error) {
        console.error('Error incrementing link click via RPC:', error);
        // Do not throw an error, as it's not critical for the user experience,
        // but log it for debugging.
    }
}
