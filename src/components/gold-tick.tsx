'use client';

import { cn } from '@/lib/utils';

export const GoldTick = ({ className }: { className?: string }) => {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('flex-shrink-0', className)}
    >
      <defs>
        <linearGradient id="gold-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FDE047" />
          <stop offset="50%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>
      </defs>
      <path
        d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"
        fill="url(#gold-gradient)"
        stroke="#FBBF24"
        strokeWidth="1"
      />
      <path
        d="M19.167 3.375C19.583 3.5 19.833 4.042 19.708 4.5C19.625 4.875 19.292 5.125 18.917 5.125C18.5 5.125 18.125 4.833 18.042 4.375C17.917 3.917 18.167 3.417 18.583 3.292C18.667 3.25 18.75 3.25 18.833 3.292C19 3.333 19.083 3.333 19.167 3.375ZM5.208 18.583C4.833 18.458 4.458 18.667 4.333 19.042C4.208 19.5 4.417 19.917 4.833 20.042C5.25 20.167 5.667 19.958 5.792 19.583C5.875 19.208 5.625 18.792 5.208 18.583Z"
        fill="#FBBF24"
      />
      <path
        d="M16.5 8.5L10.5 14.5L7.5 11.5"
        stroke="black"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};
