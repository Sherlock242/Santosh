
import React, { Suspense } from 'react';
import { getFeedPosts, getFeedMoods } from '@/app/actions';
import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { Loader2 } from 'lucide-react';
import MoodClientPage from '@/components/mood-client-page';

export default async function MoodPage() {
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Fetch initial data on the server
    const moodsData = user ? await getFeedMoods() : [];
    const postsData = user ? await getFeedPosts({ page: 1, limit: 5 }) : [];

    return (
        <Suspense fallback={<div className="flex h-full w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
            <MoodClientPage initialMoods={moodsData} initialPosts={postsData} />
        </Suspense>
    );
}
