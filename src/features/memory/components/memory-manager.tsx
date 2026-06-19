'use client';

import React, { useState, useCallback, useMemo } from 'react';
import useSWR from 'swr';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Brain, Trash2, Plus, Loader2, AlertTriangle, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import {
  addMemoryAction,
  forgetMemoryAction,
  clearAllMemoriesAction,
} from '../actions';
import type { Memory } from '@/services/memory.service';
import { memoryService } from '@/services/memory.service';
import { cn } from '@/lib/utils';

const SUGGESTED = [
  'I prefer TypeScript over JavaScript',
  'My timezone is IST (UTC+5:30)',
  'I am working on a Next.js 14 project',
];

function MemorySkeleton() {
  return (
    <div className="space-y-2 animate-pulse" aria-label="Loading memories">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="h-14 rounded-lg border border-border bg-card/50" />
      ))}
    </div>
  );
}

export function MemoryManager() {
  const [draft, setDraft] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isClearing, setIsClearing] = useState(false);

  const {
    data: memories,
    isLoading,
    error,
    mutate,
  } = useSWR<Memory[]>('memories', () => memoryService.list(), {
    revalidateOnFocus: false,
  });

  const handleAdd = useCallback(
    async (content: string) => {
      const trimmed = content.trim();
      if (!trimmed) return;

      // Optimistic update for instant feedback
      const optimistic: Memory = {
        id: `optimistic-${Date.now()}`,
        user_id: '',
        content: trimmed,
        category: 'user-fact',
        source_message: null,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      mutate((current) => [optimistic, ...(current ?? [])], false);
      setDraft('');

      const result = await addMemoryAction(trimmed);
      if (result.error) {
        toast.error(result.error);
        mutate(); // rollback
      } else {
        toast.success('Memory saved');
        mutate(); // sync with server
      }
    },
    [mutate],
  );

  const handleForget = useCallback(
    async (id: string) => {
      setPendingId(id);
      const previous = memories;
      mutate((current) => (current ?? []).filter((m) => m.id !== id), false);

      const result = await forgetMemoryAction(id);
      if (result.error) {
        toast.error(result.error);
        mutate(previous);
      } else {
        toast.success('Memory forgotten');
      }
      setPendingId(null);
    },
    [memories, mutate],
  );

  const handleClearAll = useCallback(async () => {
    if (!memories?.length) return;
    if (!window.confirm('Forget all memories? This cannot be undone.')) return;

    setIsClearing(true);
    const previous = memories;
    mutate([], false);

    const result = await clearAllMemoriesAction();
    if (result.error) {
      toast.error(result.error);
      mutate(previous);
    } else {
      toast.success('All memories cleared');
    }
    setIsClearing(false);
  }, [memories, mutate]);

  const list = useMemo(() => memories ?? [], [memories]);

  return (
    <div className="rounded-xl border border-border bg-card p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3 mb-5">
        <div>
          <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Brain className="h-4 w-4 text-primary" aria-hidden />
            Memory
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Spread AI remembers facts across every conversation.
          </p>
        </div>
        {list.length > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClearAll}
            disabled={isClearing}
            className="text-muted-foreground hover:text-destructive"
          >
            {isClearing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
            <span className="ml-1.5">Clear all</span>
          </Button>
        )}
      </div>

      {/* Add new memory */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (isAdding || !draft.trim()) return;
          setIsAdding(true);
          handleAdd(draft).finally(() => setIsAdding(false));
        }}
        className="flex gap-2 mb-3"
      >
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder='Tell me to remember… e.g. "I prefer Python"'
          aria-label="New memory"
          disabled={isAdding}
          className="flex-1 h-10"
        />
        <Button
          type="submit"
          size="icon"
          disabled={isAdding || !draft.trim()}
          aria-label="Save memory"
          className="h-10 w-10 bg-primary text-primary-foreground hover:bg-primary/90"
        >
          {isAdding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        </Button>
      </form>

      {/* Quick suggestions */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {SUGGESTED.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => handleAdd(s)}
            disabled={isAdding}
            className={cn(
              'inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-full',
              'border border-border bg-card text-muted-foreground',
              'hover:bg-accent hover:text-accent-foreground hover:border-primary/30',
              'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
            )}
          >
            <Sparkles className="h-3 w-3" aria-hidden />
            {s}
          </button>
        ))}
      </div>

      {/* List */}
      {isLoading ? (
        <MemorySkeleton />
      ) : error ? (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
        >
          <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" aria-hidden />
          <span>{error instanceof Error ? error.message : 'Failed to load memories.'}</span>
        </div>
      ) : list.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border py-8 text-center">
          <Brain className="h-6 w-6 mx-auto text-muted-foreground mb-2" aria-hidden />
          <p className="text-sm text-muted-foreground">No memories yet.</p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            Try saying <span className="italic">&ldquo;remember this: I prefer dark mode&rdquo;</span> in any chat.
          </p>
        </div>
      ) : (
        <ul className="space-y-1.5" role="list" aria-label="Saved memories">
          {list.map((m) => (
            <li
              key={m.id}
              className={cn(
                'group flex items-center gap-3 rounded-lg border border-border bg-background/50 px-3 py-2.5',
                'hover:bg-accent/50 transition-colors',
                m.id.startsWith('optimistic-') && 'opacity-60',
              )}
            >
              <span className="flex-1 min-w-0 text-sm text-foreground break-words">{m.content}</span>
              <button
                type="button"
                onClick={() => handleForget(m.id)}
                disabled={m.id.startsWith('optimistic-') || pendingId === m.id}
                aria-label={`Forget: ${m.content}`}
                className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity p-1 rounded text-muted-foreground hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/40 disabled:pointer-events-none"
              >
                {pendingId === m.id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
