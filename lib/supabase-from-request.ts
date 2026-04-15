import { createServerSupabaseClient } from './supabase-server';
import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient, User } from '@supabase/supabase-js';

/**
 * Resolve the Supabase session for an incoming API request,
 * transparently supporting both the web (cookie-based) and mobile
 * (Bearer token) auth paths.
 *
 * Web (default): falls through to `createServerSupabaseClient()`,
 * which binds to the request cookies from `next/headers` and
 * returns the same session-aware client every existing route
 * already uses.
 *
 * Mobile (Capacitor webview calling the hosted origin): the
 * client-side `lib/api-client.ts` helpers attach
 * `Authorization: Bearer <access_token>` to each request. We
 * construct a fresh `@supabase/supabase-js` client with the
 * anon key plus a global `Authorization` header override, then
 * call `auth.getUser()` on it — which Supabase validates against
 * its auth server using the embedded token. A valid token yields
 * the same `{ supabase, user }` shape the cookie path does.
 *
 * The returned `supabase` client carries whatever auth identity
 * was resolved, so existing RLS policies and same-user reads
 * continue to work unchanged. Callers should treat a non-null
 * `error` as "reject the request" and a null `user` as
 * "unauthenticated".
 */
export interface AuthenticatedClient {
  supabase: SupabaseClient | null;
  user: User | null;
  error: string | null;
}

export async function getAuthenticatedClient(
  request: Request
): Promise<AuthenticatedClient> {
  const authHeader = request.headers.get('Authorization');

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice('Bearer '.length).trim();
    if (!token) {
      return { supabase: null, user: null, error: 'Empty Bearer token' };
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
        global: {
          headers: { Authorization: `Bearer ${token}` },
        },
      }
    );

    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      return { supabase: null, user: null, error: 'Invalid token' };
    }
    return { supabase, user, error: null };
  }

  // Web / cookie path — behaves identically to the existing routes.
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  return {
    supabase,
    user,
    error: error?.message || (!user ? 'Not authenticated' : null),
  };
}
