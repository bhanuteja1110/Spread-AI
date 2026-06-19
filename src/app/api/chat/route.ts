import { streamText, type Message, type CoreMessage } from 'ai';
import { nvidiaClient, DEFAULT_NVIDIA_MODEL, DEFAULT_VISION_MODEL } from '@/lib/nvidia/client';
import { manageContextWindow, type MessageContentPart } from '@/lib/nvidia/context-manager';
import { memoryService } from '@/services/memory.service';
import { tavilySearch, formatSourcesForPrompt } from '@/lib/tavily/search';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const TAG = '[chat-route]';
function log(stage: string, extra?: Record<string, unknown>) {
  // eslint-disable-next-line no-console
  console.log(`${TAG} ${stage}`, extra ? JSON.stringify(extra) : '');
}

function elapsed(start: number) {
  return `${(performance.now() - start).toFixed(1)}ms`;
}

// Node.js runtime — chosen over Edge for compatibility with @supabase/ssr
// cookie writes during streaming responses. Edge can have inconsistent
// cookie-flow behavior with `toDataStreamResponse()`, which manifests as
// a request that hangs forever (browser shows "Generating…" but no
// response/error ever arrives).
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Vercel Node runtime caps: Hobby 60s, Pro 300s. Default to 60s which
// works on all plans. Increase on Pro for longer responses.
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
const IMAGE_URL_REGEX = /<image_url>([\s\S]*?)<\/image_url>/g;
const HAS_IMAGE_REGEX = /\[Attached Image:/;
const LEGACY_IMAGE_REGEX = /\[Attached Image: .*? - (https?:\/\/[^\]]+)\]/g;

interface ChatRequestBody {
  messages: Message[];
  conversationId: string;
  webSearch?: boolean;
}

