'use client';

import { useEffect, useRef } from 'react';
import { mutate } from 'swr';
import { createClient } from '@/lib/supabase/client';

const CONVERSATIONS_CHANNEL = 'conversations_changes';
const SUBSCRIPTION_KEY = Symbol.for('spreadai.conversations_realtime');

interface GlobalSubscription {
  count: number;
  channel: ReturnType<ReturnType<typeof createClient>['channel']> | null;
  unsubscribe: (() => void) | null;
}

/**
 * Global realtime subscription for the `conversations` table.
 *
 * Uses a reference-counted singleton so the channel is only ever subscribed to
 * once per browser tab — even when multiple components (e.g. desktop sidebar
 * + mobile drawer sidebar) call this hook simultaneously.
 *
 * This prevents the Supabase Realtime error:
 *   "cannot add postgres_changes callbacks after subscribe()"
 * which occurred when both Sidebar instances each tried to create and
 * subscribe their own identically-named channel.
 */
export function useConversationsRealtime(): void {
  const mountedRef = useRef(false);

  useEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;

    const globalScope = globalThis as unknown as { [k: symbol]: GlobalSubscription | undefined };
    const existing: GlobalSubscription | undefined = globalScope[SUBSCRIPTION_KEY];

    // If a previous subscription is registered, just bump the refcount and reuse it.
    if (existing && existing.channel && existing.unsubscribe) {
      existing.count += 1;

      // The existing channel already has its handler attached — we don't
      // register a duplicate. Just decrement the refcount on unmount.
      return () => {
        existing.count -= 1;
        if (existing.count <= 0 && existing.unsubscribe) {
          existing.unsubscribe();
          globalScope[SUBSCRIPTION_KEY] = undefined;
        }
      };
    }

    // First subscriber — create the channel, attach handlers, subscribe.
    const supabase = createClient();
    const channel = supabase
      .channel(CONVERSATIONS_CHANNEL)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'conversations' },
        () => {
          mutate('conversations');
        },
      );

    const subscription = channel.subscribe();

    const unsubscribe = () => {
      try {
        supabase.removeChannel(channel);
      } catch {
        // Channel may already be removed — ignore.
      }
      subscription?.unsubscribe?.();
    };

    globalScope[SUBSCRIPTION_KEY] = {
      count: 1,
      channel,
      unsubscribe,
    };

    return () => {
      const current = globalScope[SUBSCRIPTION_KEY];
      if (!current) return;
      current.count -= 1;
      if (current.count <= 0) {
        current.unsubscribe?.();
        globalScope[SUBSCRIPTION_KEY] = undefined;
      }
    };
  }, []);
}
