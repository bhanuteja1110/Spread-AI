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
    async function loadUser() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setFullName(user.user_metadata?.full_name || '');
        setAvatarUrl(user.user_metadata?.avatar_url || null);
      }
    }
    loadUser();
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
    <div className="rounded-xl border border-white/10 bg-white/5 p-5 sm:p-6">
      <h3 className="text-base font-semibold text-white mb-5">Profile</h3>

      <div className="flex flex-col sm:flex-row gap-6 sm:gap-8 items-start">
        <div className="flex flex-col items-center gap-3 mx-auto sm:mx-0">
          <Avatar
            size="lg"
            className="h-20 w-20 sm:h-24 sm:w-24 border border-white/10 bg-white/5"
          >
            <AvatarImage src={currentImage || ''} className="object-cover" />
            <AvatarFallback className="bg-white/5 text-purple-300 text-xl">
              {fullName ? fullName.charAt(0).toUpperCase() : (
                <UserIcon className="h-8 w-8 text-gray-500" />
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
            className="bg-white/5 border border-white/10 hover:bg-white/10 text-xs"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-3 w-3 mr-1.5" aria-hidden /> Upload
          </Button>
        </div>

        <div className="flex-1 space-y-4 w-full min-w-0">
          <div className="space-y-1.5">
            <label
              htmlFor="full-name"
              className="text-xs font-medium text-gray-400"
            >
              Display Name
            </label>
            <Input
              id="full-name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Enter your name"
              className="bg-white/5 border-white/10 text-white h-10"
            />
          </div>

          <Button
            type="button"
            onClick={handleSave}
            disabled={isLoading}
            className="bg-purple-600 hover:bg-purple-700 text-white font-medium h-10 px-5"
          >
            {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
}
