'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Sidebar } from './sidebar';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Menu } from 'lucide-react';
import { useChat } from 'ai/react';
import { MessageList } from './message-list';
import { ChatInput } from './chat-input';
import useSWR from 'swr';
import { chatService } from '@/services/chat.service';
import { UpgradeModal } from '@/features/billing/components/upgrade-modal';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { useChatStateRegistration } from '../context/chat-state-context';
import { mutate as globalMutate } from 'swr';

export function ChatLayout({ conversationId: propConvId }: { conversationId?: string }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [userMeta, setUserMeta] = useState<{ name?: string; avatarUrl?: string }>({});

  // The conv id we KNOW about (from URL or from a successful createConversation).
  // This is the single source of truth — we never duplicate it.
  const [knownConvId, setKnownConvId] = useState<string | undefined>(propConvId);

  // Cache in-flight createConversation promise so spam-clicks reuse it
  const creatingConvRef = useRef<Promise<string> | null>(null);

  // Sync from URL prop on navigation between saved chats
  useEffect(() => {
    setKnownConvId(propConvId);
  }, [propConvId]);

  const userMetaLoadedRef = useRef(false);
  useEffect(() => {
    if (userMetaLoadedRef.current) return;
    userMetaLoadedRef.current = true;
    createClient()
      .auth.getUser()
      .then(({ data: { user } }) => {
        if (user) {
          setUserMeta({
            name: user.user_metadata?.full_name || user.email?.split('@')[0],
            avatarUrl: user.user_metadata?.avatar_url,
          });
        }
      });
  }, []);

  // Load persisted messages for the currently-known conversation.
  // SWR key changes only when knownConvId flips — never mid-stream.
  const { data: dbMessages, isLoading: isDbLoading } = useSWR(
    knownConvId ? `messages:${knownConvId}` : null,
    () => chatService.getMessages(knownConvId!),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      // Never refetch mid-conversation; messages stream live via useChat
      dedupingInterval: 60_000,
    },
  );

  // ---- The KEY change: NO `id` prop on useChat ----
  // useChat internally derives chatKey = [api, id]. If we passed the
  // conversation id, every time it flipped (e.g. after creating the row
  // on first send) the SWR-backed messages store would reset to initialMessages,
  // wiping the in-flight stream and rendered messages. By omitting `id`,
  // the hook uses its stable hookId for the entire component lifetime.
  //
  // We DO pass `conversationId` per-append() in `body` so the server knows
  // which conversation to write to.
  const { messages, isLoading, setMessages, append, error, reload, stop } = useChat({
    api: '/api/chat',
    onError: useCallback((err: Error) => {
      console.error('[chat] error:', err);
      if (err.message.includes('429') || err.message.includes('QUOTA_EXCEEDED')) {
        setShowUpgradeModal(true);
      } else {
        toast.error('Failed to get a response. Please try again.');
      }
    }, []),
  });

  // Sync persisted DB messages into useChat ONCE per knownConvId change.
  // We never overwrite an in-flight stream (messages.length > 0).
  const syncedConvRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (dbMessages && syncedConvRef.current !== knownConvId) {
      syncedConvRef.current = knownConvId;
      // Only seed if AI SDK is empty (fresh navigation into saved chat)
      if (messages.length === 0) setMessages(dbMessages);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dbMessages, knownConvId]);

  /**
   * Ensure a conversation row exists. Idempotent under concurrent calls —
   * they share the same in-flight promise.
   *
   * Critical: this NEVER causes `useChat` to remount. We just update a
   * piece of React state + the URL via replaceState.
   */
  const ensureConversation = useCallback(
    async (title: string): Promise<string> => {
      if (knownConvId) return knownConvId;
      if (creatingConvRef.current) return creatingConvRef.current;

      const promise = (async (): Promise<string> => {
        const conv = await chatService.createConversation(title);
        // 1) update state — does NOT remount useChat (we removed the `id` prop)
        setKnownConvId(conv.id);
        // 2) update URL silently so a refresh keeps you in the same chat
        if (typeof window !== 'undefined') {
          window.history.replaceState(null, '', `/dashboard/c/${conv.id}`);
        }
        // 3) refresh sidebar list so the new chat appears
        globalMutate('conversations');
        return conv.id;
      })();
      creatingConvRef.current = promise;
      try {
        return await promise;
      } finally {
        creatingConvRef.current = null;
      }
    },
    [knownConvId],
  );

  const handleSend = useCallback(
    async (finalPrompt: string) => {
      if (!finalPrompt.trim() || isLoading) return;
      try {
        const title = finalPrompt.trim().slice(0, 50);
        const convId = await ensureConversation(title);
        append(
          { role: 'user', content: finalPrompt },
          { body: { conversationId: convId } },
        );
      } catch (err) {
        console.error('[chat] send failed:', err);
        toast.error('Failed to start a new conversation. Please try again.');
      }
    },
    [isLoading, append, ensureConversation],
  );

  const handleRetry = useCallback(() => {
    if (!error || isLoading) return;
    reload();
  }, [error, isLoading, reload]);

  /**
   * Hard reset to a fresh draft. Called by Sidebar's "New Chat" button.
   *
   * Stops any in-flight stream, clears messages, drops knownConvId,
   * rewrites the URL to /dashboard — all without unmounting the component.
   */
  const resetChat = useCallback(() => {
    try {
      stop?.();
    } catch {
      /* ignore */
    }
    setMessages([]);
    setKnownConvId(undefined);
    syncedConvRef.current = undefined;
    if (typeof window !== 'undefined' && window.location.pathname !== '/dashboard') {
      window.history.replaceState(null, '', '/dashboard');
    }
  }, [setMessages, stop]);

  // Expose resetChat to siblings (Sidebar) via context
  useChatStateRegistration(resetChat);

  const closeSidebar = useCallback(() => setIsSidebarOpen(false), []);
  const openSidebar = useCallback(() => setIsSidebarOpen(true), []);

  return (
    <div className="flex h-svh w-full overflow-hidden bg-background">
      <aside className="hidden md:flex w-[260px] lg:w-[300px] flex-shrink-0">
        <Sidebar />
      </aside>

      <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
        <SheetContent
          side="left"
          className="p-0 w-[280px] max-w-[85vw] border-r border-border bg-background"
        >
          <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
          <Sidebar onClose={closeSidebar} />
        </SheetContent>
      </Sheet>

      <div className="flex flex-col flex-1 min-w-0 relative">
        <header className="flex h-14 items-center gap-2 px-3 sm:px-4 border-b border-border bg-background/95 backdrop-blur-md z-10 flex-shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden h-9 w-9 text-muted-foreground hover:text-foreground"
            onClick={openSidebar}
            aria-label="Open navigation"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <h1 className="text-sm font-semibold text-foreground truncate">
            {knownConvId ? 'Spread AI' : 'New Chat'}
          </h1>
        </header>

        {isDbLoading ? (
          <div
            className="flex-1 flex items-center justify-center"
            aria-label="Loading conversation"
          >
            <div
              className="h-8 w-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin"
              aria-hidden
            />
          </div>
        ) : (
          <MessageList
            messages={messages}
            isLoading={isLoading}
            error={error}
            onRetry={handleRetry}
            userAvatarUrl={userMeta.avatarUrl}
            userName={userMeta.name}
          />
        )}

        <ChatInput isLoading={isLoading} onSend={handleSend} />
        <UpgradeModal isOpen={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} />
      </div>
    </div>
  );
}
