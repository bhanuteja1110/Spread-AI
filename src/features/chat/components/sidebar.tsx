'use client';

import React, { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, MessageSquare, Settings, LogOut, PanelLeftClose, MoreVertical, Trash, Edit2, LayoutDashboard } from 'lucide-react';
import { signOut } from '@/features/auth/actions';
import { chatService, type Conversation } from '@/services/chat.service';
import useSWR, { mutate } from 'swr';
import { useRouter, useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface SidebarProps {
  onClose?: () => void;
}

export function Sidebar({ onClose }: SidebarProps) {
  const router = useRouter();
  const params = useParams();
  const currentChatId = params?.id as string | undefined;

  const { data: conversations } = useSWR<Conversation[]>('conversations', () => chatService.getConversations());

  // Supabase Realtime Subscription for seamless cross-device synchronization
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel('conversations_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'conversations' },
        () => {
          mutate('conversations'); // Automatically re-fetches strictly via cache invalidation when DB changes
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleNewChat = () => {
    router.push('/dashboard/chat');
    if (onClose) onClose();
  };

  const handleSelectChat = (id: string) => {
    router.push(`/dashboard/c/${id}`);
    if (onClose) onClose();
  };

  const handleRename = async (e: React.MouseEvent, id: string, currentTitle: string) => {
    e.stopPropagation();
    const newTitle = window.prompt('Enter new name for the conversation:', currentTitle);
    if (!newTitle || newTitle === currentTitle) return;

    // Optimistic UI
    const previousData = conversations;
    mutate('conversations', conversations?.map(c => c.id === id ? { ...c, title: newTitle } : c), false);

    try {
      await chatService.updateConversationTitle(id, newTitle);
    } catch (error) {
      mutate('conversations', previousData);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    // Optimistic UI mutation (Instant UI feedback)
    const previousData = conversations;
    mutate('conversations', conversations?.filter(c => c.id !== id), false);
    
    try {
      await chatService.deleteConversation(id);
      if (currentChatId === id) {
        router.push('/dashboard/chat');
      }
    } catch (error) {
      // Rollback UI instantly on network failure
      mutate('conversations', previousData);
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#080b12] border-r border-white/5">
      <div className="p-4 border-b border-white/10 flex flex-col gap-2">
        <Button onClick={handleNewChat} className="w-full justify-start gap-2 bg-purple-600 hover:bg-purple-700 text-white transition-all shadow-sm font-semibold">
          <Plus className="h-4 w-4" />
          New Chat
        </Button>
        <Button 
          variant="ghost"
          onClick={() => {
            if (onClose) onClose();
            router.push('/dashboard');
          }}
          className="w-full justify-start gap-3 text-gray-400 hover:text-white hover:bg-white/10 transition-all font-medium"
        >
          <LayoutDashboard className="h-4 w-4" />
          Analytics Overview
        </Button>
        {onClose && (
          <Button variant="ghost" size="icon" onClick={onClose} className="absolute right-4 top-4 md:hidden text-gray-400 hover:text-white">
            <PanelLeftClose className="h-5 w-5" />
          </Button>
        )}
      </div>

      <ScrollArea className="flex-1 px-3">
        <div className="space-y-1 mt-2">
          {conversations?.map((chat) => (
            <div key={chat.id} className="relative group flex items-center">
              <Button
                variant={currentChatId === chat.id ? 'secondary' : 'ghost'}
                onClick={() => handleSelectChat(chat.id)}
                className={`w-full justify-start text-[14px] font-normal hover:text-gray-100 hover:bg-white/[0.08] overflow-hidden text-ellipsis whitespace-nowrap px-3 py-6 transition-colors ${currentChatId === chat.id ? 'bg-white/10 text-white' : 'text-gray-400'}`}
              >
                <MessageSquare className="mr-3 h-4 w-4 flex-shrink-0 opacity-70" />
                <span className="truncate tracking-wide pr-6">{chat.title}</span>
              </Button>
              
              <div className="absolute right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-white">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-32 bg-[#0b101e] border-white/10 text-gray-300">
                    <DropdownMenuItem 
                      className="hover:bg-white/10 hover:text-white cursor-pointer"
                      onClick={(e) => handleRename(e, chat.id, chat.title)}
                    >
                      <Edit2 className="mr-2 h-4 w-4" /> Rename
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      className="text-red-400 hover:bg-red-400/10 hover:text-red-300 cursor-pointer"
                      onClick={(e) => handleDelete(e, chat.id)}
                    >
                      <Trash className="mr-2 h-4 w-4" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      <div className="p-4 border-t border-white/5 space-y-2 bg-[#080b12]">
        <Button variant="ghost" className="w-full justify-start text-gray-400 hover:text-white hover:bg-white/5 transition-colors">
          <Settings className="mr-3 h-4 w-4 opacity-70" />
          Settings
        </Button>
        <form action={signOut} className="w-full">
          <Button 
            type="submit"
            variant="ghost" 
            className="w-full justify-start text-gray-400 hover:text-red-400 hover:bg-red-400/10 transition-colors"
          >
            <LogOut className="mr-3 h-4 w-4 opacity-70" />
            Log out
          </Button>
        </form>
      </div>
    </div>
  );
}
