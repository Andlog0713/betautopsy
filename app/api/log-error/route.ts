import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function POST(request: Request) {
  try {
    const { message, stack, path, source, metadata } = await request.json();

    if (!message) {
      return NextResponse.json({ error: 'message required' }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();

    // Try to get user ID, but don't fail if not authenticated
    let userId: string | null = null;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id ?? null;
    } catch {
      // Not authenticated — that's fine
    }

    await supabase.from('error_logs').insert({
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
