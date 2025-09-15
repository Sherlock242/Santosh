
'use client';

import Link from 'next/link';
import { useSelectedLayoutSegment } from 'next/navigation';
import { Home, Search, PlusSquare, Bell, User, Link2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';
import { useAuth } from '@/hooks/use-auth';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { EdengramLogo } from './edengram-logo';
import React, { useState, useEffect } from 'react';
import Image from 'next/image';

export function MainSidebar() {
  const segment = useSelectedLayoutSegment();
  const { user, supabase } = useAuth();
  const [hasNewNotifications, setHasNewNotifications] = useState(false);
  const [pendingSegment, setPendingSegment] = useState<string | null>(null);

  useEffect(() => {
    // When the actual segment changes (page loads), clear the pending state.
    if (segment !== pendingSegment) {
      setPendingSegment(null);
    }
     // If we navigate to the notifications page, clear the indicator immediately
    if (segment === 'notifications') {
      setHasNewNotifications(false);
    }
  }, [segment, pendingSegment]);


  useEffect(() => {
    if (!user) return;

    // This subscription listens for new notifications in real-time.
    // The initial check for unread notifications has been removed to prevent the dot from reappearing incorrectly.
    const channel = supabase
      .channel('realtime-notifications-sidebar')
      .on(
        'postgres_changes', 
        { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'notifications', 
            filter: `recipient_id=eq.${user.id}` 
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
    }
  }, [user, supabase]);

  const navItems = [
    { href: '/mood', segment: 'mood', label: 'Home', icon: Home },
    { href: '/explore', segment: 'explore', label: 'Search', icon: Search },
    { href: '/design', segment: 'design', label: 'Create', icon: PlusSquare },
    { href: '/links', segment: 'links', label: 'Links', icon: Link2 },
    { href: '/notifications', segment: 'notifications', label: 'Notifications', icon: Bell, hasIndicator: hasNewNotifications },
    { href: '/gallery', segment: 'gallery', label: 'Profile', icon: User, isProfile: true },
  ];
  
  const handleNavClick = (itemSegment: string) => {
    setPendingSegment(itemSegment);
    if (itemSegment === 'notifications') {
      setHasNewNotifications(false);
    }
  }

  return (
    <aside className="hidden md:flex md:flex-col md:w-20 md:border-r md:border-border/40 md:py-4">
      <TooltipProvider>
        <nav className="flex flex-col items-center gap-4">
          <Link href="/mood" className="mb-4">
            <EdengramLogo className="h-8 w-8" />
          </Link>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = (pendingSegment || segment) === item.segment;
            
            return (
              <Tooltip key={item.label}>
                <TooltipTrigger asChild>
                  <Link
                    href={item.href}
                    onClick={() => handleNavClick(item.segment)}
                    className={cn(
                      'relative flex items-center justify-center rounded-lg transition-colors w-12 h-12',
                      isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted/50'
                    )}
                  >
                    {item.isProfile ? (
                      <Avatar className="h-8 w-8">
                        {user?.picture && <AvatarImage src={user.picture} alt={user.name || 'profile'} data-ai-hint="profile picture" className="rounded-full" />}
                        <AvatarFallback>{user?.name ? user.name.charAt(0).toUpperCase() : 'U'}</AvatarFallback>
                      </Avatar>
                    ) : (
                      <Icon className="h-6 w-6" />
                    )}
                    {item.hasIndicator && (
                      <span className="absolute top-2 right-2 h-2.5 w-2.5 rounded-full bg-primary" />
                    )}
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>{item.label}</p>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </nav>
      </TooltipProvider>
    </aside>
  );
}
