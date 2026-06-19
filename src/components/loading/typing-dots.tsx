'use client';

import React, { memo } from 'react';
import { cn } from '@/lib/utils';

interface TypingDotsProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  label?: string;
}

function TypingDotsImpl({ className, size = 'md', label }: TypingDotsProps) {
  const scale = size === 'sm' ? 0.75 : size === 'lg' ? 1.25 : 1;
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={label || 'Loading'}
      className={cn('typing-indicator', className)}
      style={{ transform: `scale(${scale})` }}
    >
      <span className="typing-circle" aria-hidden />
      <span className="typing-circle" aria-hidden />
      <span className="typing-circle" aria-hidden />
      <span className="typing-shadow" aria-hidden />
      <span className="typing-shadow" aria-hidden />
      <span className="typing-shadow" aria-hidden />
      {label ? <span className="sr-only">{label}</span> : null}
    </div>
  );
}

export const TypingDots = memo(TypingDotsImpl);