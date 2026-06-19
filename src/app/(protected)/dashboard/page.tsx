'use client';

import { ChatLayout } from '@/features/chat/components/chat-layout';

/**
 * /dashboard renders the New Chat experience directly. No redirect, no
 * client-side navigation flicker on mobile — the URL stays exactly as the
 * user navigated to it.
 */
export default function DashboardPage() {
  return <ChatLayout />;
}
