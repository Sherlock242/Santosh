
'use client';

import React, { useState, useEffect, useTransition, useRef } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Plus, Search, Trash2, Link as LinkIcon, Share2, Palette, Eye, ChevronLeft, ChevronRight, MessageSquarePlus, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { addLink, getLinks, deleteLink, createLinkRequest, getLinkRequests, addLinkResponse, deleteLinkRequest, deleteLinkResponse } from '../actions/link.actions';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AnimatePresence, motion } from 'framer-motion';

// --- Types ---
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

interface LinkResponse {
    id: string;
    urls: string[];
    created_at: string;
    user: UserProfile;
}

interface LinkRequest {
    id: string;
    request_text: string;
    created_at: string;
    user: UserProfile;
    responses: LinkResponse[];
}

const LINKS_PER_PAGE = 10;
const REQUESTS_PER_PAGE = 10;

// --- Hooks ---
function useDebounce(value: string, delay: number) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

// --- Sub-components ---
const LinkPost = ({ link, user, handleDeleteLink, handleLinkClick }: { link: LinkEntry, user: any, handleDeleteLink: (id: string) => void, handleLinkClick: (link: LinkEntry) => void }) => (
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
                                <AlertDialogDescription>This will permanently delete the link titled &quot;{link.title}&quot;.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteLink(link.id)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                )}
            </div>
        </div>
        <button onClick={() => handleLinkClick(link)} className="overflow-hidden text-left w-full group">
            <p className="font-semibold truncate">{link.title}</p>
            <p className="text-sm truncate" style={{ color: link.color }}>{link.url}</p>
        </button>
    </div>
);

const ResponseForm = ({ requestId, onResponseAdded }: { requestId: string, onResponseAdded: () => void }) => {
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();
    const [urls, setUrls] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const urlList = urls.split('\n').map(u => u.trim()).filter(u => u);
        if (urlList.length === 0 || urlList.length > 5) {
            toast({ title: 'You must add between 1 and 5 links.', variant: 'destructive'});
            return;
        }
        startTransition(async () => {
            try {
                await addLinkResponse({ requestId, urls: urlList });
                setUrls('');
                toast({ title: 'Response added!', variant: 'success' });
                onResponseAdded();
            } catch (error: any) {
                toast({ title: 'Error adding response', description: error.message, variant: 'destructive' });
            }
        });
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-2 mt-2">
            <Textarea 
                placeholder="Add up to 5 links, each on a new line."
                value={urls}
                onChange={e => setUrls(e.target.value)}
                disabled={isPending}
                rows={3}
            />
            <Button type="submit" size="sm" className="w-full" disabled={isPending}>
                {isPending ? <Loader2 className="animate-spin" /> : 'Submit Response'}
            </Button>
        </form>
    )
}

