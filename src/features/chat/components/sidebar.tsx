'use client';

import React, { memo } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, MessageSquare, Settings as SettingsIcon, LogOut, MoreVertical, Trash, Edit2 } from 'lucide-react';
import { signOut } from '@/features/auth/actions';
import { chatService, type Conversation } from '@/services/chat.service';
import useSWR, { mutate } from 'swr';
import { useConversationsRealtime } from '@/hooks/use-conversations-realtime';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface SidebarProps {
  onClose?: () => void;
}

function SidebarImpl({ onClose }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const currentChatId = params?.id as string | undefined;

  const { data: conversations, isLoading: isLoadingConvs } = useSWR<Conversation[]>(
    'conversations',
    () => chatService.getConversations(),
    { revalidateOnFocus: false },
  );

  // Reference-counted global subscription — safe even when Sidebar mounts twice
  // (desktop aside + mobile drawer). No duplicate channel subscriptions.
  useConversationsRealtime();

  const handleNewChat = () => {
    router.push('/dashboard/chat');
    onClose?.();
  };

  const handleSelectChat = (id: string) => {
    router.push(`/dashboard/c/${id}`);
    onClose?.();
  };

  const handleRename = async (e: React.MouseEvent, id: string, currentTitle: string) => {
    e.stopPropagation();
    e.preventDefault();
    const newTitle = window.prompt('Enter new name for the conversation:', currentTitle);
    if (!newTitle || newTitle === currentTitle) return;

    const previousData = conversations;
    mutate(
      'conversations',
      conversations?.map((c) => (c.id === id ? { ...c, title: newTitle } : c)),
      false,
    );

    try {
      await chatService.updateConversationTitle(id, newTitle);
    } catch {
      mutate('conversations', previousData);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    e.preventDefault();
    const previousData = conversations;
    mutate(
      'conversations',
      conversations?.filter((c) => c.id !== id),
      false,
    );

    try {
      await chatService.deleteConversation(id);
      if (currentChatId === id) {
        router.push('/dashboard/chat');
      }
    } catch {
      mutate('conversations', previousData);
    }
  };

  const handleSettings = () => {
    router.push('/settings');
    onClose?.();
  };

  return (
    <nav
      aria-label="Primary"
      className="flex flex-col h-full w-full bg-sidebar border-r border-sidebar-border"
    >
      {/* Top — Logo + New Chat */}
      <div className="p-3 border-b border-sidebar-border flex flex-col gap-3">
        <Link
          href="/dashboard/chat"
          onClick={onClose}
          className="flex items-center gap-2.5 px-2 py-1.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/40"
        >
          <span
            aria-hidden
            className="h-7 w-7 rounded-md bg-purple-600 flex items-center justify-center text-xs font-bold text-white tracking-tight"
          >
            SA
          </span>
          <span className="text-sm font-semibold text-white tracking-tight">Spread AI</span>
        </Link>

        <Button
          onClick={handleNewChat}
          aria-label="Start a new chat"
          className="w-full justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white transition-colors font-medium h-9"
        >
          <Plus className="h-4 w-4" aria-hidden />
          New Chat
        </Button>
      </div>

      {/* Conversations list */}
      <div className="flex-1 min-h-0 px-2 py-2">
        <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Recent
        </p>
        <ScrollArea className="h-full">
          {isLoadingConvs ? (
            <div className="space-y-1 px-1 py-1" aria-label="Loading conversations">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-9 rounded-md bg-muted animate-pulse"
                  aria-hidden
                />
              ))}
            </div>
          ) : conversations && conversations.length > 0 ? (
            <ul className="space-y-0.5" role="list">
              {conversations.map((chat) => {
                const isActive = currentChatId === chat.id;
                return (
                  <li key={chat.id} className="relative group">
                    <button
                      type="button"
                      onClick={() => handleSelectChat(chat.id)}
                      aria-current={isActive ? 'page' : undefined}
                      className={cn(
                        'w-full flex items-center gap-2.5 text-left rounded-md px-2.5 h-9 text-sm transition-colors truncate',
                        isActive
                          ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                          : 'text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                      )}
                    >
                      <MessageSquare
                        className={cn(
                          'h-4 w-4 flex-shrink-0',
                          isActive ? 'text-primary' : 'text-muted-foreground/70',
                        )}
                        aria-hidden
                      />
                      <span className="truncate flex-1">{chat.title}</span>
                    </button>

                    <div className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label="Conversation options"
                            className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-sidebar-accent"
                          >
                            <MoreVertical className="h-4 w-4" aria-hidden />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          className="w-32 bg-popover border-border text-popover-foreground"
                        >
                          <DropdownMenuItem
                            className="hover:bg-sidebar-accent focus:bg-sidebar-accent cursor-pointer"
                            onClick={(e) => handleRename(e, chat.id, chat.title)}
                          >
                            <Edit2 className="h-4 w-4" aria-hidden /> Rename
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            variant="destructive"
                            className="cursor-pointer"
                            onClick={(e) => handleDelete(e, chat.id)}
                          >
                            <Trash className="h-4 w-4" aria-hidden /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="px-3 py-6 text-center text-xs text-muted-foreground">
              No conversations yet.
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Bottom — Settings + Logout */}
      <div className="p-2 border-t border-sidebar-border space-y-0.5">
        <button
          type="button"
          onClick={handleSettings}
          aria-label="Open settings"
          className={cn(
            'w-full flex items-center gap-2.5 px-2.5 h-9 rounded-md text-sm transition-colors',
            pathname?.startsWith('/settings')
              ? 'bg-sidebar-accent text-sidebar-accent-foreground'
              : 'text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
          )}
        >
          <SettingsIcon className="h-4 w-4 flex-shrink-0" aria-hidden />
          <span>Settings</span>
        </button>

        <form action={signOut} className="w-full">
          <button
            type="submit"
            aria-label="Log out"
            className="w-full flex items-center gap-2.5 px-2.5 h-9 rounded-md text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
          >
            <LogOut className="h-4 w-4 flex-shrink-0" aria-hidden />
            <span>Log out</span>
          </button>
        </form>
      </div>
    </nav>
  );
}

/**
 * Memoized Sidebar.
 *
 * `chat-layout.tsx` mounts the Sidebar twice (desktop aside + mobile drawer).
 * Memoizing prevents both instances from re-rendering whenever the chat
 * messages, typing state, or any unrelated parent state changes — only when
 * `onClose` actually changes.
 */
export const Sidebar = memo(SidebarImpl, (prev, next) => prev.onClose === next.onClose);
