
'use client';

import React from 'react';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useSupport } from '@/hooks/use-support';
import Image from 'next/image';
import { GoldTick } from './gold-tick';

interface User {
  id: string;
  name: string;
  picture: string;
  is_private: boolean;
  support_status: 'approved' | 'pending' | null;
  is_gold_member?: boolean;
}

interface UserListItemProps {
  itemUser: User;
  onSupportChange: (userId: string, newStatus: 'approved' | 'pending' | null) => void;
}

export const UserListItem = React.memo(({ itemUser, onSupportChange }: UserListItemProps) => {
    const { user: currentUser } = useAuth();

    const { supportStatus, isLoading, handleSupportToggle } = useSupport(
        itemUser.id, 
        itemUser.support_status,
        itemUser.is_private,
        onSupportChange
    );
    
    const isSelf = currentUser?.id === itemUser.id;

    return (
        <div className="flex items-center gap-4 p-2 rounded-lg hover:bg-muted">
            <Link href={`/gallery?userId=${itemUser.id}`}>
                <Avatar className="h-12 w-12">
                    <AvatarImage src={itemUser.picture} alt={itemUser.name} data-ai-hint="profile picture" className="rounded-full" />
                    <AvatarFallback>{itemUser.name ? itemUser.name.charAt(0).toUpperCase() : 'U'}</AvatarFallback>
                </Avatar>
            </Link>
            <Link href={`/gallery?userId=${itemUser.id}`} className="font-semibold flex-1 flex items-center gap-1">
              {itemUser.name}
              {itemUser.is_gold_member && <GoldTick />}
            </Link>
            {!isSelf && currentUser && (
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
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 
                        (supportStatus === 'approved' ? 'Unsupport' : 
                         supportStatus === 'pending' ? 'Pending' : 'Support')}
                </Button>
            )}
        </div>
    )
});
UserListItem.displayName = 'UserListItem';
