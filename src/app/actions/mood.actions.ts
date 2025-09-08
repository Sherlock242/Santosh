
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

    // Define a type for the shape of the user profile we expect
    type UserProfile = { id: string; name: string; picture: string; is_private: boolean; is_gold_member: boolean; };

    const { data: viewersData, error: viewersError } = await supabase
        .from('mood_views')
        .select('users:viewer_id(id, name, picture, is_private, is_gold_member)')
        .eq('mood_id', moodId);

    if (viewersError) {
        console.error('Error getting mood viewers:', viewersError);
        return [];
    }

    // Extract the nested user objects and filter out any nulls
    const users = viewersData
        .map(v => v.users)
        .filter((u): u is UserProfile => u !== null);
    
    if (users.length === 0) return [];
    
    const userIds = users.map(u => u.id);

    const { data: supportStatusData, error: supportStatusError } = await supabase
        .from('supports')
        .select('supported_id, status')
        .eq('supporter_id', currentUser.id)
        .in('supported_id', userIds);

    if (supportStatusError) {
        console.error('Error fetching support statuses:', supportStatusError);
        // Continue without this data if it fails
    }

    const supportStatusMap = new Map(supportStatusData?.map(s => [s.supported_id, s.status]));

    return users.map(user => ({
        ...user,
        support_status: supportStatusMap.get(user.id) || null,
        has_mood: false // This info is not available in this context, default to false.
    })) as UserWithSupportStatus[];
}
