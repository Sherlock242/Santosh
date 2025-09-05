
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, ArrowLeft, Camera, Lock, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { updateUserProfile, removeUserProfilePicture } from '@/app/actions';
import { Separator } from '@/components/ui/separator';
import imageCompression from 'browser-image-compression';
import Image from 'next/image';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function EditProfilePage() {
    const { user, loading: authLoading, supabase, refreshUser } = useAuth();
    const router = useRouter();
    const { toast } = useToast();

    const [name, setName] = useState('');
    const [isPrivate, setIsPrivate] = useState(false);
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isRemoving, setIsRemoving] = useState(false);
    const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
    
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const fetchUserData = async () => {
            if (!authLoading && user) {
                // Fetch the user's current privacy setting from the database
                const { data, error } = await supabase
                    .from('users')
                    .select('name, picture, is_private')
                    .eq('id', user.id)
                    .single();

                if (error) {
                    console.error("Error fetching user data for edit page", error);
                    toast({ title: "Error", description: "Could not load profile data."});
                } else if (data) {
                    setName(data.name);
                    setAvatarPreview(data.picture);
                    setIsPrivate(data.is_private);
                }
            }
        }
        fetchUserData();
    }, [user, authLoading, supabase, toast]);

    const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            try {
                const options = {
                    maxSizeMB: 0.05, // 50KB
                    maxWidthOrHeight: 800,
                    useWebWorker: true,
                };
                const compressedFile = await imageCompression(file, options);
                setAvatarFile(compressedFile);
                setAvatarPreview(URL.createObjectURL(compressedFile));
            } catch (error) {
                console.error('Error compressing image:', error);
                toast({
                    title: "Compression Failed",
                    description: "Could not compress the image. Please try another one.",
                    variant: "destructive",
                });
                // Fallback to original file if compression fails
                setAvatarFile(file);
                setAvatarPreview(URL.createObjectURL(file));
            }
        }
    };

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        setIsSaving(true);
        try {
            const formData = new FormData();
            formData.append('name', name);
            formData.append('is_private', String(isPrivate));
            if (avatarFile) {
                formData.append('avatar', avatarFile);
            }

            await updateUserProfile(formData);
            
            toast({
                title: "Profile updated!",
                description: "Your changes have been saved successfully.",
                variant: 'success'
            });

            // Refresh the user session to get the new avatar URL everywhere
            await refreshUser();

            // The server action revalidates paths, so we can just navigate back.
            router.push(`/gallery?userId=${user.id}`);
            
        } catch (error: any) {
            console.error("Failed to update profile", error);
            toast({
                title: "Update failed",
                description: error.message || "Could not save your changes.",
                variant: 'destructive'
            });
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleRemovePicture = async () => {
        setShowRemoveConfirm(false);
        setIsRemoving(true);
        try {
            const { newPicture } = await removeUserProfilePicture();
            setAvatarPreview(newPicture);
            setAvatarFile(null); // Clear any staged file
            toast({
                title: "Profile picture removed",
                variant: 'success'
            });
             // Refresh the user session to update the avatar URL everywhere
            await refreshUser();
        } catch (error: any) {
            toast({
                title: "Error removing picture",
                description: error.message,
                variant: 'destructive'
            });
        } finally {
            setIsRemoving(false);
        }
    }
    
    if (authLoading || !user) {
        return (
            <div className="flex h-full w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }
    
    const isDefaultAvatar = avatarPreview?.includes('placehold.co');

    return (
        <>
            <div className="flex h-full w-full flex-col">
                <header className="flex h-16 flex-shrink-0 items-center border-b px-4">
                    <Button variant="ghost" size="icon" className="mr-2" onClick={() => router.back()}>
                        <ArrowLeft />
                    </Button>
                    <h1 className="text-lg font-semibold">Edit Profile</h1>
                </header>
                <div className="flex-1 overflow-y-auto p-6">
                    <form onSubmit={handleFormSubmit} className="space-y-8">
                        <div className="flex flex-col items-center gap-4">
                            <div className="relative">
                                <Avatar className="h-24 w-24">
                                    {avatarPreview && <AvatarImage src={avatarPreview} alt="Profile preview" data-ai-hint="profile picture" className="rounded-full object-cover" />}
                                    {/* Conditionally render fallback only if there is no new avatar file selected for preview */}
                                    {!avatarFile && <AvatarFallback>{name.charAt(0).toUpperCase()}</AvatarFallback>}
                                </Avatar>
                                <div className="absolute bottom-0 right-0 flex gap-1">
                                    <Button 
                                        type="button"
                                        variant="outline" 
                                        size="icon"
                                        className="rounded-full w-8 h-8"
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        <Camera className="h-4 w-4"/>
                                    </Button>
                                    {!isDefaultAvatar && (
                                        <Button
                                            type="button"
                                            variant="destructive"
                                            size="icon"
                                            className="rounded-full w-8 h-8"
                                            onClick={() => setShowRemoveConfirm(true)}
                                            disabled={isRemoving}
                                        >
                                            {isRemoving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                        </Button>
                                    )}
                                </div>
                                <Input 
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    accept="image/png, image/jpeg, image/gif"
                                    onChange={handleAvatarChange}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="name">Name</Label>
                            <Input 
                                id="name" 
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                            />
                        </div>

                        <Separator />
                        
                         <div className="space-y-4">
                            <Label className="text-base font-semibold">Account Privacy</Label>
                            <div className="flex items-center justify-between rounded-lg border p-4">
                                <div className="flex items-center gap-3">
                                    <Lock className="h-5 w-5"/>
                                    <div className="space-y-0.5">
                                        <Label htmlFor="private-account">Private Account</Label>
                                        <p className="text-xs text-muted-foreground">
                                            When your account is private, only people you approve can see your photos and videos.
                                        </p>
                                    </div>
                                </div>
                                <Switch
                                    id="private-account"
                                    checked={isPrivate}
                                    onCheckedChange={setIsPrivate}
                                />
                            </div>
                        </div>
                        
                        <Button type="submit" className="w-full" disabled={isSaving}>
                            {isSaving ? <Loader2 className="animate-spin" /> : 'Save Changes'}
                        </Button>
                    </form>
                </div>
            </div>
            <AlertDialog open={showRemoveConfirm} onOpenChange={setShowRemoveConfirm}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Remove Profile Picture?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to remove your profile picture? This will revert to the default avatar.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleRemovePicture}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Yes, Remove It
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
