
'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Loader2 } from 'lucide-react';
import { getLikers } from '@/app/actions';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { UserListItem } from './user-list-item';

interface Liker {
  id: string;
  name: string;
  picture: string;
  is_private: boolean;
  support_status: 'approved' | 'pending' | null;
  has_mood: boolean;
  is_gold_member: boolean;
}

const likerListCache: {
    [key: string]: {
        items: Liker[],
        page: number,
        hasMore: boolean,
        scrollPosition: number
    }
} = {};

interface LikerListSheetProps {
    open: boolean;
    onOpenChange: (isOpen: boolean) => void;
    emojiId: string;
}

function LikerListSheet({ open, onOpenChange, emojiId }: LikerListSheetProps) {
    const { toast } = useToast();
    const cacheKey = `likers-${emojiId}`;

    const [likerList, setLikerList] = useState<Liker[]>(likerListCache[cacheKey]?.items || []);
    const [page, setPage] = useState(likerListCache[cacheKey]?.page || 1);
    const [hasMore, setHasMore] = useState(likerListCache[cacheKey]?.hasMore ?? true);
    
    const [isLoading, setIsLoading] = useState(false);
    const [isFetchingMore, setIsFetchingMore] = useState(false);

    const loaderRef = useRef(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    
    const fetchLikers = useCallback(async (pageNum: number) => {
        if (!emojiId || isFetchingMore) return;

        if (pageNum === 1) setIsLoading(true);
        else setIsFetchingMore(true);
        
        try {
            const users = await getLikers({ emojiId, page: pageNum, limit: 15 });
            
            if (users.length < 15) {
                setHasMore(false);
                if (likerListCache[cacheKey]) likerListCache[cacheKey].hasMore = false;
            }

            setLikerList(prev => {
                const existingIds = new Set(prev.map(u => u.id));
                const uniqueNew = users.filter(u => !existingIds.has(u.id as string));
                const updatedList = pageNum === 1 ? users : [...prev, ...uniqueNew];
                if (likerListCache[cacheKey]) likerListCache[cacheKey].items = updatedList as Liker[];
                return updatedList as Liker[];
            });

            const nextPage = pageNum + 1;
            setPage(nextPage);
            if (likerListCache[cacheKey]) likerListCache[cacheKey].page = nextPage;

        } catch (error) {
            console.error(`Failed to fetch likers:`, error);
            toast({ title: "Error loading users", variant: "destructive" });
        } finally {
            if (pageNum === 1) setIsLoading(false);
            setIsFetchingMore(false);
        }
    }, [emojiId, isFetchingMore, toast, cacheKey]);

    useEffect(() => {
        if (open && emojiId) {
            if (!likerListCache[cacheKey]) {
                likerListCache[cacheKey] = {
                    items: [],
                    page: 1,
                    hasMore: true,
                    scrollPosition: 0,
                };
                fetchLikers(1);
            } else {
                setLikerList(likerListCache[cacheKey].items);
                setPage(likerListCache[cacheKey].page);
                setHasMore(likerListCache[cacheKey].hasMore);
                // Restore scroll position
                setTimeout(() => {
                    if (scrollContainerRef.current) {
                        scrollContainerRef.current.scrollTop = likerListCache[cacheKey].scrollPosition;
                    }
                }, 0);
            }
        }
    }, [open, emojiId, fetchLikers, cacheKey]);

    // Save scroll position
    useEffect(() => {
        const scrollable = scrollContainerRef.current;
        if (!scrollable || !cacheKey) return;
    
        const handleScroll = () => {
            if (likerListCache[cacheKey]) {
                likerListCache[cacheKey].scrollPosition = scrollable.scrollTop;
            }
        };
    
        scrollable.addEventListener('scroll', handleScroll, { passive: true });
        return () => scrollable.removeEventListener('scroll', handleScroll);
    }, [cacheKey]);

    // Infinite scroll observer
    useEffect(() => {
        const observer = new IntersectionObserver((entries) => {
            const target = entries[0];
            if (target.isIntersecting && hasMore && !isFetchingMore && !isLoading) {
                fetchLikers(page);
            }
        }, { root: scrollContainerRef.current, rootMargin: '200px', threshold: 0 });

        const currentLoader = loaderRef.current;
        if (currentLoader) observer.observe(currentLoader);

        return () => {
            if (currentLoader) observer.unobserve(currentLoader);
        };
    }, [fetchLikers, hasMore, isFetchingMore, isLoading, page]);

    const handleSupportChange = (changedUserId: string, newStatus: 'approved' | 'pending' | null) => {
        const updateList = (list: Liker[]) => list.map(user => 
            user.id === changedUserId 
            ? { ...user, support_status: newStatus } 
            : user
        );
        setLikerList(updateList);
        if (likerListCache[cacheKey]) {
            likerListCache[cacheKey].items = updateList(likerListCache[cacheKey].items);
        }
    };

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="bottom" className="max-h-[80vh] flex flex-col">
                <SheetHeader className="text-center">
                    <SheetTitle>Likes</SheetTitle>
                </SheetHeader>
                <div className="flex-1 overflow-y-auto no-scrollbar" ref={scrollContainerRef}>
                    {isLoading ? (
                        <div className="flex justify-center items-center h-full">
                            <Loader2 className="h-8 w-8 animate-spin" />
                        </div>
                    ) : likerList.length > 0 ? (
                        <>
                            <div className="flex flex-col gap-1 p-2">
                               {likerList.map(user => (
                                   <UserListItem
                                        key={user.id} 
                                        itemUser={user} 
                                        onSupportChange={handleSupportChange}
                                   />
                               ))}
                            </div>
                            {hasMore && <div ref={loaderRef} className="flex justify-center p-4"><Loader2 className="h-6 w-6 animate-spin"/></div>}
                        </>
                    ) : (
                        <div className="text-center py-10 text-muted-foreground">
                            <p>No likes yet.</p>
                        </div>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    )
}

export default LikerListSheet;
