
'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabaseServer';

interface LinkPayload {
    titlePrefix: string;
    urls: string[];
    color: string;
}

export async function addLink(payload: LinkPayload) {
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        throw new Error('You must be logged in to add a link.');
    }

    if (!payload.urls || payload.urls.length === 0) {
        throw new Error('At least one URL is required.');
    }

    const linksToInsert = payload.urls.map((url, index) => {
        let title = payload.titlePrefix 
            ? `${payload.titlePrefix} ${index + 1}` 
            : url;
        
        if (title.length > 50) {
            title = title.substring(0, 47) + '...';
        }

        return {
            user_id: user.id,
            title: title,
            url: url,
            color: payload.color,
            clicks: 0,
        };
    });

    const { error } = await supabase.from('links').insert(linksToInsert);

    if (error) {
        console.error('Error adding links:', error);
        throw new Error(error.message);
    }

    revalidatePath('/links');
}

export async function getLinks({ query, page = 1, limit = 10 }: { query: string; page: number; limit: number; }) {
    const supabase = createSupabaseServerClient();
    
    const from = (page - 1) * limit;
    const to = page * limit - 1;

    let linksQuery = supabase
        .from('links')
        .select(`id, title, url, created_at, user_id, color, clicks`)
        .order('created_at', { ascending: false })
        .range(from, to);

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


// --- Link Request Actions ---

export async function createLinkRequest(requestText: string) {
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        throw new Error('You must be logged in to create a request.');
    }
    if (!requestText || requestText.length > 40) {
        throw new Error('Request text must be between 1 and 40 characters.');
    }

    const { error } = await supabase.from('link_requests').insert({
        user_id: user.id,
        request_text: requestText,
    });

    if (error) {
        console.error('Error creating link request:', error);
        throw new Error(error.message);
    }
    revalidatePath('/links');
}

export async function getLinkRequests({ query, page = 1, limit = 10 }: { query: string; page: number; limit: number; }) {
    const supabase = createSupabaseServerClient();
    const from = (page - 1) * limit;
    const to = page * limit - 1;

    let requestQuery = supabase
        .from('link_requests')
        .select(`
            id,
            request_text,
            created_at,
            user:users (id, name, picture),
            responses:link_request_responses (
                id,
                urls,
                created_at,
                user:users (id, name, picture)
            )
        `)
        .order('created_at', { ascending: false })
        .range(from, to);
    
    if (query) {
        requestQuery = requestQuery.ilike('request_text', `%${query}%`);
    }

    const { data, error } = await requestQuery;

    if (error) {
        console.error('Error fetching link requests:', error);
        throw new Error(error.message);
    }

    return data || [];
}

export async function addLinkResponse({ requestId, urls }: { requestId: string; urls: string[] }) {
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        throw new Error('You must be logged in to respond.');
    }
    if (!urls || urls.length === 0 || urls.length > 5) {
        throw new Error('You can add between 1 and 5 links.');
    }

    const { error } = await supabase.from('link_request_responses').insert({
        request_id: requestId,
        user_id: user.id,
        urls: urls,
    });

    if (error) {
        console.error('Error adding link response:', error);
        throw new Error(error.message);
    }
    revalidatePath('/links');
}

export async function deleteLinkRequest(requestId: string) {
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated.');

    const { error } = await supabase.from('link_requests').delete()
        .eq('id', requestId)
        .eq('user_id', user.id);

    if (error) {
        console.error('Error deleting link request:', error);
        throw new Error(error.message);
    }
    revalidatePath('/links');
}

export async function deleteLinkResponse(responseId: string) {
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated.');

    const { error } = await supabase.from('link_request_responses').delete()
        .eq('id', responseId)
        .eq('user_id', user.id);

    if (error) {
        console.error('Error deleting link response:', error);
        throw new Error(error.message);
    }
    revalidatePath('/links');
}
