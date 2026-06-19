'use client';

import React from 'react';
import { FileText, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Parses user message content for attached file references and renders them
 * as clean filename pills. The stored content keeps the original markup
 * (for AI context), but the UI never shows raw Supabase signed URLs.
 *
 * Recognised markers (produced by chat-input.tsx):
 *   [Attached Image: filename]
 *   <document title="filename">...extracted text...</document>
 *
 * The markers are stripped from the rendered text; only the filename pill
 * is shown, followed by the user's typed text (if any).
 */

interface ParsedSegment {
  kind: 'text' | 'image' | 'document';
  text?: string;
  filename?: string;
}

const IMAGE_REGEX = /\[Attached Image:\s*([^\]]+?)\s*\]/g;
// Matches <document title="...">...</document> with balanced newlines
const DOCUMENT_REGEX = /<document\s+title="([^"]+)">([\s\S]*?)<\/document>/g;
// Hidden URL blocks (model-only context) — stripped from rendered output
const IMAGE_URL_REGEX = /<image_url>[\s\S]*?<\/image_url>/g;

function parseContent(raw: string): ParsedSegment[] {
  if (!raw) return [];
  // Pre-strip hidden URL blocks — these are model-only context, never shown
  const sanitized = raw.replace(IMAGE_URL_REGEX, '');

  // Collect matches in order
  type Match = { index: number; length: number; segment: ParsedSegment };
  const matches: Match[] = [];

  let m: RegExpExecArray | null;
  IMAGE_REGEX.lastIndex = 0;
  while ((m = IMAGE_REGEX.exec(sanitized)) !== null) {
    matches.push({
      index: m.index,
      length: m[0].length,
      segment: { kind: 'image', filename: m[1] },
    });
  }

  DOCUMENT_REGEX.lastIndex = 0;
  while ((m = DOCUMENT_REGEX.exec(sanitized)) !== null) {
    matches.push({
      index: m.index,
      length: m[0].length,
      segment: { kind: 'document', filename: m[1] },
    });
  }

  // Sort matches by position
  matches.sort((a, b) => a.index - b.index);

  // Build segments
  const segments: ParsedSegment[] = [];
  let cursor = 0;
  for (const match of matches) {
    if (match.index > cursor) {
      const text = sanitized.slice(cursor, match.index).trim();
      if (text) segments.push({ kind: 'text', text });
    }
    segments.push(match.segment);
    cursor = match.index + match.length;
  }
  if (cursor < sanitized.length) {
    const text = sanitized.slice(cursor).trim();
    if (text) segments.push({ kind: 'text', text });
  }

  return segments;
}

function AttachmentPill({
  filename,
  kind,
  variant,
}: {
  filename: string;
  kind: 'image' | 'document';
  variant: 'user' | 'assistant';
}) {
  const Icon = kind === 'image' ? ImageIcon : FileText;
  const label = kind === 'image' ? 'Image' : 'Document';

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 align-middle rounded-md px-2 py-1 text-xs font-medium border',
        variant === 'user'
          ? 'bg-primary-foreground/15 border-primary-foreground/25 text-primary-foreground'
          : 'bg-muted border-border text-foreground',
      )}
      title={filename}
    >
      <Icon className="h-3 w-3 flex-shrink-0" aria-hidden />
      <span className="text-[10px] uppercase tracking-wide opacity-70">{label}</span>
      <span className="max-w-[140px] truncate">{filename}</span>
    </span>
  );
}

export function UserMessageBody({ content, className }: { content: string; className?: string }) {
  const segments = parseContent(content);

  // No file markers → render as plain text
  if (segments.length === 0 || (segments.length === 1 && segments[0].kind === 'text')) {
    return (
      <span className={cn('whitespace-pre-wrap break-words', className)}>
        {segments[0]?.text ?? content}
      </span>
    );
  }

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {segments.map((seg, i) => {
        if (seg.kind === 'text') {
          return (
            <span key={i} className="whitespace-pre-wrap break-words">
              {seg.text}
            </span>
          );
        }
        return (
          <AttachmentPill
            key={i}
            filename={seg.filename!}
            kind={seg.kind}
            variant="user"
          />
        );
      })}
    </div>
  );
}

export function AssistantMessageBody({ content }: { content: string }) {
  // AI responses may reference attached documents inline. We leave content
  // untouched — the markdown renderer handles `[Attached Image: ...]` etc.
  return <span className="whitespace-pre-wrap break-words">{content}</span>;
}
