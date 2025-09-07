
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

        if (error) {
            console.error("Error fetching user profile:", error);
             const authUser = currentSession.user;
             const newUser = {
                id: authUser.id,
                email: authUser.email || '',
                name: authUser.user_metadata.name || authUser.email?.split('@')[0] || 'User',
                picture: authUser.user_metadata.picture || `https://placehold.co/64x64.png?text=${(authUser.user_metadata.name || authUser.email || 'U').charAt(0).toUpperCase()}`,
                is_private: false,
                is_gold_member: false,
            };
             setUser(newUser);
        } else if (profile) {
            const userProfile: UserProfile = {
                id: profile.id,
                name: profile.name,
                email: profile.email,
                picture: profile.picture,
                is_private: profile.is_private,
                is_gold_member: profile.is_gold_member,
                deleted_at: profile.deleted_at,
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
  
    const publicPaths = ['/', '/auth/callback', '/terms', '/about', '/privacy', '/blogs', '/contact', '/cancellation-policy', '/forgot-password', '/reset-password'];
    const isPublicPath = publicPaths.includes(pathname) || pathname.startsWith('/reset-password'); // Allow reset-password with params
    
    // If the user is logged in and on the main sign-in page, redirect to /mood
    if (user && pathname === '/') {
        router.push('/mood');
    } 
    // If the user is not logged in and not on a public path, redirect to the sign-in page
    else if (!user && !isPublicPath) {
        router.push('/');
    }
  }, [user, loading, pathname, router]);
  
  if (loading && !user && !['/', '/terms', '/about', '/privacy', '/blogs', '/contact', '/cancellation-policy', '/forgot-password', '/reset-password'].some(p => pathname.startsWith(p))) {
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
