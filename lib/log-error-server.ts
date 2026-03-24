import { createServerClient } from '@supabase/ssr';

/**
 * Log an error to the database from server-side code (API routes, server actions).
 * Fire-and-forget — never throws.
 */
export async function logErrorServer(
  error: unknown,
  context?: { path?: string; userId?: string; metadata?: Record<string, unknown> }
) {
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
