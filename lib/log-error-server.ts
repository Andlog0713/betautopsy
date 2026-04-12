import { createServerClient } from '@supabase/ssr';
import * as Sentry from '@sentry/nextjs';

/**
 * Log an error to the database AND Sentry from server-side code (API routes,
 * server actions). Fire-and-forget — never throws.
 *
 * Sentry only forwards in production (per sentry.server.config.ts), so local
 * dev still only writes to error_logs.
 */
export async function logErrorServer(
  error: unknown,
  context?: { path?: string; userId?: string; metadata?: Record<string, unknown> }
) {
  // 1) Forward to Sentry first so we still see the error if Supabase is down.
  try {
    Sentry.captureException(error, {
      tags: {
        path: context?.path ?? 'unknown',
      },
      user: context?.userId ? { id: context.userId } : undefined,
      extra: context?.metadata,
    });
  } catch {
    // Sentry should never break the app
  }

  // 2) Persist to error_logs for in-app review.
  try {
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;

    // Use service-level client to bypass RLS for server-side logging
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { cookies: { getAll: () => [], setAll: () => {} } }
    );

    await supabase.from('error_logs').insert({
      user_id: context?.userId ?? null,
      source: 'api',
      message: message.slice(0, 2000),
      stack: stack?.slice(0, 5000) ?? null,
      path: context?.path ?? null,
      metadata: context?.metadata ?? null,
    });
  } catch {
    // Silently fail — error logging should never cause cascading failures
  }
}
