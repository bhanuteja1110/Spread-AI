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

  // Cache user-meta so the same fetch isn't repeated across re-renders
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

  // Keep activeConvId in sync when navigating between conversations
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

  const { messages, isLoading, setMessages, append } = useChat({
    api: '/api/chat',
    body: { conversationId: activeConvId },
    onError: useCallback((error: Error) => {
      if (error.message.includes('429') || error.message.includes('QUOTA_EXCEEDED')) {
        setShowUpgradeModal(true);
      } else {
        toast.error('Failed to get a response. Please try again.');
      }
    }, []),
  });

  // Sync DB messages into the AI SDK on first load
  const syncedConvRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (dbMessages && syncedConvRef.current !== activeConvId) {
      syncedConvRef.current = activeConvId;
      setMessages(dbMessages);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dbMessages, activeConvId]);

  const handleSend = useCallback(
    async (finalPrompt: string) => {
      if (!finalPrompt.trim() || isLoading) return;

      if (!activeConvId) {
        // Optimistic: create the conversation in the background while the
        // user message streams immediately. This makes new-chat feel instant.
        const title = finalPrompt.trim().slice(0, 50);
        try {
          // Kick off conversation creation, but DON'T await before appending
          const convPromise = chatService.createConversation(title);
          append({ role: 'user', content: finalPrompt });
          const conv = await convPromise;
          setActiveConvId(conv.id);
          window.history.replaceState(null, '', `/dashboard/c/${conv.id}`);
        } catch {
          toast.error('Failed to start a new conversation. Please try again.');
        }
      } else {
        append({ role: 'user', content: finalPrompt });
      }
    },
    [activeConvId, isLoading, append],
  );

  // Memoize the close handler so it doesn't change every render (would
  // invalidate memoized Sidebar).
  const closeSidebar = useCallback(() => setIsSidebarOpen(false), []);
  const openSidebar = useCallback(() => setIsSidebarOpen(true), []);

  return (
    <div className="flex h-svh w-full overflow-hidden bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-[260px] lg:w-[300px] flex-shrink-0">
        <Sidebar />
      </aside>

      {/* Mobile Drawer */}
      <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
        <SheetContent
          side="left"
          className="p-0 w-[280px] max-w-[85vw] border-r border-border bg-background"
        >
          <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
          <Sidebar onClose={closeSidebar} />
        </SheetContent>
      </Sheet>

      {/* Main Chat Area */}
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
