import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase-server';

export async function POST(request: Request) {
  try {
    const { email, archetype, emotion_estimate } = await request.json();

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email required' }, { status: 400 });
    }

    const supabase = createServiceRoleClient();

    await supabase.from('quiz_leads').upsert(
      {
        email: email.toLowerCase().trim(),
        archetype,
        emotion_estimate,
        created_at: new Date().toISOString(),
      },
      { onConflict: 'email' }
    );

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
  }
}
