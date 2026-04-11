'use client';

import { useEffect } from 'react';
import { reportError } from '@/lib/report-error';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportError(error, { source: 'client', metadata: { digest: error.digest } });
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center">
        <h2 className="font-bold text-2xl mb-2 text-fg-bright">Something went wrong</h2>
        <p className="text-ink-600 text-sm mb-6">{error.message}</p>
        <button onClick={reset} className="btn-primary">
          Try Again
        </button>
      </div>
    </div>
  );
}
