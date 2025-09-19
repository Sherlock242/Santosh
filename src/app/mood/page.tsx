
import React, { Suspense } from 'react';
import { getFeedPosts, getFeedMoods } from '@/app/actions';
import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { Loader2 } from 'lucide-react';
import MoodClientPage from '@/components/mood-client-page';
import { redirect } from 'next/navigation';

export default async function MoodPage() {
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    // If there is no user, they should be at the login page.
    // Middleware should handle this, but as a fallback.
    if (!user) {
        redirect('/');
    }

    // Fetch initial data on the server in parallel
    const [moodsData, postsData] = await Promise.all([
        getFeedMoods(),
        getFeedPosts({ page: 1, limit: 5 })
    ]);

    return (
        <Suspense fallback={<div className="flex h-full w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
            <MoodClientPage initialMoods={moodsData} initialPosts={postsData} />
        </Suspense>
    );
}

    