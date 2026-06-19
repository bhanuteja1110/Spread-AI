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
    <div className="flex min-h-[400px] flex-col items-center justify-center p-8 text-center text-destructive bg-destructive/10 rounded-xl border border-destructive/20 m-4">
      <h2 className="mb-4 text-xl font-semibold text-foreground">Something went wrong!</h2>

      <div className="text-left w-full max-w-2xl bg-muted p-4 rounded-lg overflow-auto mb-6 text-sm text-muted-foreground font-mono">
        <p className="font-bold text-foreground mb-2">{error.message}</p>
        <pre className="whitespace-pre-wrap">{error.stack}</pre>
        {error.digest && (
          <p className="mt-4 text-xs text-muted-foreground/70">Digest: {error.digest}</p>
        )}
      </div>

      <button
        type="button"
        onClick={() => reset()}
        className="rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 transition-colors"
      >
        Try again
      </button>
    </div>
  );
}
