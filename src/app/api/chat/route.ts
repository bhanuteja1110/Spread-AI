import { streamText, type Message, type CoreMessage } from 'ai';
import { nvidiaClient, DEFAULT_NVIDIA_MODEL, DEFAULT_VISION_MODEL } from '@/lib/nvidia/client';
import { manageContextWindow, type MessageContentPart } from '@/lib/nvidia/context-manager';
import { memoryService } from '@/services/memory.service';
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
// Matches the hidden image_url block (model-only context) in user messages.
const IMAGE_URL_REGEX = /<image_url>([\s\S]*?)<\/image_url>/g;
// Marker indicating the user attached an image (without revealing the URL).
const HAS_IMAGE_REGEX = /\[Attached Image:/;
// Old format kept for backward compatibility with previously-stored messages.
const LEGACY_IMAGE_REGEX = /\[Attached Image: .*? - (https?:\/\/[^\]]+)\]/g;

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

    // --- Resolve or create the conversation ---
    // Two cases:
    //   (a) Client sent a real id → verify ownership
    //   (b) Client sent nothing (first message of new chat, race condition)
    //       → create the conversation server-side using the user's first message as title
    let resolvedConvId = typeof conversationId === 'string' && conversationId.length > 0
      ? conversationId
      : null;

    if (resolvedConvId) {
      const { data: conv, error: convError } = await supabase
        .from('conversations')
        .select('id')
        .eq('id', resolvedConvId)
        .eq('user_id', user.id)
        .single();

      if (convError || !conv) {
        // Stale or invalid id — fall through and create fresh
        console.warn('[chat] conversation id invalid, recreating:', resolvedConvId);
        resolvedConvId = null;
      }
    }

    if (!resolvedConvId) {
      const latestUserMessage = [...messages].reverse().find((m) => m.role === 'user');
      const fallbackTitle =
        typeof latestUserMessage?.content === 'string'
          ? latestUserMessage.content.trim().slice(0, 50) || 'New chat'
          : 'New chat';

      const { data: newConv, error: createError } = await supabase
        .from('conversations')
        .insert({ user_id: user.id, title: fallbackTitle })
        .select('id')
        .single();

      if (createError || !newConv) {
        console.error('[chat] conversation create failed:', createError);
        return NextResponse.json(
          { error: 'Failed to start conversation.', code: 'CONV_CREATE_FAILED' },
          { status: 500 },
        );
      }
      resolvedConvId = newConv.id;
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
          conversation_id: resolvedConvId,
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
        .eq('id', resolvedConvId)
        .then(({ error }) => {
          if (error) console.error('Failed to update conversation timestamp:', error);
        });

      // --- Memory: detect "remember this" directives and persist them ---
      if (typeof latestMessage.content === 'string') {
        const memoryDirective = memoryService.detectMemoryDirective(latestMessage.content);
        if (memoryDirective) {
          // Async — never blocks the response stream
          memoryService
            .add(memoryDirective, 'user-fact', latestMessage.content)
            .then(() => {
              /* memory saved */
            })
            .catch((err) => console.error('[memory] save failed:', err));
        }
      }
    }

    // --- Memory: retrieve user's long-term memories to ground the response ---
    let memoryContext = '';
    try {
      const { data: memories } = await supabase.rpc('get_active_memories', {
        p_user_id: user.id,
      });
      if (memories && memories.length > 0) {
        memoryContext =
          '\n\nUser-stored memories (use these to personalize responses):\n' +
          memories
            .map((m: { content: string }) => `- ${m.content}`)
            .join('\n');
      }
    } catch (err) {
      console.error('[memory] retrieval failed:', err);
    }

    // --- Multimodal Vision Detection & Server-Side Image Buffer Fetching ---
    // Why: NVIDIA NIM vision models often block outbound networking (meaning they can't fetch external URLs).
    // To ensure the model sees the image, we download the signed URL into a Uint8Array.
    // The AI SDK will automatically encode this as base64 in the request payload.
    //
    // Image URL sources (in priority order):
    //   1. <image_url>...</image_url>   ← current chat-input format
    //   2. [Attached Image: name - URL]   ← legacy format for old stored messages
    let requiresVision = false;
    const processedMessages = await Promise.all(
      messages.map(async (msg): Promise<CoreMessage> => {
        if (
          msg.role === 'user' &&
          typeof msg.content === 'string' &&
          HAS_IMAGE_REGEX.test(msg.content)
        ) {
          requiresVision = true;
          const parts: MessageContentPart[] = [];
          // Strip BOTH the new <image_url> block and the legacy [Attached Image: ... - URL]
          // for the text portion — the model only needs the user's words + the image binary.
          const cleanText = msg.content
            .replace(IMAGE_URL_REGEX, '')
            .replace(LEGACY_IMAGE_REGEX, '')
            .trim();

          if (cleanText) {
            parts.push({ type: 'text', text: cleanText });
          } else {
            parts.push({ type: 'text', text: 'Please analyze this image carefully.' });
          }

          // Collect image URLs from either format
          const urls: string[] = [];
          for (const m of Array.from(msg.content.matchAll(IMAGE_URL_REGEX))) urls.push(m[1]);
          for (const m of Array.from(msg.content.matchAll(LEGACY_IMAGE_REGEX))) urls.push(m[1]);

          for (const url of urls) {
            try {
              const res = await fetch(url);
              if (!res.ok) throw new Error(`HTTP ${res.status}`);
              const buffer = await res.arrayBuffer();
              parts.push({ type: 'image', image: new Uint8Array(buffer) });
            } catch (err) {
              console.error('Failed to download image buffer, falling back to URL:', err);
              parts.push({ type: 'image', image: url }); // graceful fallback
            }
          }

          return { role: 'user', content: parts } as CoreMessage;
        }

        // Standardize format to strictly CoreMessage for the AI SDK
        return { role: msg.role, content: msg.content } as CoreMessage;
      })
    );

    const optimizedMessages = await manageContextWindow(processedMessages) as CoreMessage[];
    const selectedModel = requiresVision ? DEFAULT_VISION_MODEL : DEFAULT_NVIDIA_MODEL;

    // --- Stream AI Response ---
    const result = await streamText({
      model: nvidiaClient(selectedModel),
      messages: optimizedMessages,
      system: SYSTEM_PROMPT + memoryContext,
      maxRetries: 2,
      temperature: 0.7,
      async onFinish({ text }) {
        if (!text) return;
        const { error } = await supabase.from('messages').insert({
          conversation_id: resolvedConvId,
          user_id: user.id,
          role: 'assistant',
          content: text,
        });
        if (error) console.error('Failed to persist assistant message:', error);
      },
    });

    const streamResponse = result.toDataStreamResponse();
    // Echo the resolved conversation id so the client can update its URL
    // even if it started with no id (e.g. optimistic race on first message).
    streamResponse.headers.set('x-conversation-id', resolvedConvId!);
    return streamResponse;
  } catch (error: unknown) {
    console.error('Chat API error:', error);
    const message = error instanceof Error ? error.message : 'An internal server error occurred.';

    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json({ error: 'Request timed out.' }, { status: 504 });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
