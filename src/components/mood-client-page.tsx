
'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MoodHeader } from '@/components/mood-header';
import { Loader2 } from 'lucide-react';
import type { EmojiState } from '@/app/design/page';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import dynamic from 'next/dynamic';
import { getFeedPosts, getFeedMoods, deletePost } from '../app/actions';
import MoodStories from '@/components/mood-stories';
import type { Mood, PostViewEmoji } from '@/components/post-view';
import { updatePostCache } from '@/lib/post-cache';

const PostView = dynamic(
  () => import('@/components/post-view').then(mod => mod.PostView),
  {
    loading: () => <div className="flex h-full w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>,
    ssr: false 
  }
);

interface FeedPostType extends EmojiState {
    like_count: number;
    is_liked: boolean;
    user: EmojiState['user'] & { has_mood?: boolean };
}

interface MoodClientPageProps {
    initialMoods: Mood[];
    initialPosts: FeedPostType[];
}

export default function MoodClientPage({ initialMoods, initialPosts }: MoodClientPageProps) {
    const { user } = useAuth();
    const { toast } = useToast();
    const [moods, setMoods] = useState<Mood[]>(initialMoods);
    const [feedPosts, setFeedPosts] = useState<FeedPostType[]>(initialPosts);
    const [isLoading, setIsLoading] = useState(true);
    const [isFetchingMore, setIsFetchingMore] = useState(false);
    
    const [page, setPage] = useState(initialPosts.length > 0 ? 2 : 1);
    const [hasMore, setHasMore] = useState(initialPosts.length === 5);

    const [selectedMood, setSelectedMood] = useState<Mood | null>(null);
    const [viewingStoryFromFeed, setViewingStoryFromFeed] = useState<Mood[] | null>(null);
    const [selectedPostId, setSelectedPostId] = useState<string | null>(null);

    const loaderRef = useRef(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    
    const fetchMoods = useCallback(async () => {
        if (!user) return;
        try {
            const moodsData = await getFeedMoods();
            if (!moodsData) return;
            const formattedMoods = moodsData.map(m => ({
                ...m,
                like_count: 0,
                is_liked: false,
                mood_user: {
                    ...m.mood_user,
                    has_mood: true 
                }
            })) as Mood[];
            setMoods(formattedMoods);
        } catch (error) {
            console.error("Failed to fetch moods", error);
        }
    }, [user]);

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
    }, [isFetchingMore, toast, hasMore, page]);
    
    // Infinite Scroll
    useEffect(() => {
        const observer = new IntersectionObserver(
            entries => {
                if (entries[0].isIntersecting && hasMore && !isFetchingMore && !isLoading) {
                    fetchPosts(page);
                }
            },
            { rootMargin: '200px' }
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

    const loadInitialData = useCallback(async (forceRefresh = false) => {
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

            if (postsData.length < 5) {
                setHasMore(false);
            } else {
                setHasMore(true);
            }
        } catch(error: any) {
            toast({ title: "Could not load your feed", description: error.message, variant: 'destructive'});
            setHasMore(false);
        } finally {
            setIsLoading(false);
        }
    }, [toast, user]);

    useEffect(() => {
      loadInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]);
    
    const handleRefresh = useCallback(async () => {
        setPage(1);
        setHasMore(true);
        await loadInitialData(true);
    }, [loadInitialData]);

    const handleSelectMood = (mood: Mood) => {
        setSelectedMood(mood);
    };
    
    const handleOnCloseMood = (updatedMoods?: Mood[]) => {
        if (updatedMoods) {
            setMoods(updatedMoods);
        }
        setSelectedMood(null);
        setViewingStoryFromFeed(null);
    }

    const handleDelete = async (emojiId: string) => {
        try {
            await deletePost(emojiId);
            toast({
                title: 'Post Deleted',
                description: 'The post has been removed from your feed.',
                variant: 'success',
            });
            const newPosts = feedPosts.filter(p => p.id !== emojiId);
            setFeedPosts(newPosts);
            setSelectedPostId(null);
        } catch (error: any) {
            toast({
                title: 'Error Deleting Post',
                description: error.message,
                variant: 'destructive',
            });
        }
    };

    const selectedPostIndex = selectedPostId ? feedPosts.findIndex(p => p.id === selectedPostId) : -1;
    
    if (selectedPostId && selectedPostIndex > -1) {
         return (
             <PostView 
                emojis={feedPosts}
                initialIndex={selectedPostIndex}
                onClose={() => setSelectedPostId(null)}
                onMoodChange={handleRefresh}
                onDelete={handleDelete}
                fetchMore={() => fetchPosts(page)}
                hasMore={hasMore}
            />
         )
    }
    
    if (selectedMood) {
        const userMoods = moods.filter(m => m.mood_user_id === selectedMood.mood_user_id);
        const initialMoodIndex = userMoods.findIndex(m => m.mood_id === selectedMood.mood_id);
        if (userMoods.length === 0 || initialMoodIndex === -1) {
            setSelectedMood(null);
            return null;
        }
        return (
            <PostView 
                emojis={userMoods}
                initialIndex={initialMoodIndex}
                onClose={() => handleOnCloseMood(moods)}
                isMoodView={true}
                onMoodChange={handleRefresh}
                onDelete={(moodId) => {
                    setMoods(moods.filter(m => m.mood_id !== parseInt(moodId)));
                    loadInitialData();
                }}
            />
        )
    }

    if (viewingStoryFromFeed) {
         return (
            <PostView 
                emojis={viewingStoryFromFeed}
                initialIndex={0}
                onClose={() => handleOnCloseMood(moods)}
                isMoodView={true}
                onMoodChange={handleRefresh}
                onDelete={(moodId) => {
                    setMoods(moods.filter(m => m.mood_id !== parseInt(moodId)));
                    loadInitialData();
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
                <div className="divide-y divide-border">
                    {feedPosts.map((post) => {
                        const postWithUser = {
                            ...post,
                            user: {
                                id: post.user_id || '',
                                name: post.user?.name || 'Unknown',
                                picture: post.user?.picture || '',
                                is_gold_member: post.user?.is_gold_member,
                            }
                        };
                        return (
                            <div key={post.id} onClick={() => setSelectedPostId(post.id)} className="cursor-pointer">
                                <PostView emojis={[postWithUser]} showNav={false} onClose={()=>{}} />
                            </div>
                        )
                    })}
                </div>
            );
        }
        
        return (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 gap-4 text-muted-foreground">
            </div>
        );
    }

    return (
        <div className="h-full w-full overflow-y-auto no-scrollbar" ref={scrollContainerRef}>
            <div className="sticky top-0 z-10">
                 <MoodHeader />
            </div>
            
            <MoodStories 
                user={user}
                moods={moods}
                isLoading={isLoading}
                onSelectMood={(index) => handleSelectMood(moods[index])}
            />
        
            <div className="relative">
                {renderContent()}
                {hasMore && (
                    <div ref={loaderRef} className="flex justify-center p-4">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                )}
            </div>
        </div>
    );
}
