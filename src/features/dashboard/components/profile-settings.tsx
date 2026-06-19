'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Upload, User as UserIcon } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { updateProfileSettingsAction } from '../actions';
import { createClient } from '@/lib/supabase/client';

export function ProfileSettings() {
  const [isLoading, setIsLoading] = useState(false);
  const [fullName, setFullName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadUser() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user && !cancelled) {
        setFullName(user.user_metadata?.full_name || '');
        setAvatarUrl(user.user_metadata?.avatar_url || null);
      }
    }
    loadUser();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be smaller than 5MB.');
      return;
    }
    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
  };

  const handleSave = async () => {
    if (!fullName.trim()) {
      toast.error('Name is required.');
      return;
    }
    setIsLoading(true);
    const formData = new FormData();
    formData.append('fullName', fullName);
    if (selectedFile) formData.append('avatar', selectedFile);

    const result = await updateProfileSettingsAction(formData);

    if (result.error) {
      toast.error(result.error);
    } else if (result.success) {
      toast.success('Profile updated successfully!');
      setAvatarUrl(result.avatarUrl!);
      setPreviewUrl(null);
      setSelectedFile(null);
      window.dispatchEvent(new Event('auth-change'));
    }
    setIsLoading(false);
  };

  const currentImage = previewUrl || avatarUrl;

  return (
    <div className="rounded-xl border border-border bg-card p-5 sm:p-6">
      <h3 className="text-base font-semibold text-foreground mb-5">Profile</h3>

      <div className="flex flex-col sm:flex-row gap-6 sm:gap-8 items-start">
        <div className="flex flex-col items-center gap-3 mx-auto sm:mx-0">
          <Avatar
            size="lg"
            className="h-20 w-20 sm:h-24 sm:w-24 border border-border bg-muted"
          >
            <AvatarImage src={currentImage || ''} className="object-cover" />
            <AvatarFallback className="bg-muted text-primary text-xl">
              {fullName ? fullName.charAt(0).toUpperCase() : (
                <UserIcon className="h-8 w-8 text-muted-foreground" />
              )}
            </AvatarFallback>
          </Avatar>

          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/*"
            onChange={handleFileSelect}
            aria-label="Upload avatar"
          />

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="bg-muted border border-border hover:bg-accent text-xs"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-3 w-3 mr-1.5" aria-hidden /> Upload
          </Button>
        </div>

        <div className="flex-1 space-y-4 w-full min-w-0">
          <div className="space-y-1.5">
            <label htmlFor="full-name" className="text-xs font-medium text-muted-foreground">
              Display Name
            </label>
            <Input
              id="full-name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Enter your name"
              className="h-10"
            />
          </div>

          <Button
            type="button"
            onClick={handleSave}
            disabled={isLoading}
            className="bg-primary text-primary-foreground hover:bg-primary/90 font-medium h-10 px-5"
          >
            {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
}
