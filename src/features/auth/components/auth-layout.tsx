import React from 'react';

export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-background">
      {/* Dynamic Background Blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/20 blur-[120px] mix-blend-screen animate-blob" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-600/20 blur-[120px] mix-blend-screen animate-blob animation-delay-2000" />
      <div className="absolute top-[20%] left-[60%] w-[30%] h-[30%] rounded-full bg-purple-600/20 blur-[120px] mix-blend-screen animate-blob animation-delay-4000" />

      {/* Main Content Area */}
      <main className="relative z-10 w-full max-w-md px-4 sm:px-6">
        <div className="glass-panel p-8 sm:p-10 rounded-2xl w-full">
          {children}
        </div>
      </main>
    </div>
  );
}
