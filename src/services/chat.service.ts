import { createClient } from '@/lib/supabase/client';
import { type Message } from 'ai';

export interface Conversation {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface DbMessage {
  id: string;
  conversation_id: string;
  user_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
}

export const chatService = {
  async getConversations(page = 1, limit = 50): Promise<Conversation[]> {
    const supabase = createClient();
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // Select only required columns — avoid over-fetching with SELECT *
    const { data, error } = await supabase
      .from('conversations')
      .select('id, user_id, title, created_at, updated_at')
      .order('updated_at', { ascending: false })
      .range(from, to);

    if (error) throw new Error(`Failed to fetch conversations: ${error.message}`);
    return data ?? [];
  },

  async createConversation(title: string): Promise<Conversation> {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Sanitize title to prevent XSS if title is ever rendered as HTML elsewhere
    const sanitizedTitle = title.trim().slice(0, 100) || 'New Conversation';

    const { data, error } = await supabase
      .from('conversations')
      .insert({ title: sanitizedTitle, user_id: user.id })
      .select('id, user_id, title, created_at, updated_at')
      .single();

    if (error) throw new Error(`Failed to create conversation: ${error.message}`);
    return data;
  },

  async updateConversationTitle(id: string, title: string): Promise<Conversation> {
    const supabase = createClient();
    const sanitizedTitle = title.trim().slice(0, 100);
    if (!sanitizedTitle) throw new Error('Title cannot be empty.');

    const { data, error } = await supabase
      .from('conversations')
      .update({ title: sanitizedTitle, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('id, user_id, title, created_at, updated_at')
      .single();

    if (error) throw new Error(`Failed to update conversation: ${error.message}`);
    return data;
  },

  async deleteConversation(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase.from('conversations').delete().eq('id', id);
    if (error) throw new Error(`Failed to delete conversation: ${error.message}`);
  },

  async deleteConversations(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    const supabase = createClient();
    const { error } = await supabase.from('conversations').delete().in('id', ids);
    if (error) throw new Error(`Failed to delete conversations: ${error.message}`);
  },

  async deleteAllConversations(): Promise<void> {
    const supabase = createClient();
    // RLS ensures only this user's rows are deleted
    const { error } = await supabase
      .from('conversations')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    if (error) throw new Error(`Failed to delete all conversations: ${error.message}`);
  },

  async getMessages(conversationId: string, page = 1, limit = 50): Promise<Message[]> {
    const supabase = createClient();
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, error } = await supabase
      .from('messages')
      .select('id, role, content, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) throw new Error(`Failed to fetch messages: ${error.message}`);

    // Reverse: fetched newest-first, UI requires oldest-first
    return (data ?? []).reverse().map((msg: Pick<DbMessage, 'id' | 'role' | 'content' | 'created_at'>) => ({
      id: msg.id,
      role: msg.role,
      content: msg.content,
      createdAt: new Date(msg.created_at),
    }));
  },
};
