
'use client';

import React, { useEffect, useRef, useState, useCallback, memo, lazy, Suspense } from 'react';
import type { EmojiState } from '@/app/design/page';
import { Face } from '@/components/emoji-face';
import { ClockFace } from '@/components/loki-face';
import { RimuruFace } from '@/components/rimuru-face';
import { CreatorMoji } from '@/components/creator-moji';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
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
import { ArrowLeft, MoreHorizontal, Edit, Trash2, Send, Smile, X, Eye, Loader2, Heart } from 'lucide-react';
import { motion, useMotionValue, AnimatePresence, useAnimation, animate } from 'framer-motion';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { setMood, removeMood, recordMoodView, getMoodViewers, likePost, unlikePost, deletePost } from '@/app/actions';
import { LikeButton } from './like-button';
import { TimeRemaining } from './time-remaining';
import Image from 'next/image';
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
  showNav?: boolean;
  fetchMore?: () => void;
  hasMore?: boolean;
}

const filters = [
    { name: 'None', style: {}, css: 'none' },
    { name: 'Sepia', style: { background: 'linear-gradient(to right, #704214, #EAE0C8)' }, css: 'sepia(1)' },
    { name: 'Grayscale', style: { background: 'linear-gradient(to right, #333, #ccc)' }, css: 'grayscale(1)' },
    { name: 'Invert', style: { background: 'linear-gradient(to right, #f00, #0ff)' }, css: 'invert(1)' },
    { name: 'Hue-Rotate', style: { background: 'linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)' }, css: 'hue-rotate(90deg)' },
    { name: 'Contrast', style: { background: 'linear-gradient(to right, #000, #fff)' }, css: 'contrast(1.5)' },
    { name: 'Saturate', style: { background: 'linear-gradient(to right, gray, red)' }, css: 'saturate(2)' },
    { name: 'Vintage', style: { background: 'linear-gradient(to right, #6d5a4c, #d5c8b8)' }, css: 'sepia(0.5) saturate(1.5) contrast(0.9)' },
    { name: 'Cool', style: { background: 'linear-gradient(to right, #3a7bd5, #00d2ff)' }, css: 'contrast(1.1) brightness(1.1) hue-rotate(-15deg)' },
    { name: 'Warm', style: { background: 'linear-gradient(to right, #f7b733, #fc4a1a)' }, css: 'sepia(0.3) saturate(1.2) brightness(1.1)' },
  ];

