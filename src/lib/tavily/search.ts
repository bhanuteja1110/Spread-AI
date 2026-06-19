import { env } from '@/lib/env';

export interface TavilySource {
  title: string;
  url: string;
  content: string;
  score?: number;
  publishedDate?: string;
}

export interface TavilySearchResult {
  query: string;
  sources: TavilySource[];
  answer?: string;
}

interface TavilyApiResponse {
  query: string;
  results: Array<{
    title: string;
    url: string;
    content: string;
    score?: number;
    published_date?: string;
  }>;
  answer?: string;
}

const TAVILY_ENDPOINT = 'https://api.tavily.com/search';
const REQUEST_TIMEOUT_MS = 15_000;

/**
 * Run a Tavily web search and return normalized sources.
 *
 * Fails gracefully — returns `{ sources: [] }` if the API key is missing,
 * the request fails, or the response is malformed. We never want to block
 * the chat response just because search isn't available.
 */
export async function tavilySearch(
  query: string,
  options?: { maxResults?: number },
): Promise<TavilySearchResult> {
  const apiKey = env.TAVILY_API_KEY;
  if (!apiKey) {
    return { query, sources: [] };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(TAVILY_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        max_results: Math.min(Math.max(options?.maxResults ?? 5, 1), 10),
        search_depth: 'basic',
        include_answer: false,
        topic: 'general',
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      console.warn('[tavily] non-2xx response:', response.status);
      return { query, sources: [] };
    }

    const data = (await response.json()) as TavilyApiResponse;
    const sources: TavilySource[] = (data.results ?? []).map((r) => ({
      title: r.title,
      url: r.url,
      content: r.content,
      score: r.score,
      publishedDate: r.published_date,
    }));

    return { query: data.query || query, sources, answer: data.answer };
  } catch (err) {
    if ((err as Error).name === 'AbortError') {
      console.warn('[tavily] search timed out');
    } else {
      console.error('[tavily] search failed:', err);
    }
    return { query, sources: [] };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Format Tavily sources into a context block that can be injected into
 * the AI system prompt. Each source gets a citation number that the model
 * can reference as [1], [2], etc.
 */
export function formatSourcesForPrompt(result: TavilySearchResult): string {
  if (!result.sources.length) return '';

  const lines: string[] = [
    '',
    'Web search results (cite sources using [n] notation, e.g. "According to [1]…"):',
    '',
  ];

  result.sources.forEach((src, idx) => {
    const citationNumber = idx + 1;
    const date = src.publishedDate ? ` (${src.publishedDate})` : '';
    lines.push(`[${citationNumber}] ${src.title}${date}`);
    lines.push(`    ${src.url}`);
    lines.push(`    ${src.content.slice(0, 500)}`);
    lines.push('');
  });

  return lines.join('\n');
}
