
'use client';

import React, { useEffect, useRef, useState, useCallback, memo } from 'react';
import type { EmojiState } from '@/app/design/page';
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
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MoreHorizontal, ArrowLeft, X, Eye, Loader2 } from 'lucide-react';
import { motion, animate } from 'framer-motion';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { removeMood, recordMoodView, getMoodViewers } from '@/app/actions';
import { TimeRemaining } from './time-remaining';
import dynamic from 'next/dynamic';
import { UserListItem } from './user-list-item';
import { GoldTick } from './gold-tick';
import { PostCard } from './post-card';

const LikerListSheet = dynamic(() => import('@/components/liker-list-sheet'), { ssr: false });

export interface Mood extends EmojiState {
    mood_id: number;
    mood_user_id: string;
    is_viewed?: boolean;
    mood_created_at: string;
    mood_user?: {
      id: string;
      name: string;
      picture: string;
      has_mood: boolean;
      is_gold_member?: boolean;
    };
    like_count: number;
    is_liked: boolean;
    user: {
        id: string;
        name: string;
        picture: string;
        has_mood?: boolean;
        is_gold_member?: boolean;
    };
}

interface Viewer {
  id: string;
  name: string;
  picture: string;
  is_private: boolean;
  support_status: 'approved' | 'pending' | null;
  has_mood: boolean;
}

export interface PostViewEmoji extends EmojiState {
    like_count: number;
    is_liked: boolean;
    user: {
        id: string;
        name: string;
        picture: string;
        has_mood?: boolean;
        is_gold_member?: boolean;
    };
}

interface PostViewProps {
  emojis: (PostViewEmoji | Mood)[];
  initialIndex?: number;
  onClose: (emojis?: any[]) => void;
  onDelete?: (id: string) => void;
  onMoodChange?: () => void;
  isMoodView?: boolean;
}

