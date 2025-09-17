
import React, { Suspense } from 'react';
import { getGalleryPosts, getSupportStatus, getSupporterCount, getSupportingCount } from '@/app/actions';
import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { Loader2 } from 'lucide-react';
import GalleryClientPage from '@/components/gallery-client-page';

async function getProfileUser(userId: string) {
    const supabase = createSupabaseServerClient();
    const { data: userProfile, error } = await supabase
        .from('users')
        .select('id, name, picture, is_private, is_gold_member')
        .eq('id', userId)
        .single();
    if (error) {
        console.error("Error fetching profile user", error);
        return null;
    }
    return userProfile;
}

export default async function GalleryPage({ searchParams }: { searchParams: { userId?: string } }) {
    const supabase = createSupabaseServerClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();

    const userId = searchParams.userId || authUser?.id;

    if (!userId) {
        return (
            <div className="flex h-full w-full items-center justify-center">
                <p>User not found.</p>
            </div>
        );
    }
    
    const isOwnProfile = !searchParams.userId || (authUser && searchParams.userId === authUser.id);
    
    // Fetch initial data on the server
    const profileUser = await getProfileUser(userId);
    
    if (!profileUser) {
         return (
            <div className="flex h-full w-full items-center justify-center">
                <p>Profile not found.</p>
            </div>
        );
    }
    
    let initialSupportStatus: 'approved' | 'pending' | null = null;
    if (!isOwnProfile && authUser) {
        initialSupportStatus = await getSupportStatus(authUser.id, userId);
    }

    const canViewContent = !profileUser.is_private || isOwnProfile || initialSupportStatus === 'approved';

    // Fetch posts only if the user has permission to view them
    const initialPosts = canViewContent ? await getGalleryPosts({ userId }) : [];

    const [supporterCount, supportingCount] = await Promise.all([
        getSupporterCount(userId),
        getSupportingCount(userId)
    ]);
    
    return (
        <Suspense fallback={<div className="flex h-full w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
            <GalleryClientPage
                initialPosts={initialPosts}
                initialProfileUser={profileUser}
                initialSupporterCount={supporterCount}
                initialSupportingCount={supportingCount}
                initialSupportStatus={initialSupportStatus}
                viewingUserId={userId}
                isOwnProfile={isOwnProfile}
                canViewContentInitially={canViewContent}
            />
        </Suspense>
    );
}
