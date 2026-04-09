import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function POST(request: Request) {
  try {
    const { message, stack, path, source, metadata } = await request.json();

    if (!message) {
      return NextResponse.json({ error: 'message required' }, { status: 400 });
    }

    // Use the session client only to resolve the caller's user id.
    let userId: string | null = null;
    try {
      const sessionSupabase = await createServerSupabaseClient();
      const { data: { user } } = await sessionSupabase.auth.getUser();
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
