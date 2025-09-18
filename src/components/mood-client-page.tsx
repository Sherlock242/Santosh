'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { MoodHeader } from '@/components/mood-header';
import { Loader2, UserPlus } from 'lucide-react';
import type { EmojiState } from '@/app/design/page';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import dynamic from 'next/dynamic';
import { getFeedPosts, getFeedMoods } from '../app/actions';
import MoodStories from '@/components/mood-stories';
import type { Mood } from '@/components/post-view';
import { updatePostCache } from '@/lib/post-cache';
import { PostCard } from './post-card';
import Link from 'next/link';

const PostView = dynamic(
  () => import('@/components/post-view').then(mod => mod.PostView),
  {
    loading: () => <div className="flex h-full w-full items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin" /></div>,
    ssr: false 
  }
);

interface FeedPostType extends EmojiState {
    like_count: number;
    is_liked: boolean;
    user: EmojiState['user'] & { has_mood?: boolean; is_gold_member?: boolean; };
}

interface MoodClientPageProps {
    initialMoods: Mood[];
    initialPosts: FeedPostType[];
}

export default function MoodClientPage({ initialMoods, initialPosts }: MoodClientPageProps) {
    const { user } = useAuth();
    const router = useRouter();
    const { toast } = useToast();
    const [moods, setMoods] = useState<Mood[]>(initialMoods);
    const [feedPosts, setFeedPosts] = useState<FeedPostType[]>(initialPosts);
    const [isLoading, setIsLoading] = useState(true);
    const [isFetchingMore, setIsFetchingMore] = useState(false);
    
    const [page, setPage] = useState(initialPosts.length > 0 ? 2 : 1);
    const [hasMore, setHasMore] = useState(initialPosts.length === 5);

    const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
    const [viewingStoryFromFeed, setViewingStoryFromFeed] = useState<Mood[] | null>(null);

    const loaderRef = useRef(null);
    
    const fetchPosts = useCallback(async (pageNum: number) => {
        if (isFetchingMore || !hasMore) return;
        setIsFetchingMore(true);

        try {
            const limit = 5;
            const newPosts = await getFeedPosts({ page: pageNum, limit });

            updatePostCache(newPosts);
            
            if (newPosts.length < limit) {
                setHasMore(false);
            }

            if (newPosts.length > 0) {
                setFeedPosts(prev => {
                    const existingIds = new Set(prev.map(p => p.id));
                    const uniqueNewPosts = newPosts.filter(p => !existingIds.has(p.id));
                    return [...prev, ...uniqueNewPosts];
                });
                setPage(p => p + 1);
            }
        } catch (error: any) {
            toast({ title: "Failed to load more posts", description: error.message, variant: "destructive" });
        } finally {
            setIsFetchingMore(false);
        }
    }, [isFetchingMore, toast, hasMore]);
    
    // Infinite Scroll
    useEffect(() => {
        const observer = new IntersectionObserver(
            entries => {
                if (entries[0].isIntersecting && hasMore && !isFetchingMore && !isLoading) {
                    fetchPosts(page);
                }
            },
            { root: null, rootMargin: '400px' }
        );

        const currentLoader = loaderRef.current;
        if (currentLoader) {
            observer.observe(currentLoader);
        }

        return () => {
            if (currentLoader) {
                observer.unobserve(currentLoader);
            }
        };
    }, [hasMore, isFetchingMore, isLoading, page, fetchPosts]);

    const refreshMoods = useCallback(async () => {
        if (!user) return;
        try {
            const moodsData = await getFeedMoods();
            setMoods(moodsData as Mood[] || []);
        } catch(error: any) {
            toast({ title: "Could not refresh moods", description: error.message, variant: 'destructive'});
        }
    }, [user, toast]);

    const refreshFeed = useCallback(async () => {
        if (!user) {
            setIsLoading(false);
            return;
        }
        
        setIsLoading(true);

        try {
            const [moodsData, postsData] = await Promise.all([
                getFeedMoods(),
                getFeedPosts({ page: 1, limit: 5 })
            ]);
            
            setMoods(moodsData as Mood[] || []);
            setFeedPosts(postsData || []);
            updatePostCache(postsData);
            
            const newPage = postsData.length > 0 ? 2 : 1;
            setPage(newPage);
            setHasMore(postsData.length >= 5);

        } catch(error: any) {
            toast({ title: "Could not load your feed", description: error.message, variant: 'destructive'});
            setHasMore(false);
        } finally {
            setIsLoading(false);
        }
    }, [toast, user]);

    useEffect(() => {
      refreshFeed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]);
    
    const handleDeletePost = (postId: string) => {
        setFeedPosts(prev => prev.filter(p => p.id !== postId));
    };
    
    const handleOnCloseMood = (updatedMoods?: Mood[]) => {
        if (updatedMoods) {
            setMoods(updatedMoods);
        }
        setViewingStoryFromFeed(null);
    }
    
    const selectedPostIndex = selectedPostId ? feedPosts.findIndex(p => p.id === selectedPostId) : -1;

    if (selectedPostIndex > -1) {
        const postsForView = feedPosts.map(post => ({
            ...post,
            user: {
                id: post.user?.id || post.user_id || '',
                name: post.user?.name || 'Unknown',
                picture: post.user?.picture || '',
                is_gold_member: post.user?.is_gold_member,
            }
        }));

        return (
            <PostView
                emojis={postsForView}
                initialIndex={selectedPostIndex}
                onClose={() => setSelectedPostId(null)}
                onDelete={handleDeletePost}
                onMoodChange={refreshMoods}
            />
        )
    }

    if (viewingStoryFromFeed) {
         return (
            <PostView 
                emojis={viewingStoryFromFeed}
                initialIndex={0}
                onClose={handleOnCloseMood}
                isMoodView={true}
                onMoodChange={refreshMoods}
                onDelete={(moodId) => {
                    setMoods(moods.filter(m => m.mood_id !== parseInt(moodId)));
                }}
            />
        )
    }
  
    const renderContent = () => {
        if (isLoading && feedPosts.length === 0) {
            return (
                <div className="flex h-full w-full flex-col items-center justify-center p-10">
                    <Loader2 className="h-8 w-8 animate-spin" />
                </div>
            );
        }
        if (feedPosts.length > 0) {
            return (
                <div>
                    {feedPosts.map((post) => (
                        <PostCard key={post.id} post={post} onSelect={() => setSelectedPostId(post.id)} onDelete={handleDeletePost} onMoodChange={refreshMoods} />
                    ))}
                </div>
            );
        }
        
        return (
             <div className="flex-1 flex flex-col items-center justify-center text-center p-8 gap-4 text-muted-foreground">
                <UserPlus className="h-16 w-16 text-muted-foreground/50" />
                <h2 className="text-xl font-bold text-foreground">Welcome to Edengram</h2>
                <p>Your feed is empty. Find users to support on the explore page.</p>
                <Link href="/explore">
                    <button className="bg-primary text-primary-foreground px-4 py-2 rounded-md">Explore</button>
                </Link>
            </div>
        );
    }

    return (
        <div className="pb-14">
            <MoodHeader />
            <MoodStories 
                user={user}
                moods={moods}
                isLoading={isLoading}
                onSelectMood={(index) => {
                    const selectedMood = moods[index];
                    if (!selectedMood) return;

                    const userStoryMoods = moods.filter(m => m.mood_user_id === selectedMood.mood_user_id);
                    const startIndexInUserStory = userStoryMoods.findIndex(m => m.mood_id === selectedMood.mood_id);
                    const reorderedUserStory = [
                        ...userStoryMoods.slice(startIndexInUserStory),
                        ...userStoryMoods.slice(0, startIndexInUserStory)
                    ];
                    const otherUsersMoods = moods.filter(m => m.mood_user_id !== selectedMood.mood_user_id);
                    const fullPlaylist = [...reorderedUserStory, ...otherUsersMoods];
                    setViewingStoryFromFeed(fullPlaylist);
                }}
            />
            {renderContent()}
            {!isLoading && hasMore && (
                <div ref={loaderRef} className="flex justify-center p-4">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
            )}
        </div>
    );
}
