import { apiPost } from './api-client';

/**
 * Report an error to the server for logging.
 * Fire-and-forget — never throws or blocks the UI.
 *
 * Callers are the two client error boundaries (`app/error.tsx` and
 * `app/global-error.tsx`), so `apiPost` is safe here — on web it
 * resolves to a same-origin `fetch('/api/log-error')` with the
 * session cookie, and on mobile it rewrites to the hosted origin
 * and adds the Bearer token. Anonymous reports are still permitted
 * by the route handler even without a token.
 */
export function reportError(
  error: Error | string,
  context?: { path?: string; source?: 'client' | 'api' | 'server'; metadata?: Record<string, unknown> }
) {
  try {
    const message = typeof error === 'string' ? error : error.message;
    const stack = typeof error === 'string' ? undefined : error.stack;

    apiPost('/api/log-error', {
      message,
      stack,
      path: context?.path ?? (typeof window !== 'undefined' ? window.location.pathname : undefined),
      source: context?.source ?? 'client',
      metadata: context?.metadata,
    }).catch(() => {
      // Silently fail — error logging should never break the app
    });
  } catch {
    // Silently fail
  }
}
