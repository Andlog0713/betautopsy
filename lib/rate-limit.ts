import { createServerClient } from '@supabase/ssr';

/**
 * Check rate limit for a given key. Persisted in Supabase so limits
 * survive deployments and work across serverless instances.
 *
 * Falls back to allowing the request if the DB check fails,
 * so rate limiting never blocks users due to infrastructure issues.
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<boolean> {
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { cookies: { getAll: () => [], setAll: () => {} } }
    );

    const now = new Date();
    const resetAt = new Date(now.getTime() + windowMs);

    // Fetch existing entry
    const { data: entry } = await supabase
      .from('rate_limits')
      .select('count, reset_at')
      .eq('key', key)
      .single();

    // No entry or window expired — start fresh
    if (!entry || new Date(entry.reset_at) <= now) {
      await supabase
        .from('rate_limits')
        .upsert({ key, count: 1, reset_at: resetAt.toISOString() }, { onConflict: 'key' });
      return true;
    }

    // At limit
    if (entry.count >= limit) {
      return false;
    }

    // Increment
    await supabase
      .from('rate_limits')
      .update({ count: entry.count + 1 })
      .eq('key', key);

    return true;
  } catch {
    // If rate limiting fails, allow the request rather than blocking users
    return true;
  }
}
