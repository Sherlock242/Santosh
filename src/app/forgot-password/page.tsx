
'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { sendPasswordResetEmail } from '../actions/user.actions';
import { Loader2, Mail } from 'lucide-react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await sendPasswordResetEmail(email);
      setIsSubmitted(true);
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

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <div className="w-full max-w-md mx-auto">
         <div className="text-center mb-8">
            <h1 className="text-3xl font-logo font-bold">Edengram</h1>
         </div>
        <div className="bg-card p-8 rounded-lg shadow-lg text-center">
          {isSubmitted ? (
            <>
              <Mail className="mx-auto h-16 w-16 text-primary mb-4" />
              <h2 className="text-2xl font-bold mb-2">Check Your Email</h2>
              <p className="text-muted-foreground mb-6">
                If an account exists for <span className="font-semibold text-foreground">{email}</span>, a password reset link has been sent.
              </p>
              <Button asChild>
                <Link href="/">Back to Sign In</Link>
              </Button>
            </>
          ) : (
            <>
              <h2 className="text-2xl font-bold mb-2">Forgot Password?</h2>
              <p className="text-muted-foreground mb-6">
                No worries, we'll send you reset instructions.
              </p>
              <form onSubmit={handleSubmit} className="space-y-6 text-left">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading && <Loader2 className="animate-spin mr-2" />}
                  Send Reset Link
                </Button>
              </form>
              <p className="text-sm text-muted-foreground mt-6">
                <Link href="/" className="text-primary hover:underline">
                    &larr; Back to Sign In
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