const MoodContent = memo(({ emoji }: { emoji: Mood }) => {
    const featureOffsetX = useMotionValue(emoji.feature_offset_x || 0);
    const featureOffsetY = useMotionValue(emoji.feature_offset_y || 0);
    const activeFilterCss = filters.find(f => f.name === emoji.selected_filter)?.css || 'none';

    const renderEmojiFace = (emoji: EmojiState) => {
        const props = {
          ...emoji,
          color: emoji.emoji_color,
          isDragging: false,
          isInteractive: false,
          feature_offset_x: featureOffsetX,
          feature_offset_y: featureOffsetY,
          setColor: () => {},
        };
        switch(emoji.model) {
            case 'creator': return <CreatorMoji {...props} />;
            case 'loki': return <ClockFace {...props} />;
            case 'rimuru': return <RimuruFace {...props} />;
            case 'emoji':
            default: return <Face {...props} />;
        }
    };
    
    return (
        <div className="w-full h-full flex flex-col bg-black">
             <div 
                className="flex-1 flex items-center justify-center min-h-0 relative"
                style={{ 
                    backgroundColor: emoji.background_color,
                    filter: activeFilterCss,
                }}
            >
                {renderEmojiFace(emoji)}
            </div>
            {emoji.caption && (
                <div className="absolute bottom-10 left-1/2 -translate-x-1/2 bg-black/50 text-white text-center p-2 rounded-lg z-20">
                    <p>{emoji.caption}</p>
                </div>
            )}
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
  const [viewers, setViewers] = useState<Viewer[]>([]);
  const [isViewersSheetOpen, setIsViewersSheetOpen] = useState(false);
  const [isFetchingViewers, setIsFetchingViewers] = useState(false);
  
  const { user } = useAuth();
  const { toast } = useToast();
  
  const progressWidth = useMotionValue('0%');
  const animationControlsRef = useRef<ReturnType<typeof animate> | null>(null);
  
  const currentEmojiState = localEmojis[currentIndex];

  useEffect(() => {
    setLocalEmojis(emojis);
  }, [emojis]);

  useEffect(() => {
    if (!currentEmojiState) {
        onClose(localEmojis);
    }
  }, [currentEmojiState, localEmojis, onClose]);

  const isCurrentEmojiMood = (emoji: PostViewEmoji | Mood): emoji is Mood => {
    return 'mood_id' in emoji;
  }
  
  const goToNext = useCallback(() => {
    if (currentIndex < localEmojis.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
        onClose(localEmojis);
    }
  }, [currentIndex, localEmojis, onClose]);

  const goToPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const startAnimation = useCallback(() => {
    progressWidth.set('0%');
    animationControlsRef.current = animate(progressWidth, '100%', {
        duration: 10,
        ease: 'linear',
        onComplete: () => {
            if (currentIndex < localEmojis.length - 1) {
                goToNext();
            } else {
                onClose(localEmojis);
            }
        }
    });
  }, [progressWidth, currentIndex, localEmojis.length, goToNext, onClose]);


  useEffect(() => {
    if (isMoodView && currentEmojiState && isCurrentEmojiMood(currentEmojiState)) {
        if (!currentEmojiState.is_viewed) {
             recordMoodView(currentEmojiState.mood_id);
             setLocalEmojis(prevEmojis => {
                 const updatedEmojis = [...prevEmojis];
                 const moodToUpdate = updatedEmojis[currentIndex] as Mood;
                 if (moodToUpdate) {
                     moodToUpdate.is_viewed = true;
                 }
                 return updatedEmojis;
             });
        }
        startAnimation();
    }
    return () => {
      animationControlsRef.current?.stop();
    }
  }, [currentIndex, isMoodView, currentEmojiState, startAnimation]);

  useEffect(() => {
    if (isMoodView) {
        if (isViewersSheetOpen) {
            animationControlsRef.current?.pause();
        } else {
            animationControlsRef.current?.play();
        }
    }
  }, [isViewersSheetOpen, isMoodView]);
  
  const handleShowViewers = async () => {
      if (!currentEmojiState || !isCurrentEmojiMood(currentEmojiState)) return;
      setIsFetchingViewers(true);
      setIsViewersSheetOpen(true);
      try {
          const fetchedViewers = await getMoodViewers(currentEmojiState.mood_id);
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
    if (!currentEmojiState || !isCurrentEmojiMood(currentEmojiState)) return;
    try {
        await removeMood();
        toast({ title: "Mood Removed", variant: 'success' });
        if (onMoodChange) onMoodChange();
        if (onDelete) {
            onDelete(currentEmojiState.mood_id.toString());
        }
        onClose(localEmojis);
    } catch (error: any) {
        toast({ title: "Error removing mood", description: error.message, variant: 'destructive' });
    }
  }

  if (!currentEmojiState) {
    return null;
  }
  
  const postAuthor = isCurrentEmojiMood(currentEmojiState) ? currentEmojiState.mood_user : (currentEmojiState as PostViewEmoji).user;
  
  if (isMoodView) {
      return (
        <motion.div 
            className="h-full w-full flex flex-col bg-black relative"
            onPanEnd={(_, info) => {
                if (info.offset.y > 100) onClose(localEmojis);
            }}
        >
            <div className="absolute top-0 left-0 right-0 p-3 z-20">
                <div className="flex items-center gap-2">
                    {localEmojis.map((_, index) => (
                        <div key={index} className="w-full bg-gray-500/50 rounded-full h-1">
                            <motion.div 
                                className="bg-white h-1 rounded-full"
                                style={{ width: index === currentIndex ? progressWidth : (index < currentIndex ? '100%' : '0%') }}
                            />
                        </div>
                    ))}
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
                    {isCurrentEmojiMood(currentEmojiState) && currentEmojiState.mood_created_at && (
                        <TimeRemaining createdAt={currentEmojiState.mood_created_at} className="text-sm text-white/70" />
                    )}
                    <div className="ml-auto flex items-center gap-2">
                        {user && currentEmojiState && isCurrentEmojiMood(currentEmojiState) && currentEmojiState.mood_user_id === user.id && (
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
                                    <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10" onClick={handleRemoveMood}>
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        <span>Remove Mood</span>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                        <button onClick={() => onClose(localEmojis)} className="text-white">
                            <X size={24} />
                        </button>
                    </div>
                </div>
            </div>

            <div className="absolute inset-0 z-10 flex">
                <div className="flex-1" onClick={goToPrev}></div>
                <div className="flex-1" onClick={goToNext}></div>
            </div>
            
             <MoodContent emoji={currentEmojiState as Mood} />


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
        </motion.div>
      )
  }

  // MODAL VIEW FOR GALLERY/EXPLORE
  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => onClose()}>
        <motion.div
            layoutId={`post-${currentEmojiState.id}`}
            className="w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
        >
            <PostCard 
                post={currentEmojiState as PostViewEmoji}
                onSelect={() => {}}
                onDelete={(id) => {
                    if (onDelete) onDelete(id);
                    onClose();
                }}
                onMoodChange={onMoodChange}
            />
        </motion.div>
    </div>
  );
}
