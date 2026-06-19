'use client';

import React, { useState, lazy, Suspense } from 'react';
import { Sidebar } from '@/features/chat/components/sidebar';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Menu, User, BarChart3, Brain, Palette } from 'lucide-react';
import { ThemeSwitcher } from '@/components/theme-switcher';
import { cn } from '@/lib/utils';

type SettingsTab = 'profile' | 'memory' | 'theme' | 'analytics';

// Lazy-load heavy tabs so the initial Settings bundle stays small
const ProfileSettings = lazy(() =>
  import('@/features/dashboard/components/profile-settings').then((m) => ({ default: m.ProfileSettings })),
);
const MemoryManager = lazy(() =>
  import('@/features/memory/components/memory-manager').then((m) => ({ default: m.MemoryManager })),
);
const AnalyticsView = lazy(() =>
  import('@/features/settings/components/analytics-view').then((m) => ({ default: m.AnalyticsView })),
);

const TABS: { id: SettingsTab; label: string; icon: React.ElementType; description: string }[] = [
  {
    id: 'profile',
    label: 'Profile',
    icon: User,
    description: 'Manage your account details and avatar.',
  },
  {
    id: 'memory',
    label: 'Memory',
    icon: Brain,
    description: 'Long-term facts Spread AI remembers about you.',
  },
  {
    id: 'theme',
    label: 'Appearance',
    icon: Palette,
    description: 'Choose how Spread AI looks on this device.',
  },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: BarChart3,
    description: 'Your usage statistics and activity timeline.',
  },
];

function TabFallback() {
  return (
    <div className="space-y-3 animate-pulse" aria-label="Loading section">
      <div className="h-32 rounded-xl border border-border bg-card" />
      <div className="h-20 rounded-xl border border-border bg-card" />
    </div>
  );
}

export default function SettingsPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');

  const activeMeta = TABS.find((t) => t.id === activeTab)!;

  return (
    <div className="flex h-svh w-full overflow-hidden bg-background">
      <aside className="hidden md:flex w-[260px] lg:w-[300px] flex-shrink-0">
        <Sidebar />
      </aside>

      <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
        <SheetContent
          side="left"
          className="p-0 w-[280px] max-w-[85vw] border-r border-border bg-background"
        >
          <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
          <Sidebar onClose={() => setIsSidebarOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex flex-col flex-1 min-w-0 bg-background">
        <header className="flex h-14 items-center gap-2 px-3 sm:px-4 border-b border-border bg-background/95 backdrop-blur-md z-10 flex-shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden h-9 w-9 text-muted-foreground hover:text-foreground"
            onClick={() => setIsSidebarOpen(true)}
            aria-label="Open navigation"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <h1 className="text-sm font-semibold text-foreground">Settings</h1>
        </header>

        <main className="flex-1 overflow-y-auto overscroll-contain">
          <div className="max-w-4xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-8">
            <div className="mb-6">
              <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">
                Settings
              </h2>
              <p className="text-sm text-muted-foreground mt-1">{activeMeta.description}</p>
            </div>

            <div
              role="tablist"
              aria-label="Settings sections"
              className="flex gap-1 p-1 mb-6 rounded-lg bg-card border border-border w-full sm:w-fit overflow-x-auto scrollbar-thin"
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
                      'flex items-center justify-center gap-2 px-3 sm:px-4 h-9 rounded-md text-sm font-medium transition-all whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
                      isActive
                        ? 'bg-primary/15 text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground hover:bg-accent/60',
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
              <Suspense fallback={<TabFallback />}>
                {activeTab === 'profile' && <ProfileSettings />}
                {activeTab === 'memory' && <MemoryManager />}
                {activeTab === 'theme' && (
                  <div className="rounded-xl border border-border bg-card p-5 sm:p-6">
                    <h3 className="text-base font-semibold text-foreground mb-1">Appearance</h3>
                    <p className="text-sm text-muted-foreground mb-5">
                      Your selection is saved on this device.
                    </p>
                    <ThemeSwitcher />
                  </div>
                )}
                {activeTab === 'analytics' && <AnalyticsView />}
              </Suspense>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