export async function POST(req: Request): Promise<Response> {
  const requestId = crypto.randomUUID();
  const t0 = performance.now();
  log('received', { requestId });

  try {
    // --- Parse & Validate Input ---
    let body: ChatRequestBody;
    try {
      body = (await req.json()) as ChatRequestBody;
    } catch (parseErr) {
      log('invalid-json', { requestId });
      return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
    }

    const { messages, conversationId, webSearch } = body;
    log('parsed-body', {
      requestId,
      messageCount: messages?.length,
      conversationId,
      webSearch: !!webSearch,
    });

    if (!Array.isArray(messages) || messages.length === 0) {
      log('empty-messages', { requestId });
      return NextResponse.json({ error: 'messages array is required.' }, { status: 400 });
    }

    // --- Auth ---
    const supabase = createClient();
    const tAuth = performance.now();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      log('auth-failed', { requestId, error: authError?.message });
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }
    log('auth-ok', { requestId, userId: user.id, dur: elapsed(tAuth) });

    // --- Resolve or create the conversation ---
    // PERFORMANCE: while we resolve/create the conversation we kick off the
    // memory retrieval and Tavily search in parallel — these three are
    // independent and can save 300-800ms of serial latency.
    const latestMessage = messages[messages.length - 1];
    const latestUserMessage = [...messages].reverse().find((m) => m.role === 'user');
    const fallbackTitle =
      typeof latestUserMessage?.content === 'string'
        ? latestUserMessage.content.trim().slice(0, 50) || 'New chat'
        : 'New chat';

    const tConv = performance.now();
    const convPromise = (async (): Promise<string | null> => {
      let resolvedConvId =
        typeof conversationId === 'string' && conversationId.length > 0
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
          log('conv-not-found', { requestId, staleId: resolvedConvId });
          resolvedConvId = null;
        }
      }

      if (!resolvedConvId) {
        const { data: newConv, error: createError } = await supabase
          .from('conversations')
          .insert({ user_id: user.id, title: fallbackTitle })
          .select('id')
          .single();

        if (createError || !newConv) {
          log('conv-create-failed', { requestId, error: createError?.message });
          return null;
        }
        resolvedConvId = newConv.id;
      }
      return resolvedConvId;
    })();

    const memPromise = (async (): Promise<string> => {
      const tMem = performance.now();
      try {
        const { data: memories } = await supabase.rpc('get_active_memories', {
          p_user_id: user.id,
        });
        if (memories && memories.length > 0) {
          log('memories-loaded', { requestId, count: memories.length, dur: elapsed(tMem) });
          return (
            '\n\nUser-stored memories (use these to personalize responses):\n' +
            memories.map((m: { content: string }) => `- ${m.content}`).join('\n')
          );
        }
      } catch (err) {
        log('memory-load-failed', { requestId, error: String(err) });
      }
      return '';
    })();

    const webPromise = (async (): Promise<{ context: string; sources: { title: string; url: string; sourceIndex: number }[] }> => {
      if (!webSearch) return { context: '', sources: [] };
      const tWeb = performance.now();
      log('tavily-started', { requestId });
      const rawQuery =
        typeof latestUserMessage?.content === 'string' ? latestUserMessage.content : '';
      const query = rawQuery
        .replace(IMAGE_URL_REGEX, '')
        .replace(LEGACY_IMAGE_REGEX, '')
        .replace(/<document[\s\S]*?<\/document>/g, '')
        .replace(/\[Attached Image:[^\]]*\]/g, '')
        .trim();

      if (!query) {
        log('tavily-skipped-empty-query', { requestId });
        return { context: '', sources: [] };
      }
      try {
        const result = await tavilySearch(query, { maxResults: 5 });
        const context = formatSourcesForPrompt(result);
        const sources = result.sources.map((s, i) => ({
          title: s.title,
          url: s.url,
          sourceIndex: i + 1,
        }));
        log('tavily-finished', { requestId, sourceCount: sources.length, query, dur: elapsed(tWeb) });
        return { context, sources };
      } catch (err) {
        log('tavily-failed', { requestId, error: String(err) });
        return { context: '', sources: [] };
      }
    })();

    const [resolvedConvId, memoryContext, webResult] = await Promise.all([
      convPromise,
      memPromise,
      webPromise,
    ]);

    if (!resolvedConvId) {
      return NextResponse.json(
        { error: 'Failed to start conversation.', code: 'CONV_CREATE_FAILED' },
        { status: 500 },
      );
    }
    const { context: webSearchContext, sources: webSources } = webResult;
    log('conv-resolved', { requestId, convId: resolvedConvId, dur: elapsed(tConv) });

    // --- Atomic Quota Enforcement ---
    const { data: quotaCheck, error: rpcError } = await supabase.rpc('increment_user_usage', {
      p_user_id: user.id,
      p_max_limit: FREE_TIER_LIMIT,
    });

    if (rpcError) {
      log('quota-rpc-error', { requestId, error: rpcError.message });
      return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
    }

    if (quotaCheck?.allowed === false) {
      log('quota-exceeded', { requestId });
      return new Response(
        JSON.stringify({
          error: 'QUOTA_EXCEEDED',
          message: `You have reached your daily limit of ${FREE_TIER_LIMIT} messages. Upgrade for unlimited access.`,
        }),
        { status: 429, headers: { 'Content-Type': 'application/json' } },
      );
    }

    // --- Persist User Message (fire-and-forget) ---
    if (latestMessage?.role === 'user') {
      const contentToSave =
        typeof latestMessage.content === 'string'
          ? latestMessage.content
          : JSON.stringify(latestMessage.content);

      supabase
        .from('messages')
        .insert({
          conversation_id: resolvedConvId,
          user_id: user.id,
          role: 'user',
          content: contentToSave,
        })
        .then(({ error }) => {
          if (error) log('persist-user-msg-failed', { requestId, error: error.message });
        });

      supabase
        .from('conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', resolvedConvId)
        .then(({ error }) => {
          if (error) log('update-conv-failed', { requestId, error: error.message });
        });

      // Memory: detect "remember this" directives
      if (typeof latestMessage.content === 'string') {
        const memoryDirective = memoryService.detectMemoryDirective(latestMessage.content);
        if (memoryDirective) {
          memoryService
            .add(memoryDirective, 'user-fact', latestMessage.content)
            .then(() => log('memory-saved', { requestId }))
            .catch((err) => log('memory-save-failed', { requestId, error: String(err) }));
        }
      }
    }

    // --- Multimodal vision processing ---
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
          const cleanText = msg.content
            .replace(IMAGE_URL_REGEX, '')
            .replace(LEGACY_IMAGE_REGEX, '')
            .trim();

          if (cleanText) {
            parts.push({ type: 'text', text: cleanText });
          } else {
            parts.push({ type: 'text', text: 'Please analyze this image carefully.' });
          }

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
              log('image-download-failed', { requestId, url, error: String(err) });
              parts.push({ type: 'image', image: url });
            }
          }

          return { role: 'user', content: parts } as CoreMessage;
        }

        return { role: msg.role, content: msg.content } as CoreMessage;
      }),
    );

    const optimizedMessages = (await manageContextWindow(processedMessages)) as CoreMessage[];
    const selectedModel = requiresVision ? DEFAULT_VISION_MODEL : DEFAULT_NVIDIA_MODEL;
    log('model-selected', { requestId, model: selectedModel, requiresVision });

    // --- Stream AI Response ---
    log('model-request-started', { requestId, model: selectedModel });

    const result = await streamText({
      model: nvidiaClient(selectedModel),
      messages: optimizedMessages,
      system:
        SYSTEM_PROMPT +
        memoryContext +
        (webSearchContext
          ? `\n\nWhen citing web sources, use [n] notation inline (e.g. "According to [1]…"). End your reply with a "Sources:" section listing each cited [n] with its title and URL.${webSearchContext}`
          : ''),
      maxRetries: 2,
      temperature: 0.7,
      async onChunk({ chunk }) {
        // Fires on the first text chunk — confirms streaming is live
        if (chunk.type === 'text-delta') {
          log('first-token-received', { requestId });
        }
      },
      async onFinish({ text }) {
        log('stream-finished', {
          requestId,
          length: text?.length ?? 0,
          hasText: !!text,
        });

        if (!text) {
          log('stream-finished-empty', { requestId });
          return;
        }

        let contentToPersist = text;
        if (webSources.length > 0) {
          const sourcesBlock =
            '\n\n---\nSources:\n' +
            webSources.map((s) => `[${s.sourceIndex}] ${s.title} — ${s.url}`).join('\n');
          contentToPersist = text + sourcesBlock;
        }

        const { error } = await supabase.from('messages').insert({
          conversation_id: resolvedConvId,
          user_id: user.id,
          role: 'assistant',
          content: contentToPersist,
        });
        if (error) {
          log('persist-assistant-failed', { requestId, error: error.message });
        } else {
          log('response-persisted', { requestId });
        }
      },
      async onError({ error }) {
        log('model-stream-error', {
          requestId,
          error: error instanceof Error ? error.message : String(error),
        });
      },
    });

    log('stream-text-returned', { requestId });

    const streamResponse = result.toDataStreamResponse();
    streamResponse.headers.set('x-conversation-id', resolvedConvId!);
    streamResponse.headers.set('x-request-id', requestId);
    streamResponse.headers.set('x-server-timing', `total;dur=${(performance.now() - t0).toFixed(0)}`);
    log('response-headers-set', { requestId, convId: resolvedConvId, totalDur: elapsed(t0) });

    return streamResponse;
  } catch (error: unknown) {
    log('fatal-error', {
      requestId,
      error: error instanceof Error ? error.message : String(error),
      name: error instanceof Error ? error.name : 'unknown',
      totalDur: elapsed(t0),
    });
    const message = error instanceof Error ? error.message : 'An internal server error occurred.';

    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json({ error: 'Request timed out.' }, { status: 504 });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
