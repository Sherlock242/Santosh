
'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { resetUserPassword } from '@/app/actions';
import { Loader2 } from 'lucide-react';

function ResetPasswordPageContent() {
    const { session, loading } = useAuth();
    const router = useRouter();
    const { toast } = useToast();

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (!loading && !session) {
            toast({ title: 'Invalid Session', description: 'Your password reset link may have expired.', variant: 'destructive' });
            router.push('/forgot-password');
        }
    }, [session, loading, router, toast]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            toast({ title: 'Passwords do not match', variant: 'destructive' });
            return;
        }
        if (password.length < 6) {
            toast({ title: 'Password is too short', description: 'Password must be at least 6 characters.', variant: 'destructive' });
            return;
        }

        setIsLoading(true);
        try {
            await resetUserPassword(password);
            toast({
                title: 'Password Reset Successful',
                description: 'You can now sign in with your new password.',
                variant: 'success'
            });
            // The server action redirects on success
        } catch (error: any) {
            toast({
                title: 'Error',
                description: error.message,
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    };
    
    if (loading || !session) {
         return (
            <div className="flex h-full w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    return (
         <div className="flex items-center justify-center min-h-screen bg-background p-4">
            <div className="w-full max-w-md mx-auto">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-logo font-bold">Edengram</h1>
                </div>
                <div className="bg-card p-8 rounded-lg shadow-lg text-center">
                    <h2 className="text-2xl font-bold mb-2">Create a New Password</h2>
                    <p className="text-muted-foreground mb-6">
                        Please choose a new password for your account.
                    </p>
                    <form onSubmit={handleSubmit} className="space-y-6 text-left">
                        <div className="space-y-2">
                            <Label htmlFor="password">New Password</Label>
                            <Input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                disabled={isLoading}
                            />
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="confirm-password">Confirm New Password</Label>
                            <Input
                                id="confirm-password"
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                disabled={isLoading}
                            />
                        </div>
                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading && <Loader2 className="animate-spin mr-2" />}
                            Reset Password
                        </Button>
                    </form>
                </div>
            </div>
        </div>
    )
}


export default function ResetPasswordPage() {
    return (
        <Suspense fallback={<div className="flex h-full w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
            <ResetPasswordPageContent />
        </Suspense>
    )
}
