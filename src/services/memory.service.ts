import { createClient } from '@/lib/supabase/client';

export interface Memory {
  id: string;
  user_id: string;
  content: string;
  category: string;
  source_message: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const memoryService = {
  async list(): Promise<Memory[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('memories')
      .select('id, user_id, content, category, source_message, is_active, created_at, updated_at')
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) throw new Error(`Failed to fetch memories: ${error.message}`);
    return (data ?? []) as Memory[];
  },

  async add(content: string, category = 'fact', sourceMessage?: string): Promise<Memory> {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const sanitized = content.trim().slice(0, 1000);
    if (!sanitized) throw new Error('Memory content cannot be empty.');

    const { data, error } = await supabase
      .from('memories')
      .insert({
        user_id: user.id,
        content: sanitized,
        category,
        source_message: sourceMessage?.slice(0, 2000) ?? null,
      })
      .select()
      .single();
    if (error) throw new Error(`Failed to save memory: ${error.message}`);
    return data as Memory;
  },

  async forget(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase.from('memories').delete().eq('id', id);
    if (error) throw new Error(`Failed to delete memory: ${error.message}`);
  },

  async clearAll(): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from('memories')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    if (error) throw new Error(`Failed to clear memories: ${error.message}`);
  },

  /**
   * Detect whether a user message contains an instruction to remember something.
   * Returns the extracted memory content, or null if no memory directive is found.
   *
   * Examples that match:
   *   "remember that I work at NVIDIA"
   *   "remember this: my dog is named Max"
   *   "don't forget I prefer TypeScript"
   *   "save this information — I'm allergic to peanuts"
   */
  detectMemoryDirective(message: string): string | null {
    if (!message) return null;

    const patterns: RegExp[] = [
      // "remember this/that: <content>" / "remember that <content>"
      /\bremember\s+(?:this|that)\s*[:\-—]?\s*(.+)$/i,
      // "remember <content>"
      /\bremember\s+(?:that\s+)?(.{8,})$/i,
      // "don't forget <content>" / "do not forget <content>"
      /\b(?:don'?t|do\s+not)\s+forget\s+(?:that\s+)?(.+)$/i,
      // "save this information: <content>" / "save this: <content>"
      /\bsave\s+this(?:\s+information)?\s*[:\-—]?\s*(.+)$/i,
      // "keep in mind that <content>"
      /\bkeep\s+in\s+mind\s+(?:that\s+)?(.+)$/i,
    ];

    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match && match[1]) {
        const cleaned = match[1].trim().replace(/[.!?]+$/, '');
        if (cleaned.length >= 3) return cleaned;
      }
    }
    return null;
  },
};
