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

export function ChatLayout({ conversationId }: { conversationId?: string }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeConvId, setActiveConvId] = useState<string | undefined>(conversationId);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [userMeta, setUserMeta] = useState<{ name?: string; avatarUrl?: string }>({});
  // Prevent double-create if user spams the send button on a new chat
  const creatingConvRef = useRef<Promise<string> | null>(null);

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

  useEffect(() => {
    setActiveConvId(conversationId);
  }, [conversationId]);

  const { data: dbMessages, isLoading: isDbLoading } = useSWR(
    activeConvId ? `messages:${activeConvId}` : null,
    () => chatService.getMessages(activeConvId!),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    },
  );

  // We pass an empty body to useChat and override body per-append() call.
  // This is the KEY fix for the first-message bug: previously `body:
  // { conversationId: activeConvId }` was captured once at hook init and
  // every append() reused that frozen value, so the first message was sent
  // with `conversationId: undefined` and the API rejected it with 400.
  const { messages, isLoading, setMessages, append, error, reload } = useChat({
    api: '/api/chat',
    id: activeConvId, // re-mounts the chat when conversation changes
    onError: useCallback((err: Error) => {
      console.error('[chat] error:', err);
      if (err.message.includes('429') || err.message.includes('QUOTA_EXCEEDED')) {
        setShowUpgradeModal(true);
      } else {
        toast.error('Failed to get a response. Please try again.');
      }
    }, []),
  });

  // Sync DB messages into the AI SDK when conversation changes
  const syncedConvRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (dbMessages && syncedConvRef.current !== activeConvId) {
      syncedConvRef.current = activeConvId;
      setMessages(dbMessages);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dbMessages, activeConvId]);

  /**
   * Ensure a conversation exists and return its ID. Safe to call repeatedly;
   * concurrent calls share the same in-flight promise.
   */
  const ensureConversation = useCallback(
    async (title: string): Promise<string> => {
      if (activeConvId) return activeConvId;
      if (creatingConvRef.current) return creatingConvRef.current;

      const promise = (async () => {
        try {
          const conv = await chatService.createConversation(title);
          setActiveConvId(conv.id);
          window.history.replaceState(null, '', `/dashboard/c/${conv.id}`);
          return conv.id;
        } finally {
          creatingConvRef.current = null;
        }
      })();
      creatingConvRef.current = promise;
      return promise;
    },
    [activeConvId],
  );

  const handleSend = useCallback(
    async (finalPrompt: string) => {
      if (!finalPrompt.trim() || isLoading) return;

      try {
        // Always have a real conversation ID BEFORE we send. This eliminates
        // the race where the first request hits the API with conversationId=undefined.
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
          <h1 className="text-sm font-semibold text-foreground truncate">Spread AI</h1>
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
