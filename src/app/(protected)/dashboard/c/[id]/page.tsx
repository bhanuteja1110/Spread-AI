import { ChatLayout } from '@/features/chat/components/chat-layout';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dashboard | Spread AI',
  description: 'AI Chat Interface',
};

export default function ChatPage({ params }: { params: { id: string } }) {
  return <ChatLayout conversationId={params.id} />;
}
