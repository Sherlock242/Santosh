
'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabaseServer';
import type { UserWithSupportStatus } from './support.actions';

// --- Mood Actions ---

export async function setMood(emojiId: string) {
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        throw new Error("User not authenticated.");
    }

    // Step 1: Delete any existing mood for the user.
    // This ensures a new mood_id is created, resetting views.
    const { error: deleteError } = await supabase
        .from('moods')
        .delete()
        .eq('user_id', user.id);
        
    if (deleteError) {
        console.error('Error deleting old mood:', deleteError);
        throw deleteError;
    }

    // Step 2: Insert the new mood.
    const { error: insertError } = await supabase
        .from('moods')
        .insert({ 
            user_id: user.id, 
            emoji_id: emojiId, 
            created_at: new Date().toISOString() 
        });

    if (insertError) {
        console.error('Error setting new mood:', insertError);
        throw new Error(insertError.message);
    }

    revalidatePath('/mood');
}

export async function removeMood() {
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        throw new Error("User not authenticated.");
    }

    const { error } = await supabase
        .from('moods')
        .delete()
        .eq('user_id', user.id);

    if (error) {
        console.error('Error removing mood:', error);
        throw new Error(error.message);
    }

    revalidatePath('/mood');
}

export async function recordMoodView(moodId: number) {
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return; // Don't record views for non-logged-in users
    }

    // Allow users to record a view for their own mood.
    const { error } = await supabase
        .from('mood_views')
        .insert({ mood_id: moodId, viewer_id: user.id });

    // Ignore unique violation errors (code 23505), as it just means the user has already viewed this mood.
    if (error && error.code !== '23505') {
        console.error('Error recording mood view:', error);
    }
}

export async function getMoodViewers(moodId: number): Promise<UserWithSupportStatus[]> {
    const supabase = createSupabaseServerClient();
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) return [];

    // Step 1: Directly get the IDs of the viewers.
    const { data: viewers, error: viewersError } = await supabase
        .from('mood_views')
        .select('viewer_id')
        .eq('mood_id', moodId);

    if (viewersError) {
        console.error('Error getting mood viewer IDs:', viewersError);
        return [];
    }

    const viewerIds = viewers.map(v => v.viewer_id);
    if (viewerIds.length === 0) return [];

    // Step 2: Fetch all user profiles for those IDs in a separate, direct query.
    const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, name, picture, is_private, is_gold_member')
        .in('id', viewerIds);

    if (usersError) {
        console.error('Error fetching viewer profiles:', usersError);
        return [];
    }

    // Step 3: Get the current user's support status towards the viewers.
    const { data: supportStatusData, error: supportStatusError } = await supabase
        .from('supports')
        .select('supported_id, status')
        .eq('supporter_id', currentUser.id)
        .in('supported_id', viewerIds);
        
    if (supportStatusError) {
        console.error('Error fetching support statuses:', supportStatusError);
        // Continue without this data if it fails
    }

    const supportStatusMap = new Map(supportStatusData?.map(s => [s.supported_id, s.status]));

    // Step 4: Combine the data.
    return users.map(user => ({
        ...user,
        support_status: supportStatusMap.get(user.id) || null,
        has_mood: false // This info is not available in this context, default to false.
    })) as UserWithSupportStatus[];
}
