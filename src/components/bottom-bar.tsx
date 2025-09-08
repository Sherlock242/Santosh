
'use client';

import Link from 'next/link';
import { useSelectedLayoutSegment } from 'next/navigation';
import { Home, Search, PlusSquare, Bell, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';
import { useAuth } from '@/hooks/use-auth';
import React, { useState, useEffect } from 'react';
import Image from 'next/image';

export function BottomBar() {
  const segment = useSelectedLayoutSegment();
  const { user, supabase } = useAuth();
  const [hasNewNotifications, setHasNewNotifications] = useState(false);

  useEffect(() => {
    // If we navigate to the notifications page, clear the indicator immediately
    if (segment === 'notifications') {
      setHasNewNotifications(false);
    }
  }, [segment]);

  useEffect(() => {
    if (!user) return;

    // This subscription listens for new notifications in real-time.
    // The initial check for unread notifications has been removed to prevent the dot from reappearing incorrectly.
    const channel = supabase
      .channel('realtime-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_id=eq.${user.id}`,
        },
        (payload) => {
          // Only show the dot for genuinely new, unread notifications.
          if (payload.new && !(payload.new as any).is_read) {
            setHasNewNotifications(true);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, supabase]);

  const navItems = [
    { href: '/mood', segment: 'mood', label: 'Home', icon: Home },
    { href: '/explore', segment: 'explore', label: 'Search', icon: Search },
    { href: '/design', segment: 'design', label: 'Create', icon: PlusSquare },
    { href: '/notifications', segment: 'notifications', label: 'Notifications', icon: Bell, hasIndicator: hasNewNotifications },
    { href: '/gallery', segment: 'gallery', label: 'Profile', icon: User, isProfile: true },
  ];
  
  const handleNotificationsClick = () => {
    if (hasNewNotifications) {
      setHasNewNotifications(false);
    }
  }

  return (
    <footer className="fixed bottom-0 left-0 z-50 w-full border-t border-border/40 bg-background backdrop-blur md:hidden">
      <nav className="flex h-14 items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.segment === segment;

          if (item.isProfile) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center justify-center rounded-full transition-colors w-9 h-9',
                  isActive && 'ring-2 ring-primary ring-offset-2 ring-offset-background'
                )}
              >
                <Avatar className="h-7 w-7">
                  {user?.picture && <AvatarImage src={user.picture} alt={user.name || 'profile'} data-ai-hint="profile picture" className="rounded-full" />}
                  <AvatarFallback>{user?.name ? user.name.charAt(0).toUpperCase() : 'U'}</AvatarFallback>
                </Avatar>
              </Link>
            );
          }
          
          const clickHandler = item.segment === 'notifications' ? handleNotificationsClick : undefined;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={clickHandler}
              className="relative flex items-center justify-center rounded-md transition-colors w-12 h-12 text-muted-foreground hover:bg-muted/50"
            >
              <Icon className={cn('h-7 w-7', isActive && 'text-primary')} />
              {item.hasIndicator && (
                <span className="absolute top-2 right-2 h-2.5 w-2.5 rounded-full bg-primary" />
              )}
            </Link>
          );
        })}
      </nav>
    </footer>
  );
}
