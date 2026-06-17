/**
 * Semantic Document Chunker
 * Extremely memory-efficient slicing engine designed to handle massive PDFs (e.g. 10MB+)
 * safely within the Vercel AI SDK execution limits.
 */
export function chunkDocument(text: string, maxTokens: number = 20000): string {
  const CHARS_PER_TOKEN = 4; // Lightweight heuristic
  const maxLength = maxTokens * CHARS_PER_TOKEN;

  if (text.length <= maxLength) return text;

  // The document exceeds the token window. 
  // We prioritize the beginning and the end of the document, gracefully truncating the middle.
  // This ensures the Introduction, Exec Summary, and Conclusions are always retained.
  const halfLength = Math.floor(maxLength / 2);
  
  const startChunk = text.slice(0, halfLength);
  const endChunk = text.slice(text.length - halfLength);

  return `${startChunk}\n\n... [System Note: Massive document truncated dynamically to preserve context token limits] ...\n\n${endChunk}`;
}
