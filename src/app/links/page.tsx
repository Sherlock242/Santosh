
'use client';

import React, { useState, useEffect, useTransition, useRef } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Plus, Search, Trash2, Link as LinkIcon, Share2, Palette, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { addLink, getLinks, deleteLink } from '../actions/link.actions';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Link from 'next/link';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface UserProfile {
    id: string;
    name: string;
    picture: string;
}

interface LinkEntry {
    id: string;
    title: string;
    url: string;
    created_at: string;
    user_id: string;
    user: UserProfile | null;
    color: string;
    clicks: number;
}

function useDebounce(value: string, delay: number) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}


export default function LinksPage() {
    const { user } = useAuth();
    const { toast } = useToast();
    
    const [links, setLinks] = useState<LinkEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isPending, startTransition] = useTransition();

    const [titlePrefix, setTitlePrefix] = useState('');
    const [urls, setUrls] = useState('');
    const [color, setColor] = useState('#8A2BE2');
    const colorInputRef = useRef<HTMLInputElement>(null);

    const [searchQuery, setSearchQuery] = useState('');
    const debouncedSearchQuery = useDebounce(searchQuery, 300);

    const fetchLinks = async (query: string) => {
        setIsLoading(true);
        try {
            const userLinks = await getLinks(query);
            setLinks(userLinks as LinkEntry[]);
        } catch (error: any) {
            toast({ title: 'Error fetching links', description: error.message, variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    };
    
    useEffect(() => {
        fetchLinks(debouncedSearchQuery);
    }, [debouncedSearchQuery, toast]);

    const handleAddLink = async (e: React.FormEvent) => {
        e.preventDefault();
        const urlList = urls.split('\n').map(u => u.trim()).filter(u => u);

        if (urlList.length === 0) {
            toast({ title: 'Please enter at least one URL', variant: 'destructive' });
            return;
        }

        startTransition(async () => {
            try {
                await addLink({ titlePrefix, urls: urlList, color });
                setTitlePrefix('');
                setUrls('');
                toast({ title: 'Links added successfully!', variant: 'success' });
                fetchLinks(debouncedSearchQuery); // Refresh the list
            } catch (error: any) {
                toast({ title: 'Error adding links', description: error.message, variant: 'destructive' });
            }
        });
    };
    
    const handleDeleteLink = (linkId: string) => {
        startTransition(async () => {
             try {
                await deleteLink(linkId);
                toast({ title: 'Link deleted', variant: 'success' });
                setLinks(prev => prev.filter(link => link.id !== linkId));
            } catch (error: any) {
                toast({ title: 'Error deleting link', description: error.message, variant: 'destructive' });
            }
        });
    }

    const handleLinkClick = async (link: LinkEntry) => {
      // Optimistically update UI
      setLinks(prevLinks => 
          prevLinks.map(l => 
              l.id === link.id ? { ...l, clicks: (l.clicks || 0) + 1 } : l
          )
      );

      // Fire-and-forget the API call. We won't block navigation.
      fetch('/api/links/increment', {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
          },
          body: JSON.stringify({ linkId: link.id }),
          keepalive: true,
      }).catch(err => {
        console.error("Failed to increment link click:", err);
      });
      
      window.open(link.url, '_blank', 'noopener,noreferrer');
    };

    const handleShare = (link: LinkEntry) => {
        const shareData = {
            title: link.title,
            text: `Check out this link: ${link.title}`,
            url: link.url,
        };

        if (navigator.share) {
            navigator.share(shareData).catch((error) => {
                if (error.name !== 'AbortError') {
                    console.error('Share failed:', error);
                }
            });
        } else {
            navigator.clipboard.writeText(link.url).then(() => {
                toast({ title: 'Link copied to clipboard!' });
            }).catch(err => {
                toast({ title: 'Failed to copy link', variant: 'destructive' });
            });
        }
    };


    return (
        <div className="flex h-full w-full flex-col">
            <header className="flex h-16 items-center justify-between border-b border-border/40 bg-background px-4 md:px-6">
                <div className="flex items-center gap-3">
                    <LinkIcon className="h-6 w-6" />
                    <h1 className="text-xl font-bold">Public Links</h1>
                </div>
            </header>
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
                {user && (
                    <form onSubmit={handleAddLink} className="space-y-4">
                        <div>
                            <Label htmlFor="title-prefix" className="text-xs text-muted-foreground">Title Prefix</Label>
                            <Input 
                                id="title-prefix"
                                placeholder="e.g., Wednesday S01E"
                                value={titlePrefix}
                                onChange={(e) => setTitlePrefix(e.target.value)}
                                disabled={isPending}
                                maxLength={30}
                            />
                        </div>
                         <div>
                            <Label htmlFor="urls" className="text-xs text-muted-foreground">Links</Label>
                            <div className="relative">
                               <Textarea 
                                    id="urls"
                                    placeholder="https://example.com/episode-1"
                                    value={urls}
                                    onChange={(e) => setUrls(e.target.value)}
                                    disabled={isPending}
                                    required
                                    className="pr-10"
                                    rows={4}
                                />
                                <button
                                    type="button"
                                    className="absolute bottom-2 right-2 p-1 text-muted-foreground hover:text-foreground"
                                    onClick={() => colorInputRef.current?.click()}
                                >
                                    <Palette className="h-5 w-5" style={{ color: color }}/>
                                    <span className="sr-only">Choose color</span>
                                </button>
                                <input
                                    ref={colorInputRef}
                                    type="color"
                                    value={color}
                                    onChange={(e) => setColor(e.target.value)}
                                    className="absolute -z-10 w-0 h-0 opacity-0"
                                />
                            </div>
                        </div>
                        <Button type="submit" className="w-full" disabled={isPending}>
                            {isPending ? <Loader2 className="animate-spin" /> : <><Plus className="mr-2 h-4 w-4" /> Add Links</>}
                        </Button>
                    </form>
                )}

                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                        placeholder="Search links..."
                        className="pl-10 h-11"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                {isLoading ? (
                    <div className="flex justify-center items-center py-10">
                        <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                ) : (
                    <div className="space-y-3">
                        {links.length > 0 ? (
                            links.map(link => (
                                <div key={link.id} className="rounded-lg border bg-card p-3 space-y-2">
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            {link.user && (
                                                <Link href={`/gallery?userId=${link.user.id}`}>
                                                    <Avatar className="h-8 w-8">
                                                        <AvatarImage src={link.user.picture} alt={link.user.name} />
                                                        <AvatarFallback>{link.user.name?.charAt(0).toUpperCase()}</AvatarFallback>
                                                    </Avatar>
                                                </Link>
                                            )}
                                            <p className="text-sm font-semibold truncate">{link.user?.name || 'Anonymous'}</p>
                                        </div>
                                        <div className="flex items-center gap-1">
                                             <div className="flex items-center gap-1.5 text-sm text-muted-foreground flex-shrink-0">
                                                <Eye className="h-4 w-4" />
                                                <span>{link.clicks || 0}</span>
                                            </div>
                                            {user && user.id === link.user_id && (
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                This will permanently delete the link titled &quot;{link.title}&quot;.
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                            <AlertDialogAction
                                                                onClick={() => handleDeleteLink(link.id)}
                                                                className="bg-destructive hover:bg-destructive/90"
                                                            >
                                                                Delete
                                                            </AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            )}
                                        </div>
                                    </div>
                                    
                                    <button
                                        onClick={() => handleLinkClick(link)}
                                        className="overflow-hidden text-left w-full group"
                                    >
                                        <p className="font-semibold truncate">{link.title}</p>
                                        <p
                                            className="text-sm truncate"
                                            style={{ color: link.color }}
                                        >
                                            {link.url}
                                        </p>
                                    </button>
                                </div>
                            ))
                        ) : (
                           <div className="text-center py-10 text-muted-foreground">
                                <LinkIcon className="mx-auto h-12 w-12" />
                                <p className="mt-4 font-semibold">No links found</p>
                                <p className="text-sm">Be the first to add a link!</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
