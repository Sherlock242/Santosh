
'use client';

import Link from 'next/link';
import { useSelectedLayoutSegment } from 'next/navigation';
import { Home, Search, PlusSquare, Bell, User, Link2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';
import { useAuth } from '@/hooks/use-auth';
import React, { useState, useEffect } from 'react';
import Image from 'next/image';

export function BottomBar() {
  const segment = useSelectedLayoutSegment();
  const { user, supabase } = useAuth();

  const navItems = [
    { href: '/mood', segment: 'mood', label: 'Home', icon: Home },
    { href: '/explore', segment: 'explore', label: 'Search', icon: Search },
    { href: '/design', segment: 'design', label: 'Create', icon: PlusSquare },
    { href: '/links', segment: 'links', label: 'Links', icon: Link2 },
    { href: '/gallery', segment: 'gallery', label: 'Profile', icon: User, isProfile: true },
  ];
  
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
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className="relative flex items-center justify-center rounded-md transition-colors w-12 h-12 text-muted-foreground hover:bg-muted/50"
            >
              <Icon className={cn('h-7 w-7', isActive && 'text-primary')} />
            </Link>
          );
        })}
      </nav>
    </footer>
  );
}
