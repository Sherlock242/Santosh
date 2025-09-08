
'use client';

import React, { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import dynamic from 'next/dynamic';
import type { EmojiState } from '@/app/design/page';
import { GalleryThumbnail } from '@/components/gallery-thumbnail';
import { Button } from '@/components/ui/button';
import { Lock, Grid3x3, Menu, LogOut, Share2, Loader2, ArrowLeft, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
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
import { useToast } from '@/hooks/use-toast';
import { getGalleryPosts, getSupportStatus, getSupporterCount, getSupportingCount, deleteUserAccount } from '@/app/actions';
import { supabase } from '@/lib/supabaseClient';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useSupport } from '@/hooks/use-support';
import Image from 'next/image';
import { getPostsByUserFromCache, updatePostCache, getProfileStatsFromCache, updateProfileStatsCache, getUserFromCache } from '@/lib/post-cache';
import { GoldTick } from '@/components/gold-tick';

const PostView = dynamic(() => 
  import('@/components/post-view').then(mod => mod.PostView),
  {
    loading: () => <div className="flex h-full w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>,
    ssr: false 
  }
);

const UserListSheet = dynamic(() =>
  import('@/components/user-list-sheet').then(mod => mod.UserListSheet),
  { ssr: false }
);


interface ProfileUser {
    id: string;
    name: string;
    picture: string;
    is_private: boolean;
    is_gold_member: boolean;
}

interface GalleryEmoji extends EmojiState {
    like_count: number;
    is_liked: boolean;
}

const MemoizedThumbnail = React.memo(GalleryThumbnail);

function GalleryPageContent() {
    const { user: authUser, supabase, refreshUser } = useAuth();
    const { toast } = useToast();
    const searchParams = useSearchParams();
    const router = useRouter();
    const userId = searchParams.get('userId');

    const isOwnProfile = !userId || (authUser && userId === authUser.id);
    const viewingUserId = isOwnProfile ? authUser?.id : userId;

    const [profileUser, setProfileUser] = React.useState<ProfileUser | null>(null);
    const [savedEmojis, setSavedEmojis] = useState<GalleryEmoji[]>([]);
    const [selectedEmojiId, setSelectedEmojiId] = React.useState<string | null>(null);
    const [isLoading, setIsLoading] = React.useState(true);
    
    const [supporterCount, setSupporterCount] = React.useState(0);
    const [supportingCount, setSupportingCount] = React.useState(0);
    const [postCount, setPostCount] = React.useState(0);
    
    const [canViewContent, setCanViewContent] = useState(true);

    const onSupportStatusChange = useCallback((newStatus: 'approved' | 'pending' | null, oldStatus: 'approved' | 'pending' | null) => {
        // Optimistically update supporter count
        const isSupporting = newStatus === 'approved';
        const wasSupporting = oldStatus === 'approved';

        if (isSupporting && !wasSupporting) {
            setSupporterCount(c => c + 1);
        } else if (!isSupporting && wasSupporting) {
            setSupporterCount(c => Math.max(0, c - 1));
        }

        // If user is approved, reload content to show posts.
        if (newStatus === 'approved') {
            fetchPosts(); 
        } else if (oldStatus === 'approved') {
            // If user unsupports, clear posts for private profiles.
            if(profileUser?.is_private) {
                setSavedEmojis([]);
                setCanViewContent(false);
            }
        }
    }, [profileUser]);

    const [initialSupportStatus, setInitialSupportStatus] = React.useState<'approved' | 'pending' | null>(null);
    const { supportStatus, isLoading: isSupportLoading, handleSupportToggle } = useSupport(viewingUserId, initialSupportStatus, profileUser?.is_private, undefined, onSupportStatusChange);
    
    const [isInitialPostsLoading, setIsInitialPostsLoading] = useState(true);

    const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
    const [showSignOutConfirm, setShowSignOutConfirm] = React.useState(false);
    const [sheetContent, setSheetContent] = React.useState<'supporters' | 'supporting' | null>(null);
    const [isMenuOpen, setIsMenuOpen] = React.useState(false);
    
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const fetchPosts = useCallback(async () => {
        if (!viewingUserId) return;
        
        try {
            const newPosts = await getGalleryPosts({ userId: viewingUserId });
            
            // Update global cache
            updatePostCache(newPosts);

            if (newPosts.length === 0 && profileUser?.is_private && !isOwnProfile && supportStatus !== 'approved') {
                setCanViewContent(false);
            } else {
                setCanViewContent(true);
            }

            setSavedEmojis(newPosts as GalleryEmoji[]);
            setPostCount(newPosts.length); // Also update post count from the fresh fetch
            
        } catch (error: any) {
            console.error("Failed to load posts:", error);
            toast({ title: "Failed to load posts", description: error.message, variant: 'destructive' });
        } finally {
            setIsInitialPostsLoading(false);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [viewingUserId, toast, isOwnProfile, profileUser, supportStatus]);

    const fetchProfileInfo = useCallback(async () => {
        if (!viewingUserId) return;

        try {
            // Fetch user from DB, but check cache for picture/name first for instant display
            const cachedUser = getUserFromCache(viewingUserId);
            if (cachedUser) {
                setProfileUser(prev => ({ ...(prev || {} as ProfileUser), id: viewingUserId, ...cachedUser }));
            }

            const { data: userProfile, error: userError } = await supabase
                .from('users')
                .select('id, name, picture, is_private, is_gold_member')
                .eq('id', viewingUserId)
                .single();

            if (userError || !userProfile) throw new Error(userError?.message || "User profile not found.");
            
            setProfileUser(userProfile);

            const [supporters, following] = await Promise.all([
                getSupporterCount(viewingUserId),
                getSupportingCount(viewingUserId),
            ]);

            setSupporterCount(supporters);
            setSupportingCount(following);
            updateProfileStatsCache(viewingUserId, { supporterCount: supporters, supportingCount: following });
            
            let status: 'approved' | 'pending' | null = null;
            if (!isOwnProfile && authUser) {
                status = await getSupportStatus(authUser.id, viewingUserId);
                setInitialSupportStatus(status);
            }
            
            const canViewInitial = !userProfile.is_private || isOwnProfile || status === 'approved';
            setCanViewContent(canViewInitial);
            
            if (canViewInitial) {
                await fetchPosts();
            } else {
                setIsInitialPostsLoading(false);
            }
        } catch (error: any) {
            console.error("Failed to load profile info:", error);
            toast({ title: "Could not load profile", description: error.message, variant: 'destructive' });
            setIsInitialPostsLoading(false);
        } finally {
            setIsLoading(false);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [viewingUserId, supabase, isOwnProfile, authUser, toast]);
    
    // This effect runs when coming back from the payment page to refresh the user data.
    useEffect(() => {
        const fromPayment = searchParams.get('from_payment');
        if (fromPayment === 'true') {
            refreshUser(); // Refresh the authUser in the context
            fetchProfileInfo(); // Refetch this profile's info
            
            // Clean up the URL
            const nextUrl = new URL(window.location.href);
            nextUrl.searchParams.delete('from_payment');
            router.replace(nextUrl.toString(), { scroll: false });
        }
    }, [searchParams, router, fetchProfileInfo, refreshUser]);

    useEffect(() => {
        if (!viewingUserId) {
            setIsLoading(false);
            setIsInitialPostsLoading(false);
            return;
        }

        // Instantly load from cache if available
        const cachedPosts = getPostsByUserFromCache(viewingUserId);
        const cachedStats = getProfileStatsFromCache(viewingUserId);
        const cachedUser = getUserFromCache(viewingUserId);

        if (cachedPosts.length > 0 || cachedStats || cachedUser) {
             if (cachedUser) {
                setProfileUser(prev => ({ ...(prev || {} as ProfileUser), id: viewingUserId, ...cachedUser }));
            }
            if(cachedPosts.length > 0) {
                setSavedEmojis(cachedPosts as GalleryEmoji[]);
                setPostCount(cachedPosts.length);
                setIsInitialPostsLoading(false); // Stop the post loader specifically
            }
            if(cachedStats) {
                setSupporterCount(cachedStats.supporterCount);
                setSupportingCount(cachedStats.supportingCount);
            }
            setIsLoading(false); // Stop the main page loader
        } else {
            setIsLoading(true); // Only show main loader if nothing is cached
        }
        
        // Fetch fresh data in the background
        fetchProfileInfo();

    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [viewingUserId]);
    
    const handleDelete = async (emojiId: string) => {
        if (!supabase || !viewingUserId) return;
        try {
            const { error } = await supabase.from('emojis').delete().eq('id', emojiId);
            if (error) throw error;

            const updatedEmojis = savedEmojis.filter(emoji => emoji.id !== emojiId);
            setSavedEmojis(updatedEmojis);
            updatePostCache(updatedEmojis);
            setPostCount(updatedEmojis.length); // Update count after deletion

            setSelectedEmojiId(null);
            toast({ title: 'Post deleted', variant: 'success' })
        } catch (error: any) {
            console.error("Failed to delete emoji from Supabase", error);
            toast({ title: 'Error deleting post', description: error.message, variant: 'destructive' })
        }
    };
    
    const handleSignOut = async () => {
        setShowSignOutConfirm(false);
        if (!supabase) return;
        router.replace('/');
        await supabase.auth.signOut();
    };
    
    const handleDeleteAccount = async () => {
        setShowDeleteConfirm(false);
        if (!authUser || !supabase) return;

        try {
            await deleteUserAccount();
            
            toast({
                title: 'Account Deleted',
                description: 'Your account has been permanently deleted.',
                variant: 'success',
            });

            await supabase.auth.signOut();
            router.replace('/');
            
        } catch (error: any) {
          console.error("Failed to delete account:", error);
          toast({
            title: "Error Deleting Account",
            description: "Could not schedule your account for deletion.",
            variant: "destructive",
          });
        }
    };

    const handleShareProfile = async () => {
        if (!profileUser) return;
        const profileUrl = `${window.location.origin}/gallery?userId=${profileUser.id}`;
        const shareData = {
            title: `Check out ${profileUser.name}'s profile on Edengram!`,
            text: `See all of ${profileUser.name}'s creations on Edengram.`,
            url: profileUrl,
        };

        const copyToClipboard = () => {
            navigator.clipboard.writeText(profileUrl).then(() => {
                toast({
                    title: 'Profile link copied!',
                    description: 'The link to the profile has been copied to your clipboard.',
                    variant: 'success'
                });
            }).catch(err => {
                console.error("Could not copy text: ", err);
                toast({
                    title: 'Error',
                    description: 'Could not copy link to clipboard.',
                    variant: 'destructive'
                });
            });
        };
        
        if (navigator.share) {
            try {
                await navigator.share(shareData);
            } catch (err: any) {
                if (err.name !== 'AbortError' && err.name !== 'PermissionDeniedError') {
                    console.error('Share failed, falling back to copy:', err);
                    copyToClipboard();
                }
            }
        } else {
            copyToClipboard();
        }
    };

    const ProfileHeader = React.memo(() => (
        <header className="flex h-16 items-center justify-between bg-background px-4 md:px-6">
            <div className="flex items-center gap-1 font-semibold text-lg">
                {!isOwnProfile ? (
                    <Button variant="ghost" size="icon" className="mr-2" onClick={() => router.back()}>
                        <ArrowLeft />
                    </Button>
                ) : null }
                 {profileUser?.is_private && <Lock className="h-4 w-4" />}
                <span className="flex items-center gap-1">
                  {profileUser?.name || 'Profile'}
                  {profileUser?.is_gold_member && <GoldTick />}
                </span>
            </div>
            {isOwnProfile && authUser && (
            <div className="flex items-center gap-2">
                 <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
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
                        <div className="flex-1 space-y-2">
                           <Button variant="ghost" className="w-full justify-start" asChild>
                                <Link href="/plan">
                                    <GoldTick className="mr-2 h-4 w-4" />
                                    Upgrade to Gold
                                </Link>
                           </Button>
                        </div>
                        <div className="mt-auto">
                           <Button variant="ghost" className="w-full justify-start" onClick={() => { setIsMenuOpen(false); setShowSignOutConfirm(true); }}>
                                <LogOut className="mr-2 h-4 w-4" />
                                Sign Out
                           </Button>
                           <Button variant="destructive" className="w-full justify-start mt-2" onClick={() => { setIsMenuOpen(false); setShowDeleteConfirm(true); }}>
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete Account
                           </Button>
                        </div>
                    </SheetContent>
                </Sheet>
            </div>
            )}
        </header>
    ));
    ProfileHeader.displayName = "ProfileHeader";
    
    const selectedEmojiIndex = selectedEmojiId ? savedEmojis.findIndex(e => e.id === selectedEmojiId) : -1;
    
    if (!authUser && !userId) {
        return (
            <div className="flex h-full w-full flex-col items-center justify-center text-center p-8">
                <Lock className="h-16 w-16 text-muted-foreground" />
                <h2 className="mt-4 text-2xl font-bold">Please sign in</h2>
                <p className="text-muted-foreground">You need to be signed in to view your gallery.</p>
                <Button asChild className="mt-4">
                    <Link href="/">Go to Sign In</Link>
                </Button>
            </div>
        );
    }
    
    const showLoadingScreen = isLoading;

    const postsForView = savedEmojis.map(emoji => ({
        ...emoji,
        user: {
            id: profileUser?.id || '',
            name: profileUser?.name || '',
            picture: profileUser?.picture || '',
            is_gold_member: profileUser?.is_gold_member,
        }
    }));


    return (
        <>
            <div className="flex h-full w-full flex-col overflow-x-hidden">
            {selectedEmojiIndex > -1 ? (
                    <PostView 
                        emojis={postsForView}
                        initialIndex={selectedEmojiIndex}
                        onClose={() => setSelectedEmojiId(null)}
                        onDelete={isOwnProfile ? handleDelete : undefined}
                    />
            ) : (
                <>
                    <ProfileHeader />
                    <div className="flex-1 overflow-y-auto no-scrollbar" ref={scrollContainerRef}>
                        {showLoadingScreen ? (
                            <div className="flex h-full w-full flex-col items-center justify-center">
                                <Loader2 className="h-8 w-8 animate-spin" />
                            </div>
                        ) : (
                        <>
                        <div className="p-4 md:p-6">
                             <div className="flex items-center gap-4 md:gap-8">
                                <div>
                                    <Avatar className="w-20 h-20 md:w-28 md:h-28">
                                        {profileUser?.picture && <AvatarImage src={profileUser.picture} alt={profileUser.name || ''} data-ai-hint="profile picture" className="rounded-full" />}
                                        <AvatarFallback>{profileUser?.name?.charAt(0) || 'U'}</AvatarFallback>
                                    </Avatar>
                                </div>
                                <div className="flex-1 flex justify-around">
                                    <div className="text-center">
                                        <p className="font-bold text-lg md:text-xl">{postCount}</p>
                                        <p className="text-sm text-muted-foreground">posts</p>
                                    </div>
                                    <button className="text-center" onClick={() => canViewContent && setSheetContent('supporters')}>
                                        <p className="font-bold text-lg md:text-xl">{supporterCount}</p>
                                        <p className="text-sm text-muted-foreground">supporters</p>
                                    </button>
                                     <button className="text-center" onClick={() => canViewContent && setSheetContent('supporting')}>
                                        <p className="font-bold text-lg md:text-xl">{supportingCount}</p>
                                        <p className="text-sm text-muted-foreground">supporting</p>
                                    </button>
                                </div>
                            </div>
                           <div className="mt-4 flex gap-2">
                                {isOwnProfile ? (
                                    <>
                                        <Button asChild variant="secondary" className="flex-1">
                                            <Link href="/profile/edit">Edit Profile</Link>
                                        </Button>
                                        <Button variant="secondary" className="flex-1" onClick={handleShareProfile}>Share profile</Button>
                                    </>
                                ) : (
                                    <>
                                        <Button 
                                            variant={supportStatus === 'approved' || supportStatus === 'pending' ? "secondary" : "default"} 
                                            className="flex-1"
                                            onClick={handleSupportToggle}
                                            disabled={isSupportLoading}
                                        >
                                            {isSupportLoading ? <Loader2 className="animate-spin"/> : (
                                                supportStatus === 'approved' ? 'Unsupport' :
                                                supportStatus === 'pending' ? 'Pending' : 'Support'
                                            )}
                                        </Button>
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="p-1 md:p-4">
                            {canViewContent ? (
                                isInitialPostsLoading && savedEmojis.length === 0 ? (
                                    <div className="flex justify-center items-center h-48"><Loader2 className="h-8 w-8 animate-spin" /></div>
                                ) : savedEmojis.length > 0 ? (
                                    <>
                                        <motion.div 
                                            layout
                                            className="grid grid-cols-3 md:grid-cols-4 gap-1 md:gap-4"
                                        >
                                            {savedEmojis.map(emoji => (
                                                <MemoizedThumbnail key={emoji.id} emoji={emoji} onSelect={() => setSelectedEmojiId(emoji.id)} />
                                            ))}
                                        </motion.div>
                                    </>
                                ) : (
                                    <div className="flex flex-col h-full items-center justify-center text-center p-8 gap-4 text-muted-foreground">
                                        <div className="border-2 border-foreground rounded-full p-4">
                                            <Grid3x3 className="h-12 w-12" />
                                        </div>
                                        <h2 className="text-2xl font-bold">No Posts Yet</h2>
                                        {isOwnProfile && <Link href="/design" className="text-primary font-semibold">Create your first post</Link>}
                                    </div>
                                )
                            ) : (
                                <div className="flex flex-col h-full items-center justify-center text-center p-8 gap-4 text-muted-foreground">
                                    <Lock className="h-12 w-12" />
                                    <h2 className="text-xl font-bold text-foreground">This Account is Private</h2>
                                    <p>Support this user to see their posts.</p>
                                </div>
                            )}
                        </div>
                        </>
                        )}
                    </div>
                </>
            )}
            </div>
            
            {sheetContent && (
                <Suspense fallback={null}>
                    <UserListSheet
                        open={!!sheetContent}
                        onOpenChange={(isOpen) => !isOpen && setSheetContent(null)}
                        type={sheetContent}
                        userId={viewingUserId}
                    />
                </Suspense>
            )}

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

export default function GalleryPage() {
    return (
        <Suspense fallback={<div className="flex h-full w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
            <GalleryPageContent />
        </Suspense>
    );
}
