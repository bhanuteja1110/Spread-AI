'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
import { useRouter } from 'next/navigation';

export function ChatLayout({ conversationId }: { conversationId?: string }) {
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeConvId, setActiveConvId] = useState<string | undefined>(conversationId);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [userMeta, setUserMeta] = useState<{ name?: string; avatarUrl?: string }>({});

  useEffect(() => {
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

  useEffect(() => {
    if (dbMessages && messages.length === 0) {
      setMessages(dbMessages);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dbMessages]);

  const handleSend = useCallback(
    async (finalPrompt: string) => {
      if (!finalPrompt.trim() || isLoading) return;

      if (!activeConvId) {
        const title = finalPrompt.trim().slice(0, 50);
        try {
          const conv = await chatService.createConversation(title);
          setActiveConvId(conv.id);
          window.history.replaceState(null, '', `/dashboard/c/${conv.id}`);
          await new Promise((r) => setTimeout(r, 50));
          append(
            { role: 'user', content: finalPrompt },
            { body: { conversationId: conv.id } },
          );
        } catch {
          toast.error('Failed to start a new conversation. Please try again.');
        }
      } else {
        append({ role: 'user', content: finalPrompt });
      }
    },
    [activeConvId, isLoading, append],
  );

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
          className="p-0 w-[280px] max-w-[85vw] border-r border-white/5 bg-background"
        >
          <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
          <Sidebar onClose={() => setIsSidebarOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Main Chat Area */}
      <div className="flex flex-col flex-1 min-w-0 relative">
        <header className="flex h-14 items-center gap-2 px-3 sm:px-4 border-b border-white/5 bg-background/95 backdrop-blur-md z-10 flex-shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden h-9 w-9 text-gray-400 hover:text-white"
            onClick={() => setIsSidebarOpen(true)}
            aria-label="Open navigation"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <h1 className="text-sm font-semibold text-gray-200 truncate">Spread AI</h1>
        </header>

        {isDbLoading ? (
          <div
            className="flex-1 flex items-center justify-center"
            aria-label="Loading conversation"
          >
            <div
              className="h-8 w-8 rounded-full border-2 border-purple-500/30 border-t-purple-500 animate-spin"
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
