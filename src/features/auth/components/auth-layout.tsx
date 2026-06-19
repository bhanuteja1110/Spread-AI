import React from 'react';
import Link from 'next/link';

/**
 * Theme-aware auth layout.
 *
 * Uses semantic Tailwind tokens (bg-background, bg-card, text-foreground,
 * border-border, bg-primary) so it adapts to light + dark automatically.
 * Hardcoded colors (bg-black, text-white, #080b12, etc.) are removed —
 * all visuals come from CSS variables in globals.css.
 *
 * The ambient glow blobs use `--primary` with reduced opacity in light mode
 * and higher opacity in dark mode (handled via /[0.08]/dark:bg-primary\/15).
 */
export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-svh flex items-center justify-center overflow-hidden bg-background">
      {/* Ambient glow blobs */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-[-15%] left-[-10%] w-[60%] h-[60%] rounded-full animate-blob bg-primary/[0.08] dark:bg-primary/[0.15]"
        style={{ filter: 'blur(60px)' }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-[-15%] right-[-10%] w-[60%] h-[60%] rounded-full animate-blob animation-delay-2000 bg-blue-500/[0.06] dark:bg-blue-500/[0.12]"
        style={{ filter: 'blur(60px)' }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute top-[30%] left-[60%] w-[35%] h-[35%] rounded-full animate-blob animation-delay-4000 bg-purple-500/[0.05] dark:bg-purple-500/[0.10]"
        style={{ filter: 'blur(60px)' }}
      />

      {/* Logo */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 z-10">
        <Link href="/login" className="flex items-center gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-md">
          <span
            aria-hidden
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </span>
          <span className="text-lg font-bold text-foreground tracking-tight">Spread AI</span>
        </Link>
      </div>

      {/* Main card — uses semantic tokens so it works in light + dark */}
      <main className="relative z-10 w-full max-w-md px-4 sm:px-6 py-20">
        <div className="w-full rounded-2xl p-8 sm:p-10 bg-card/80 backdrop-blur-xl border border-border shadow-xl">
          {children}
        </div>
      </main>
    </div>
  );
}
