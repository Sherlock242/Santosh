'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { EmojiState } from '@/app/design/page';
import { Face } from '@/components/emoji-face';
import { ClockFace } from '@/components/loki-face';
import { RimuruFace } from '@/components/rimuru-face';
import { CreatorMoji } from '@/components/creator-moji';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MoreHorizontal, Heart, Send } from 'lucide-react';
import { motion, useMotionValue, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { LikeButton } from './like-button';
import { TimeRemaining } from './time-remaining';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { setMood, deletePost } from '@/app/actions';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from './ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';
import { Edit, Smile, Trash2 } from 'lucide-react';
import dynamic from 'next/dynamic';
import { GoldTick } from './gold-tick';

const LikerListSheet = dynamic(() => import('@/components/liker-list-sheet'), { ssr: false });

interface PostCardProps {
    post: PostViewEmoji;
    onSelect: () => void;
}

interface PostViewEmoji extends EmojiState {
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

const filters = [
    { name: 'None', css: 'none' },
    { name: 'Sepia', css: 'sepia(1)' },
    { name: 'Grayscale', css: 'grayscale(1)' },
    { name: 'Invert', css: 'invert(1)' },
    { name: 'Hue-Rotate', css: 'hue-rotate(90deg)' },
    { name: 'Contrast', css: 'contrast(1.5)' },
    { name: 'Saturate', css: 'saturate(2)' },
    { name: 'Vintage', css: 'sepia(0.5) saturate(1.5) contrast(0.9)' },
    { name: 'Cool', css: 'contrast(1.1) brightness(1.1) hue-rotate(-15deg)' },
    { name: 'Warm', css: 'sepia(0.3) saturate(1.2) brightness(1.1)' },
];

export const PostCard = ({ post, onSelect }: PostCardProps) => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [localLikeCount, setLocalLikeCount] = useState(post.like_count);
    const [isLikedState, setIsLikedState] = useState(post.is_liked);
    const [showHeartIcon, setShowHeartIcon] = useState(false);
    const [likersEmojiId, setLikersEmojiId] = useState<string | null>(null);
    const [emojiToSetMood, setEmojiToSetMood] = useState<string | null>(null);

    const likeButtonRef = useRef<{ triggerLike: () => void }>(null);

    const featureOffsetX = useMotionValue(post.feature_offset_x || 0);
    const featureOffsetY = useMotionValue(post.feature_offset_y || 0);
    const activeFilterCss = filters.find(f => f.name === post.selected_filter)?.css || 'none';

    useEffect(() => {
        setIsLikedState(post.is_liked);
        setLocalLikeCount(post.like_count);
    }, [post.is_liked, post.like_count]);
    
    const handleLikeAnimation = useCallback(() => {
        setShowHeartIcon(true);
    }, []);

    useEffect(() => {
        if (showHeartIcon) {
            const timer = setTimeout(() => setShowHeartIcon(false), 600);
            return () => clearTimeout(timer);
        }
    }, [showHeartIcon]);
    
    const handleSetMoodClick = () => {
        if (user) {
            setEmojiToSetMood(post.id);
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

    const renderEmojiFace = (emoji: EmojiState) => {
        const props = {
          ...emoji,
          color: emoji.emoji_color,
          isDragging: false,
          isInteractive: false,
          feature_offset_x: featureOffsetX,
          feature_offset_y: featureOffsetY,
          setColor: () => {},
          showPlatform: false, // Don't show platform in cards
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
        <div className="w-full flex-shrink-0 flex flex-col">
            <div className="flex items-center px-4 py-2">
                <Avatar className="h-8 w-8">
                    {post.user?.picture && <AvatarImage src={post.user.picture} alt={post.user.name || 'User'} data-ai-hint="profile picture" className="rounded-full" />}
                    <AvatarFallback>{post.user?.name ? post.user.name.charAt(0).toUpperCase() : 'U'}</AvatarFallback>
                </Avatar>
                <Link href={`/gallery?userId=${post.user?.id}`} className="ml-3 font-semibold text-sm flex items-center gap-1">
                  {post.user?.name || 'User'}
                  {post.user?.is_gold_member && <GoldTick />}
                </Link>
                {post.created_at && (
                    <TimeRemaining createdAt={post.created_at} className="text-xs text-muted-foreground ml-2" />
                )}
                 <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="ml-auto h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={handleSetMoodClick}>
                            <Smile className="mr-2 h-4 w-4" />
                            <span>Set as Mood</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
            
            <div 
                className="aspect-square flex items-center justify-center min-h-0 relative cursor-pointer"
                style={{ 
                    backgroundColor: post.background_color,
                    filter: activeFilterCss,
                }}
                onClick={onSelect}
                onDoubleClick={() => likeButtonRef.current?.triggerLike()}
            >
                {renderEmojiFace(post)}
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
                        postId={post.id} 
                        initialLikes={localLikeCount} 
                        isInitiallyLiked={isLikedState} 
                        onLikeCountChange={setLocalLikeCount}
                        onIsLikedChange={setIsLikedState}
                        onLikeAnimation={handleLikeAnimation}
                    />
                    <Send className="h-6 w-6 cursor-pointer" onClick={handleSetMoodClick} />
                </div>
                 {localLikeCount > 0 && (
                    <button className="text-sm font-semibold mt-2" onClick={() => setLikersEmojiId(post.id)}>
                        {localLikeCount} {localLikeCount === 1 ? 'like' : 'likes'}
                    </button>
                )}
                {post.caption && (
                    <p className="text-sm mt-1">
                        <span className="font-semibold">{post.user?.name || 'User'}</span>
                        {' '}{post.caption}
                    </p>
                )}
            </div>

             {likersEmojiId && (
                <LikerListSheet open={!!likersEmojiId} onOpenChange={(isOpen) => !isOpen && setLikersEmojiId(null)} emojiId={likersEmojiId} />
            )}

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
        </div>
    )
}
