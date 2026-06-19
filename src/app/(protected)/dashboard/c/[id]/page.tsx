import { ChatLayout } from '@/features/chat/components/chat-layout';
import { ChatStateProvider } from '@/features/chat/context/chat-state-context';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dashboard | Spread AI',
  description: 'AI Chat Interface',
};

export default function ChatPage({ params }: { params: { id: string } }) {
  return (
    <ChatStateProvider>
      <ChatLayout conversationId={params.id} />
    </ChatStateProvider>
  );
}