const MoodContent = memo(({ emoji, onInteraction, onClose }: { emoji: Mood, onInteraction: (action: 'next' | 'prev') => void, onClose: () => void }) => {
    const { user } = useAuth();
    const { toast } = useToast();
    const progressWidth = useMotionValue('0%');
    const animationControlsRef = useRef<ReturnType<typeof animate> | null>(null);
    const [viewers, setViewers] = useState<Viewer[]>([]);
    const [isViewersSheetOpen, setIsViewersSheetOpen] = useState(false);
    const [isFetchingViewers, setIsFetchingViewers] = useState(false);
    const postAuthor = emoji.mood_user;

    const startAnimation = useCallback(() => {
        progressWidth.set('0%');
        animationControlsRef.current = animate(progressWidth, '100%', {
            duration: 10,
            ease: 'linear',
            onComplete: () => onInteraction('next'),
        });
    }, [progressWidth, onInteraction]);

    useEffect(() => {
        startAnimation();
        if (!emoji.is_viewed) {
             recordMoodView(emoji.mood_id);
        }
        return () => {
          animationControlsRef.current?.stop();
        }
    }, [emoji.mood_id, emoji.is_viewed, startAnimation]);

     useEffect(() => {
        if (isViewersSheetOpen) {
            animationControlsRef.current?.pause();
        } else {
            animationControlsRef.current?.play();
        }
    }, [isViewersSheetOpen]);
    
    const handleShowViewers = async () => {
      if (!emoji) return;
      setIsFetchingViewers(true);
      setIsViewersSheetOpen(true);
      try {
          const fetchedViewers = await getMoodViewers(emoji.mood_id);
          setViewers(fetchedViewers as Viewer[]);
      } catch (error) {
          console.error("Failed to fetch viewers", error);
          toast({ title: "Error", description: "Could not load viewers.", variant: "destructive" });
          setIsViewersSheetOpen(false);
      } finally {
          setIsFetchingViewers(false);
      }
    };

    const handleRemoveMood = async () => {
        // This function is now passed up to the parent `PostView` to handle state updates
    }
    
    return (
        <div className="w-full h-full flex flex-col bg-black relative">
             <div className="absolute top-0 left-0 right-0 p-3 z-20">
                 <div className="w-full bg-gray-500/50 rounded-full h-1">
                    <motion.div 
                        className="bg-white h-1 rounded-full"
                        style={{ width: progressWidth }}
                    />
                </div>
                 <div className="flex items-center mt-3 gap-2">
                    <Avatar className="h-8 w-8">
                        {postAuthor?.picture && <AvatarImage src={postAuthor.picture} alt={postAuthor.name || 'User'} data-ai-hint="profile picture" className="rounded-full" />}
                        <AvatarFallback>{postAuthor?.name ? postAuthor.name.charAt(0).toUpperCase() : 'U'}</AvatarFallback>
                    </Avatar>
                     <span className="font-semibold text-sm text-white flex items-center gap-1">
                      {postAuthor?.name}
                      {postAuthor?.is_gold_member && <GoldTick />}
                    </span>
                    <TimeRemaining createdAt={emoji.mood_created_at} className="text-sm text-white/70" />
                    <div className="ml-auto flex items-center gap-2">
                        {user && emoji.mood_user_id === user.id && (
                             <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <button className="text-white"><MoreHorizontal size={24} /></button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                    <DropdownMenuItem onClick={handleShowViewers}>
                                        <Eye className="mr-2 h-4 w-4" />
                                        <span>Viewers</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10" onClick={() => (onClose as any)('delete_current')}>
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        <span>Remove Mood</span>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                        <button onClick={onClose} className="text-white">
                            <X size={24} />
                        </button>
                    </div>
                </div>
            </div>

            <div className="absolute inset-0 z-10 flex">
                <div className="flex-1" onClick={() => onInteraction('prev')}></div>
                <div className="flex-1" onClick={() => onInteraction('next')}></div>
            </div>
            
            <PostCard post={emoji as PostViewEmoji} isCardView={false}/>

            <Sheet open={isViewersSheetOpen} onOpenChange={setIsViewersSheetOpen}>
              <SheetContent side="bottom" className="max-h-[80%] flex flex-col">
                <SheetHeader>
                  <SheetTitle>Viewers</SheetTitle>
                </SheetHeader>
                <div className="flex-1 overflow-y-auto no-scrollbar">
                  {isFetchingViewers ? (
                    <div className="flex justify-center items-center h-full">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : viewers.length > 0 ? (
                    <div className="flex flex-col gap-1 p-2">
                        {viewers.map((viewer) => (
                           <UserListItem 
                                key={viewer.id} 
                                itemUser={viewer} 
                                onSupportChange={(changedUserId, newStatus) => {
                                    setViewers(prev => prev.map(v => v.id === changedUserId ? {...v, support_status: newStatus} : v));
                                }}
                            />
                        ))}
                    </div>
                  ) : (
                    <div className="text-center text-muted-foreground py-10">
                      No viewers yet.
                    </div>
                  )}
                </div>
              </SheetContent>
            </Sheet>
        </div>
    );
});
MoodContent.displayName = 'MoodContent';


export function PostView({ 
    emojis,
    initialIndex = 0, 
    onClose, 
    onDelete, 
    onMoodChange,
    isMoodView = false,
}: PostViewProps) {
  
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [localEmojis, setLocalEmojis] = useState(emojis);
  const { toast } = useToast();
  
  useEffect(() => {
    setLocalEmojis(emojis);
  }, [emojis]);

  useEffect(() => {
    const post = localEmojis[currentIndex];
    if (post && !isMoodView) {
      const element = document.getElementById(`post-card-${post.id}`);
      if (element) {
        element.scrollIntoView({ behavior: 'auto', block: 'start' });
      }
    }
  }, [currentIndex, localEmojis, isMoodView]);

  const handleInteraction = useCallback((action: 'next' | 'prev') => {
    if (action === 'next') {
        if (currentIndex < localEmojis.length - 1) {
            setCurrentIndex(prev => prev + 1);
        } else {
            onClose(localEmojis);
        }
    } else { // prev
        if (currentIndex > 0) {
            setCurrentIndex(prev => prev - 1);
        }
    }
  }, [currentIndex, localEmojis, onClose]);
  
  const handleMoodDeletion = async (mood: Mood) => {
    try {
        await removeMood();
        toast({ title: "Mood Removed", variant: 'success' });
        if (onMoodChange) onMoodChange();
        if (onDelete) {
            onDelete(mood.mood_id.toString());
        }
        
        const newLocalEmojis = localEmojis.filter(e => 'mood_id' in e && e.mood_id !== mood.mood_id);
        if (newLocalEmojis.length === 0) {
            onClose(newLocalEmojis);
        } else {
            setLocalEmojis(newLocalEmojis);
            setCurrentIndex(0);
        }

    } catch (error: any) {
        toast({ title: "Error removing mood", description: error.message, variant: 'destructive' });
    }
  }


  if (isMoodView) {
    const currentMood = localEmojis[currentIndex] as Mood | undefined;
    if (!currentMood) {
      onClose(localEmojis);
      return null;
    }
    return (
        <motion.div className="fixed inset-0 h-full w-full bg-black z-50">
            <MoodContent 
                emoji={currentMood} 
                onInteraction={handleInteraction} 
                onClose={(action?: any) => {
                    if (action === 'delete_current') {
                        handleMoodDeletion(currentMood);
                    } else {
                        onClose(localEmojis);
                    }
                }}
            />
        </motion.div>
    );
  }

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col">
        <header className="flex h-16 items-center border-b px-4 flex-shrink-0">
             <Button variant="ghost" size="icon" className="mr-2" onClick={() => onClose()}>
                <ArrowLeft />
            </Button>
            <h1 className="text-lg font-semibold">Posts</h1>
        </header>
        <div className="flex-1 overflow-y-auto">
            {localEmojis.map((emoji) => (
                <div key={emoji.id} id={`post-card-${emoji.id}`}>
                    <PostCard 
                        post={emoji as PostViewEmoji}
                        onDelete={(id) => {
                           if (onDelete) onDelete(id);
                           const newEmojis = localEmojis.filter(e => e.id !== id);
                           if (newEmojis.length === 0) {
                               onClose();
                           } else {
                               setLocalEmojis(newEmojis);
                           }
                        }}
                        onMoodChange={onMoodChange}
                    />
                </div>
            ))}
        </div>
    </div>
  );
}
