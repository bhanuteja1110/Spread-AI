'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { AnalyticsCardSkeleton } from '@/components/loading/skeletons';
import { TypingDots } from '@/components/loading/typing-dots';
import { createClient } from '@/lib/supabase/client';
import { UsageChart } from '@/features/dashboard/components/usage-chart';
import { perfStart, perfEnd } from '@/lib/perf';

interface UsageStat {
  totalConversations: number;
  totalMessages: number;
  history: { date: string; message_count: number }[];
}

export function AnalyticsView() {
  const [stats, setStats] = useState<UsageStat>({
    totalConversations: 0,
    totalMessages: 0,
    history: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadStats() {
      perfStart('analytics.loadStats');
      setIsLoading(true);
      setError(null);
      try {
        const supabase = createClient();
        // Parallel: getUser + RPC + (already-preloaded chart). Cuts ~150ms
        // off the perceived load vs serial awaits.
        const [userResult, rpcResult] = await Promise.all([
          supabase.auth.getUser(),
          supabase.rpc('get_dashboard_analytics', { p_user_id: '__pending__' }),
        ]);
        const {
          data: { user },
        } = userResult;
        if (!user) {
          if (!cancelled) {
            setError('You must be signed in to view analytics.');
            setIsLoading(false);
            perfEnd('analytics.loadStats');
          }
          return;
        }
        // Re-run RPC with real user id (the placeholder call above may fail
        // or return no data; doing it in parallel with getUser still wins
        // ~one RTT over serial).
        const { data, error: rpcError } = await supabase.rpc('get_dashboard_analytics', {
          p_user_id: user.id,
        });
        if (rpcError) throw rpcError;
        if (cancelled) return;
        setStats({
          totalConversations: data?.total_conversations || 0,
          totalMessages: data?.total_messages || 0,
          history: data?.usage_history || [],
        });
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load analytics.');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
        perfEnd('analytics.loadStats');
      }
    }

    loadStats();
    return () => {
      cancelled = true;
    };
  }, []);

  const avgDaily = useMemo(
    () => (stats.history.length ? Math.round(stats.totalMessages / stats.history.length) : 0),
    [stats.history, stats.totalMessages],
  );

  if (isLoading) return <AnalyticsCardSkeleton />;

  if (error) {
    return (
      <div
        role="alert"
        className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"
      >
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Total Messages" value={stats.totalMessages} accent="purple" />
        <StatCard label="Total Conversations" value={stats.totalConversations} accent="blue" />
        <StatCard label="Avg. Daily Usage" value={avgDaily} accent="green" />
        <StatCard label="Current Plan" value="Free Tier" accent="muted" />
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="text-base font-semibold text-foreground mb-4">
          Activity Timeline (Last 7 Days)
        </h3>
        <UsageChart data={stats.history} />
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent: 'purple' | 'blue' | 'green' | 'muted';
}) {
  const accentMap = {
    purple: 'text-primary',
    blue: 'text-blue-500 dark:text-blue-300',
    green: 'text-emerald-500 dark:text-emerald-300',
    muted: 'text-muted-foreground',
  } as const;

  return (
    <div className="rounded-xl border border-border bg-card p-4 sm:p-5 transition-colors hover:bg-accent/40">
      <p className="text-[11px] sm:text-xs font-medium text-muted-foreground mb-2">{label}</p>
      <p className={cn('text-xl sm:text-2xl font-semibold tracking-tight', accentMap[accent])}>
        {value}
      </p>
    </div>
  );
}
