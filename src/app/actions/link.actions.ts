
'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { createNotification } from './notification.actions';

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
        // If there's only one URL and a prefix is given, use the prefix as the full title.
        // Otherwise, append an index for multiple URLs.
        let title = payload.urls.length > 1 
            ? `${payload.titlePrefix} ${index + 1}` 
            : payload.titlePrefix || url;
        
        if (title.length > 200) {
            title = title.substring(0, 197) + '...';
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
    if (!requestText || requestText.trim().length === 0 || requestText.length > 200) {
        throw new Error('Request text must be between 1 and 200 characters.');
    }

    const { error } = await supabase.from('link_requests').insert({
        user_id: user.id,
        request_text: requestText,
    });

    if (error) {
        console.error('Error creating link request:', error);
        throw new Error(error.message || 'An unknown error occurred while creating the request.');
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
            user:users!link_requests_user_id_fkey(id, name, picture),
            responses:link_request_responses (
                id,
                urls,
                created_at,
                user:users!link_request_responses_user_id_fkey(id, name, picture)
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
    
    // 1. Get the original request to find the owner
    const { data: request, error: requestError } = await supabase
        .from('link_requests')
        .select('user_id')
        .eq('id', requestId)
        .single();
    
    if (requestError || !request) {
        console.error('Error finding link request owner:', requestError);
        throw new Error('Could not find the original request.');
    }

    // 2. Insert the response
    const { error: responseError } = await supabase.from('link_request_responses').insert({
        request_id: requestId,
        user_id: user.id,
        urls: urls,
    });

    if (responseError) {
        console.error('Error adding link response:', responseError);
        throw new Error(responseError.message);
    }

    // 3. Create a notification for the original requestor
    if (user.id !== request.user_id) {
        await createNotification({
            recipient_id: request.user_id,
            actor_id: user.id,
            type: 'new_link_response',
            link_request_id: requestId,
        });
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

    // This action must use an admin client to bypass RLS,
    // because we need to check ownership of the parent request.
    const supabaseAdmin = createSupabaseServerClient(true);
    
    // 1. Fetch the response and its parent request's author
    const { data: responseData, error: fetchError } = await supabaseAdmin
        .from('link_request_responses')
        .select(`
            user_id,
            request:link_requests!inner ( user_id )
        `)
        .eq('id', responseId)
        .single();
        
    if (fetchError || !responseData) {
        console.error('Error fetching response to delete:', fetchError);
        throw new Error('Could not find the response to delete.');
    }
    
    // The 'request' property might be null if the join fails, or an object if it succeeds.
    // TypeScript might infer it as an array if not specified as a one-to-one join, hence the check.
    const requestObject = Array.isArray(responseData.request) ? responseData.request[0] : responseData.request;

    const isResponseOwner = responseData.user_id === user.id;
    const isRequestOwner = requestObject && requestObject.user_id === user.id;

    if (!isResponseOwner && !isRequestOwner) {
        throw new Error('You do not have permission to delete this response.');
    }

    // 2. Perform the deletion with admin client
    const { error: deleteError } = await supabaseAdmin
        .from('link_request_responses')
        .delete()
        .eq('id', responseId);

    if (deleteError) {
        console.error('Error deleting link response:', deleteError);
        throw new Error(deleteError.message);
    }

    revalidatePath('/links');
}
