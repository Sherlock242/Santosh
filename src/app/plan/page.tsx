
'use client';

import React, { useTransition } from 'react';
import { Button } from "@/components/ui/button";
import { Check, Loader2 } from "lucide-react";
import { createRazorpaySubscription } from '@/app/actions/payment.actions';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import Script from 'next/script';

declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function PlanPage() {
  const { user, supabase, refreshUser } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleUpgradeClick = () => {
    if (!user) {
      toast({
        title: "Please sign in",
        description: "You must be signed in to upgrade your plan.",
        variant: "destructive"
      });
      router.push('/');
      return;
    }

    startTransition(async () => {
      try {
        const result = await createRazorpaySubscription();
        
        if (!result) {
            throw new Error("Could not create a subscription.");
        }

        const options = {
            key: result.key,
            subscription_id: result.subscriptionId,
            name: "Edengram Gold",
            description: "Monthly Subscription",
            image: "/icon.png",
            config: {
              display: {
                blocks: {
                  upi: {
                    name: "Pay with UPI",
                    instruments: [
                      { method: "upi" },
                    ],
                  },
                  wallets: {
                    name: "Pay with Wallets",
                    instruments: [
                      { method: "wallet" },
                    ],
                  },
                  netbanking: {
                    name: "Pay with Netbanking",
                    instruments: [
                      { method: "netbanking" },
                    ],
                  },
                  card: {
                    name: "Pay with Card",
                    instruments: [
                      { method: "card" },
                    ],
                  },
                },
                sequence: ["block.upi", "block.card", "block.netbanking", "block.wallets"],
                preferences: {
                  show_default_blocks: true,
                },
              },
            },
            handler: async function (response: any) {
                // --- Start of new logic ---
                // Update user to Gold Member immediately on the client-side
                if (supabase) {
                    const { error } = await supabase
                        .from('users')
                        .update({ is_gold_member: true })
                        .eq('id', user.id);

                    if (error) {
                       console.error("Failed to update user to gold member on client:", error);
                       // The webhook will still act as a fallback, but we can inform the user.
                       toast({
                           title: "Payment Successful!",
                           description: "Your status will be updated shortly.",
                           variant: "success",
                       });
                    } else {
                        toast({
                            title: "Payment Successful!",
                            description: "Welcome to Edengram Gold! Your profile is updated.",
                            variant: "success",
                        });
                    }
                }
                // --- End of new logic ---

                await refreshUser();
                router.push('/gallery?from_payment=true');
            },
            notes: {
                supabase_user_id: user.id,
            },
        };
        
        const rzp = new window.Razorpay(options);
        rzp.open();

      } catch (error: any) {
        toast({
          title: "Payment Error",
          description: error.message || "Something went wrong. Please try again.",
          variant: "destructive"
        });
      }
    });
  };

  return (
    <>
      <Script
        id="razorpay-checkout-js"
        src="https://checkout.razorpay.com/v1/checkout.js"
      />
      <div className="min-h-screen bg-background text-foreground">
        <header className="py-6 px-4 md:px-8 border-b border-border">
          <div className="container mx-auto">
            <h1 className="text-3xl font-logo font-bold">Edengram</h1>
          </div>
        </header>
        <main className="container mx-auto py-12 px-4 md:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-4xl font-bold tracking-tight text-amber-400">Upgrade to Gold</h2>
          </div>

          <div className="max-w-md mx-auto mt-16 bg-card p-8 rounded-lg shadow-lg border border-amber-400/50">
            <h3 className="text-3xl font-bold text-center">Gold Plan</h3>
            <p className="text-center text-muted-foreground mt-2 mb-8">Perfect for creators and supporters.</p>
            
            <ul className="space-y-4 text-left">
              <li className="flex items-center gap-4">
                <Check className="h-6 w-6 text-amber-400" />
                <span>Get the exclusive Gold Tick next to your name.</span>
              </li>
              <li className="flex items-center gap-4">
                <Check className="h-6 w-6 text-amber-400" />
                <span>Priority access to new features.</span>
              </li>
              <li className="flex items-center gap-4">
                <Check className="h-6 w-6 text-amber-400" />
                <span>Faster customer support.</span>
              </li>
              <li className="flex items-center gap-4">
                <Check className="h-6 w-6 text-amber-400" />
                <span>Directly support the development of Edengram.</span>
              </li>
            </ul>

            <div className="text-center mt-10">
                <p className="text-4xl font-bold">₹99 <span className="text-base font-normal text-muted-foreground">/ month</span></p>
            </div>

            {user?.is_gold_member ? (
              <Button size="lg" className="w-full mt-8 bg-gradient-to-r from-yellow-500 to-amber-500 text-white" disabled>
                You are a Gold Member
              </Button>
            ) : (
              <Button size="lg" className="w-full mt-8 bg-gradient-to-r from-yellow-500 to-amber-500 text-white hover:from-yellow-600 hover:to-amber-600" onClick={handleUpgradeClick} disabled={isPending}>
                {isPending ? <Loader2 className="animate-spin" /> : 'Upgrade to Gold'}
              </Button>
            )}
          </div>
        </main>
      </div>
    </>
  );
}
