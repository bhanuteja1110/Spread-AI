import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from '@/components/ui/sonner';
import { cn } from '@/lib/utils';

// Inter — clean, modern, and battle-tested (used by Vercel, Linear, and many top SaaS products)
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={cn('dark', inter.variable)} suppressHydrationWarning>
      <body className={cn('font-sans antialiased bg-background text-foreground')}>
        {children}
        <Toaster position="top-center" richColors theme="dark" />
      </body>
    </html>
  );
}
