
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
import { ArrowLeft, MoreHorizontal, Edit, Trash2, Send, Smile, X, Eye, Loader2, Heart, Star } from 'lucide-react';
import { motion, useMotionValue, AnimatePresence, useAnimation, animate } from 'framer-motion';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { setMood, removeMood, recordMoodView, getMoodViewers, likePost, unlikePost } from '@/app/actions';
import { LikeButton } from './like-button';
import { TimeRemaining } from './time-remaining';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { UserListItem } from './user-list-item';

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

const PostContent = memo(({ 
    emoji, 
    onDelete,
    onSetMood
}: { 
    emoji: PostViewEmoji,
    onDelete?: (id: string) => void,
    onSetMood: (id: string) => void,
}) => {
    const [localLikeCount, setLocalLikeCount] = useState(emoji.like_count);
    const [isLikedState, setIsLikedState] = useState(emoji.is_liked);
    const [likersEmojiId, setLikersEmojiId] = useState<string | null>(null);
    const [showHeartIcon, setShowHeartIcon] = useState(false);
    
    const likeButtonRef = useRef<{ triggerLike: () => void }>(null);

    const featureOffsetX = useMotionValue(emoji.feature_offset_x || 0);
    const featureOffsetY = useMotionValue(emoji.feature_offset_y || 0);
    const activeFilterCss = filters.find(f => f.name === emoji.selected_filter)?.css || 'none';

    const handleLikeAnimation = useCallback(() => {
        setShowHeartIcon(true);
    }, []);

    useEffect(() => {
        if (showHeartIcon) {
            const timer = setTimeout(() => setShowHeartIcon(false), 600);
            return () => clearTimeout(timer);
        }
    }, [showHeartIcon]);

    const renderEmojiFace = (emoji: EmojiState) => {
        const props = {
          ...emoji,
          animation_type: emoji.animation_type,
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
    
    useEffect(() => {
        setIsLikedState(emoji.is_liked);
        setLocalLikeCount(emoji.like_count);
    }, [emoji.is_liked, emoji.like_count]);
    
    return (
        <div
            className="w-full flex-shrink-0 flex flex-col border-b border-border/40"
        >
            <div className="flex items-center px-4 py-2">
                <Avatar className="h-8 w-8">
                    {emoji.user?.picture && <AvatarImage src={emoji.user.picture} alt={emoji.user.name || 'User'} data-ai-hint="profile picture" className="rounded-full" />}
                    <AvatarFallback>{emoji.user?.name ? emoji.user.name.charAt(0).toUpperCase() : 'U'}</AvatarFallback>
                </Avatar>
                <Link href={`/gallery?userId=${emoji.user?.id}`} className="ml-3 font-semibold text-sm flex items-center gap-1">
                  {emoji.user?.name || 'User'}
                  {emoji.user?.is_gold_member && <Star className="h-4 w-4 text-yellow-400 fill-current" />}
                </Link>
                {emoji.created_at && (
                    <TimeRemaining createdAt={emoji.created_at} className="text-xs text-muted-foreground ml-2" />
                )}
                {onDelete && (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="ml-auto h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onSetMood(emoji.id)}>
                            <Smile className="mr-2 h-4 w-4" />
                            <span>Set as Mood</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                            <Link href={`/design?emojiId=${emoji.id}`} className="flex items-center w-full">
                                <Edit className="mr-2 h-4 w-4" />
                                <span>Edit</span>
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10" onClick={() => onDelete(emoji.id)}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            <span>Delete</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
                )}
            </div>

            <div 
                className="aspect-square flex items-center justify-center min-h-0 relative"
                style={{ 
                    backgroundColor: emoji.background_color,
                    filter: activeFilterCss,
                }}
                onDoubleClick={() => likeButtonRef.current?.triggerLike()}
            >
                {renderEmojiFace(emoji)}
                <AnimatePresence>
                    {showHeartIcon && (
                        <motion.div
                            className="absolute"
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 1.2, opacity: 0 }}
                            transition={{ type: "spring", stiffness: 400, damping: 20 }}
                        >
                            <Heart className="w-20 h-20 text-white/90" fill="currentColor" />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <div className="px-4 pt-3 pb-4">
                <div className="flex items-center gap-4">
                    <LikeButton 
                        ref={likeButtonRef}
                        postId={emoji.id} 
                        initialLikes={localLikeCount} 
                        isInitiallyLiked={isLikedState} 
                        onLikeCountChange={setLocalLikeCount}
                        onIsLikedChange={setIsLikedState}
                        onLikeAnimation={handleLikeAnimation}
                    />
                    <Send className="h-6 w-6 cursor-pointer" onClick={() => onSetMood(emoji.id)} />
                </div>
                {localLikeCount > 0 && (
                    <button className="text-sm font-semibold mt-2" onClick={() => setLikersEmojiId(emoji.id)}>
                        {localLikeCount} {localLikeCount === 1 ? 'like' : 'likes'}
                    </button>
                )}
                {emoji.caption && (
                    <p className="text-sm mt-1">
                        <span className="font-semibold">{emoji.user?.name || 'User'}</span>
                        {' '}{emoji.caption}
                    </p>
                )}
            </div>
             {likersEmojiId && (
                <Suspense fallback={null}>
                    <LikerListSheet open={!!likersEmojiId} onOpenChange={(isOpen) => !isOpen && setLikersEmojiId(null)} emojiId={likersEmojiId} />
                </Suspense>
            )}
        </div>
    );
});
PostContent.displayName = 'PostContent';


export function PostView({ 
    emojis,
    initialIndex = 0, 
    onClose, 
    onDelete, 
    onMoodChange,
    isMoodView = false,
    showNav = true,
    fetchMore,
    hasMore,
}: PostViewProps) {
  
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [localEmojis, setLocalEmojis] = useState(emojis);
  const [direction, setDirection] = useState(0);
  const [emojiToDelete, setEmojiToDelete] = React.useState<string | null>(null);
  const [emojiToSetMood, setEmojiToSetMood] = useState<string | null>(null);
  const [viewers, setViewers] = useState<Viewer[]>([]);
  const [isViewersSheetOpen, setIsViewersSheetOpen] = useState(false);
  const [isFetchingViewers, setIsFetchingViewers] = useState(false);
  
  const { user } = useAuth();
  const { toast } = useToast();
  
  const loaderRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const progressWidth = useMotionValue('0%');
  const animationControlsRef = useRef<ReturnType<typeof animate> | null>(null);
  
  const currentEmojiState = localEmojis[currentIndex];

  useEffect(() => {
    setLocalEmojis(emojis);
  }, [emojis]);

  // Scroll to initial post on mount
  useEffect(() => {
    if (containerRef.current && initialIndex > 0) {
      const element = containerRef.current.children[initialIndex] as HTMLElement;
      if(element) {
        element.scrollIntoView({ behavior: 'auto', block: 'start' });
      }
    }
  }, [initialIndex]);

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
      setDirection(1);
      setCurrentIndex((prev) => prev + 1);
    }
  }, [currentIndex, localEmojis.length]);

  const goToPrev = () => {
    if (currentIndex > 0) {
      setDirection(-1);
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const startAnimation = useCallback(() => {
    progressWidth.set('0%');
    animationControlsRef.current = animate(progressWidth, '100%', {
        duration: 10,
        ease: 'linear',
        onComplete: () => {
            const currentMood = localEmojis[currentIndex];
            const nextMood = localEmojis[currentIndex + 1];

            if (isCurrentEmojiMood(currentMood) && nextMood && isCurrentEmojiMood(nextMood) && nextMood.mood_user_id === currentMood.mood_user_id) {
                goToNext();
            }
        }
    });
  }, [progressWidth, currentIndex, localEmojis, goToNext]);


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

  useEffect(() => {
    if (!fetchMore || isMoodView) return;

    const observer = new IntersectionObserver(
        (entries) => {
            if (entries[0].isIntersecting && hasMore) {
                fetchMore();
            }
        },
        { threshold: 1.0 }
    );

    const currentLoader = loaderRef.current;
    if (currentLoader) {
        observer.observe(currentLoader);
    }

    return () => {
        if (currentLoader) {
            observer.unobserve(currentLoader);
        }
    };
  }, [fetchMore, hasMore, isMoodView]);


  const handleDeleteClick = (id: string) => {
    if (!onDelete) return;
    setEmojiToDelete(id);
  };
  
  const confirmDelete = () => {
    if (emojiToDelete && onDelete) {
      onDelete(emojiToDelete);
      setEmojiToDelete(null);
    }
  };

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
  
  const handleSetMoodClick = (id: string) => {
    if (user) {
        setEmojiToSetMood(id);
    }
  };

  const confirmSetMood = async () => {
    if (!emojiToSetMood) return;
    try {
        await setMood(emojiToSetMood);
        toast({
            title: "Mood Updated!",
            description: "Your new mood has been set.",
            variant: "success",
        });
        if (onMoodChange) onMoodChange();
    } catch (error: any) {
        toast({
            title: "Error setting mood",
            description: error.message,
            variant: "destructive",
        });
    } finally {
        setEmojiToSetMood(null);
    }
  };

  const featureOffsetX = useMotionValue(0);
  const featureOffsetY = useMotionValue(0);
  
  if (!currentEmojiState) {
    return null;
  }
  
  const postAuthor = isCurrentEmojiMood(currentEmojiState) ? currentEmojiState.mood_user : (currentEmojiState as PostViewEmoji).user;
  
  const defaultEmoji: EmojiState = {
    id: 'default',
    model: 'emoji',
    expression: 'neutral',
    background_color: '#000000',
    emoji_color: '#ffb300',
    show_sunglasses: false,
    show_mustache: false,
    selected_filter: null,
    animation_type: 'none',
    shape: 'default',
    eye_style: 'default',
    mouth_style: 'default',
    eyebrow_style: 'default',
    feature_offset_x: 0,
    feature_offset_y: 0,
  };

  const finalEmoji: EmojiState = { ...defaultEmoji, ...currentEmojiState };

  if (finalEmoji.model === 'loki' && finalEmoji.shape === 'blob') {
    finalEmoji.shape = 'default';
  }

  featureOffsetX.set(finalEmoji.feature_offset_x || 0);
  featureOffsetY.set(finalEmoji.feature_offset_y || 0);

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? '100%' : '-100%',
      opacity: 0,
    }),
    center: {
      x: '0%',
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction < 0 ? '100%' : '-100%',
      opacity: 0,
    }),
  };
  
  const activeFilterCss = filters.find(f => f.name === finalEmoji.selected_filter)?.css || 'none';

  const renderEmojiFace = (emoji: EmojiState) => {
    const props = {
      ...emoji,
      animation_type: emoji.animation_type,
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
                      {postAuthor?.is_gold_member && <Star className="h-4 w-4 text-yellow-400 fill-current" />}
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

            <AnimatePresence initial={false} custom={direction}>
                <motion.div
                    key={currentIndex}
                    custom={direction}
                    variants={variants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{
                        x: { type: "spring", stiffness: 300, damping: 30 },
                        opacity: { duration: 0.2 }
                    }}
                     className="w-full h-full flex items-center justify-center absolute"
                     style={{ 
                      backgroundColor: finalEmoji.background_color,
                      filter: activeFilterCss,
                    }}
                >
                  {renderEmojiFace(finalEmoji)}
                </motion.div>
            </AnimatePresence>

            {finalEmoji.caption && (
              <div className="absolute top-20 left-4 right-4 z-20 text-center">
                  <p className="inline-block bg-black/50 text-white text-sm p-2 rounded-lg">
                      {finalEmoji.caption}
                  </p>
              </div>
            )}

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

  // REGULAR POST VIEW
  return (
    <>
      <div className="h-full w-full flex flex-col bg-background">
          {showNav &&
            <header className="flex-shrink-0 flex h-16 items-center justify-between border-b border-border/40 bg-background px-4 z-10 md:hidden">
                <Button variant="ghost" size="icon" onClick={() => onClose(localEmojis)}>
                <ArrowLeft />
                </Button>
                <h2 className="font-semibold">{isMoodView ? "Mood" : "Posts"}</h2>
                <div className="w-10"></div>
            </header>
          }

          <div 
              className="flex-1 flex flex-col overflow-y-auto snap-y snap-mandatory no-scrollbar"
              ref={containerRef}
          >
              {localEmojis.map((emoji) => {
                  if (isCurrentEmojiMood(emoji)) return null;
                  const isOwner = user?.id === emoji.user_id;
                  return (
                    <div key={emoji.id} className="h-full w-full snap-start flex-shrink-0">
                      <PostContent 
                          emoji={emoji as PostViewEmoji} 
                          onDelete={isOwner ? handleDeleteClick : undefined}
                          onSetMood={handleSetMoodClick}
                      />
                    </div>
                  )
              })}
              {hasMore && (
                  <div ref={loaderRef} className="flex justify-center items-center p-4">
                      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                  </div>
              )}
          </div>
      </div>
      <AlertDialog open={!!emojiToSetMood} onOpenChange={(isOpen) => !isOpen && setEmojiToSetMood(null)}>
          <AlertDialogContent>
              <AlertDialogHeader>
                  <AlertDialogTitle>Set as your Mood?</AlertDialogTitle>
                  <AlertDialogDescription>
                      This will replace your current mood. Are you sure you want to set this post as your mood?
                  </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setEmojiToSetMood(null)}>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={confirmSetMood}>
                      Yes, Set Mood
                  </AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={!!emojiToDelete} onOpenChange={(isOpen) => !isOpen && setEmojiToDelete(null)}>
          <AlertDialogContent>
              <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                      Do you want to delete this post? This action cannot be undone.
                  </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setEmojiToDelete(null)}>No</AlertDialogCancel>
                  <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Yes, delete it</AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
