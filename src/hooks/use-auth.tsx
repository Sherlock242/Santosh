
'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect, useMemo, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import type { SupabaseClient, Session } from '@supabase/supabase-js';
import { useToast } from './use-toast';

interface UserProfile {
    id: string;
    name: string;
    email: string;
    picture: string;
    is_private: boolean;
    is_gold_member: boolean;
    deleted_at?: string | null;
    gold_member_expires_at?: string | null;
}

interface AuthContextType {
  user: UserProfile | null;
  session: Session | null;
  loading: boolean;
  setLoading: (loading: boolean) => void;
  supabase: SupabaseClient;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  
  const client = useMemo(() => supabase, []);

  const handleAuthChange = useCallback(async (currentSession: Session | null) => {
    setSession(currentSession);
    
    if (currentSession?.user) {
        const { data: profile, error } = await client
            .from('users')
            .select('*')
            .eq('id', currentSession.user.id)
            .single();

        if (error || !profile) {
            if (error && error.code !== 'PGRST116') {
              console.error("Error fetching user profile:", error);
            }
            setUser(null);
        } else {
            const hasFutureExpiration = profile.gold_member_expires_at ? new Date(profile.gold_member_expires_at) > new Date() : false;
            const isLegacyGold = profile.is_gold_member && !profile.gold_member_expires_at;
            const isGold = hasFutureExpiration || isLegacyGold;

            const userProfile: UserProfile = {
                id: profile.id,
                name: profile.name,
                email: profile.email,
                picture: profile.picture,
                is_private: profile.is_private,
                is_gold_member: isGold,
                deleted_at: profile.deleted_at,
                gold_member_expires_at: profile.gold_member_expires_at,
            };
            setUser(userProfile);
        }
    } else {
        setUser(null);
    }
  }, [client]);

  const refreshUser = useCallback(async () => {
    const { data: { session } } = await client.auth.getSession();
    await handleAuthChange(session);
  }, [client, handleAuthChange]);


  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    client.auth.getSession().then(({ data: { session } }) => {
        if (isMounted) {
            handleAuthChange(session).finally(() => setLoading(false));
        }
    });

    const { data: { subscription } } = client.auth.onAuthStateChange(
      (_event, newSession) => {
        if (isMounted) {
            handleAuthChange(newSession);
        }
      }
    );

    return () => {
        isMounted = false;
        subscription?.unsubscribe();
    };
  }, [client, handleAuthChange]);

  useEffect(() => {
    if (loading) return;
  
    const publicPaths = ['/', '/login', '/auth/callback', '/terms', '/about', '/privacy', '/blogs', '/contact', '/cancellation-policy', '/forgot-password', '/reset-password'];
    const isPublicPath = publicPaths.includes(pathname) || pathname.startsWith('/reset-password');
    
    if (user && pathname === '/login') {
        router.push('/mood');
    } 
    else if (!user && !isPublicPath) {
        router.push('/');
    }
  }, [user, loading, pathname, router]);
  
  const publicPaths = ['/', '/login', '/auth/callback', '/terms', '/about', '/privacy', '/blogs', '/contact', '/cancellation-policy', '/forgot-password', '/reset-password'];
  const isPublicPath = publicPaths.includes(pathname) || pathname.startsWith('/reset-password');

  if (loading && !isPublicPath) {
    return (
        <div className="flex items-center justify-center h-screen">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
    )
  }

  return (
    <AuthContext.Provider value={{ user, session, loading, setLoading, supabase: client, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
