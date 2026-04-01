import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { importBets } from '@/lib/import-bets';
import { logErrorServer } from '@/lib/log-error-server';
import type { ParsedBet } from '@/types';

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { bets, source } = body as { bets?: ParsedBet[]; source?: string };

    if (!Array.isArray(bets) || bets.length === 0) {
      return NextResponse.json({ error: 'bets array is required and must not be empty' }, { status: 400 });
    }

    if (bets.length > 500) {
      return NextResponse.json({ error: 'Maximum 500 bets per import' }, { status: 400 });
    }

    const result = await importBets(supabase, user.id, bets, source ?? 'paste-import');

    return NextResponse.json(result);
  } catch (error) {
    console.error('Upload-parsed error:', error);
    logErrorServer(error, { path: '/api/upload-parsed' });
    const message = error instanceof Error ? error.message : 'Import failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
