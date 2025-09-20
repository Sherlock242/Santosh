
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { resetUserPassword } from '@/app/actions';
import { Loader2, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';

export default function ChangePasswordPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const { toast } = useToast();

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    if (loading) {
        return (
            <div className="flex h-full w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    if (!user) {
        router.push('/');
        return null;
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            toast({ title: 'Passwords do not match', variant: 'destructive' });
            return;
        }
        if (password.length < 6) {
            toast({ title: 'Password too short', description: 'Password must be at least 6 characters.', variant: 'destructive' });
            return;
        }
        
        setIsSaving(true);
        try {
            await resetUserPassword(password);
            toast({
                title: 'Password Updated',
                description: 'Your password has been changed successfully.',
                variant: 'success'
            });
            // The server action redirects to /mood on success.
        } catch (error: any) {
            toast({
                title: 'Error',
                description: error.message,
                variant: 'destructive',
            });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="flex h-full w-full flex-col">
            <header className="flex h-16 flex-shrink-0 items-center border-b px-4">
                <Button variant="ghost" size="icon" className="mr-2" onClick={() => router.back()}>
                    <ArrowLeft />
                </Button>
                <h1 className="text-lg font-semibold">Change Password</h1>
            </header>
            <div className="flex-1 overflow-y-auto p-6">
                <form onSubmit={handleSubmit} className="max-w-md mx-auto space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="password">New Password</Label>
                        <Input 
                            id="password" 
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
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
                        />
                    </div>
                    
                    <Button type="submit" className="w-full" disabled={isSaving}>
                        {isSaving ? <Loader2 className="animate-spin" /> : 'Save Changes'}
                    </Button>
                </form>
            </div>
        </div>
    );
}
