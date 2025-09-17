
import React, { Suspense } from 'react';
import { getExplorePosts } from '@/app/actions';
import { Loader2 } from 'lucide-react';
import ExploreClientPage from '@/components/explore-client-page';

export default async function ExplorePage() {
    // Fetch initial data on the server
    const initialPosts = await getExplorePosts({ page: 1, limit: 12 });

    return (
        <Suspense fallback={<div className="flex h-full w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
            <ExploreClientPage initialPosts={initialPosts} />
        </Suspense>
    );
}
