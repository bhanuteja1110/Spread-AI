'use client';

import React, { memo } from 'react';
import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
}

/**
 * Base skeleton primitive — uses the global `.skeleton` shimmer class.
 */
function SkeletonImpl({ className }: SkeletonProps) {
  return <div className={cn('skeleton', className)} aria-hidden />;
}

export const Skeleton = memo(SkeletonImpl);

interface ConversationListSkeletonProps {
  count?: number;
}

export function ConversationListSkeleton({ count = 5 }: ConversationListSkeletonProps) {
  return (
    <div
      className="space-y-1 px-1 py-1"
      aria-label="Loading conversations"
      role="status"
    >
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-9 w-full" />
      ))}
    </div>
  );
}

interface ChatHistorySkeletonProps {
  count?: number;
}

export function ChatHistorySkeleton({ count = 4 }: ChatHistorySkeletonProps) {
  return (
    <div
      className="max-w-3xl mx-auto w-full pt-4 pb-32 space-y-4"
      role="status"
      aria-label="Loading conversation"
    >
      {Array.from({ length: count }).map((_, i) => {
        const isUser = i % 2 === 0;
        return (
          <div
            key={i}
            className={cn(
              'flex gap-3 px-3 sm:px-5 py-3',
              isUser ? 'justify-end' : 'justify-start',
            )}
          >
            {!isUser ? <Skeleton className="h-7 w-7 rounded-full flex-shrink-0" /> : null}
            <div
              className={cn(
                'flex flex-col gap-2',
                isUser ? 'items-end max-w-[75%]' : 'items-start flex-1 max-w-[90%]',
              )}
            >
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3.5 w-full" />
              <Skeleton className="h-3.5 w-11/12" />
              {i === count - 1 ? null : <Skeleton className="h-3.5 w-9/12" />}
            </div>
            {isUser ? <Skeleton className="h-7 w-7 rounded-full flex-shrink-0" /> : null}
          </div>
        );
      })}
    </div>
  );
}

interface MessageListSkeletonProps {
  count?: number;
}

export function MessageListSkeleton({ count = 3 }: MessageListSkeletonProps) {
  return <ChatHistorySkeleton count={count} />;
}

interface MemoryListSkeletonProps {
  count?: number;
}

export function MemoryListSkeleton({ count = 3 }: MemoryListSkeletonProps) {
  return (
    <div className="space-y-1.5" role="status" aria-label="Loading memories">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-14 w-full rounded-lg" />
      ))}
    </div>
  );
}

interface SettingsPanelSkeletonProps {
  className?: string;
}

export function SettingsPanelSkeleton({ className }: SettingsPanelSkeletonProps) {
  return (
    <div
      role="status"
      aria-label="Loading section"
      className={cn('space-y-5', className)}
    >
      <div className="rounded-xl border border-border bg-card p-5 sm:p-6 space-y-4">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-2/3" />
        <div className="flex items-center gap-4 pt-2">
          <Skeleton className="h-20 w-20 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-9 w-32" />
          </div>
        </div>
      </div>
    </div>
  );
}

interface AnalyticsCardSkeletonProps {
  count?: number;
}

export function AnalyticsCardSkeleton({ count = 4 }: AnalyticsCardSkeletonProps) {
  return (
    <div className="space-y-4" role="status" aria-label="Loading analytics">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: count }).map((_, i) => (
          <Skeleton key={i} className="h-[104px] rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-[360px] rounded-xl" />
    </div>
  );
}