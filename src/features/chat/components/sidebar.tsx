'use client';

import React, { memo, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Plus,
  MessageSquare,
  Settings as SettingsIcon,
  LogOut,
  MoreVertical,
  Trash,
  Edit2,
  CheckSquare,
  Square,
  Trash2,
} from 'lucide-react';
import { signOut } from '@/features/auth/actions';
import { chatService, type Conversation } from '@/services/chat.service';
import useSWR, { mutate } from 'swr';
import { useConversationsRealtime } from '@/hooks/use-conversations-realtime';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useChatState } from '../context/chat-state-context';
import { perfStart, perfEnd } from '@/lib/perf';
import { TypingDots } from '@/components/loading/typing-dots';

interface SidebarProps {
  onClose?: () => void;
}

function SidebarImpl({ onClose }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const currentChatId = params?.id as string | undefined;
  const { resetChat } = useChatState();

  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [clearingAll, setClearingAll] = useState(false);

  const { data: conversations, isLoading: isLoadingConvs } = useSWR<Conversation[]>(
    'conversations',
    () => chatService.getConversations(),
    { revalidateOnFocus: false },
  );

  useConversationsRealtime();

  const exitSelectionMode = useCallback(() => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  }, []);

  /**
   * New Chat — does NOT navigate via Next.js (that would remount ChatLayout
   * and wipe the in-flight stream + messages). Instead:
   *   1) Calls the parent's resetChat() — stops stream, clears messages,
   *      drops knownConvId
   *   2) Silently rewrites the URL to /dashboard via history.replaceState
   *
   * The component instance is preserved, so users keep their typing state,
   * scroll position, and any in-flight optimistics.
   */
  const handleNewChat = useCallback(() => {
    perfStart('sidebar.handleNewChat');
    onClose?.();
    resetChat();
    perfEnd('sidebar.handleNewChat');
  }, [onClose, resetChat]);

  const handleSelectChat = useCallback(
    (id: string) => {
      if (selectionMode) {
        setSelectedIds((prev) => {
          const next = new Set(prev);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          return next;
        });
        return;
      }
      perfStart('sidebar.handleSelectChat');
      router.push(`/dashboard/c/${id}`);
      onClose?.();
      // router.push fires before nav; mark end optimistically
      requestAnimationFrame(() => perfEnd('sidebar.handleSelectChat'));
    },
    [selectionMode, router, onClose],
  );

  const toggleSelectionMode = useCallback(() => {
    setSelectionMode((v) => !v);
    setSelectedIds(new Set());
  }, []);

  const selectAll = useCallback(() => {
    if (!conversations) return;
    setSelectedIds(new Set(conversations.map((c) => c.id)));
  }, [conversations]);

  const handleBulkDelete = useCallback(async () => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    if (
      !window.confirm(
        `Delete ${ids.length} conversation${ids.length === 1 ? '' : 's'}? This cannot be undone.`,
      )
    ) {
      return;
    }
    const previous = conversations;
    setDeletingIds(new Set(ids));
    // Optimistic — instant UI update
    mutate(
      'conversations',
      conversations?.filter((c) => !selectedIds.has(c.id)),
      false,
    );
    perfStart('sidebar.handleBulkDelete');
    try {
      await chatService.deleteConversations(ids);
      perfEnd('sidebar.handleBulkDelete');
      if (currentChatId && selectedIds.has(currentChatId)) {
        resetChat();
      }
      toast.success(`Deleted ${ids.length} conversation${ids.length === 1 ? '' : 's'}`);
      exitSelectionMode();
    } catch (err) {
      perfEnd('sidebar.handleBulkDelete');
      toast.error(err instanceof Error ? err.message : 'Failed to delete.');
      mutate('conversations', previous);
    } finally {
      setDeletingIds(new Set());
    }
  }, [selectedIds, conversations, currentChatId, resetChat, exitSelectionMode]);

  const handleClearAll = useCallback(async () => {
    if (!conversations?.length) {
      toast.info('No conversations to delete.');
      return;
    }
    if (
      !window.confirm(
        `Delete ALL ${conversations.length} conversations? This cannot be undone.`,
      )
    ) {
      return;
    }
    setClearingAll(true);
    const previous = conversations;
    mutate('conversations', [], false);
    perfStart('sidebar.handleClearAll');
    try {
      await chatService.deleteAllConversations();
      perfEnd('sidebar.handleClearAll');
      toast.success('All conversations deleted');
      if (currentChatId) resetChat();
      exitSelectionMode();
    } catch (err) {
      perfEnd('sidebar.handleClearAll');
      toast.error(err instanceof Error ? err.message : 'Failed to clear all.');
      mutate('conversations', previous);
    } finally {
      setClearingAll(false);
    }
  }, [conversations, currentChatId, resetChat, exitSelectionMode]);

  const handleRename = useCallback(
    async (e: React.MouseEvent, id: string, currentTitle: string) => {
      e.stopPropagation();
      e.preventDefault();
      const newTitle = window.prompt('Rename conversation:', currentTitle);
      if (!newTitle || newTitle === currentTitle) return;
      const previous = conversations;
      mutate(
        'conversations',
        conversations?.map((c) => (c.id === id ? { ...c, title: newTitle } : c)),
        false,
      );
      perfStart('sidebar.handleRename');
      try {
        await chatService.updateConversationTitle(id, newTitle);
        perfEnd('sidebar.handleRename');
      } catch {
        perfEnd('sidebar.handleRename');
        mutate('conversations', previous);
        toast.error('Failed to rename.');
      }
    },
    [conversations],
  );

  const handleDelete = useCallback(
    async (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      e.preventDefault();
      if (!window.confirm('Delete this conversation? This cannot be undone.')) return;
      const previous = conversations;
      setDeletingIds((prev) => new Set(prev).add(id));
      // Optimistic — instant UI removal
      mutate(
        'conversations',
        conversations?.filter((c) => c.id !== id),
        false,
      );
      perfStart('sidebar.handleDelete');
      try {
        await chatService.deleteConversation(id);
        perfEnd('sidebar.handleDelete');
        if (currentChatId === id) resetChat();
        toast.success('Conversation deleted');
      } catch (err) {
        perfEnd('sidebar.handleDelete');
        toast.error(err instanceof Error ? err.message : 'Failed to delete.');
        mutate('conversations', previous);
      } finally {
        setDeletingIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    },
    [conversations, currentChatId, resetChat],
  );

  const handleSettings = useCallback(() => {
    perfStart('sidebar.handleSettings');
    router.push('/settings');
    onClose?.();
    requestAnimationFrame(() => perfEnd('sidebar.handleSettings'));
  }, [router, onClose]);

  // Memoize the list for stable referential equality in the map below.
  const renderedConversations = useMemo(() => conversations ?? [], [conversations]);

  return (
    <nav
      aria-label="Primary"
      className="flex flex-col h-full w-full bg-sidebar border-r border-sidebar-border"
    >
      {/* Top — Logo + New Chat + selection controls */}
      <div className="p-3 border-b border-sidebar-border flex flex-col gap-2">
        <Link
          href="/dashboard"
          onClick={onClose}
          className="flex items-center gap-2.5 px-2 py-1.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          <span
            aria-hidden
            className="h-7 w-7 rounded-md bg-primary flex items-center justify-center text-xs font-bold text-primary-foreground tracking-tight"
          >
            SA
          </span>
          <span className="text-sm font-semibold text-foreground tracking-tight">Spread AI</span>
        </Link>

        {selectionMode ? (
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={exitSelectionMode}
              className="flex-1 h-9 text-sm"
              aria-label="Cancel selection"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={selectAll}
              className="h-9 text-sm"
              aria-label="Select all"
            >
              All
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleBulkDelete}
              disabled={selectedIds.size === 0}
              className="h-9 px-3"
              aria-label={`Delete ${selectedIds.size} selected`}
            >
              <Trash2 className="h-4 w-4" />
              <span className="ml-1.5 text-xs">{selectedIds.size}</span>
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            onClick={handleNewChat}
            aria-label="Start a new chat"
            className="w-full justify-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium h-9"
          >
            <Plus className="h-4 w-4" aria-hidden />
            New Chat
          </Button>
        )}
      </div>

      {/* Conversations list */}
      <div className="flex-1 min-h-0 px-2 py-2">
        <div className="flex items-center justify-between px-2 py-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Recent
          </p>
          {conversations && conversations.length > 0 && !selectionMode && (
            <button
              type="button"
              onClick={toggleSelectionMode}
              className="text-[11px] text-muted-foreground hover:text-foreground transition-colors px-1.5 py-0.5 rounded"
              aria-label="Enter selection mode"
            >
              Select
            </button>
          )}
        </div>
        <ScrollArea className="h-full">
          {isLoadingConvs ? (
            <div
              className="px-3 py-6 flex flex-col items-center gap-2 text-muted-foreground"
              aria-label="Loading conversations"
              role="status"
            >
              <TypingDots size="sm" />
              <span className="text-xs">Loading conversations…</span>
            </div>
          ) : renderedConversations.length > 0 ? (
            <ul className="space-y-0.5" role="list">
              {renderedConversations.map((chat) => {
                const isActive = !selectionMode && currentChatId === chat.id;
                const isSelected = selectedIds.has(chat.id);
                const isDeleting = deletingIds.has(chat.id);
                return (
                  <li key={chat.id} className="relative group">
                    <button
                      type="button"
                      onClick={() => handleSelectChat(chat.id)}
                      aria-current={isActive ? 'page' : undefined}
                      aria-pressed={selectionMode ? isSelected : undefined}
                      disabled={isDeleting}
                      className={cn(
                        'w-full flex items-center gap-2.5 text-left rounded-md px-2.5 h-9 text-sm transition-colors truncate disabled:opacity-50',
                        isActive
                          ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                          : isSelected
                          ? 'bg-primary/15 text-foreground'
                          : 'text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                      )}
                    >
                      {selectionMode ? (
                        isSelected ? (
                          <CheckSquare
                            className="h-4 w-4 flex-shrink-0 text-primary"
                            aria-hidden
                          />
                        ) : (
                          <Square
                            className="h-4 w-4 flex-shrink-0 text-muted-foreground"
                            aria-hidden
                          />
                        )
                      ) : (
                        <MessageSquare
                          className={cn(
                            'h-4 w-4 flex-shrink-0',
                            isActive ? 'text-primary' : 'text-muted-foreground/70',
                          )}
                          aria-hidden
                        />
                      )}
                      <span className="truncate flex-1">{chat.title}</span>
                    </button>

                    {!selectionMode && (
                      <div className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              type="button"
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
                            className="w-40 bg-popover border-border text-popover-foreground"
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
                    )}
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

      {/* Bottom — Settings + Clear All + Logout */}
      <div className="p-2 border-t border-sidebar-border space-y-0.5">
        {selectionMode ? (
          <button
            type="button"
            onClick={handleClearAll}
            disabled={clearingAll}
            className="w-full flex items-center gap-2.5 px-2.5 h-9 rounded-md text-sm text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
            aria-label="Delete all conversations"
          >
            <Trash2 className="h-4 w-4 flex-shrink-0" aria-hidden />
            <span>{clearingAll ? 'Deleting…' : 'Delete all'}</span>
          </button>
        ) : (
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
        )}

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

export const Sidebar = memo(SidebarImpl, (prev, next) => prev.onClose === next.onClose);
