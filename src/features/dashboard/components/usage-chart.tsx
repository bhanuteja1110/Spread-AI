'use client';

import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export function UsageChart({ data }: { data: any[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="w-full h-[300px] flex items-center justify-center text-gray-500 border border-dashed border-white/10 rounded-xl">
        No recent activity found.
      </div>
    );
  }

  // Format dates strictly for visual display
  const chartData = data.map(item => ({
    ...item,
    formattedDate: new Date(item.date).toLocaleDateString('en-US', { weekday: 'short' })
  }));

  return (
    <div className="w-full h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorMessages" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
          <XAxis 
            dataKey="formattedDate" 
            stroke="rgba(255,255,255,0.3)" 
            fontSize={12} 
            tickLine={false} 
            axisLine={false} 
          />
          <YAxis 
            stroke="rgba(255,255,255,0.3)" 
            fontSize={12} 
            tickLine={false} 
            axisLine={false} 
          />
          <Tooltip 
            contentStyle={{ backgroundColor: '#0b101e', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}
            itemStyle={{ color: '#e5e7eb' }}
          />
          <Area 
            type="monotone" 
            dataKey="message_count" 
            name="Messages"
            stroke="#a855f7" 
            strokeWidth={3}
            fillOpacity={1} 
            fill="url(#colorMessages)" 
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
