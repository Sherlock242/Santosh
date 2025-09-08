
'use client';

import { Menu, LogOut, Trash2 } from 'lucide-react';
import { Button } from './ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useAuth } from '@/hooks/use-auth';
import React, { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { deleteUserAccount } from '@/app/actions';
import { EdengramLogo } from './edengram-logo';
  

export function ChatHeader({ children }: { children?: React.ReactNode }) {
  const { user, supabase } = useAuth();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  
  const handleSignOut = async () => {
    setShowSignOutConfirm(false);
    if (!supabase) return;
    router.replace('/');
    await supabase.auth.signOut();
  };
  
  const handleDeleteAccount = async () => {
    setShowDeleteConfirm(false);
    if (!user || !supabase) return;

    try {
      await deleteUserAccount();
      
      toast({
        title: 'Account Deleted',
        description: 'Your account has been permanently deleted.',
        variant: 'success',
      });

      router.replace('/');
      await supabase.auth.signOut();
      
    } catch (error: any) {
      console.error("Failed to delete account:", error);
      toast({
        title: "Error Deleting Account",
        description: "Could not schedule your account for deletion.",
        variant: "destructive",
      });
    }
  };
  
  return (
    <>
      <header className="flex h-16 items-center justify-between border-b border-border/40 bg-background px-4 md:px-6">
        <h1 className="text-2xl font-logo font-bold -mb-1">Edengram</h1>
        <div className="flex items-center gap-2">
          {children}
          {user && (
            <Sheet>
                <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-muted-foreground hover:bg-transparent hover:text-primary">
                        <Menu />
                        <span className="sr-only">Open menu</span>
                    </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-full max-w-sm flex flex-col">
                    <SheetHeader className="text-left">
                        <SheetTitle>Menu</SheetTitle>
                    </SheetHeader>
                    <div className="flex-1">
                    </div>

                    <div className="mt-auto">
                      <Button variant="ghost" className="w-full justify-start" onClick={() => setShowSignOutConfirm(true)}>
                            <LogOut className="mr-2 h-4 w-4" />
                            Sign Out
                      </Button>
                      <Button variant="destructive" className="w-full justify-start mt-2" onClick={() => setShowDeleteConfirm(true)}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete Account
                      </Button>
                    </div>
                </SheetContent>
            </Sheet>
          )}
        </div>
      </header>
       <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will schedule your account and all associated data for permanent deletion in 30 minutes. You can cancel this by signing back in within that time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAccount} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Yes, Delete My Account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showSignOutConfirm} onOpenChange={setShowSignOutConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to log out?</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No</AlertDialogCancel>
            <AlertDialogAction onClick={handleSignOut}>
              Yes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
