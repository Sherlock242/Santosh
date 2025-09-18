
'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Loader2, UserPlus, Heart, Check, MessageSquareReply } from 'lucide-react';
import { getNotifications, respondToSupportRequest } from '../actions';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { GalleryThumbnail } from '@/components/gallery-thumbnail';
import type { EmojiState } from '@/app/design/page';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useSupport } from '@/hooks/use-support';
import Image from 'next/image';

const NotificationHeader = () => (
    <header className="flex h-16 items-center border-b border-border/40 bg-background px-4 md:px-6">
        <h1 className="text-xl font-bold">Notifications</h1>
    </header>
);

interface Actor {
    id: string;
    name: string;
    picture: string;
    is_private: boolean;
}

interface Notification {
  id: number;
  type: 'new_supporter' | 'new_like' | 'new_support_request' | 'support_request_approved' | 'new_link_response';
  created_at: string;
  emoji_id: string | null;
  link_request_id: string | null;
  actor: Actor;
  emoji: EmojiState | null;
  actor_support_status: 'approved' | 'pending' | null;
}

const timeSince = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + "y";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + "m";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + "d";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + "h";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + "min";
    return Math.floor(seconds) + "s";
};

const NotificationItemWrapper = ({ 
    actor, 
    onPostClick, 
    emoji,
    icon,
    text,
    action,
    mainAction
}: { 
    actor: Actor, 
    onPostClick?: () => void, 
    emoji?: EmojiState | null,
    icon: React.ReactNode,
    text: React.ReactNode,
    action?: React.ReactNode,
    mainAction?: () => void
}) => (
    <div onClick={mainAction} className="flex items-center gap-4 px-4 py-3 hover:bg-muted/50 cursor-pointer">
        <Link href={`/gallery?userId=${actor.id}`} onClick={(e) => e.stopPropagation()} className="relative flex-shrink-0 cursor-pointer">
            <Avatar className="h-10 w-10">
                <AvatarImage src={actor.picture} alt={actor.name} data-ai-hint="profile picture" className="rounded-full" />
                <AvatarFallback>{actor.name ? actor.name.charAt(0).toUpperCase() : 'U'}</AvatarFallback>
            </Avatar>
            {icon}
        </Link>
        <div className="flex-1 text-sm">
            {text}
        </div>
        {emoji ? (
             <button className="w-12 h-12 flex-shrink-0" onClick={(e) => { e.stopPropagation(); onPostClick?.(); }}>
                <GalleryThumbnail emoji={emoji} onSelect={() => {}} />
            </button>
        ) : action}
    </div>
);


const SupportNotification = React.memo(({ notification }: { notification: Notification }) => {
    const { actor, created_at } = notification;
    const { supportStatus, isLoading, handleSupportToggle } = useSupport(
        actor.id, 
        notification.actor_support_status || null,
        actor.is_private
    );
    
    return (
        <NotificationItemWrapper 
            actor={actor}
            icon={
                <div className="absolute -bottom-1 -right-1 bg-primary rounded-full p-0.5">
                    <UserPlus className="h-3 w-3 text-primary-foreground"/>
                </div>
            }
            text={
                <p>
                    <Link href={`/gallery?userId=${actor.id}`} onClick={(e) => e.stopPropagation()} className="font-semibold">{actor.name}</Link>
                    {' started supporting you. '}
                    <span className="text-muted-foreground">{timeSince(new Date(created_at))}</span>
                </p>
            }
            action={
                <Button
                    variant={supportStatus === 'approved' || supportStatus === 'pending' ? 'secondary' : 'default'}
                    size="sm"
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleSupportToggle();
                    }}
                    disabled={isLoading}
                >
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin"/> :
                    supportStatus === 'approved' ? 'Unsupport' :
                    supportStatus === 'pending' ? 'Pending' : 'Support'}
                </Button>
            }
        />
    );
});
SupportNotification.displayName = 'SupportNotification';

const SupportRequestNotification = React.memo(({ notification, onRespond }: { notification: Notification; onRespond: (id: number) => void; }) => {
    const { actor, created_at, id } = notification;
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState<'approve' | 'decline' | null>(null);

    const handleResponse = async (action: 'approve' | 'decline') => {
        setIsLoading(action);
        try {
            await respondToSupportRequest(actor.id, action);
            toast({
                title: `Request ${action === 'approve' ? 'Approved' : 'Declined'}`,
                variant: 'success',
            });
            onRespond(id);
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } finally {
            setIsLoading(null);
        }
    }

    return (
         <NotificationItemWrapper 
            actor={actor}
            icon={<></>}
            text={
                <p>
                    <Link href={`/gallery?userId=${actor.id}`} onClick={(e) => e.stopPropagation()} className="font-semibold">{actor.name}</Link>
                    {' wants to support you. '}
                    <span className="text-muted-foreground">{timeSince(new Date(created_at))}</span>
                </p>
            }
            action={
                <div className="flex gap-2">
                    <Button size="sm" onClick={(e) => {e.stopPropagation(); handleResponse('approve')}} disabled={!!isLoading}>
                        {isLoading === 'approve' ? <Loader2 className="h-4 w-4 animate-spin"/> : 'Approve'}
                    </Button>
                    <Button size="sm" variant="secondary" onClick={(e) => {e.stopPropagation(); handleResponse('decline')}} disabled={!!isLoading}>
                        {isLoading === 'decline' ? <Loader2 className="h-4 w-4 animate-spin"/> : 'Decline'}
                    </Button>
                </div>
            }
        />
    );
});
SupportRequestNotification.displayName = 'SupportRequestNotification';


