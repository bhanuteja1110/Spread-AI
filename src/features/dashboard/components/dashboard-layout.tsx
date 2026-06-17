'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar } from '@/features/chat/components/sidebar';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Menu, Activity, MessageSquare, Clock, Zap } from 'lucide-react';
import dynamic from 'next/dynamic';
import { createClient } from '@/lib/supabase/client';
import { ProfileSettings } from './profile-settings';

// Extremely critical performance optimization: Lazy Load Recharts
const UsageChart = dynamic(() => import('./usage-chart').then(m => m.UsageChart), { 
  ssr: false,
  loading: () => <div className="w-full h-[300px] bg-white/5 animate-pulse rounded-xl flex items-center justify-center text-gray-500 text-sm">Loading visual analytics...</div>
});

export function DashboardLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [stats, setStats] = useState({ totalConversations: 0, totalMessages: 0, history: [] });

  useEffect(() => {
    async function loadStats() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Native DB-level aggregation prevents freezing the browser on millions of rows
        const { data } = await supabase.rpc('get_dashboard_analytics', { p_user_id: user.id });
        if (data) setStats({
           totalConversations: data.total_conversations || 0,
           totalMessages: data.total_messages || 0,
           history: data.usage_history || []
        });
      }
    }
    loadStats();
  }, []);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <div className="hidden md:flex md:w-[280px] lg:w-[320px] flex-shrink-0">
        <Sidebar />
      </div>

      <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
        <SheetContent side="left" className="p-0 w-[280px] border-r-white/10 bg-background sm:max-w-xs">
          <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
          <Sidebar onClose={() => setIsSidebarOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex flex-col flex-1 min-w-0 bg-background overflow-y-auto">
        <header className="flex h-14 items-center justify-between border-b border-white/5 px-4 bg-background/80 backdrop-blur-xl sticky top-0 z-10 shadow-sm">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="md:hidden text-gray-400 hover:text-white" onClick={() => setIsSidebarOpen(true)}>
              <Menu className="h-5 w-5" />
            </Button>
            <h1 className="text-sm font-semibold tracking-wide text-gray-200">Analytics Overview</h1>
          </div>
        </header>

        <main className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto w-full space-y-6">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
             <div className="bg-white/5 border border-white/10 rounded-xl p-6 flex flex-col justify-between hover:bg-white/10 transition-colors">
                <div className="flex items-center gap-3 text-gray-400 mb-4">
                  <MessageSquare className="h-5 w-5 text-purple-400" />
                  <h3 className="font-medium text-sm">Total Messages</h3>
                </div>
                <p className="text-3xl font-bold text-white">{stats.totalMessages}</p>
             </div>
             
             <div className="bg-white/5 border border-white/10 rounded-xl p-6 flex flex-col justify-between hover:bg-white/10 transition-colors">
                <div className="flex items-center gap-3 text-gray-400 mb-4">
                  <Clock className="h-5 w-5 text-blue-400" />
                  <h3 className="font-medium text-sm">Total Conversations</h3>
                </div>
                <p className="text-3xl font-bold text-white">{stats.totalConversations}</p>
             </div>

             <div className="bg-white/5 border border-white/10 rounded-xl p-6 flex flex-col justify-between hover:bg-white/10 transition-colors">
                <div className="flex items-center gap-3 text-gray-400 mb-4">
                  <Activity className="h-5 w-5 text-green-400" />
                  <h3 className="font-medium text-sm">Avg. Daily Usage</h3>
                </div>
                <p className="text-3xl font-bold text-white">
                   {stats.history.length ? Math.round(stats.totalMessages / stats.history.length) : 0}
                </p>
             </div>

             <div className="bg-gradient-to-br from-purple-600/20 to-blue-600/20 border border-purple-500/30 rounded-xl p-6 flex flex-col justify-between relative overflow-hidden group">
                <div className="flex items-center gap-3 text-purple-300 mb-4 z-10">
                  <Zap className="h-5 w-5" />
                  <h3 className="font-medium text-sm">Current Plan</h3>
                </div>
                <p className="text-2xl font-bold text-white z-10">Free Tier</p>
                <div className="absolute -bottom-6 -right-6 h-24 w-24 bg-purple-500/20 blur-2xl rounded-full group-hover:bg-purple-500/30 transition-all"></div>
             </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-6">
             <h3 className="text-lg font-medium text-gray-200 mb-6">Activity Timeline (Last 7 Days)</h3>
             <UsageChart data={stats.history} />
          </div>

          {/* User Preferences & Avatar */}
          <ProfileSettings />
          
        </main>
      </div>
    </div>
  );
}
