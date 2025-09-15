
'use client';

import React, { useState, useEffect, useTransition, useMemo } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Plus, Search, Trash2, Link as LinkIcon, ExternalLink } from 'lucide-react';
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

interface Link {
    id: string;
    title: string;
    url: string;
    created_at: string;
}

// Debounce function
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
    
    const [links, setLinks] = useState<Link[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isPending, startTransition] = useTransition();

    const [title, setTitle] = useState('');
    const [url, setUrl] = useState('');

    const [searchQuery, setSearchQuery] = useState('');
    const debouncedSearchQuery = useDebounce(searchQuery, 300);

    const fetchLinks = async (query: string) => {
        if (!user) return;
        setIsLoading(true);
        try {
            const userLinks = await getLinks(query);
            setLinks(userLinks);
        } catch (error: any) {
            toast({ title: 'Error fetching links', description: error.message, variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    };
    
    useEffect(() => {
        fetchLinks(debouncedSearchQuery);
    }, [debouncedSearchQuery, user]);

    const handleAddLink = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title || !url) {
            toast({ title: 'Please fill both title and URL', variant: 'destructive' });
            return;
        }

        startTransition(async () => {
            try {
                await addLink({ title, url });
                setTitle('');
                setUrl('');
                toast({ title: 'Link added successfully!', variant: 'success' });
                fetchLinks(debouncedSearchQuery); // Refresh the list
            } catch (error: any) {
                toast({ title: 'Error adding link', description: error.message, variant: 'destructive' });
            }
        });
    };
    
    const handleDeleteLink = async (linkId: string) => {
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

    const filteredLinks = useMemo(() => {
        if (!debouncedSearchQuery) return links;
        return links.filter(link => 
            link.title.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
            link.url.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
        );
    }, [debouncedSearchQuery, links]);

    return (
        <div className="flex h-full w-full flex-col">
            <header className="flex h-16 items-center border-b border-border/40 bg-background px-4 md:px-6">
                <h1 className="text-xl font-bold">My Links</h1>
            </header>
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
                <form onSubmit={handleAddLink} className="space-y-4">
                    <Input 
                        placeholder="Link Title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        disabled={isPending}
                        required
                    />
                    <Input 
                        type="url"
                        placeholder="https://example.com"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        disabled={isPending}
                        required
                    />
                    <Button type="submit" className="w-full" disabled={isPending}>
                        {isPending ? <Loader2 className="animate-spin" /> : <><Plus className="mr-2 h-4 w-4" /> Add Link</>}
                    </Button>
                </form>

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
                        {filteredLinks.length > 0 ? (
                            filteredLinks.map(link => (
                                <div key={link.id} className="flex items-center gap-4 rounded-lg border bg-card p-3">
                                    <div className="flex-1 overflow-hidden">
                                        <p className="font-semibold truncate">{link.title}</p>
                                        <a 
                                            href={link.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-sm text-primary hover:underline truncate block"
                                        >
                                            {link.url}
                                        </a>
                                    </div>
                                    <a
                                      href={link.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="p-2 text-muted-foreground hover:text-foreground"
                                      aria-label="Open link in new tab"
                                    >
                                      <ExternalLink className="h-5 w-5" />
                                    </a>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                                                <Trash2 className="h-5 w-5" />
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
                                </div>
                            ))
                        ) : (
                           <div className="text-center py-10 text-muted-foreground">
                                <LinkIcon className="mx-auto h-12 w-12" />
                                <p className="mt-4 font-semibold">No links found</p>
                                <p className="text-sm">Add a new link to get started.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
