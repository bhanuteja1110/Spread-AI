'use client';

import React, { useEffect, useRef, useCallback } from 'react';
import { MessageBubble } from './message-bubble';
import { type Message } from 'ai';
import { Zap, Brain, Palette, Loader2 } from 'lucide-react';

interface MessageListProps {
  messages: Message[];
  isLoading: boolean;
  userAvatarUrl?: string;
  userName?: string;
  onLoadMore?: () => void;
}

const SUGGESTED_PROMPTS = [
  {
    icon: Zap,
    iconColor: 'text-yellow-300',
    bg: 'bg-yellow-500/10',
    title: 'Spread Fast',
    description: 'Ultra-low latency for quick debugging and fast lookups.',
    prompt: 'Help me debug this code quickly.',
  },
  {
    icon: Brain,
    iconColor: 'text-blue-300',
    bg: 'bg-blue-500/10',
    title: 'Spread Smart',
    description: 'Deep reasoning for complex architecture and analysis.',
    prompt: 'Help me design a scalable microservices architecture.',
  },
  {
    icon: Palette,
    iconColor: 'text-purple-300',
    bg: 'bg-purple-500/10',
    title: 'Spread Creative',
    description: 'Vision and creativity — images, documents, and ideas.',
    prompt: 'Analyze this image and describe what you see.',
  },
] as const;

function EmptyState() {
  return (
    <div className="flex flex-1 min-h-0 flex-col items-center justify-center px-4 sm:px-6 py-6 overflow-y-auto overscroll-contain">
      <div className="max-w-3xl w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="text-center space-y-2">
          <div
            aria-hidden
            className="mx-auto h-12 w-12 sm:h-14 sm:w-14 rounded-xl bg-purple-600 flex items-center justify-center mb-4"
          >
            <span className="text-white font-bold text-base sm:text-lg tracking-tight">SA</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white break-words">
            How can Spread AI help?
          </h2>
          <p className="text-gray-500 text-sm max-w-md mx-auto">
            Choose a mode below or type your question to get started.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {SUGGESTED_PROMPTS.map(({ icon: Icon, iconColor, bg, title, description }) => (
            <div
              key={title}
              className="p-4 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.07] hover:border-white/15 transition-colors"
            >
              <div
                className={`${bg} w-9 h-9 rounded-lg flex items-center justify-center mb-3`}
              >
                <Icon className={`h-4 w-4 ${iconColor}`} aria-hidden />
              </div>
              <h3 className="font-medium text-white mb-1 text-sm">{title}</h3>
              <p className="text-xs text-gray-500 leading-relaxed">{description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function MessageList({
  messages,
  isLoading,
  userAvatarUrl,
  userName,
  onLoadMore,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length]);

  const handleScroll = useCallback(() => {
    if (!containerRef.current || !onLoadMore) return;
    if (containerRef.current.scrollTop < 80) {
      onLoadMore();
    }
  }, [onLoadMore]);

  if (messages.length === 0) {
    return <EmptyState />;
  }

  return (
    <div
      ref={containerRef}
      onScroll={onLoadMore ? handleScroll : undefined}
      className="flex-1 min-h-0 overflow-y-auto overscroll-contain"
      role="log"
      aria-label="Conversation messages"
      aria-live="polite"
    >
      <div className="max-w-4xl mx-auto w-full px-2 sm:px-4 pt-3 pb-6 space-y-0.5">
        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            userAvatarUrl={userAvatarUrl}
            userName={userName}
          />
        ))}

        {isLoading && (
          <div
            className="flex items-center gap-3 py-4 px-3 sm:px-4"
            aria-label="Spread AI is thinking"
          >
            <div
              aria-hidden
              className="h-8 w-8 rounded-full bg-purple-600 flex items-center justify-center flex-shrink-0"
            >
              <Loader2 className="h-4 w-4 text-white animate-spin" />
            </div>
            <div className="flex gap-1 items-center" aria-hidden>
              <span className="h-1.5 w-1.5 rounded-full bg-purple-400 animate-bounce [animation-delay:-0.3s]" />
              <span className="h-1.5 w-1.5 rounded-full bg-purple-400 animate-bounce [animation-delay:-0.15s]" />
              <span className="h-1.5 w-1.5 rounded-full bg-purple-400 animate-bounce" />
            </div>
          </div>
        )}

        <div ref={bottomRef} aria-hidden />
      </div>
    </div>
  );
}
