import { streamText, type Message } from 'ai';
import { nvidiaClient, DEFAULT_NVIDIA_MODEL, DEFAULT_VISION_MODEL } from '@/lib/nvidia/client';
import { manageContextWindow } from '@/lib/nvidia/context-manager';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Matches Vercel's Fluid compute max — ensures streams don't time out mid-response
export const maxDuration = 60;

const FREE_TIER_LIMIT = 50;

const SYSTEM_PROMPT =
  'You are Spread AI, a highly advanced AI assistant and coding engine. ' +
  'You were founded by Bhanuteja. ' +
  'You offer three intelligence modes: Spread Fast (low-latency tasks), ' +
  'Spread Smart (deep reasoning & architecture), and Spread Creative (multimodal vision & creativity). ' +
  'You support file uploads (PDF, DOCX, TXT, Images), voice input, and a usage dashboard. ' +
  'Be concise, accurate, and helpful. Format code in fenced code blocks with the correct language tag.';

// Regex compiled once at module level — not on every request
const IMAGE_URL_REGEX = /\[Attached Image: .*? - (https?:\/\/[^\]]+)\]/g;
const HAS_IMAGE_REGEX = /\[Attached Image:/;

interface ChatRequestBody {
  messages: Message[];
  conversationId: string;
}

export async function POST(req: Request): Promise<Response> {
  try {
    // --- Parse & Validate Input ---
    let body: ChatRequestBody;
    try {
      body = (await req.json()) as ChatRequestBody;
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
    }

    const { messages, conversationId } = body;

    if (!conversationId || typeof conversationId !== 'string') {
      return NextResponse.json({ error: 'conversationId is required.' }, { status: 400 });
    }
    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'messages array is required.' }, { status: 400 });
    }

    // --- Auth ---
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    // --- Ownership validation: Ensure the conversation belongs to this user ---
    const { data: conv, error: convError } = await supabase
      .from('conversations')
      .select('id')
      .eq('id', conversationId)
      .eq('user_id', user.id)
      .single();

    if (convError || !conv) {
      return NextResponse.json({ error: 'Conversation not found or access denied.' }, { status: 403 });
    }

    // --- Atomic Quota Enforcement ---
    const { data: quotaCheck, error: rpcError } = await supabase.rpc('increment_user_usage', {
      p_user_id: user.id,
      p_max_limit: FREE_TIER_LIMIT,
    });

    if (rpcError) {
      console.error('Usage RPC error:', rpcError);
      return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
    }

    if (quotaCheck?.allowed === false) {
      return new Response(
        JSON.stringify({
          error: 'QUOTA_EXCEEDED',
          message: `You have reached your daily limit of ${FREE_TIER_LIMIT} messages. Upgrade for unlimited access.`,
        }),
        { status: 429, headers: { 'Content-Type': 'application/json' } },
      );
    }

    // --- Persist User Message ---
    const latestMessage = messages[messages.length - 1];
    if (latestMessage?.role === 'user') {
      const contentToSave =
        typeof latestMessage.content === 'string'
          ? latestMessage.content
          : JSON.stringify(latestMessage.content);

      // Fire-and-forget — don't block the stream on DB write
      supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          user_id: user.id,
          role: 'user',
          content: contentToSave,
        })
        .then(({ error }) => {
          if (error) console.error('Failed to persist user message:', error);
        });

      supabase
        .from('conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', conversationId)
        .then(({ error }) => {
          if (error) console.error('Failed to update conversation timestamp:', error);
        });
    }

    // --- Multimodal Vision Detection & Message Transformation ---
    let requiresVision = false;
    const processedMessages = messages.map((msg) => {
      if (
        msg.role === 'user' &&
        typeof msg.content === 'string' &&
        HAS_IMAGE_REGEX.test(msg.content)
      ) {
        requiresVision = true;
        const parts: Array<{ type: 'text' | 'image'; text?: string; image?: string }> = [];
        const cleanText = msg.content.replace(IMAGE_URL_REGEX, '').trim();

        if (cleanText) {
          parts.push({ type: 'text', text: cleanText });
        } else {
          parts.push({ type: 'text', text: 'Please analyze this image carefully.' });
        }

        // Extract all image URLs from this message
        const imageMatches = Array.from(msg.content.matchAll(IMAGE_URL_REGEX));
        for (const match of imageMatches) {
          parts.push({ type: 'image', image: match[1] });
        }

        return { ...msg, content: parts };
      }
      return msg;
    });

    const optimizedMessages = await manageContextWindow(processedMessages as Message[]);
    const selectedModel = requiresVision ? DEFAULT_VISION_MODEL : DEFAULT_NVIDIA_MODEL;

    // --- Stream AI Response ---
    const result = await streamText({
      model: nvidiaClient(selectedModel),
      messages: optimizedMessages,
      system: SYSTEM_PROMPT,
      maxRetries: 2,
      temperature: 0.7,
      async onFinish({ text }) {
        if (!text) return;
        const { error } = await supabase.from('messages').insert({
          conversation_id: conversationId,
          user_id: user.id,
          role: 'assistant',
          content: text,
        });
        if (error) console.error('Failed to persist assistant message:', error);
      },
    });

    return result.toDataStreamResponse();
  } catch (error: unknown) {
    console.error('Chat API error:', error);
    const message = error instanceof Error ? error.message : 'An internal server error occurred.';

    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json({ error: 'Request timed out.' }, { status: 504 });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
