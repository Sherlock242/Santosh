
'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { createNotification } from './notification.actions';

export type UserWithSupportStatus = { id: string; name: string; picture: string; is_private: boolean; is_gold_member: boolean; support_status: 'approved' | 'pending' | null; has_mood: boolean; };

// --- Support Actions ---

export async function getSupportStatus(supporterId: string, supportedId: string) {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase
        .from('supports')
        .select('status')
        .eq('supporter_id', supporterId)
        .eq('supported_id', supportedId)
        .single();
    
    if (error) {
        if (error.code === 'PGRST116') return null; // No relationship found
        console.error("Error getting support status:", error);
        return null;
    }

    return data?.status || null; // 'approved', 'pending', or null
}

export async function getSupporterCount(userId: string) {
    const supabase = createSupabaseServerClient();
    const { count, error } = await supabase
        .from('supports')
        .select('*', { count: 'exact', head: true })
        .eq('supported_id', userId)
        .eq('status', 'approved');

    if (error) {
        console.error('Error getting supporter count:', error);
        return 0;
    }
    return count || 0;
}

export async function getSupportingCount(userId: string) {
    const supabase = createSupabaseServerClient();
    const { count, error } = await supabase
        .from('supports')
        .select('*', { count: 'exact', head: true })
        .eq('supporter_id', userId)
        .eq('status', 'approved');
    
    if (error) {
        console.error('Error getting supporting count:', error);
        return 0;
    }
    return count || 0;
}

export async function getSupporters({ userId, page = 1, limit = 15 }: { userId: string, page: number, limit: number }): Promise<UserWithSupportStatus[]> {
    const supabase = createSupabaseServerClient();
    const { data: { user: currentUser } } = await supabase.auth.getUser();

    // 1. Fetch the user profiles directly through the join
    const { data: supportersData, error: supportersError } = await supabase
        .from('supports')
        .select('users:supporter_id(id, name, picture, is_private, is_gold_member)')
        .eq('supported_id', userId)
        .eq('status', 'approved')
        .order('created_at', { ascending: false })
        .range((page - 1) * limit, page * limit - 1);

    if (supportersError) {
        console.error('Error getting supporters:', supportersError);
        return [];
    }

    const users = supportersData.map(s => s.users).filter(Boolean) as { id: string; name: string; picture: string; is_private: boolean; is_gold_member: boolean }[];
    if (users.length === 0) return [];
    
    const userIds = users.map(u => u.id);

    // 2. Get the current user's support status towards these supporters
    let supportStatusMap = new Map<string, 'approved' | 'pending'>();
    if (currentUser) {
        const { data: supportStatusData, error: supportStatusError } = await supabase
            .from('supports')
            .select('supported_id, status')
            .eq('supporter_id', currentUser.id)
            .in('supported_id', userIds);

        if (!supportStatusError && supportStatusData) {
            supportStatusMap = new Map(supportStatusData.map(s => [s.supported_id, s.status as 'approved' | 'pending']));
        }
    }

    // 3. Combine the data
    return users.map(user => ({
        ...user,
        support_status: supportStatusMap.get(user.id) || null,
        has_mood: false, // This data is not essential for this view and complicates the query.
    })) as UserWithSupportStatus[];
}


export async function getSupporting({ userId, page = 1, limit = 15 }: { userId: string, page: number, limit: number }): Promise<UserWithSupportStatus[]> {
    const supabase = createSupabaseServerClient();
    const { data: { user: currentUser } } = await supabase.auth.getUser();

    // 1. Get the profiles for those IDs
    const { data: supportingData, error: supportingError } = await supabase
        .from('supports')
        .select('users:supported_id(id, name, picture, is_private, is_gold_member)')
        .eq('supporter_id', userId)
        .eq('status', 'approved')
        .order('created_at', { ascending: false })
        .range((page - 1) * limit, page * limit - 1);
        
    if (supportingError) {
        console.error('Error getting supporting list:', supportingError);
        return [];
    }
    
    const users = supportingData.map(s => s.users).filter(Boolean) as { id: string; name: string; picture: string; is_private: boolean; is_gold_member: boolean }[];
    if (users.length === 0) return [];

    const userIds = users.map(u => u.id);

    // 2. Get the current user's support status towards these users
    let supportStatusMap = new Map<string, 'approved' | 'pending'>();
     if (currentUser) {
        const { data: supportStatusData, error: supportStatusError } = await supabase
            .from('supports')
            .select('supported_id, status')
            .eq('supporter_id', currentUser.id)
            .in('supported_id', userIds);
        
        if (!supportStatusError && supportStatusData) {
            supportStatusMap = new Map(supportStatusData.map(s => [s.supported_id, s.status as 'approved' | 'pending']));
        }
    }
    
    // 3. Combine the data
    return users.map(user => ({
        ...user,
        support_status: supportStatusMap.get(user.id) || null,
        has_mood: false // This data is not essential for this view and complicates the query.
    })) as UserWithSupportStatus[];
}


export async function supportUser(supportedId: string, isPrivate: boolean) {
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        throw new Error("User not authenticated.");
    }
    if (user.id === supportedId) {
        throw new Error("Cannot support yourself.");
    }
    
    const status = isPrivate ? 'pending' : 'approved';

    const { error } = await supabase
        .from('supports')
        .insert({ supporter_id: user.id, supported_id: supportedId, status });
    
    if (error) {
        console.error('Error supporting user:', error);
        throw error;
    }

    // Create notification if the user accepted the follow request
    if (status === 'approved') {
        await createNotification({
            recipient_id: supportedId,
            actor_id: user.id,
            type: 'new_supporter',
        });
    } else { // It's a private account, so send a request notification
        await createNotification({
            recipient_id: supportedId,
            actor_id: user.id,
            type: 'new_support_request',
        });
    }

    revalidatePath(`/gallery?userId=${supportedId}`);
    revalidatePath(`/notifications`);
}

export async function unsupportUser(supportedId: string) {
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        throw new Error("User not authenticated.");
    }

    const { error } = await supabase
        .from('supports')
        .delete()
        .eq('supporter_id', user.id)
        .eq('supported_id', supportedId);

    if (error) {
        console.error('Error unsupporting user:', error);
        throw error;
    }
    
    revalidatePath(`/gallery?userId=${supportedId}`);
    revalidatePath(`/notifications`);
}

export async function respondToSupportRequest(supporterId: string, action: 'approve' | 'decline') {
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    if (action === 'approve') {
        const { error } = await supabase
            .from('supports')
            .update({ status: 'approved' })
            .eq('supporter_id', supporterId)
            .eq('supported_id', user.id)
            .eq('status', 'pending');

        if (error) throw error;
        
        // Notify the user that their request was approved
        await createNotification({
            recipient_id: supporterId,
            actor_id: user.id,
            type: 'support_request_approved'
        });

    } else { // decline
        const { error } = await supabase
            .from('supports')
            .delete()
            .eq('supporter_id', supporterId)
            .eq('supported_id', user.id)
            .eq('status', 'pending');
        
        if (error) throw error;
    }
    
    revalidatePath('/notifications');
}
