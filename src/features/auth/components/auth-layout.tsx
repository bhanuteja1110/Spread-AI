import React from 'react';
import Image from 'next/image';

export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #0a0e1a 0%, #0d1117 50%, #0a0e1a 100%)' }}
    >
      {/* Ambient glow blobs */}
      <div
        className="pointer-events-none absolute top-[-15%] left-[-10%] w-[50%] h-[50%] rounded-full animate-blob"
        style={{ background: 'radial-gradient(circle, rgba(168,85,247,0.15) 0%, transparent 70%)', filter: 'blur(60px)' }}
      />
      <div
        className="pointer-events-none absolute bottom-[-15%] right-[-10%] w-[50%] h-[50%] rounded-full animate-blob animation-delay-2000"
        style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.12) 0%, transparent 70%)', filter: 'blur(60px)' }}
      />
      <div
        className="pointer-events-none absolute top-[30%] left-[60%] w-[30%] h-[30%] rounded-full animate-blob animation-delay-4000"
        style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.1) 0%, transparent 70%)', filter: 'blur(60px)' }}
      />

      {/* Logo */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-600 shadow-lg shadow-purple-500/30">
            <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <span className="text-lg font-bold text-white tracking-tight">Spread AI</span>
        </div>
      </div>

      {/* Main glass card */}
      <main className="relative z-10 w-full max-w-md px-4 sm:px-6 py-16">
        <div
          className="w-full rounded-2xl p-8 sm:p-10"
          style={{
            background: 'rgba(255, 255, 255, 0.04)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)',
          }}
        >
          {children}
        </div>
      </main>
    </div>
  );
}
