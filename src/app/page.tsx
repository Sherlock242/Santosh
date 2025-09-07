
'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EdengramLogo } from '@/components/edengram-logo';
import Head from 'next/head';

// This component uses client-side hooks.
function LoginPageContent() {
  const router = useRouter();
  const { user, supabase, loading: authLoading, setLoading: setAuthLoading } = useAuth();
  const { toast } = useToast();
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleManualSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
            data: {
                name: name,
                picture: `https://placehold.co/64x64.png?text=${name.charAt(0).toUpperCase()}`
            }
        }
    });
    setAuthLoading(false);
    if (error) {
        toast({ title: 'Sign-up Error', description: error.message, variant: 'destructive'});
    } else {
        toast({ title: 'Check your email', description: 'A confirmation link has been sent to your email address.', variant: 'success'});
    }
  }

  const handleManualSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    try {
        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });
        if (error) {
            toast({ title: 'Sign-in Error', description: error.message, variant: 'destructive'});
        }
        // On success, the onAuthStateChange listener in useAuth will handle the redirect.
    } catch (error: any) {
         toast({ title: 'Sign-in Error', description: error.message, variant: 'destructive'});
    } finally {
        setAuthLoading(false);
    }
  }
  
  useEffect(() => {
    if (user) {
        router.push('/mood');
        return;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading, isClient]);


  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        delayChildren: 0.3,
        staggerChildren: 0.15,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: {
        type: 'spring',
        damping: 15,
        stiffness: 100,
      }
    },
  };

  return (
    <>
      <div className="flex flex-col items-center justify-center h-full text-center p-4 overflow-y-auto">
        <motion.div 
          className="flex flex-col items-center justify-center gap-6 w-full max-w-sm"
          initial="hidden"
          animate="visible"
          variants={containerVariants}
        >
          <motion.div variants={itemVariants} className="flex items-center justify-center gap-2">
            <EdengramLogo className="h-12 w-12" />
            <h1 className="text-4xl font-logo font-normal">
              Edengram
            </h1>
          </motion.div>

          <motion.div variants={itemVariants} className="w-full">
              <Tabs defaultValue="signin" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="signin">Sign In</TabsTrigger>
                      <TabsTrigger value="signup">Sign Up</TabsTrigger>
                  </TabsList>
                  <TabsContent value="signin">
                      <form onSubmit={handleManualSignIn} className="space-y-4 pt-4">
                          <div className="space-y-2 text-left">
                              <Label htmlFor="email-in">Email</Label>
                              <Input id="email-in" type="email" placeholder="m@example.com" required value={email} onChange={e => setEmail(e.target.value)} disabled={!isClient || authLoading} />
                          </div>
                           <div className="space-y-2 text-left">
                               <div className="flex justify-between items-baseline">
                                <Label htmlFor="password-in">Password</Label>
                                <Link href="/forgot-password" passHref className="text-sm text-primary hover:underline">Forgot?</Link>
                               </div>
                              <Input id="password-in" type="password" required value={password} onChange={e => setPassword(e.target.value)} disabled={!isClient || authLoading} />
                          </div>
                          <Button type="submit" className="w-full" disabled={!isClient || authLoading}>
                              {isClient && authLoading ? <Loader2 className="animate-spin" /> : 'Sign In'}
                          </Button>
                      </form>
                  </TabsContent>
                  <TabsContent value="signup">
                      <form onSubmit={handleManualSignUp} className="space-y-4 pt-4">
                          <div className="space-y-2 text-left">
                              <Label htmlFor="name-up">Name</Label>
                              <Input id="name-up" type="text" placeholder="Your Name" required value={name} onChange={e => setName(e.target.value)} disabled={!isClient || authLoading} />
                          </div>
                          <div className="space-y-2 text-left">
                              <Label htmlFor="email-up">Email</Label>
                              <Input id="email-up" type="email" placeholder="m@example.com" required value={email} onChange={e => setEmail(e.target.value)} disabled={!isClient || authLoading} />
                          </div>
                           <div className="space-y-2 text-left">
                              <Label htmlFor="password-up">Password</Label>
                              <Input id="password-up" type="password" required value={password} onChange={e => setPassword(e.target.value)} disabled={!isClient || authLoading} />
                          </div>
                          <Button type="submit" className="w-full" disabled={!isClient || authLoading}>
                              {isClient && authLoading ? <Loader2 className="animate-spin" /> : 'Sign Up'}
                          </Button>
                      </form>
                  </TabsContent>
              </Tabs>
          </motion.div>
          
        </motion.div>
          <footer className="absolute bottom-4 text-xs text-muted-foreground">
              <div className="flex gap-4 justify-center flex-wrap px-4">
                  <Link href="/about" className="hover:text-foreground">About Us</Link>
                  <Link href="/terms" className="hover:text-foreground">Terms</Link>
                  <Link href="/privacy" className="hover:text-foreground">Privacy</Link>
                  <Link href="/blogs" className="hover:text-foreground">Blogs</Link>
                  <Link href="/contact" className="hover:text-foreground">Contact</Link>
              </div>
          </footer>
      </div>
    </>
  );
}

// This is the exported page component.
// It wraps the client component in a Suspense boundary.
export default function LoginPage() {
    return (
        <Suspense fallback={<div className="flex h-full w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
            <LoginPageContent />
        </Suspense>
    )
}
