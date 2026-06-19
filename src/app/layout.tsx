import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from '@/components/ui/sonner';
import { ThemeProvider } from '@/components/theme-provider';
import { cn } from '@/lib/utils';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });

export const metadata: Metadata = {
  title: {
    default: 'Spread AI — Your AI-Powered Assistant',
    template: '%s | Spread AI',
  },
  description:
    'Spread AI is a next-generation AI coding assistant and knowledge engine, founded by Bhanuteja. Supports voice input, file analysis, and multimodal vision.',
  keywords: ['AI', 'coding assistant', 'NVIDIA', 'chat', 'Spread AI'],
  authors: [{ name: 'Bhanuteja' }],
  robots: { index: true, follow: true },
  openGraph: {
    type: 'website',
    title: 'Spread AI',
    description: 'Advanced AI coding assistant powered by NVIDIA.',
    siteName: 'Spread AI',
  },
};

// Block FOUC: read stored theme (or system preference) and apply the matching
// class on <html> BEFORE the React tree mounts. Without this, dark-mode users
// see a white flash on first paint.
const themeScript = `
(function() {
  try {
    var stored = localStorage.getItem('spreadai-theme');
    var systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    var isDark = stored === 'dark' || (stored !== 'light' && systemDark);
    if (isDark) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  } catch (_) {}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={cn('font-sans antialiased bg-background text-foreground')}>
        <ThemeProvider>{children}</ThemeProvider>
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
