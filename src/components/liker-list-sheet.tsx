
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
import { useToast } from '@/hooks/use-toast';
import { UserListItem } from './user-list-item';
import type { UserWithSupportStatus } from '@/app/actions';

interface LikerListSheetProps {
    open: boolean;
    onOpenChange: (isOpen: boolean) => void;
    emojiId: string;
}

function LikerListSheet({ open, onOpenChange, emojiId }: LikerListSheetProps) {
    const { toast } = useToast();

    const [likerList, setLikerList] = useState<UserWithSupportStatus[]>([]);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    
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
            }

            setLikerList(prev => {
                const existingIds = new Set(prev.map(u => u.id));
                const uniqueNew = users.filter(u => !existingIds.has(u.id as string));
                const updatedList = pageNum === 1 ? users : [...prev, ...uniqueNew];
                return updatedList as UserWithSupportStatus[];
            });

            const nextPage = pageNum + 1;
            setPage(nextPage);

        } catch (error) {
            console.error(`Failed to fetch likers:`, error);
            toast({ title: "Error loading users", variant: "destructive" });
        } finally {
            if (pageNum === 1) setIsLoading(false);
            setIsFetchingMore(false);
        }
    }, [emojiId, isFetchingMore, toast]);

    useEffect(() => {
        if (open && emojiId) {
            fetchLikers(1);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, emojiId]);

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
        const updateList = (list: UserWithSupportStatus[]) => list.map(user => 
            user.id === changedUserId 
            ? { ...user, support_status: newStatus } 
            : user
        );
        setLikerList(updateList);
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
