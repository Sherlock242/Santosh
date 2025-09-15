
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
  const [pendingSegment, setPendingSegment] = useState<string | null>(null);

  useEffect(() => {
    // When the actual segment changes (page loads), clear the pending state.
    if (segment !== pendingSegment) {
      setPendingSegment(null);
    }
  }, [segment, pendingSegment]);


  const navItems = [
    { href: '/mood', segment: 'mood', label: 'Home', icon: Home },
    { href: '/explore', segment: 'explore', label: 'Search', icon: Search },
    { href: '/design', segment: 'design', label: 'Create', icon: PlusSquare },
    { href: '/links', segment: 'links', label: 'Links', icon: Link2 },
    { href: '/gallery', segment: 'gallery', label: 'Profile', icon: User, isProfile: true },
  ];
  
  const handleNavClick = (itemSegment: string) => {
    setPendingSegment(itemSegment);
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
