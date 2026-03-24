/**
 * Report an error to the server for logging.
 * Fire-and-forget — never throws or blocks the UI.
 */
export function reportError(
  error: Error | string,
  context?: { path?: string; source?: 'client' | 'api' | 'server'; metadata?: Record<string, unknown> }
) {
  try {
    const message = typeof error === 'string' ? error : error.message;
    const stack = typeof error === 'string' ? undefined : error.stack;

    fetch('/api/log-error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        stack,
        path: context?.path ?? (typeof window !== 'undefined' ? window.location.pathname : undefined),
        source: context?.source ?? 'client',
        metadata: context?.metadata,
      }),
    }).catch(() => {
      // Silently fail — error logging should never break the app
    });
  } catch {
    // Silently fail
  }
}
