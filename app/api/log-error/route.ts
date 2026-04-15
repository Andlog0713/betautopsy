import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { getAuthenticatedClient } from '@/lib/supabase-from-request';

export async function POST(request: Request) {
  try {
    const { message, stack, path, source, metadata } = await request.json();

    if (!message) {
      return NextResponse.json({ error: 'message required' }, { status: 400 });
    }

    // Best-effort resolve the caller's user id via the shared auth
    // helper. Supports both the web cookie path and the mobile
    // Bearer-token path. Failure is intentionally tolerated —
    // anonymous error reports are valid, the row just gets
    // `user_id = null`, which the service-role insert below is
    // permitted to write.
    let userId: string | null = null;
    try {
      const { user } = await getAuthenticatedClient(request);
      userId = user?.id ?? null;
    } catch {
      // Not authenticated — that's fine, row will be user_id null.
    }

    // Service-role client for the actual insert so we bypass the strict
    // `auth.uid() = user_id` RLS policy (which would otherwise reject
    // anonymous rows where both sides are null).
    const serviceSupabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { cookies: { getAll: () => [], setAll: () => {} } }
    );

    await serviceSupabase.from('error_logs').insert({
      user_id: userId,
      source: source || 'client',
      message: String(message).slice(0, 2000),
      stack: stack ? String(stack).slice(0, 5000) : null,
      path: path ? String(path).slice(0, 500) : null,
      metadata: metadata ?? null,
    });

    return NextResponse.json({ ok: true });
  } catch {
    // Don't let error logging itself cause errors for the user
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
