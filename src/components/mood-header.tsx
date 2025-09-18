
'use client';

import { useAuth } from '@/hooks/use-auth';
import { Bell } from 'lucide-react';
import Link from 'next/link';
import { Button } from './ui/button';
import { useEffect, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
  
const NotificationBell = () => {
    const { user, supabase } = useAuth();
    const [hasNewNotifications, setHasNewNotifications] = useState(false);

    const checkForNewNotifications = useCallback(async () => {
        if (!user) return;
        const { count, error } = await supabase
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('recipient_id', user.id)
            .eq('is_read', false);
        
        if (error) {
            console.error("Error checking for notifications:", error);
            return;
        }
        
        setHasNewNotifications(count ? count > 0 : false);
    }, [user, supabase]);

    useEffect(() => {
        checkForNewNotifications();
    }, [checkForNewNotifications]);

    useEffect(() => {
        if (!user) return;

        const channel = supabase
            .channel('realtime-notifications-header')
            .on(
                'postgres_changes',
                {
                    event: '*', // Listen to all changes
                    schema: 'public',
                    table: 'notifications',
                    filter: `recipient_id=eq.${user.id}`,
                },
                () => {
                    // When any change happens, re-check the count.
                    // This is more reliable than trying to manage state based on payload.
                    checkForNewNotifications();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user, supabase, checkForNewNotifications]);

    return (
        <Button asChild variant="ghost" size="icon" className="relative text-muted-foreground hover:text-primary">
            <Link href="/notifications" onClick={() => setHasNewNotifications(false)}>
                <Bell />
                {hasNewNotifications && <span className="absolute top-2 right-2 h-2.5 w-2.5 rounded-full bg-primary" />}
                <span className="sr-only">Notifications</span>
            </Link>
        </Button>
    )
}


export function MoodHeader({ children }: { children?: React.ReactNode }) {
  const { user } = useAuth();

  return (
    <>
      <header className="flex h-16 items-center justify-between border-b border-border/40 bg-background px-4 md:px-6">
        <h1 className="text-2xl font-logo font-bold -mb-1">Edengram</h1>
        <div className="flex items-center gap-2">
          {children}
          <NotificationBell />
        </div>
      </header>
    </>
  );
}
