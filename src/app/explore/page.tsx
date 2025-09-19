
import React, { Suspense } from 'react';
import { getExplorePosts } from '@/app/actions';
import { Loader2 } from 'lucide-react';
import ExploreClientPage from '@/components/explore-client-page';

export const revalidate = 60; // Revalidate the page every 60 seconds

export default async function ExplorePage() {
    // Fetch initial data on the server.
    // The getExplorePosts action now handles combining like statuses for logged-in users.
    const initialPosts = await getExplorePosts({ page: 1, limit: 12 });

    return (
        <Suspense fallback={<div className="flex h-full w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
            <ExploreClientPage initialPosts={initialPosts} />
        </Suspense>
    );
}

    

    