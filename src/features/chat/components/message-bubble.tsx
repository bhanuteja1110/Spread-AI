'use client';

import React, { memo, useCallback, useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { type Message } from 'ai';
import { Copy, Check, RefreshCw, AlertTriangle, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

const MarkdownRenderer = memo(
  React.lazy(() =>
    import('./markdown-renderer').then((mod) => ({ default: mod.MarkdownRenderer })),
  ),
);
MarkdownRenderer.displayName = 'MarkdownRenderer';

interface MessageBubbleProps {
  message: Message;
  userAvatarUrl?: string;
  userName?: string;
  onRetry?: () => void;
  isLast?: boolean;
}

function MessageBubbleImpl({ message, userAvatarUrl, userName, onRetry }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);
  const [markdownReady, setMarkdownReady] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(
        typeof message.content === 'string' ? message.content : JSON.stringify(message.content),
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error('Failed to copy.');
    }
  }, [message.content]);

  // Defer mounting MarkdownRenderer until idle so first-paint stays fast
  useEffect(() => {
    if (isUser) return;
    if (typeof window === 'undefined') return;
    if ('requestIdleCallback' in window) {
      const id = (window as any).requestIdleCallback(() => setMarkdownReady(true), {
        timeout: 250,
      });
      return () => (window as any).cancelIdleCallback?.(id);
    }
    const t = setTimeout(() => setMarkdownReady(true), 80);
    return () => clearTimeout(t);
  }, [isUser]);

  const initials = userName ? userName.slice(0, 2).toUpperCase() : 'U';
  const isFailed = (message as any).error === true;

  // ----- USER MESSAGE (right-aligned compact bubble) -----
  if (isUser) {
    return (
      <div
        role="article"
        aria-label="Your message"
        className="group flex justify-end w-full px-3 sm:px-4 py-1.5"
      >
        <div className="flex items-end gap-2 max-w-[85%] sm:max-w-[75%]">
          <button
            onClick={handleCopy}
            aria-label={copied ? 'Copied!' : 'Copy message'}
            className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40 self-end mb-0.5"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
          <div
            className={cn(
              'rounded-2xl rounded-br-md px-3.5 py-2.5 text-sm leading-relaxed',
              'bg-primary text-primary-foreground whitespace-pre-wrap break-words',
              'shadow-sm',
            )}
          >
            {message.content as string}
          </div>
        </div>
      </div>
    );
  }

  // ----- AI MESSAGE (left-aligned, full width, generous typography) -----
  return (
    <div
      role="article"
      aria-label="Spread AI response"
      className="group flex w-full gap-3 px-3 sm:px-5 py-3"
    >
      <div className="flex-shrink-0 pt-0.5">
        <div
          aria-hidden
          className="h-7 w-7 rounded-full bg-primary flex items-center justify-center"
        >
          <Sparkles className="h-3.5 w-3.5 text-primary-foreground" />
        </div>
      </div>

      <div className="flex-1 min-w-0 overflow-hidden">
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="text-xs font-medium text-muted-foreground">Spread AI</span>
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                aria-label="Retry response"
                className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={handleCopy}
              aria-label={copied ? 'Copied!' : 'Copy message'}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>

        {isFailed ? (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
          >
            <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" aria-hidden />
            <div className="flex-1">
              <p className="font-medium">Failed to get a response.</p>
              {onRetry && (
                <button
                  type="button"
                  onClick={onRetry}
                  className="mt-1 text-xs underline underline-offset-2 hover:no-underline"
                >
                  Try again
                </button>
              )}
            </div>
          </div>
        ) : markdownReady ? (
          <div className="prose prose-sm sm:prose-base dark:prose-invert max-w-none text-foreground leading-relaxed break-words">
            <MarkdownRenderer content={message.content as string} />
          </div>
        ) : (
          <div className="space-y-2 animate-pulse" aria-hidden>
            <div className="h-3.5 w-11/12 rounded bg-muted" />
            <div className="h-3.5 w-9/12 rounded bg-muted" />
            <div className="h-3.5 w-10/12 rounded bg-muted" />
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Memoized: only re-render the specific message that changed.
 * Streaming tokens update the streaming message in place; siblings stay frozen.
 */
export const MessageBubble = memo(
  MessageBubbleImpl,
  (prev, next) =>
    prev.message.id === next.message.id &&
    prev.message.content === next.message.content &&
    prev.userAvatarUrl === next.userAvatarUrl &&
    prev.onRetry === next.onRetry &&
    prev.isLast === next.isLast,
);
