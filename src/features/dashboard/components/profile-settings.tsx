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
  
  // Local state for optimistic image previewing before backend sync
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
      toast.error("Please select an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be smaller than 5MB.");
      return;
    }

    setSelectedFile(file);
    // Generate an instant local preview without hitting the server
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
  };

  const handleSave = async () => {
    if (!fullName.trim()) {
      toast.error("Name is required.");
      return;
    }

    setIsLoading(true);
    const formData = new FormData();
    formData.append('fullName', fullName);
    if (selectedFile) {
      formData.append('avatar', selectedFile);
    }

    const result = await updateProfileSettingsAction(formData);

    if (result.error) {
      toast.error(result.error);
    } else if (result.success) {
      toast.success("Profile updated successfully!");
      setAvatarUrl(result.avatarUrl!);
      setPreviewUrl(null);
      setSelectedFile(null);
      
      // Dispatch custom event to trigger global re-renders for components watching Auth state
      window.dispatchEvent(new Event('auth-change'));
    }
    setIsLoading(false);
  };

  const currentImage = previewUrl || avatarUrl;

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-6">
      <h3 className="text-lg font-medium text-gray-200 mb-6">Profile Management</h3>
      
      <div className="flex flex-col sm:flex-row gap-8 items-start">
        <div className="flex flex-col items-center gap-4">
          <Avatar className="h-24 w-24 border-2 border-white/10 shadow-xl bg-purple-500/20">
            <AvatarImage src={currentImage || ''} className="object-cover" />
            <AvatarFallback className="text-3xl bg-transparent text-purple-400">
              {fullName ? fullName.charAt(0).toUpperCase() : <UserIcon className="h-10 w-10 opacity-50" />}
            </AvatarFallback>
          </Avatar>
          
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept="image/*" 
            onChange={handleFileSelect} 
          />
          
          <Button 
            variant="outline" 
            size="sm" 
            className="bg-white/5 border-white/10 hover:bg-white/10 text-xs transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-3 w-3 mr-2" /> Upload Avatar
          </Button>
        </div>

        <div className="flex-1 space-y-4 w-full max-w-md">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-400">Display Name</label>
            <Input 
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Enter your name"
              className="bg-black/20 border-white/10 focus-visible:ring-purple-500/50 text-white h-11"
            />
          </div>
          
          <div className="pt-4">
            <Button 
              onClick={handleSave} 
              disabled={isLoading}
              className="bg-purple-600 hover:bg-purple-700 text-white transition-all shadow-lg font-medium px-8 h-11"
            >
              {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Save Changes
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
