'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/Button';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[app-error]', error.message);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-console-bg px-4 text-center">
      <p className="font-mono text-xs uppercase tracking-widest text-risk-critical">System Alert</p>
      <h1 className="font-display text-2xl font-bold text-floodlight">Something went wrong</h1>
      <p className="max-w-md text-sm text-console-muted">
        The command center hit an unexpected error. This has been logged. You can try reloading this view.
      </p>
      <Button onClick={reset}>Try again</Button>
    </main>
  );
}
