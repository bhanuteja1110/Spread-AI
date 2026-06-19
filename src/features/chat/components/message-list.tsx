'use client';

import React, { useEffect, useRef, useState, useCallback, memo } from 'react';
import { MessageBubble } from './message-bubble';
import { type Message } from 'ai';
import { Zap, Brain, Palette, AlertTriangle, RefreshCw, PauseCircle } from 'lucide-react';

interface MessageListProps {
  messages: Message[];
  isLoading: boolean;
  userAvatarUrl?: string;
  userName?: string;
  error?: Error | null;
  onRetry?: () => void;
  onStop?: () => void;
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

const StreamingIndicator = memo(function StreamingIndicator({
  onStop,
}: {
  onStop?: () => void;
}) {
  // Detect when the tab is hidden mid-stream. The stream is NOT aborted —
  // the browser keeps the connection alive and buffers chunks. We just
  // surface a small affordance so users know the response is still arriving.
  const [isTabHidden, setIsTabHidden] = useState(false);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const onVisibility = () => setIsTabHidden(document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  return (
    <div
      className="flex items-center gap-3 px-3 sm:px-5 py-2"
      aria-label="Spread AI is responding"
    >
      <div className="h-7 w-7 flex-shrink-0" aria-hidden />
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {isTabHidden ? (
          <>
            <PauseCircle className="h-4 w-4 text-muted-foreground" aria-hidden />
            <span className="text-xs text-muted-foreground">
              Streaming in background — switch back to view
            </span>
          </>
        ) : (
          <>
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce" />
            </div>
            <span className="text-xs text-muted-foreground">Generating…</span>
          </>
        )}
      </div>
      {onStop && (
        <button
          type="button"
          onClick={onStop}
          aria-label="Stop generating"
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border border-border bg-card hover:bg-accent text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          <span
            aria-hidden
            className="block h-2 w-2 bg-foreground rounded-[1px]"
          />
          Stop
        </button>
      )}
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

/**
 * Scroll a message into view such that its TOP sits roughly 16-24px below the
 * container's top edge — mirroring ChatGPT's behavior. About 65-70% of the
 * viewport stays BELOW the message so the streaming AI response has room.
 */
function scrollMessageIntoView(container: HTMLElement, messageId: string) {
  const el = container.querySelector<HTMLElement>(`[data-message-id="${messageId}"]`);
  if (!el) return;

  const containerRect = container.getBoundingClientRect();
  const elRect = el.getBoundingClientRect();
  // Top offset = how far we want the message top to sit below the container's top.
  // Slightly larger on desktop so the AI bubble below has generous breathing room.
  const desiredTopPx = Math.max(16, Math.min(container.clientHeight * 0.12, 96));

  const currentTopOffset = elRect.top - containerRect.top;
  const delta = currentTopOffset - desiredTopPx;

  if (Math.abs(delta) < 4) return; // already in place

  const targetScroll = container.scrollTop + delta;

  container.scrollTo({
    top: Math.max(0, targetScroll),
    behavior: 'smooth',
  });
}

function MessageListImpl({
  messages,
  isLoading,
  userAvatarUrl,
  userName,
  error,
  onRetry,
  onStop,
}: MessageListProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Track the last user message id we've already scrolled to (so we don't
  // re-scroll the same one on re-renders).
  const lastScrolledUserIdRef = useRef<string | null>(null);
  const prevMessagesRef = useRef<Message[]>(messages);
  const userPinnedScrollRef = useRef(false);

  // --- Effect 1: When a NEW user message is added, scroll it near the top ---
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const prev = prevMessagesRef.current;
    prevMessagesRef.current = messages;

    if (messages.length === 0) {
      lastScrolledUserIdRef.current = null;
      return;
    }

    // Find new user messages (count went up, last few contain a new user msg)
    const prevUserCount = prev.filter((m) => m.role === 'user').length;
    const currUserCount = messages.filter((m) => m.role === 'user').length;

    if (currUserCount <= prevUserCount) {
      // No new user message; nothing to do here.
      return;
    }

    // The newest user message is the last one with role === 'user'
    const newestUser = [...messages].reverse().find((m) => m.role === 'user');
    if (!newestUser || newestUser.id === lastScrolledUserIdRef.current) return;

    lastScrolledUserIdRef.current = newestUser.id;
    userPinnedScrollRef.current = true;

    // Wait one frame so the bubble has mounted in the DOM
    requestAnimationFrame(() => {
      if (!containerRef.current) return;
      scrollMessageIntoView(containerRef.current, newestUser.id);
      // Release the pin after streaming settles (a few seconds)
      window.setTimeout(() => {
        if (newestUser.id === lastScrolledUserIdRef.current) {
          userPinnedScrollRef.current = false;
        }
      }, 4000);
    });
  }, [messages]);

  // --- Effect 2: While the AI is streaming, only auto-scroll if user is near bottom ---
  // (We don't fight the user if they've scrolled up to read earlier content.)
  useEffect(() => {
    if (!isLoading) return;
    const container = containerRef.current;
    if (!container) return;

    // Stream just started: respect the user-pin position from Effect 1
    // (don't override it). After the AI message mounts, keep the user message
    // near the top and let the response stream into the remaining space.
    const streamingId = window.requestAnimationFrame(() => {
      const lastUser = [...messages].reverse().find((m) => m.role === 'user');
      if (!lastUser) return;
      // Nudge slightly only if the user message has drifted far from the top
      const el = container.querySelector<HTMLElement>(`[data-message-id="${lastUser.id}"]`);
      if (!el) return;
      const containerRect = container.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();
      const drift = (elRect.top - containerRect.top) - 24;
      // If drifted more than 80px upward (off-screen) OR if we're streaming and user is near top
      if (Math.abs(drift) > 120) {
        container.scrollTo({
          top: container.scrollTop + drift,
          behavior: 'smooth',
        });
      }
    });

    return () => window.cancelAnimationFrame(streamingId);
  }, [isLoading, messages.length, messages]);

  // --- Effect 3: When streaming ends (isLoading flips false), scroll to bottom ---
  // so the tail of the response is visible. Only if user hasn't manually scrolled.
  const wasLoadingRef = useRef(false);
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    if (wasLoadingRef.current && !isLoading) {
      // Stream finished — gently scroll to bottom so the final token is visible
      const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant');
      if (lastAssistant) {
        requestAnimationFrame(() => {
          if (!containerRef.current) return;
          const el = containerRef.current.querySelector<HTMLElement>(
            `[data-message-id="${lastAssistant.id}"]`,
          );
          if (el) {
            const rect = el.getBoundingClientRect();
            const containerRect = containerRef.current.getBoundingClientRect();
            const overflow = rect.bottom - containerRect.bottom;
            if (overflow > 0) {
              containerRef.current.scrollTo({
                top: containerRef.current.scrollTop + overflow + 24,
                behavior: 'smooth',
              });
            }
          }
        });
      }
      userPinnedScrollRef.current = false;
    }
    wasLoadingRef.current = isLoading;
  }, [isLoading, messages]);

  // --- Effect 4: When the user returns to the tab mid-stream, re-pin scroll ---
  // While the tab was hidden the streaming response may have buffered many
  // chunks. rAF-driven scroll updates paused while hidden. When the tab
  // becomes visible again, we want the user to immediately see the response,
  // not a stale scroll position. We scroll the latest user message back
  // into view, then let the streaming response render into the visible area.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const onVisibility = () => {
      if (document.hidden || !isLoading) return;
      const container = containerRef.current;
      if (!container) return;
      const lastUser = [...messages].reverse().find((m) => m.role === 'user');
      if (!lastUser) return;
      // Use scrollIntoView (which respects prefers-reduced-motion)
      // with `nearest` so we don't yank the viewport if the user
      // has scrolled elsewhere intentionally.
      const el = container.querySelector<HTMLElement>(
        `[data-message-id="${lastUser.id}"]`,
      );
      if (el) {
        const rect = el.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        if (rect.top < containerRect.top || rect.top > containerRect.top + 200) {
          scrollMessageIntoView(container, lastUser.id);
        }
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [isLoading, messages]);

  const handleScroll = useCallback(() => {
    // Reserved for future "scroll to load older" pagination
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
      {/* Top spacer — keeps first message from hugging the header */}
      <div className="max-w-3xl mx-auto w-full pt-4 pb-32 space-y-0.5">
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
          <StreamingIndicator onStop={onStop} />
        )}

        <ErrorBanner error={error} onRetry={onRetry} />
      </div>
    </div>
  );
}

function isUserMsg(m: Message) {
  return m.role === 'user';
}

export const MessageList = memo(MessageListImpl);