export default function NotificationsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const loaderRef = useRef(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async (pageNum: number, limit = 15) => {
    if (!user || isFetchingMore) return;
    
    if (pageNum === 1) {
        setIsLoading(true);
    } else {
        setIsFetchingMore(true);
    }

    try {
        const newNotificationsData = await getNotifications({ page: pageNum, limit });
        const newNotifications = newNotificationsData as Notification[];

        if (newNotifications.length < limit) {
            setHasMore(false);
        }

        setNotifications(prev => {
            if (pageNum === 1) {
                 return newNotifications;
            }
            const existingIds = new Set(prev.map((n: Notification) => n.id));
            const uniqueNew = newNotifications.filter((n: Notification) => !existingIds.has(n.id));
            return [...prev, ...uniqueNew];
        });
        
        setPage(pageNum + 1);

    } catch (error: any) {
        console.error("Failed to fetch notifications", error);
        toast({ title: "Error", description: "Could not load notifications.", variant: "destructive"});
    } finally {
        setIsLoading(false);
        setIsFetchingMore(false);
    }
  }, [user, toast, isFetchingMore]);

  useEffect(() => {
    if (user) {
        fetchNotifications(1);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
        const target = entries[0];
        if (target.isIntersecting && hasMore && !isFetchingMore && !isLoading) {
            fetchNotifications(page);
        }
    }, { root: scrollContainerRef.current, rootMargin: '200px', threshold: 0 });

    const currentLoader = loaderRef.current;
    if (currentLoader) observer.observe(currentLoader);

    return () => {
        if (currentLoader) observer.unobserve(currentLoader);
    }
  }, [fetchNotifications, hasMore, isFetchingMore, isLoading, page]);
  
  const handleRequestResponded = (notificationId: number) => {
    const updatedNotifications = notifications.filter((n: Notification) => n.id !== notificationId);
    setNotifications(updatedNotifications);
  }
  
  const renderNotification = (notification: Notification) => {
    const { actor, type, emoji, created_at } = notification;

    switch(type) {
        case 'new_support_request':
            return <SupportRequestNotification key={notification.id} notification={notification} onRespond={handleRequestResponded} />;
        
        case 'new_supporter':
            return <SupportNotification key={notification.id} notification={notification} />;

        case 'support_request_approved':
            return (
                <NotificationItemWrapper 
                    key={notification.id} 
                    actor={actor}
                    mainAction={() => router.push(`/gallery?userId=${actor.id}`)}
                    icon={
                        <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-0.5">
                            <Check className="h-3 w-3 text-white"/>
                        </div>
                    }
                    text={
                        <p>
                            <span className="font-semibold">{actor.name}</span>
                            {' approved your support request.'}
                            <span className="text-muted-foreground ml-2">{timeSince(new Date(created_at))}</span>
                        </p>
                    }
                    action={<div className="w-12 h-12" />}
                />
            );

        case 'new_like':
            if (!emoji || !emoji.id) return null;
            return (
                <NotificationItemWrapper 
                    key={notification.id} 
                    actor={actor} 
                    emoji={emoji} 
                    mainAction={() => router.push(`/gallery?userId=${emoji.user_id}`)}
                    onPostClick={() => router.push(`/gallery?userId=${emoji.user_id}`)}
                    icon={
                         <div className="absolute -bottom-1 -right-1 bg-red-500 rounded-full p-0.5">
                           <Heart className="h-3 w-3 text-white" fill="white" />
                        </div>
                    }
                    text={
                        <p>
                            <Link href={`/gallery?userId=${actor.id}`} onClick={(e) => e.stopPropagation()} className="font-semibold">{actor.name}</Link>
                            {' reacted to your post.'}
                            <span className="text-muted-foreground ml-2">{timeSince(new Date(created_at))}</span>
                        </p>
                    }
                />
            );
        
        case 'new_link_response':
            return (
                <NotificationItemWrapper 
                    key={notification.id} 
                    actor={actor}
                    mainAction={() => router.push('/links')}
                    icon={
                        <div className="absolute -bottom-1 -right-1 bg-blue-500 rounded-full p-0.5">
                            <MessageSquareReply className="h-3 w-3 text-white"/>
                        </div>
                    }
                    text={
                        <p>
                            <Link href={`/gallery?userId=${actor.id}`} onClick={(e) => e.stopPropagation()} className="font-semibold">{actor.name}</Link>
                            {' replied to your link request.'}
                            <span className="text-muted-foreground ml-2">{timeSince(new Date(created_at))}</span>
                        </p>
                    }
                    action={<div className="w-12 h-12" />}
                />
            );

        default:
            return null;
    }
  }

  return (
    <div className="flex h-full w-full flex-col">
      <NotificationHeader />
      <div className="flex-1 overflow-y-auto" ref={scrollContainerRef}>
        {isLoading ? (
            <div className="flex h-full w-full flex-col items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        ) : notifications.length > 0 ? (
            <>
                {notifications.map(renderNotification)}
                {hasMore && <div ref={loaderRef} className="flex justify-center p-4"><Loader2 className="h-6 w-6 animate-spin"/></div>}
            </>
        ) : (
          <div className="text-center p-8 text-muted-foreground h-full flex flex-col items-center justify-center">
              <Heart className="w-16 h-16 mb-4"/>
              <h2 className="text-xl font-semibold text-foreground">Activity On Your Posts</h2>
              <p>When someone likes or supports you, you'll see it here.</p>
          </div>
        )}
      </div>
    </div>
  );
}
