
'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabaseServer';

interface LinkPayload {
    title: string;
    url: string;
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

    const { error } = await supabase.from('links').insert({
        user_id: user.id,
        title: payload.title,
        url: payload.url,
    });

    if (error) {
        console.error('Error adding link:', error);
        throw new Error(error.message);
    }

    revalidatePath('/links');
}

export async function getLinks(query: string) {
    const supabase = createSupabaseServerClient();
    
    let queryBuilder = supabase
        .from('links')
        .select('*, user:users(id, name, picture)')
        .order('created_at', { ascending: false });

    if (query) {
        queryBuilder = queryBuilder.or(`title.ilike.%${query}%,url.ilike.%${query}%`);
    }

    const { data, error } = await queryBuilder;

    if (error) {
        console.error('Error fetching links:', error);
        throw new Error(error.message);
    }

    return data || [];
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
