'use client';

import React, { useEffect, useRef, useCallback, memo } from 'react';
import { MessageBubble } from './message-bubble';
import { type Message } from 'ai';
import { Zap, Brain, Palette, AlertTriangle, RefreshCw } from 'lucide-react';

interface MessageListProps {
  messages: Message[];
  isLoading: boolean;
  userAvatarUrl?: string;
  userName?: string;
  error?: Error | null;
  onRetry?: () => void;
}

const SUGGESTED_PROMPTS = [
  {
    icon: Zap,
    iconColor: 'text-amber-500 dark:text-yellow-300',
    bg: 'bg-amber-500/10',
    title: 'Spread Fast',
    description: 'Ultra-low latency for quick debugging and lookups.',
    prompt: 'Help me debug this code quickly.',
  },
  {
    icon: Brain,
    iconColor: 'text-blue-500 dark:text-blue-300',
    bg: 'bg-blue-500/10',
    title: 'Spread Smart',
    description: 'Deep reasoning for complex architecture and analysis.',
    prompt: 'Help me design a scalable microservices architecture.',
  },
  {
    icon: Palette,
    iconColor: 'text-primary',
    bg: 'bg-primary/10',
    title: 'Spread Creative',
    description: 'Vision and creativity — images, documents, and ideas.',
    prompt: 'Analyze this image and describe what you see.',
  },
] as const;

const EmptyState = memo(function EmptyState() {
  return (
    <div className="flex flex-1 min-h-0 flex-col items-center justify-center px-4 sm:px-6 py-6 overflow-y-auto overscroll-contain">
      <div className="max-w-3xl w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="text-center space-y-2">
          <div
            aria-hidden
            className="mx-auto h-12 w-12 sm:h-14 sm:w-14 rounded-2xl bg-primary flex items-center justify-center mb-4"
          >
            <span className="text-primary-foreground font-bold text-base sm:text-lg tracking-tight">SA</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground break-words">
            How can Spread AI help?
          </h2>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">
            Choose a mode below or type your question to get started.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {SUGGESTED_PROMPTS.map(({ icon: Icon, iconColor, bg, title, description }) => (
            <div
              key={title}
              className="p-4 rounded-xl bg-card border border-border hover:bg-accent/40 hover:border-primary/30 transition-colors"
            >
              <div className={`${bg} w-9 h-9 rounded-lg flex items-center justify-center mb-3`}>
                <Icon className={`h-4 w-4 ${iconColor}`} aria-hidden />
              </div>
              <h3 className="font-medium text-foreground mb-1 text-sm">{title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

const StreamingIndicator = memo(function StreamingIndicator() {
  return (
    <div
      className="flex items-center gap-3 px-3 sm:px-5 py-2"
      aria-label="Spread AI is responding"
    >
      <div className="h-7 w-7 flex-shrink-0" aria-hidden />
      <div className="flex items-center gap-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
        <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
        <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce" />
      </div>
    </div>
  );
});

const ErrorBanner = memo(function ErrorBanner({ error, onRetry }: { error?: Error | null; onRetry?: () => void }) {
  if (!error) return null;
  const isQuota = error.message.includes('429') || error.message.includes('QUOTA_EXCEEDED');
  return (
    <div
      role="alert"
      className="mx-3 sm:mx-5 my-2 flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm"
    >
      <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0 text-destructive" aria-hidden />
      <div className="flex-1 text-destructive">
        <p className="font-medium">
          {isQuota ? 'Daily message limit reached.' : 'Something went wrong.'}
        </p>
        <p className="text-xs text-destructive/80 mt-0.5">
          {isQuota
            ? 'Upgrade to Pro for unlimited messages.'
            : 'Failed to get a response. Please try again.'}
        </p>
      </div>
      {onRetry && !isQuota && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-1 text-xs font-medium text-destructive hover:underline"
        >
          <RefreshCw className="h-3 w-3" /> Retry
        </button>
      )}
    </div>
  );
});

function MessageListImpl({
  messages,
  isLoading,
  userAvatarUrl,
  userName,
  error,
  onRetry,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastMsgCountRef = useRef(messages.length);

  // Auto-scroll on new messages, but only if user is already near the bottom
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const addedNew = messages.length !== lastMsgCountRef.current;
    lastMsgCountRef.current = messages.length;

    // Always scroll on first render, then only if near bottom
    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;
    if (addedNew && distanceFromBottom < 200) {
      requestAnimationFrame(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      });
    }
  }, [messages.length]);

  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
  }, []);

  if (messages.length === 0 && !isLoading) {
    return <EmptyState />;
  }

  const lastIdx = messages.length - 1;

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="flex-1 min-h-0 overflow-y-auto overscroll-contain scrollbar-thin"
      role="log"
      aria-label="Conversation messages"
      aria-live="polite"
    >
      <div className="max-w-3xl mx-auto w-full py-3 space-y-0.5">
        {messages.map((message, idx) => (
          <MessageBubble
            key={message.id}
            message={message}
            userAvatarUrl={userAvatarUrl}
            userName={userName}
            onRetry={
              !isUserMsg(message) && message.id === messages[lastIdx]?.id && onRetry
                ? onRetry
                : undefined
            }
            isLast={idx === lastIdx}
          />
        ))}

        {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
          <StreamingIndicator />
        )}

        <ErrorBanner error={error} onRetry={onRetry} />

        <div ref={bottomRef} aria-hidden />
      </div>
    </div>
  );
}

function isUserMsg(m: Message) {
  return m.role === 'user';
}

export const MessageList = memo(MessageListImpl);
