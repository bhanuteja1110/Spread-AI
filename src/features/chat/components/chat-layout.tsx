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
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);

  const [knownConvId, setKnownConvId] = useState<string | undefined>(propConvId);
  const creatingConvRef = useRef<Promise<string> | null>(null);

  // Keep URL prop → local state in sync on navigation
  useEffect(() => {
    setKnownConvId(propConvId);
  }, [propConvId]);

  // Load user meta once
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

  // Load persisted messages for the current conversation.
  // KEY CHANGE: we now pass these to useChat as `initialMessages` so they're
  // available on the FIRST render — no race with setMessages().
  const { data: dbMessages, isLoading: isDbLoading } = useSWR(
    knownConvId ? `messages:${knownConvId}` : null,
    () => chatService.getMessages(knownConvId!),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 60_000,
    },
  );

  // Track which conversation has been "seeded" into useChat's initial state.
  const seededConvIdRef = useRef<string | undefined>(undefined);
  const initialMessages = React.useMemo(() => {
    // Only seed when we have a conversation AND we haven't already seeded it
    if (knownConvId && seededConvIdRef.current !== knownConvId) {
      seededConvIdRef.current = knownConvId;
      // Reset for new conversation; useChat receives initialMessages only once.
      if (dbMessages) return dbMessages;
    }
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dbMessages, knownConvId]);

  /**
   * useChat — bullet-proof configuration.
   *
   * 1) `initialMessages` seeds persisted history on the very first render,
   *    avoiding the previous "setMessages after mount" race that could lose
   *    messages sent quickly after navigation.
   * 2) `experimental_prepareRequestBody` injects `conversationId` into EVERY
   *    request (initial, append, reload) from a ref, so it can't be lost
   *    mid-stream or due to stale closures.
   * 3) No `id` prop — the hook keeps a stable internal key for the component
   *    lifetime, so the SWR-backed `messages` store doesn't reset.
   */
  const convIdRef = useRef<string | undefined>(propConvId);
  useEffect(() => {
    convIdRef.current = knownConvId;
  }, [knownConvId]);

  const { messages, isLoading, setMessages, append, error, reload, stop } = useChat({
    api: '/api/chat',
    initialMessages,
    experimental_prepareRequestBody: ({ messages: msgs }) => ({
      messages: msgs,
      conversationId: convIdRef.current,
      webSearch: webSearchEnabled,
    }),
    onError: useCallback((err: Error) => {
      console.error('[chat] error:', err);
      if (
        err.message.includes('429') ||
        err.message.includes('QUOTA_EXCEEDED') ||
        /"code":"QUOTA_EXCEEDED"/.test(err.message)
      ) {
        setShowUpgradeModal(true);
        return;
      }
      // Surface the actual error in development for faster debugging
      const debugInfo = process.env.NODE_ENV === 'development' ? ` (${err.message.slice(0, 140)})` : '';
      toast.error(`Failed to get a response${debugInfo}`);
    }, []),
    onFinish: useCallback(() => {
      // After a stream completes in an existing chat, mark messages as fresh
      // so a navigation-back triggers a refetch on next visit.
      if (knownConvId) {
        globalMutate(`messages:${knownConvId}`);
      }
    }, [knownConvId]),
  });

  /**
   * Ensure a conversation row exists. Idempotent under concurrent calls.
   * Updates ref synchronously so the next request body includes the id.
   */
  const ensureConversation = useCallback(
    async (title: string): Promise<string> => {
      const current = convIdRef.current;
      if (current) return current;
      if (creatingConvRef.current) return creatingConvRef.current;

      const promise = (async (): Promise<string> => {
        const conv = await chatService.createConversation(title);
        convIdRef.current = conv.id;
        setKnownConvId(conv.id);
        seededConvIdRef.current = conv.id;
        if (typeof window !== 'undefined') {
          window.history.replaceState(null, '', `/dashboard/c/${conv.id}`);
        }
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
    [],
  );

  const handleSend = useCallback(
    async (finalPrompt: string) => {
      if (!finalPrompt.trim() || isLoading) return;
      try {
        const title = finalPrompt.trim().slice(0, 50);
        const convId = await ensureConversation(title);
        // Defensive: keep ref in sync (ensureConversation already does, but
        // belt-and-suspenders for direct calls from ChatInput)
        convIdRef.current = convId;
        await append({ role: 'user', content: finalPrompt });
      } catch (err) {
        console.error('[chat] send failed:', err);
        toast.error(
          err instanceof Error
            ? `Failed to send: ${err.message.slice(0, 120)}`
            : 'Failed to send message.',
        );
      }
    },
    [isLoading, append, ensureConversation],
  );

  const handleRetry = useCallback(() => {
    if (!error || isLoading) return;
    reload();
  }, [error, isLoading, reload]);

  const handleStop = useCallback(() => {
    try {
      stop?.();
    } catch {
      /* ignore */
    }
  }, [stop]);

  const resetChat = useCallback(() => {
    try {
      stop?.();
    } catch {
      /* ignore */
    }
    setMessages([]);
    convIdRef.current = undefined;
    setKnownConvId(undefined);
    seededConvIdRef.current = undefined;
    if (typeof window !== 'undefined' && window.location.pathname !== '/dashboard') {
      window.history.replaceState(null, '', '/dashboard');
    }
  }, [setMessages, stop]);

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

        {isDbLoading && messages.length === 0 ? (
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
            onStop={handleStop}
            userAvatarUrl={userMeta.avatarUrl}
            userName={userMeta.name}
          />
        )}

        <ChatInput
          isLoading={isLoading}
          onSend={handleSend}
          onStop={handleStop}
          webSearchEnabled={webSearchEnabled}
          onToggleWebSearch={() => setWebSearchEnabled((v) => !v)}
        />
        <UpgradeModal isOpen={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} />
      </div>
    </div>
  );
}
