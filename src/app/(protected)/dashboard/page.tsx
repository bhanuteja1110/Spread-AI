'use client';

import { ChatLayout } from '@/features/chat/components/chat-layout';
import { ChatStateProvider } from '@/features/chat/context/chat-state-context';

/**
 * /dashboard renders the New Chat experience directly. No redirect, no
 * client-side navigation flicker on mobile — the URL stays exactly as the
 * user navigated to it.
 *
 * Wrapped in ChatStateProvider so the Sidebar (sibling via context) can call
 * `resetChat()` without navigating — eliminating the remount that used to
 * wipe in-flight streams.
 */
export default function DashboardPage() {
  return (
    <ChatStateProvider>
      <ChatLayout />
    </ChatStateProvider>
  );
}
