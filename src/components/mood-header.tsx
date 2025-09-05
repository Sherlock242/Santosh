
'use client';

import { useAuth } from '@/hooks/use-auth';
  

export function MoodHeader({ children }: { children?: React.ReactNode }) {
  const { user } = useAuth();

  return (
    <>
      <header className="flex h-16 items-center justify-between border-b border-border/40 bg-background px-4 md:px-6">
        <h1 className="text-2xl font-logo font-bold -mb-1">Edengram</h1>
        <div className="flex items-center gap-2">
          {children}
        </div>
      </header>
    </>
  );
}
