'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState, useCallback } from 'react';
import { Monitor, Moon, Sun, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

type ThemeOption = {
  value: 'light' | 'dark' | 'system';
  label: string;
  description: string;
  icon: typeof Monitor;
};

const OPTIONS: ThemeOption[] = [
  {
    value: 'light',
    label: 'Light',
    description: 'Bright surfaces, easy in well-lit environments.',
    icon: Sun,
  },
  {
    value: 'dark',
    label: 'Dark',
    description: 'Low-light, premium glassmorphism.',
    icon: Moon,
  },
  {
    value: 'system',
    label: 'System',
    description: 'Follow your operating system preference.',
    icon: Monitor,
  },
];

export function ThemeSwitcher() {
  const { theme, systemTheme, resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Defer rendering the active state until after hydration to avoid
  // a mismatch between the SSR snapshot and the user's actual theme.
  useEffect(() => setMounted(true), []);

  const handleSelect = useCallback(
    (value: 'light' | 'dark' | 'system') => () => {
      // next-themes is synchronous — no async work — but log it so we can
      // confirm there is no visible delay.
      // eslint-disable-next-line no-console
      console.time(`theme.switch:${value}`);
      setTheme(value);
      requestAnimationFrame(() => {
        // eslint-disable-next-line no-console
        console.timeEnd(`theme.switch:${value}`);
      });
    },
    [setTheme],
  );

  return (
    <div
      role="radiogroup"
      aria-label="Theme preference"
      className="grid grid-cols-1 sm:grid-cols-3 gap-2"
    >
      {OPTIONS.map(({ value, label, description, icon: Icon }) => {
        const isActive = mounted && theme === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={isActive}
            onClick={handleSelect(value)}
            className={cn(
              'flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
              isActive
                ? 'border-primary/60 bg-primary/10'
                : 'border-border bg-card hover:bg-accent/50',
            )}
          >
            <span
              className={cn(
                'flex h-9 w-9 items-center justify-center rounded-lg shrink-0',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground',
              )}
              aria-hidden
            >
              <Icon className="h-4 w-4" />
            </span>
            <span className="flex-1 min-w-0">
              <span className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground">{label}</span>
                {isActive && (
                  <Check
                    className="h-3.5 w-3.5 text-primary"
                    aria-label="Currently selected"
                  />
                )}
              </span>
              <span className="block text-xs text-muted-foreground mt-0.5 leading-relaxed">
                {description}
              </span>
              {mounted && value === 'system' && (
                <span className="block text-[11px] text-muted-foreground/70 mt-1">
                  Currently: {systemTheme === 'dark' ? 'Dark' : 'Light'}
                  {resolvedTheme && resolvedTheme !== systemTheme && ` (rendered as ${resolvedTheme})`}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