const RequestPost = ({ request, user, refreshRequests, handleLinkClick }: { request: LinkRequest, user: any, refreshRequests: () => void, handleLinkClick: (url: string) => void }) => {
    const [showResponseForm, setShowResponseForm] = useState(false);
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();

    const handleDeleteRequest = async () => {
        startTransition(async () => {
            try {
                await deleteLinkRequest(request.id);
                toast({ title: 'Request deleted', variant: 'success' });
                refreshRequests();
            } catch (error: any) {
                toast({ title: 'Error deleting request', description: error.message, variant: 'destructive' });
            }
        });
    }
    
    const handleDeleteResponse = async (responseId: string) => {
        startTransition(async () => {
            try {
                await deleteLinkResponse(responseId);
                toast({ title: 'Response deleted', variant: 'success' });
                refreshRequests();
            } catch (error: any) {
                toast({ title: 'Error deleting response', description: error.message, variant: 'destructive' });
            }
        });
    }

    return (
        <div className="rounded-lg border bg-card p-3 space-y-3">
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                    <Link href={`/gallery?userId=${request.user.id}`}>
                        <Avatar className="h-8 w-8"><AvatarImage src={request.user.picture} alt={request.user.name} /><AvatarFallback>{request.user.name?.charAt(0).toUpperCase()}</AvatarFallback></Avatar>
                    </Link>
                    <div>
                        <p className="text-sm font-semibold">{request.user.name}</p>
                        <p className="text-sm">{request.request_text}</p>
                    </div>
                </div>
                {user?.id === request.user.id ? (
                     <AlertDialog>
                        <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
                        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete Request?</AlertDialogTitle><AlertDialogDescription>This will delete your request and all its responses.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDeleteRequest} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
                    </AlertDialog>
                ) : (
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowResponseForm(!showResponseForm)}><MessageSquarePlus className="h-4 w-4" /></Button>
                )}
            </div>
            
            <AnimatePresence>
                {showResponseForm && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                        <ResponseForm requestId={request.id} onResponseAdded={() => { setShowResponseForm(false); refreshRequests(); }} />
                    </motion.div>
                )}
            </AnimatePresence>
            
            {request.responses.length > 0 && (
                <div className="space-y-3 pt-2 border-t border-border/50">
                    {request.responses.map(response => (
                        <div key={response.id} className="pl-4 border-l-2 border-primary/20 space-y-2">
                             <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2">
                                    <Link href={`/gallery?userId=${response.user.id}`}><Avatar className="h-6 w-6"><AvatarImage src={response.user.picture} alt={response.user.name} /><AvatarFallback>{response.user.name?.charAt(0).toUpperCase()}</AvatarFallback></Avatar></Link>
                                    <p className="text-xs font-semibold">{response.user.name}</p>
                                </div>
                                {user?.id === response.user.id && (
                                     <AlertDialog>
                                        <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-6 w-6 text-destructive"><Trash2 className="h-3 w-3" /></Button></AlertDialogTrigger>
                                        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete Response?</AlertDialogTitle></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteResponse(response.id)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
                                    </AlertDialog>
                                )}
                            </div>
                            <div className="space-y-1">
                                {response.urls.map((url, i) => (
                                    <button key={i} onClick={() => handleLinkClick(url)} className="text-sm text-primary block truncate hover:underline text-left">{url}</button>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// --- Main Page Component ---
export default function LinksPage() {
    const { user } = useAuth();
    const { toast } = useToast();
    
    // States for Links
    const [links, setLinks] = useState<LinkEntry[]>([]);
    const [isLinksLoading, setIsLinksLoading] = useState(true);
    const [linksPage, setLinksPage] = useState(1);
    const [hasMoreLinks, setHasMoreLinks] = useState(true);

    // States for Requests
    const [requests, setRequests] = useState<LinkRequest[]>([]);
    const [isRequestsLoading, setIsRequestsLoading] = useState(true);
    const [requestsPage, setRequestsPage] = useState(1);
    const [hasMoreRequests, setHasMoreRequests] = useState(true);
    
    // Common States
    const [activeTab, setActiveTab] = useState('links');
    const [searchQuery, setSearchQuery] = useState('');
    const debouncedSearchQuery = useDebounce(searchQuery, 300);
    const [isPending, startTransition] = useTransition();

    // States for Add Link Form
    const [titlePrefix, setTitlePrefix] = useState('');
    const [urls, setUrls] = useState('');
    const [color, setColor] = useState('#8A2BE2');
    const colorInputRef = useRef<HTMLInputElement>(null);

    // State for Link Request Form
    const [requestText, setRequestText] = useState('');

    const fetchLinks = async (query: string, pageNum: number) => {
        setIsLinksLoading(true);
        try {
            const userLinks = await getLinks({ query, page: pageNum, limit: LINKS_PER_PAGE });
            setLinks(pageNum === 1 ? userLinks as LinkEntry[] : [...links, ...userLinks as LinkEntry[]]);
            setHasMoreLinks(userLinks.length === LINKS_PER_PAGE);
        } catch (error: any) {
            toast({ title: 'Error fetching links', description: error.message, variant: 'destructive' });
        } finally {
            setIsLinksLoading(false);
        }
    };

    const fetchRequests = async (query: string, pageNum: number) => {
        setIsRequestsLoading(true);
        try {
            const linkRequests = await getLinkRequests({ query, page: pageNum, limit: REQUESTS_PER_PAGE });
            setRequests(pageNum === 1 ? linkRequests as LinkRequest[] : [...requests, ...linkRequests as LinkRequest[]]);
            setHasMoreRequests(linkRequests.length === REQUESTS_PER_PAGE);
        } catch (error: any) {
            toast({ title: 'Error fetching requests', description: error.message, variant: 'destructive' });
        } finally {
            setIsRequestsLoading(false);
        }
    }
    
    useEffect(() => {
        if (activeTab === 'links') {
            setLinksPage(1);
            fetchLinks(debouncedSearchQuery, 1);
        } else {
            setRequestsPage(1);
            fetchRequests(debouncedSearchQuery, 1);
        }
    }, [debouncedSearchQuery, activeTab]);

    const handleAddLink = (e: React.FormEvent) => {
        e.preventDefault();
        const urlList = urls.split('\n').map(u => u.trim()).filter(u => u);
        if (urlList.length === 0) return toast({ title: 'Please enter at least one URL', variant: 'destructive' });
        startTransition(async () => {
            try {
                await addLink({ titlePrefix, urls: urlList, color });
                setTitlePrefix(''); setUrls('');
                toast({ title: 'Links added successfully!', variant: 'success' });
                setLinksPage(1); fetchLinks(debouncedSearchQuery, 1);
            } catch (error: any) {
                toast({ title: 'Error adding links', description: error.message, variant: 'destructive' });
            }
        });
    };

    const handleCreateRequest = (e: React.FormEvent) => {
        e.preventDefault();
        if (!requestText.trim()) return;
        startTransition(async () => {
            try {
                await createLinkRequest(requestText);
                setRequestText('');
                toast({ title: 'Request posted!', variant: 'success' });
                setRequestsPage(1); fetchRequests(debouncedSearchQuery, 1);
            } catch (error: any) {
                toast({ title: 'Error posting request', description: error.message, variant: 'destructive' });
            }
        });
    }
    
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

    const handleLinkClick = (url: string) => {
        // For link clicks, we only need the url, not the whole entry
         fetch('/api/links/increment', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ url: url }), // This needs adjustment if tracking by URL
          keepalive: true,
      }).catch(err => console.error("Failed to increment link click:", err));
      window.open(url, '_blank', 'noopener,noreferrer');
    };

    return (
        <div className="flex h-full w-full flex-col">
            <header className="flex h-16 items-center justify-between border-b border-border/40 bg-background px-4 md:px-6">
                <div className="flex items-center gap-3"><LinkIcon className="h-6 w-6" /><h1 className="text-xl font-bold">Public Links</h1></div>
            </header>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
                <div className="p-4 md:p-6 space-y-4">
                     <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="links">Add Link</TabsTrigger>
                        <TabsTrigger value="requests">Request Link</TabsTrigger>
                    </TabsList>
                    <TabsContent value="links" className="m-0">
                         {user && (
                            <form onSubmit={handleAddLink} className="space-y-4">
                                <Input id="title-prefix" placeholder="Title (e.g., Wednesday S01E)" value={titlePrefix} onChange={(e) => setTitlePrefix(e.target.value)} disabled={isPending} maxLength={30} />
                                <div className="relative">
                                <Textarea id="urls" placeholder="https://example.com/episode-1" value={urls} onChange={(e) => setUrls(e.target.value)} disabled={isPending} required className="pr-10" rows={4} />
                                    <button type="button" className="absolute bottom-2 right-2 p-1 text-muted-foreground hover:text-foreground" onClick={() => colorInputRef.current?.click()}><Palette className="h-5 w-5" style={{ color: color }} /><span className="sr-only">Choose color</span></button>
                                    <input ref={colorInputRef} type="color" value={color} onChange={(e) => setColor(e.target.value)} className="absolute -z-10 w-0 h-0 opacity-0" />
                                </div>
                                <Button type="submit" className="w-full" disabled={isPending}>{isPending ? <Loader2 className="animate-spin" /> : <><Plus className="mr-2 h-4 w-4" /> Add Links</>}</Button>
                            </form>
                         )}
                    </TabsContent>
                    <TabsContent value="requests" className="m-0">
                        {user && (
                            <form onSubmit={handleCreateRequest} className="flex items-center gap-2">
                                <Input placeholder="Request something... (max 40 chars)" value={requestText} onChange={(e) => setRequestText(e.target.value)} maxLength={40} disabled={isPending} required />
                                <Button type="submit" size="icon" disabled={isPending}>{isPending ? <Loader2 className="animate-spin"/> : <Send />}</Button>
                            </form>
                        )}
                    </TabsContent>
                </div>

                <div className="px-4 md:px-6"><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" /><Input placeholder="Search..." className="pl-10 h-11" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} /></div></div>

                <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-3">
                    <TabsContent value="links" className="m-0 space-y-3">
                        {isLinksLoading && links.length === 0 ? <div className="flex justify-center p-10"><Loader2 className="h-8 w-8 animate-spin" /></div> : links.length > 0 ? (
                            links.map(link => <LinkPost key={link.id} link={link} user={user} handleDeleteLink={handleDeleteLink} handleLinkClick={(l) => handleLinkClick(l.url)} />)
                        ) : <div className="text-center py-10 text-muted-foreground"><LinkIcon className="mx-auto h-12 w-12" /><p className="mt-4 font-semibold">No links found</p>{searchQuery ? <p className="text-sm">Try a different search term.</p> : <p className="text-sm">Be the first to add a link!</p>}</div>}
                        {!isLinksLoading && hasMoreLinks && <Button variant="outline" className="w-full" onClick={() => fetchLinks(debouncedSearchQuery, linksPage + 1)}>Load More</Button>}
                    </TabsContent>
                    <TabsContent value="requests" className="m-0 space-y-3">
                        {isRequestsLoading && requests.length === 0 ? <div className="flex justify-center p-10"><Loader2 className="h-8 w-8 animate-spin" /></div> : requests.length > 0 ? (
                            requests.map(request => <RequestPost key={request.id} request={request} user={user} refreshRequests={() => fetchRequests(debouncedSearchQuery, 1)} handleLinkClick={(url) => handleLinkClick(url)} />)
                        ) : <div className="text-center py-10 text-muted-foreground"><MessageSquarePlus className="mx-auto h-12 w-12" /><p className="mt-4 font-semibold">No requests found</p>{searchQuery ? <p className="text-sm">Try a different search term.</p> : <p className="text-sm">Be the first to request a link!</p>}</div>}
                        {!isRequestsLoading && hasMoreRequests && <Button variant="outline" className="w-full" onClick={() => fetchRequests(debouncedSearchQuery, requestsPage + 1)}>Load More</Button>}
                    </TabsContent>
                </div>
            </Tabs>
        </div>
    );
}
