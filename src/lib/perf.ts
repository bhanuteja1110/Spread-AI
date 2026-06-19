'use client';

/**
 * Lightweight performance instrumentation. Logs `console.time` /
 * `console.timeEnd` pairs in development only. A no-op in production
 * builds so there's zero runtime cost.
 */

const isDev = typeof process !== 'undefined' && process.env.NODE_ENV !== 'production';

type Timer = { label: string; startedAt: number };

const activeTimers = new Map<string, Timer>();

export function perfStart(label: string): void {
  if (!isDev) return;
  if (activeTimers.has(label)) {
    // eslint-disable-next-line no-console
    console.warn(`[perf] duplicate timer "${label}" — restarting`);
  }
  activeTimers.set(label, { label, startedAt: performance.now() });
  // eslint-disable-next-line no-console
  console.time(label);
}

export function perfEnd(label: string): number {
  if (!isDev) return 0;
  // eslint-disable-next-line no-console
  console.timeEnd(label);
  const t = activeTimers.get(label);
  activeTimers.delete(label);
  return t ? performance.now() - t.startedAt : 0;
}

/**
 * Wrap an async operation and log its duration. Errors still propagate.
 */
export async function perfMeasure<T>(label: string, fn: () => Promise<T>): Promise<T> {
  perfStart(label);
  try {
    return await fn();
  } finally {
    perfEnd(label);
  }
}