'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Sidebar } from '@/features/chat/components/sidebar';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Menu, User, BarChart3 } from 'lucide-react';
import { ProfileSettings } from '@/features/dashboard/components/profile-settings';
import { cn } from '@/lib/utils';

type SettingsTab = 'profile' | 'analytics';

const TABS: { id: SettingsTab; label: string; icon: React.ElementType; description: string }[] = [
  {
    id: 'profile',
    label: 'Profile',
    icon: User,
    description: 'Manage your account details and avatar.',
  },
  {
    id: 'analytics',
    label: 'Analytics Overview',
    icon: BarChart3,
    description: 'Your usage statistics and activity timeline.',
  },
];

interface UsageStat {
  totalConversations: number;
  totalMessages: number;
  history: { date: string; message_count: number }[];
}

function AnalyticsSkeleton() {
  return (
    <div className="space-y-3 animate-pulse" aria-label="Loading analytics">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-white/10 bg-white/5 p-5 h-[104px]" />
        ))}
      </div>
      <div className="rounded-xl border border-white/10 bg-white/5 p-5 h-[360px]" />
    </div>
  );
}

function AnalyticsView() {
  const [stats, setStats] = useState<UsageStat>({
    totalConversations: 0,
    totalMessages: 0,
    history: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [UsageChart, setUsageChart] = useState<React.ComponentType<{ data: any[] }> | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadStats() {
      setIsLoading(true);
      setError(null);
      try {
        const { createClient } = await import('@/lib/supabase/client');
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          if (!cancelled) {
            setError('You must be signed in to view analytics.');
            setIsLoading(false);
          }
          return;
        }
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

        const chartMod = await import('@/features/dashboard/components/usage-chart');
        if (!cancelled) setUsageChart(() => chartMod.UsageChart);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load analytics.');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
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

  if (isLoading) return <AnalyticsSkeleton />;

  if (error) {
    return (
      <div
        className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-300"
        role="alert"
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

      <div className="rounded-xl border border-white/10 bg-white/5 p-5">
        <h3 className="text-base font-semibold text-white mb-4">
          Activity Timeline (Last 7 Days)
        </h3>
        {UsageChart ? (
          <UsageChart data={stats.history} />
        ) : (
          <div className="h-[300px] rounded-lg border border-dashed border-white/10 flex items-center justify-center text-sm text-gray-500">
            Preparing chart…
          </div>
        )}
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
    purple: 'text-purple-300',
    blue: 'text-blue-300',
    green: 'text-emerald-300',
    muted: 'text-gray-300',
  } as const;

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4 sm:p-5 transition-colors hover:bg-white/[0.07]">
      <p className="text-[11px] sm:text-xs font-medium text-gray-400 mb-2">{label}</p>
      <p className={cn('text-xl sm:text-2xl font-semibold tracking-tight', accentMap[accent])}>
        {value}
      </p>
    </div>
  );
}

export default function SettingsPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');

  const activeMeta = TABS.find((t) => t.id === activeTab)!;

  return (
    <div className="flex h-svh w-full overflow-hidden bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-[260px] lg:w-[300px] flex-shrink-0">
        <Sidebar />
      </aside>

      {/* Mobile Drawer */}
      <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
        <SheetContent
          side="left"
          className="p-0 w-[280px] max-w-[85vw] border-r border-white/5 bg-background"
        >
          <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
          <Sidebar onClose={() => setIsSidebarOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className="flex flex-col flex-1 min-w-0 bg-background">
        <header className="flex h-14 items-center gap-2 px-3 sm:px-4 border-b border-white/5 bg-background/95 backdrop-blur-md z-10 flex-shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden h-9 w-9 text-gray-400 hover:text-white"
            onClick={() => setIsSidebarOpen(true)}
            aria-label="Open navigation"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <h1 className="text-sm font-semibold text-gray-200">Settings</h1>
        </header>

        <main className="flex-1 overflow-y-auto overscroll-contain">
          <div className="max-w-4xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-8">
            <div className="mb-6">
              <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-white">
                Settings
              </h2>
              <p className="text-sm text-gray-500 mt-1">{activeMeta.description}</p>
            </div>

            <div
              role="tablist"
              aria-label="Settings sections"
              className="flex gap-1 p-1 mb-6 rounded-lg bg-white/5 border border-white/10 w-full sm:w-fit overflow-x-auto"
            >
              {TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    aria-controls={`tabpanel-${tab.id}`}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      'flex items-center justify-center gap-2 px-3 sm:px-4 h-9 rounded-md text-sm font-medium transition-all whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/40',
                      isActive
                        ? 'bg-white/10 text-white shadow-sm'
                        : 'text-gray-400 hover:text-white hover:bg-white/5',
                    )}
                  >
                    <Icon className="h-4 w-4" aria-hidden />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            <section
              role="tabpanel"
              id={`tabpanel-${activeTab}`}
              aria-labelledby={`tab-${activeTab}`}
              className="animate-in fade-in slide-in-from-bottom-2 duration-300"
            >
              {activeTab === 'profile' && <ProfileSettings />}
              {activeTab === 'analytics' && <AnalyticsView />}
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
