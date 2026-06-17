'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error natively avoiding unhandled promises
    console.error('Spread AI Global Error caught:', error);
  }, [error]);

  return (
    <div className="bg-[#0b101e] text-white flex h-screen w-full items-center justify-center p-4">
      <div className="max-w-md w-full bg-white/5 border border-white/10 rounded-2xl p-8 text-center space-y-6 shadow-2xl">
        <div className="mx-auto bg-red-500/20 h-16 w-16 flex items-center justify-center rounded-full animate-bounce">
          <AlertTriangle className="h-8 w-8 text-red-400" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight">Something went wrong</h2>
          <p className="text-gray-400 text-sm">
            We encountered an unexpected rendering error. Please reload the session safely.
          </p>
        </div>
        <Button 
          onClick={() => reset()} 
          className="w-full bg-purple-600 hover:bg-purple-700 font-semibold gap-2 transition-all h-12"
        >
          <RefreshCcw className="h-4 w-4" /> Reload Session
        </Button>
      </div>
    </div>
  );
}
