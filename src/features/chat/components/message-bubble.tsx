'use client';

import React, { memo, useCallback, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import dynamic from 'next/dynamic';
import { cn } from '@/lib/utils';
import { type Message } from 'ai';
import { Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

// Heavy markdown + syntax highlighter loaded asynchronously — zero bundle impact on initial load
const MarkdownRenderer = dynamic(
  () => import('./markdown-renderer').then((mod) => mod.MarkdownRenderer),
  {
    ssr: false,
    loading: () => (
      <div className="space-y-2 mt-2">
        <div className="h-4 w-3/4 bg-white/5 animate-pulse rounded" />
        <div className="h-4 w-1/2 bg-white/5 animate-pulse rounded" />
      </div>
    ),
  },
);

interface MessageBubbleProps {
  message: Message;
  userAvatarUrl?: string;
  userName?: string;
}

export const MessageBubble = memo(
  function MessageBubble({ message, userAvatarUrl, userName }: MessageBubbleProps) {
    const isUser = message.role === 'user';
    const [copied, setCopied] = useState(false);

    const handleCopy = useCallback(async () => {
      try {
        await navigator.clipboard.writeText(
          typeof message.content === 'string' ? message.content : JSON.stringify(message.content),
        );
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        toast.error('Failed to copy to clipboard.');
      }
    }, [message.content]);

    const initials = userName
      ? userName.slice(0, 2).toUpperCase()
      : 'U';

  return (
    <div
      className={cn(
        'group flex w-full gap-2.5 sm:gap-3 py-4 sm:py-5 px-3 sm:px-4 transition-colors rounded-lg',
        isUser ? 'bg-transparent' : 'bg-muted/30 hover:bg-muted/50',
      )}
      role="article"
      aria-label={isUser ? 'Your message' : 'Spread AI response'}
    >
      <div className="flex-shrink-0 pt-0.5">
        {isUser ? (
          <Avatar size="sm" className="h-7 w-7 sm:h-8 sm:w-8 border border-border">
            <AvatarImage src={userAvatarUrl} alt={userName || 'You'} />
            <AvatarFallback className="bg-primary/15 text-primary text-[10px] font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
        ) : (
          <div
            aria-hidden
            className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0"
          >
            <span className="text-primary-foreground text-[10px] font-bold tracking-tight">SA</span>
          </div>
        )}
      </div>

      <div className="flex-1 space-y-1 min-w-0 overflow-hidden">
        <div className="flex items-center justify-between gap-2">
          <span className="font-semibold text-sm text-foreground">
            {isUser ? (userName || 'You') : 'Spread AI'}
          </span>
          <div className="flex items-center gap-1.5">
            {message.createdAt && (
              <time
                dateTime={message.createdAt.toISOString()}
                className="text-xs text-muted-foreground/70"
              >
                {new Date(message.createdAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </time>
            )}
            <button
              onClick={handleCopy}
              aria-label={copied ? 'Copied!' : 'Copy message'}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-emerald-500" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
        </div>

        <div className="text-foreground/90 text-[15px] leading-relaxed">
          {isUser ? (
            <p className="whitespace-pre-wrap">{message.content as string}</p>
          ) : (
            <MarkdownRenderer content={message.content as string} />
          )}
        </div>
      </div>
    </div>
  );
  },
  // Deep equality comparator: only re-render the specific message being streamed
  (prev, next) =>
    prev.message.id === next.message.id &&
    prev.message.content === next.message.content &&
    prev.userAvatarUrl === next.userAvatarUrl,
);
