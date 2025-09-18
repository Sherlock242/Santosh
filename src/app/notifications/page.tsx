
import React, { Suspense } from 'react';
import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { Loader2 } from 'lucide-react';
import NotificationsClientPage from '@/components/notifications-client-page';
import { getNotifications, markNotificationsAsRead } from '../actions/notification.actions';

export default async function NotificationsPage() {
    // This server component now handles marking as read and fetching initial data.
    await markNotificationsAsRead();
    
    const initialNotifications = await getNotifications({ page: 1, limit: 15 });

    return (
        <Suspense fallback={<div className="flex h-full w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
            <NotificationsClientPage initialNotifications={initialNotifications as any[]} />
        </Suspense>
    );
}
