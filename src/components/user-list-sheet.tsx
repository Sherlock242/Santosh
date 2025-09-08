
'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Loader2 } from 'lucide-react';
import { getSupporters, getSupporting } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { UserListItem } from './user-list-item';
import type { UserWithSupportStatus } from '@/app/actions';


interface UserListSheetProps {
    open: boolean;
    onOpenChange: (isOpen: boolean) => void;
    type: 'supporters' | 'supporting' | null;
    userId: string | undefined;
}

export function UserListSheet({ open, onOpenChange, type, userId }: UserListSheetProps) {
    const { toast } = useToast();
    
    const [userList, setUserList] = useState<UserWithSupportStatus[]>([]);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    
    const [isLoading, setIsLoading] = useState(false);
    const [isFetchingMore, setIsFetchingMore] = useState(false);

    const loaderRef = useRef(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const fetchUsers = useCallback(async (pageNum: number) => {
        if (!type || !userId || isFetchingMore) return;

        if (pageNum === 1) setIsLoading(true);
        else setIsFetchingMore(true);

        try {
            const fetcher = type === 'supporters' ? getSupporters : getSupporting;
            const newUsers = await fetcher({ userId, page: pageNum, limit: 15 });

            if (newUsers.length < 15) {
                setHasMore(false);
            }

            setUserList(prev => {
                const existingIds = new Set(prev.map(u => u.id));
                const uniqueNew = newUsers.filter(u => !existingIds.has(u.id));
                return pageNum === 1 ? newUsers : [...prev, ...uniqueNew];
            });
            
            setPage(pageNum + 1);

        } catch (error) {
            console.error(`Failed to fetch ${type}:`, error);
            toast({ title: "Error loading users", variant: "destructive" });
        } finally {
            if (pageNum === 1) setIsLoading(false);
            setIsFetchingMore(false);
        }
    }, [type, userId, isFetchingMore, toast]);
    
    // Reset state and fetch data when the sheet is opened
    useEffect(() => {
        if (open && userId) {
            setUserList([]);
            setPage(1);
            setHasMore(true);
            setIsLoading(false);
            setIsFetchingMore(false);
            fetchUsers(1);
        }
    }, [open, type, userId, fetchUsers]);


    // Infinite scroll observer
    useEffect(() => {
        const observer = new IntersectionObserver((entries) => {
            const target = entries[0];
            if (target.isIntersecting && hasMore && !isFetchingMore && !isLoading) {
                fetchUsers(page);
            }
        }, { root: scrollContainerRef.current, rootMargin: '200px', threshold: 0 });

        const currentLoader = loaderRef.current;
        if (currentLoader) observer.observe(currentLoader);

        return () => {
            if (currentLoader) observer.unobserve(currentLoader);
        };
    }, [fetchUsers, hasMore, isFetchingMore, isLoading, page]);

    const handleSupportChange = (changedUserId: string, newStatus: 'approved' | 'pending' | null) => {
        setUserList(prevList => 
            prevList.map(user => 
                user.id === changedUserId 
                ? { ...user, support_status: newStatus } 
                : user
            )
        );
    }

    const title = type === 'supporters' ? 'Supporters' : 'Supporting';

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="bottom" className="max-h-[80vh] flex flex-col">
                <SheetHeader className="text-center">
                    <SheetTitle>{title}</SheetTitle>
                </SheetHeader>
                <div className="flex-1 overflow-y-auto no-scrollbar" ref={scrollContainerRef}>
                    {isLoading ? (
                        <div className="flex justify-center items-center h-full">
                            <Loader2 className="h-8 w-8 animate-spin" />
                        </div>
                    ) : userList.length > 0 ? (
                        <>
                            <div className="flex flex-col gap-1 p-2">
                            {userList.map(user => (
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
                            <p>No users to show.</p>
                        </div>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    )
}
