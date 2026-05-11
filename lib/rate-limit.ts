import { createServerClient } from '@supabase/ssr';

const RATE_LIMIT_BYPASS_EMAILS = new Set<string>([
  'andlog0713@gmail.com',
]);

function isBypassed(email: string | null | undefined): boolean {
  if (!email) return false;
  return RATE_LIMIT_BYPASS_EMAILS.has(email.trim().toLowerCase());
}

/**
 * Atomic rate limit check using a Postgres RPC function.
 * Returns true if the request is within limits, false if rate limited.
 * Falls back to allowing the request if the RPC call fails.
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
  email?: string | null
): Promise<boolean> {
  if (isBypassed(email)) return true;

  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { cookies: { getAll: () => [], setAll: () => {} } }
    );

    const { data, error } = await supabase.rpc('check_rate_limit', {
      p_key: key,
      p_limit: limit,
      p_window_ms: windowMs,
    });

    if (error) {
      console.error('Rate limit RPC error:', error);
      return true; // fail open on DB errors
    }

    return data as boolean;
  } catch {
    return true; // fail open on unexpected errors
  }
}
