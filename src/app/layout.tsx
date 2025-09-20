'use client';

import { usePathname } from 'next/navigation';
import './globals.css';
import '@/styles/nprogress.css';
import { BottomBar } from '@/components/bottom-bar';
import { Toaster } from "@/components/ui/toaster"
import { cn } from '@/lib/utils';
import { Inter, Kalam } from 'next/font/google'
import { AuthProvider } from '@/hooks/use-auth';
import React from 'react';
import { TopLoader } from '@/components/top-loader';
import { MainSidebar } from '@/components/main-sidebar';
import { AutoAds } from '@/components/AutoAds';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const kalam = Kalam({ subsets: ['latin'], weight: ['400', '700'], variable: '--font-kalam' })


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const publicPaths = ['/', '/login', '/auth/callback', '/terms', '/about', '/privacy', '/blogs', '/contact', '/cancellation-policy', '/forgot-password', '/reset-password'];
  const showNav = !publicPaths.includes(pathname);

  return (
    <html lang="en" className={cn("dark", inter.variable, kalam.variable)}>
      <head>
        <title>Edengram</title>
        <link rel="icon" href="/icon.png" />
        <meta name="description" content="Create and share interactive emojis." />
        <meta name="google-adsense-account" content="ca-pub-2882939249270622" />
      </head>
      <body className={cn("font-body antialiased bg-background")}>
        <AuthProvider>
          <React.Suspense fallback={<TopLoader />}>
            <TopLoader />
            <AutoAds />
            <div className="md:flex">
              {showNav && <MainSidebar />}
              <main className={cn(
                "relative h-screen w-full",
                showNav && "pb-14 md:pb-0"
              )}>
                {children}
              </main>
              {showNav && <BottomBar />}
            </div>
            <Toaster />
          </React.Suspense>
        </AuthProvider>
      </body>
    </html>
  );
}
