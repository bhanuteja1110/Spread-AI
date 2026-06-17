'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  console.error(error);

  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center p-8 text-center text-red-500 bg-red-500/10 rounded-xl border border-red-500/20 m-4">
      <h2 className="mb-4 text-xl font-semibold">Something went wrong!</h2>
      
      <div className="text-left w-full max-w-2xl bg-black/50 p-4 rounded-lg overflow-auto mb-6 text-sm text-red-400 font-mono">
        <p className="font-bold text-red-300 mb-2">{error.message}</p>
        <pre className="whitespace-pre-wrap">{error.stack}</pre>
        {error.digest && <p className="mt-4 text-xs text-red-500/50">Digest: {error.digest}</p>}
      </div>

      <button
        onClick={() => reset()}
        className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors"
      >
        Try again
      </button>
    </div>
  );
}
