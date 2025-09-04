
'use client';

import React, { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/use-auth';
import { likePost, unlikePost, getLikeCount } from '@/app/actions';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabaseClient';
import { Heart } from 'lucide-react';

const AnimatedHeart = ({ delay, gradientId, colors }: { delay: number, gradientId: string, colors: [string, string] }) => (
    <motion.svg
      width="30"
      height="30"
      viewBox="0 0 24 24"
      initial={{ y: 0, x: 0, scale: 0, opacity: 1 }}
      animate={{
        y: -100,
        x: Math.random() * 80 - 40,
        scale: [0.5, 1, 1.2, 1],
        opacity: 0,
        rotate: Math.random() * 90 - 45,
      }}
      transition={{ duration: 1.2, ease: "easeOut", delay }}
      className="absolute"
      style={{ willChange: 'transform, opacity' }}
    >
        <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={colors[0]} />
                <stop offset="100%" stopColor={colors[1]} />
            </linearGradient>
        </defs>
      <path
        fill={`url(#${gradientId})`}
        stroke={`url(#${gradientId})`}
        strokeWidth="1"
        d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
      />
    </motion.svg>
);
  
interface LikeButtonProps {
  postId: string;
  initialLikes: number;
  isInitiallyLiked: boolean;
  onLikeCountChange: (newCount: number) => void;
  onIsLikedChange: (isLiked: boolean) => void;
  onLikeAnimation: () => void;
}

export const LikeButton = forwardRef<
  { triggerLike: () => void },
  LikeButtonProps
>(({
  postId,
  initialLikes,
  isInitiallyLiked,
  onLikeCountChange,
  onIsLikedChange,
  onLikeAnimation
}, ref) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showHearts, setShowHearts] = useState(false);

  useEffect(() => {
    if (showHearts) {
      const timer = setTimeout(() => setShowHearts(false), 1200);
      return () => clearTimeout(timer);
    }
  }, [showHearts]);

  useEffect(() => {
    const channel = supabase
      .channel(`realtime-likes:${postId}`)
      .on('postgres_changes', { 
            event: '*', 
            schema: 'public', 
            table: 'likes', 
            filter: `emoji_id=eq.${postId}` 
        }, 
        async () => {
            const newCount = await getLikeCount(postId);
            onLikeCountChange(newCount);
        }
      )
      .subscribe();

    return () => {
        supabase.removeChannel(channel);
    }
  }, [postId, onLikeCountChange]);

  const handleClick = async (e?: React.MouseEvent<SVGSVGElement, MouseEvent>) => {
    e?.stopPropagation();
    if (!user) {
      toast({
        title: "Login Required",
        description: "You need to be logged in to like posts.",
        variant: "destructive",
      });
      return;
    }

    const wasLiked = isInitiallyLiked;
    if (!wasLiked) {
        onLikeAnimation();
    }

    const newLikedState = !wasLiked;
    const newLikeCount = newLikedState ? initialLikes + 1 : Math.max(0, initialLikes - 1);

    onIsLikedChange(newLikedState);
    onLikeCountChange(newLikeCount);

    try {
      if (wasLiked) {
        await unlikePost(postId);
      } else {
        await likePost(postId);
      }
    } catch (error) {
      // Revert UI on error
      onIsLikedChange(wasLiked);
      onLikeCountChange(initialLikes);
      toast({
        title: "Something went wrong",
        description: "Could not update like status. Please try again.",
        variant: "destructive",
      });
      console.error(error);
    }
  };

  useImperativeHandle(ref, () => ({
      triggerLike: () => handleClick()
  }));

  return (
    <div className="relative flex items-center justify-center">
      <Heart
        className={cn(
          "h-6 w-6 cursor-pointer transition-colors duration-200 ease-in-out",
          isInitiallyLiked ? "text-red-500 fill-current" : "text-foreground"
        )}
        onClick={handleClick}
      />
    </div>
  );
});
LikeButton.displayName = 'LikeButton';
