'use client';

import React, { memo } from 'react';
import { TypingDots } from './typing-dots';
import { cn } from '@/lib/utils';

interface LoadingStateProps {
  label?: string;
  description?: string;
  className?: string;
  variant?: 'overlay' | 'inline' | 'panel';
}

/**
 * Premium loading surface — replaces bare spinners with a clear status.
 * `label` is the headline ("Searching the web…"); `description` is the
 * supporting line ("Looking up the latest on quantum chips").
 */
function LoadingStateImpl({
  label = 'Loading…',
  description,
  className,
  variant = 'panel',
}: LoadingStateProps) {
  if (variant === 'inline') {
    return (
      <div
        role="status"
        aria-live="polite"
        className={cn('inline-flex items-center gap-2 text-sm text-muted-foreground', className)}
      >
        <TypingDots size="sm" />
        <span>{label}</span>
      </div>
    );
  }

  if (variant === 'overlay') {
    return (
      <div
        role="status"
        aria-live="polite"
        className={cn(
          'flex items-center gap-3 rounded-xl border border-border bg-card/95 backdrop-blur-md px-4 py-3 shadow-lg',
          className,
        )}
      >
        <TypingDots size="md" />
        <div className="flex flex-col">
          <span className="text-sm font-medium text-foreground">{label}</span>
          {description ? (
            <span className="text-xs text-muted-foreground">{description}</span>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card/60 px-6 py-8 text-center',
        className,
      )}
    >
      <TypingDots size="md" />
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {description ? (
          <p className="text-xs text-muted-foreground">{description}</p>
        ) : null}
      </div>
    </div>
  );
}

export const LoadingState = memo(LoadingStateImpl);