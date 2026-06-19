'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';
import type { ComponentProps } from 'react';

/**
 * App-wide theme provider.
 *
 * - `attribute="class"` toggles `.dark` on `<html>` — required by our
 *   Tailwind darkMode: ['class'] config.
 * - `defaultTheme="system"` follows the OS preference on first visit.
 * - `enableSystem` allows the in-app "System" option.
 * - `disableTransitionOnChange` keeps theme switches instant without a
 *   white-flash mid-animation.
 * - `storageKey` namespaced so it doesn't clash with other apps on
 *   `localhost`.
 */
export function ThemeProvider({ children, ...props }: ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      storageKey="spreadai-theme"
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}
