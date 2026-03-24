'use client';

import { useEffect } from 'react';
import { reportError } from '@/lib/report-error';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportError(error, { source: 'client', metadata: { digest: error.digest, global: true } });
  }, [error]);

  return (
    <html lang="en">
      <body style={{ backgroundColor: '#0f0e0c', color: '#F0F0F0', fontFamily: 'sans-serif' }}>
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Something went wrong</h2>
            <p style={{ color: '#A0A3B1', marginBottom: '1.5rem' }}>{error.message}</p>
            <button onClick={reset} style={{ background: '#f97316', color: 'white', padding: '0.5rem 1.5rem', borderRadius: '0.5rem', border: 'none', cursor: 'pointer' }}>
              Try Again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
