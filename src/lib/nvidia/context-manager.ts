import { type Message } from 'ai';

const MAX_TOKENS = 8000;
const CHARS_PER_TOKEN = 4;
const MAX_CHARS = MAX_TOKENS * CHARS_PER_TOKEN;

type MessageContentPart =
  | { type: 'text'; text: string }
  | { type: 'image'; image: string };

/**
 * Estimates token count for a message content value.
 * Images are given a flat 1000-token budget (conservative vision estimate).
 */
export function estimateTokens(content: string | MessageContentPart[]): number {
  if (typeof content === 'string') {
    return Math.ceil(content.length / CHARS_PER_TOKEN);
  }
  return content.reduce((acc, part) => {
    if (part.type === 'text') return acc + Math.ceil(part.text.length / CHARS_PER_TOKEN);
    if (part.type === 'image') return acc + 1000;
    return acc;
  }, 0);
}

/**
 * Truncates document content that exceeds the per-message token budget.
 * Preserves the beginning and end of the document (intro + conclusions).
 */
function truncateDocumentContent(content: string): string {
  if (content.length <= MAX_CHARS) return content;
  const halfLength = Math.floor(MAX_CHARS / 2);
  const start = content.slice(0, halfLength);
  const end = content.slice(content.length - halfLength);
  return `${start}\n\n[... content truncated to fit token limit ...]\n\n${end}`;
}

/**
 * Processes a single message content value, applying document truncation where needed.
 */
function processContent(content: string | MessageContentPart[]): string | MessageContentPart[] {
  if (typeof content === 'string') {
    return content.includes('<document') ? truncateDocumentContent(content) : content;
  }
  return content.map((part) => {
    if (part.type === 'text' && part.text.includes('<document')) {
      return { ...part, text: truncateDocumentContent(part.text) };
    }
    return part;
  });
}

/**
 * Trims the conversation history to fit within the MAX_TOKENS context window.
 * Iterates from newest to oldest, inserting a system note when history is dropped.
 */
export async function manageContextWindow(messages: Message[]): Promise<Message[]> {
  let totalTokens = 0;
  const recentMessages: Message[] = [];

  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = { ...messages[i] };
    // Apply document chunking before token estimation
    (msg as any).content = processContent(msg.content as string | MessageContentPart[]);

    const msgTokens = estimateTokens(msg.content as string | MessageContentPart[]);

    if (totalTokens + msgTokens > MAX_TOKENS) {
      // Inject a compression notice rather than silently dropping context
      recentMessages.unshift({
        id: 'ctx-compressed',
        role: 'system',
        content: '[Earlier conversation context was compressed to stay within the model token limit.]',
      } as Message);
      break;
    }

    totalTokens += msgTokens;
    recentMessages.unshift(msg);
  }

  return recentMessages;
}
