
'use client';

import React, { useState, useEffect, useCallback, lazy, Suspense, useRef, memo } from 'react';
import { MoodHeader } from '@/components/mood-header';
import { Loader2, Smile, RefreshCw } from 'lucide-react';
import type { EmojiState } from '@/app/design/page';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import { getFeedPosts, getFeedMoods } from '../actions';
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

const moodPageCache: {
    moods: Mood[] | null;
    feedPosts: FeedPostType[] | null;
    page: number;
    hasMore: boolean;
    scrollPosition: number;
} = {
    moods: null,
    feedPosts: null,
    page: 1,
    hasMore: true,
    scrollPosition: 0,
};


export default function MoodPage() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [moods, setMoods] = useState<Mood[]>(moodPageCache.moods || []);
    const [feedPosts, setFeedPosts] = useState<FeedPostType[]>(moodPageCache.feedPosts || []);
    const [isLoading, setIsLoading] = useState(!moodPageCache.feedPosts);
    const [isFetchingMore, setIsFetchingMore] = useState(false);
    
    const [page, setPage] = useState(moodPageCache.page);
    const [hasMore, setHasMore] = useState(moodPageCache.hasMore);

    const [selectedMood, setSelectedMood] = useState<Mood | null>(null);
    const [viewingStoryFromFeed, setViewingStoryFromFeed] = useState<Mood[] | null>(null);

    const scrollContainerRef = useRef<HTMLDivElement>(null);
    
    const fetchMoods = useCallback(async () => {
        if (!user) return [];
        try {
            const moodsData = await getFeedMoods();
            if (!moodsData) return [];
            const formattedMoods = moodsData.map(m => ({
                ...m,
                like_count: 0,
                is_liked: false,
                mood_user: {
                    ...m.mood_user,
                    has_mood: true 
                }
            }));
            return formattedMoods as Mood[];
        } catch (error) {
            console.error("Failed to fetch moods", error);
            return [];
        }
    }, [user]);

    const fetchPosts = useCallback(async () => {
        if (isFetchingMore || !hasMore) return;
        setIsFetchingMore(true);

        try {
            const limit = 9;
            const newPosts = await getFeedPosts({ page, limit });

            // Update the global cache
            updatePostCache(newPosts);
            
            if (newPosts.length < limit) {
                setHasMore(false);
                moodPageCache.hasMore = false;
            }

            if (newPosts.length > 0) {
                setFeedPosts(prev => {
                    const existingIds = new Set(prev.map(p => p.id));
                    const uniqueNewPosts = newPosts.filter(p => !existingIds.has(p.id));
                    const updatedPosts = [...prev, ...uniqueNewPosts];
                    moodPageCache.feedPosts = updatedPosts;
                    return updatedPosts;
                });
            }
             const nextPage = page + 1;
             setPage(nextPage);
             moodPageCache.page = nextPage;

        } catch (error: any) {
            console.error("Failed to fetch posts:", error);
            toast({ title: "Failed to load more posts", description: error.message, variant: "destructive" });
        } finally {
            setIsFetchingMore(false);
        }
    }, [isFetchingMore, toast, hasMore, page]);
    
    const loadInitialData = useCallback(async (forceRefresh = false) => {
        if (!user) {
            setIsLoading(false);
            return;
        }
        
        const useCache = !forceRefresh && !!moodPageCache.feedPosts && moodPageCache.feedPosts.length > 0;
        if (useCache) {
            setIsLoading(false);
        } else {
            setIsLoading(true);
        }

        try {
            const postsPromise = useCache
                ? Promise.resolve(moodPageCache.feedPosts)
                : getFeedPosts({ page: 1, limit: 9 });
            
            const moodsPromise = (useCache && moodPageCache.moods)
                ? Promise.resolve(moodPageCache.moods)
                : fetchMoods();

            const [moodsData, postsData] = await Promise.all([
                moodsPromise,
                postsPromise
            ]);
            
            setMoods(moodsData || []);
            moodPageCache.moods = moodsData;
            
            if (postsData) {
                // Update the global cache with initial posts
                updatePostCache(postsData);

                if (forceRefresh || !useCache) {
                    setFeedPosts(postsData);
                    moodPageCache.feedPosts = postsData;
                    const newPage = postsData.length > 0 ? 2 : 1;
                    setPage(newPage);
                    moodPageCache.page = newPage;
                }

                if (postsData.length < 9) {
                    setHasMore(false);
                    moodPageCache.hasMore = false;
                } else {
                    setHasMore(true);
                    moodPageCache.hasMore = true;
                }
            }
        } catch(error: any) {
            toast({ title: "Could not load your feed", description: error.message, variant: 'destructive'});
            setHasMore(false);
        } finally {
            setIsLoading(false);
        }
    }, [fetchMoods, toast, user]);
    
    useEffect(() => {
        loadInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]);

    const handleRefresh = useCallback(async () => {
        moodPageCache.feedPosts = null; 
        moodPageCache.moods = null;
        moodPageCache.page = 1;
        moodPageCache.hasMore = true;
        setFeedPosts([]);
        setMoods([]);
        setPage(1);
        setHasMore(true);
        await loadInitialData(true);
    }, [loadInitialData]);

    const handleSelectMood = (mood: Mood) => {
        setSelectedMood(mood);
    };

    const handleSelectUserStoryFromFeed = (userId: string) => {
        const userMoods = moods.filter(m => m.mood_user_id === userId);
        if (userMoods.length > 0) {
            setViewingStoryFromFeed(userMoods);
        }
    };

    const handleOnCloseMood = (updatedMoods?: Mood[]) => {
        if (updatedMoods) {
            setMoods(updatedMoods);
        }
        setSelectedMood(null);
        setViewingStoryFromFeed(null);
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
              <div className="flex h-full w-full flex-col items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin" />
              </div>
          );
      }
      if (feedPosts.length > 0) {
          return (
             <PostView 
                emojis={feedPosts}
                onClose={() => {}}
                showNav={false}
                onMoodChange={handleRefresh}
                onDelete={(deletedId) => {
                    const newPosts = feedPosts.filter(p => p.id !== deletedId);
                    setFeedPosts(newPosts);
                    moodPageCache.feedPosts = newPosts;
                }}
                fetchMore={fetchPosts}
                hasMore={hasMore}
            />
          );
      }
      
      return (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 gap-4 text-muted-foreground">
          </div>
      );
  }

  return (
    <div className="flex h-full w-full flex-col overflow-x-hidden">
      <MoodHeader />
      <div className="flex-1 overflow-y-auto no-scrollbar" ref={scrollContainerRef}>
      
        <MoodStories 
            user={user}
            moods={moods}
            isLoading={isLoading}
            onSelectMood={(index) => handleSelectMood(moods[moods.findIndex(m => m.mood_user_id === user?.id) === index ? 0 : index])}
        />
      
        <div className="flex-1 relative">
            {renderContent()}
        </div>
      </div>
    </div>
  );
}
