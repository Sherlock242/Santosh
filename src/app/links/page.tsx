'use client';

import React, { useState, useEffect, useTransition, useRef, useMemo, useCallback } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Plus, Search, Trash2, Link as LinkIcon, Palette, Eye, ChevronsUpDown, MessageSquarePlus, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { addLink, getLinks, deleteLink, deleteLinks, createLinkRequest, getLinkRequests, addLinkResponse, deleteLinkRequest, deleteLinkResponse } from '../actions';
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
import { AnimatePresence, motion } from 'framer-motion';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

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
    pack_id: string;
    pack_title: string;
}

interface LinkPack {
    id: string; 
    title: string;
    links: LinkEntry[];
    user: UserProfile | null;
    created_at: string;
    user_id: string;
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
    user_id: string;
    user: UserProfile; 
    responses: LinkResponse[];
}

const LINKS_PER_PAGE = 10;
const REQUESTS_PER_PAGE = 5;

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
const LinkPackPost = ({ pack, user, handleDeleteLink, handleDeletePack, handleLinkClick }: { pack: LinkPack, user: any, handleDeleteLink: (id: string) => void, handleDeletePack: (ids: string[]) => void, handleLinkClick: (link: LinkEntry) => void }) => {
    const isOwner = user && user.id === pack.user_id;
    return (
        <Collapsible defaultOpen={true} className="rounded-lg border bg-card p-3 space-y-2">
            <div className="flex items-center justify-between gap-3">
                 <div className="flex items-center gap-3 overflow-hidden">
                    {pack.user && (
                        <Link href={`/gallery?userId=${pack.user.id}`}>
                            <Avatar className="h-8 w-8">
                                <AvatarImage src={pack.user.picture} alt={pack.user.name} />
                                <AvatarFallback>{pack.user.name?.charAt(0).toUpperCase()}</AvatarFallback>
                            </Avatar>
                        </Link>
                    )}
                    <div className="overflow-hidden">
                        <p className="text-sm font-semibold truncate">{pack.user?.name || 'Anonymous'}</p>
                        <h3 className="font-semibold text-lg truncate">{pack.title}</h3>
                    </div>
                </div>
                 <div className="flex items-center gap-1">
                    {isOwner && (
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"><Trash2 className="h-4 w-4" /></Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Pack?</AlertDialogTitle>
                                    <AlertDialogDescription>This will delete the &quot;{pack.title}&quot; pack and all {pack.links.length} links inside it.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeletePack(pack.links.map(l => l.id))} className="bg-destructive hover:bg-destructive/90">Delete Pack</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    )}
                    <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                            <ChevronsUpDown className="h-4 w-4" />
                            <span className="sr-only">Toggle pack</span>
                        </Button>
                    </CollapsibleTrigger>
                </div>
            </div>

            <CollapsibleContent className="space-y-2">
                {pack.links.map(link => (
                     <div key={link.id} className="rounded-md border bg-background/50 p-2 space-y-1">
                        <div className="flex items-center justify-between">
                            <button onClick={() => handleLinkClick(link)} className="overflow-hidden text-left w-full group flex-1">
                                <p className="text-sm font-medium truncate">{link.title}</p>
                                <p className="text-xs truncate" style={{ color: link.color }}>{link.url}</p>
                            </button>
                            <div className="flex items-center gap-1 flex-shrink-0">
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <Eye className="h-3 w-3" />
                                    <span>{link.clicks || 0}</span>
                                </div>
                                {isOwner && (
                                     <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive">
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Delete Link?</AlertDialogTitle>
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
                    </div>
                ))}
            </CollapsibleContent>
        </Collapsible>
    )
}


const ResponseForm = ({ requestId, onResponseAdded }: { requestId: string; onResponseAdded: () => void }) => {
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

    const requestUser = request.user;

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

    if (!requestUser) {
        return null; // Don't render if user is missing
    }

    const hasUnreadResponse = user?.id === requestUser.id && request.responses.some(r => r.user.id !== user.id);

    return (
        <div className="rounded-lg border bg-card p-3 space-y-3">
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                    <Link href={`/gallery?userId=${requestUser.id}`}>
                        <Avatar className="h-8 w-8"><AvatarImage src={requestUser.picture} alt={requestUser.name} /><AvatarFallback>{requestUser.name?.charAt(0).toUpperCase()}</AvatarFallback></Avatar>
                    </Link>
                    <div className="flex items-center gap-2">
                        <div>
                            <p className="text-sm font-semibold">{requestUser.name}</p>
                            <p className="text-sm">{request.request_text}</p>
                        </div>
                         {hasUnreadResponse && <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0"></div>}
                    </div>
                </div>
                {user?.id === requestUser.id ? (
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
                    {request.responses.map(response => {
                        const responseUser = response.user;
                        if (!responseUser) return null;

                        return (
                            <div key={response.id} className="pl-4 border-l-2 border-primary/20 space-y-2">
                                <div className="flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-2">
                                        <Link href={`/gallery?userId=${responseUser.id}`}><Avatar className="h-6 w-6"><AvatarImage src={responseUser.picture} alt={responseUser.name} /><AvatarFallback>{responseUser.name?.charAt(0).toUpperCase()}</AvatarFallback></Avatar></Link>
                                        <p className="text-xs font-semibold">{responseUser.name}</p>
                                    </div>
                                    {(user?.id === responseUser.id || user?.id === requestUser.id) && (
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive">
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </AlertDialogTrigger>
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
                        );
                    })}
                </div>
            )}
        </div>
    );
};

type ActiveTab = 'all-links' | 'my-links' | 'all-requests' | 'my-requests';
interface LinkItem {
    id: number;
    subtitle: string;
    url: string;
}

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
    const [activeTab, setActiveTab] = useState<ActiveTab>('all-links');
    const [searchQuery, setSearchQuery] = useState('');
    const debouncedSearchQuery = useDebounce(searchQuery, 300);
    const [isPending, startTransition] = useTransition();
    const [showAddLinkForm, setShowAddLinkForm] = useState(false);
    const [showRequestForm, setShowRequestForm] = useState(false);

    // States for Add Link Form
    const [title, setTitle] = useState('');
    const [linkItems, setLinkItems] = useState<LinkItem[]>([{ id: 1, subtitle: '', url: '' }]);
    const [color, setColor] = useState('#8A2BE2');
    const colorInputRef = useRef<HTMLInputElement>(null);

    // State for Link Request Form
    const [requestText, setRequestText] = useState('');
    
    const isMyLinksTab = activeTab === 'my-links';
    const isMyRequestsTab = activeTab === 'my-requests';
    const isLinksView = activeTab === 'all-links' || activeTab === 'my-links';
    const isRequestsView = activeTab === 'all-requests' || activeTab === 'my-requests';


    const fetchLinks = useCallback(async (query: string, pageNum: number, forUserId?: string) => {
        setIsLinksLoading(true);
        try {
            const fetchedLinks = await getLinks({ query, page: pageNum, limit: LINKS_PER_PAGE, userId: forUserId });
            setLinks(pageNum === 1 ? fetchedLinks as LinkEntry[] : [...links, ...fetchedLinks as LinkEntry[]]);
            setHasMoreLinks(fetchedLinks.length === LINKS_PER_PAGE);
        } catch (error: any) {
            toast({ title: 'Error fetching links', description: error.message, variant: 'destructive' });
        } finally {
            setIsLinksLoading(false);
        }
    }, [links, toast]);

    const fetchRequests = useCallback(async (query: string, pageNum: number, forUserId?: string) => {
        setIsRequestsLoading(true);
        try {
            const linkRequests = await getLinkRequests({ query, page: pageNum, limit: REQUESTS_PER_PAGE, userId: forUserId });
            setRequests(pageNum === 1 ? linkRequests : [...requests, ...linkRequests]);
            setHasMoreRequests(linkRequests.length === REQUESTS_PER_PAGE);
        } catch (error: any) {
            toast({ title: 'Error fetching requests', description: error.message, variant: 'destructive' });
        } finally {
            setIsRequestsLoading(false);
        }
    }, [requests, toast]);
    
    useEffect(() => {
        if (isLinksView) {
            setLinksPage(1);
            fetchLinks(debouncedSearchQuery, 1, isMyLinksTab ? user?.id : undefined);
        } else {
            setRequestsPage(1);
            fetchRequests(debouncedSearchQuery, 1, isMyRequestsTab ? user?.id : undefined);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [debouncedSearchQuery, activeTab, user]);

    const handleAddLink = (e: React.FormEvent) => {
        e.preventDefault();
        const validLinks = linkItems.filter(item => item.subtitle.trim() && item.url.trim());
        if (validLinks.length === 0) return toast({ title: 'Please fill out at least one link completely.', variant: 'destructive' });
        if (!title.trim()) return toast({ title: 'Please provide a title for the link pack.', variant: 'destructive' });

        startTransition(async () => {
            try {
                await addLink({ title, links: validLinks, color });
                setTitle('');
                setLinkItems([{ id: 1, subtitle: '', url: '' }]);
                toast({ title: 'Links added successfully!', variant: 'success' });
                setShowAddLinkForm(false);
                refreshCurrentTab();
            } catch (error: any) {
                toast({ title: 'Error adding links', description: error.message, variant: 'destructive' });
            }
        });
    };
    
    const handleLinkItemChange = (id: number, field: 'subtitle' | 'url', value: string) => {
        setLinkItems(linkItems.map(item => item.id === id ? { ...item, [field]: value } : item));
    };

    const addLinkInput = () => {
        setLinkItems([...linkItems, { id: Date.now(), subtitle: '', url: '' }]);
    };

    const removeLinkInput = (id: number) => {
        if (linkItems.length > 1) {
            setLinkItems(linkItems.filter(item => item.id !== id));
        }
    };

    const handleCreateRequest = (e: React.FormEvent) => {
        e.preventDefault();
        if (!requestText.trim()) return;
        startTransition(async () => {
            try {
                await createLinkRequest(requestText);
                setRequestText('');
                toast({ title: 'Request posted!', variant: 'success' });
                setShowRequestForm(false);
                refreshCurrentTab();
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
    
    const handleDeletePack = (linkIds: string[]) => {
        startTransition(async () => {
             try {
                await deleteLinks(linkIds);
                toast({ title: 'Link pack deleted', variant: 'success' });
                setLinks(prev => prev.filter(link => !linkIds.includes(link.id)));
            } catch (error: any) {
                toast({ title: 'Error deleting pack', description: error.message, variant: 'destructive' });
            }
        });
    }

    const handleLinkClick = (link: LinkEntry) => {
        window.open(link.url, '_blank', 'noopener,noreferrer');
        // Optimistically update the UI
        setLinks(prevLinks => 
            prevLinks.map(l => 
                l.id === link.id ? { ...l, clicks: (l.clicks || 0) + 1 } : l
            )
        );

        // Use sendBeacon for reliable, non-blocking request to increment click count
        if (navigator.sendBeacon) {
            const blob = new Blob([JSON.stringify({ linkId: link.id })], { type: 'application/json' });
            navigator.sendBeacon('/api/links/increment', blob);
        } else {
            // Fallback for older browsers
            fetch('/api/links/increment', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ linkId: link.id }),
                keepalive: true,
            }).catch(err => console.error("Failed to increment link click:", err));
        }
    };
    
    const refreshCurrentTab = () => {
        if (isLinksView) {
            setLinksPage(1);
            fetchLinks(debouncedSearchQuery, 1, isMyLinksTab ? user?.id : undefined);
        } else {
            setRequestsPage(1);
            fetchRequests(debouncedSearchQuery, 1, isMyRequestsTab ? user?.id : undefined);
        }
    }

    // Group links into packs
    const linkPacks = useMemo(() => {
        const packs = new Map<string, LinkPack>();
        
        links.forEach(link => {
            const packId = link.pack_id || link.id; // Fallback for older links
            const packTitle = link.pack_title || link.title;

            if (packs.has(packId)) {
                packs.get(packId)!.links.push(link);
            } else {
                packs.set(packId, {
                    id: packId,
                    title: packTitle,
                    links: [link],
                    user: link.user,
                    created_at: link.created_at,
                    user_id: link.user_id,
                });
            }
        });

        // Sort links within each pack by creation date (oldest first)
        packs.forEach(pack => {
            pack.links.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        });
        
        return [...Array.from(packs.values())].sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    }, [links]);
    
    const renderLinks = () => {
        if (isLinksLoading && links.length === 0) {
             return <div className="flex justify-center p-10"><Loader2 className="h-8 w-8 animate-spin" /></div>
        }
        if (linkPacks.length === 0) {
            return <div className="text-center py-10 text-muted-foreground"><LinkIcon className="mx-auto h-12 w-12" /><p className="mt-4 font-semibold">No links found</p>{searchQuery ? <p className="text-sm">Try a different search term.</p> : <p className="text-sm">No links here yet. Be the first to add one!</p>}</div>
        }
        return (
            <>
                {linkPacks.map(item => (
                    <LinkPackPost key={item.id} pack={item} user={user} handleDeleteLink={handleDeleteLink} handleDeletePack={handleDeletePack} handleLinkClick={handleLinkClick} />
                ))}
                {!isLinksLoading && hasMoreLinks && <Button variant="outline" className="w-full" onClick={() => fetchLinks(debouncedSearchQuery, linksPage + 1, isMyLinksTab ? user?.id : undefined)}>Load More</Button>}
            </>
        )
    };

    const renderRequests = () => {
        if (isRequestsLoading && requests.length === 0) {
            return <div className="flex justify-center p-10"><Loader2 className="h-8 w-8 animate-spin" /></div>
        }
        if (requests.length === 0) {
            return <div className="text-center py-10 text-muted-foreground"><MessageSquarePlus className="mx-auto h-12 w-12" /><p className="mt-4 font-semibold">No requests found</p>{searchQuery ? <p className="text-sm">Try a different search term.</p> : <p className="text-sm">No one has requested a link yet. Be the first!</p>}</div>
        }
        return (
            <>
                {requests.map(request => <RequestPost key={request.id} request={request} user={user} refreshRequests={refreshCurrentTab} handleLinkClick={(url) => { window.open(url, '_blank', 'noopener,noreferrer'); }} />)}
                {!isRequestsLoading && hasMoreRequests && <Button variant="outline" className="w-full" onClick={() => fetchRequests(debouncedSearchQuery, requestsPage + 1, isMyRequestsTab ? user?.id : undefined)}>Load More</Button>}
            </>
        )
    }

    const renderHeader = () => (
         <header className="flex h-16 items-center justify-between border-b border-border/40 bg-background px-4 md:px-6">
            <div className="flex items-center gap-3">
                <LinkIcon className="h-6 w-6" />
                <h1 className="text-xl font-bold">Public Links</h1>
            </div>
            {user && (
                 <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm"><Plus className="h-4 w-4 mr-2" /> Add New</Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                        <DropdownMenuItem onSelect={() => {setShowRequestForm(false); setShowAddLinkForm(true);}}>Add Link</DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => {setShowAddLinkForm(false); setShowRequestForm(true);}}>Request a Link</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            )}
        </header>
    )


    return (
        <div className="flex h-full w-full flex-col">
            {renderHeader()}
            
            <div className="flex items-center border-b text-sm font-medium text-muted-foreground overflow-x-auto no-scrollbar">
                <button className={`flex-1 p-3 whitespace-nowrap ${activeTab === 'all-links' ? 'border-b-2 border-primary text-primary' : ''}`} onClick={() => setActiveTab('all-links')}>All Links</button>
                <button className={`flex-1 p-3 whitespace-nowrap ${activeTab === 'all-requests' ? 'border-b-2 border-primary text-primary' : ''}`} onClick={() => setActiveTab('all-requests')}>All Requests</button>
                {user && <button className={`flex-1 p-3 whitespace-nowrap ${activeTab === 'my-links' ? 'border-b-2 border-primary text-primary' : ''}`} onClick={() => setActiveTab('my-links')}>My Links</button>}
                {user && <button className={`flex-1 p-3 whitespace-nowrap ${activeTab === 'my-requests' ? 'border-b-2 border-primary text-primary' : ''}`} onClick={() => setActiveTab('my-requests')}>My Requests</button>}
            </div>

            <div className="p-4 md:p-6 border-b">
                 <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input placeholder="Search..." className="pl-10 h-11" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                 </div>
            </div>
            
            <AnimatePresence>
            {showAddLinkForm && (
                <motion.div 
                    className="p-4 md:p-6 border-b"
                    initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                >
                    <form onSubmit={handleAddLink} className="space-y-4">
                        <div className="flex items-center gap-2">
                             <Input id="title" placeholder="Pack Title (e.g., Wednesday Series)" value={title} onChange={(e) => setTitle(e.target.value)} disabled={isPending} maxLength={200} required />
                             <button type="button" className="p-2 text-muted-foreground hover:text-foreground" onClick={() => colorInputRef.current?.click()}>
                                <Palette className="h-5 w-5" style={{ color: color }} />
                                <span className="sr-only">Choose color</span>
                            </button>
                            <input ref={colorInputRef} type="color" value={color} onChange={(e) => setColor(e.target.value)} className="absolute -z-10 w-0 h-0 opacity-0" />
                        </div>
                       
                        <div className="space-y-3">
                            {linkItems.map((item, index) => (
                                <div key={item.id} className="flex items-center gap-2">
                                    <Input placeholder={`Subtitle ${index + 1}`} value={item.subtitle} onChange={(e) => handleLinkItemChange(item.id, 'subtitle', e.target.value)} disabled={isPending} required />
                                    <Input placeholder={`URL ${index + 1}`} value={item.url} onChange={(e) => handleLinkItemChange(item.id, 'url', e.target.value)} disabled={isPending} required type="url" />
                                    <Button type="button" variant="ghost" size="icon" onClick={() => removeLinkInput(item.id)} disabled={isPending || linkItems.length <= 1}>
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                        
                        <Button type="button" variant="outline" size="sm" onClick={addLinkInput} className="w-full">
                            <Plus className="h-4 w-4 mr-2" /> Add Another Link
                        </Button>
                        
                        <div className='flex gap-2'>
                            <Button type="submit" className="w-full" disabled={isPending}>{isPending ? <Loader2 className="animate-spin" /> : 'Add Links'}</Button>
                            <Button type="button" variant="secondary" onClick={() => setShowAddLinkForm(false)}>Cancel</Button>
                        </div>
                    </form>
                </motion.div>
            )}
            </AnimatePresence>
            
            <AnimatePresence>
            {showRequestForm && (
                 <motion.div
                    className="p-4 md:p-6 border-b"
                    initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                >
                    <form onSubmit={handleCreateRequest} className="space-y-4">
                         <Textarea
                            id="request-text"
                            placeholder="Request a link (max 200 characters)"
                            value={requestText}
                            onChange={(e) => setRequestText(e.target.value)}
                            disabled={isPending}
                            maxLength={200}
                            rows={3}
                            required
                        />
                        <div className='flex gap-2'>
                            <Button type="submit" className="w-full" disabled={isPending}>{isPending ? <Loader2 className="animate-spin" /> : 'Post Request'}</Button>
                            <Button type="button" variant="secondary" onClick={() => setShowRequestForm(false)}>Cancel</Button>
                        </div>
                    </form>
                </motion.div>
            )}
            </AnimatePresence>


            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-3 pb-20 md:pb-6">
                {isLinksView && renderLinks()}
                {isRequestsView && renderRequests()}
            </div>
        </div>
    );
}
