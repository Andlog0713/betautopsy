import { NextResponse } from 'next/server';
import { getAuthenticatedClient } from '@/lib/supabase-from-request';
import { importBets } from '@/lib/import-bets';
import { logErrorServer } from '@/lib/log-error-server';
import type { ParsedBet } from '@/types';

export async function POST(request: Request) {
  try {
    const { supabase, user, error: authError } = await getAuthenticatedClient(request);

    if (authError || !user || !supabase) {
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

    // Validate required fields on each bet
    const validBets = bets.filter((b) =>
      b.placed_at && b.description && typeof b.odds === 'number' && typeof b.stake === 'number' && b.stake > 0 && b.result
    );
    if (validBets.length === 0) {
      return NextResponse.json({ error: 'No valid bets found. Each bet needs a date, description, odds, stake, and result.' }, { status: 400 });
    }

    const result = await importBets(supabase, user.id, validBets, source ?? 'paste-import');
    if (validBets.length < bets.length) {
      result.errors.push(`${bets.length - validBets.length} bet(s) skipped due to missing required fields.`);
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Upload-parsed error:', error);
    logErrorServer(error, { path: '/api/upload-parsed' });
    const message = error instanceof Error ? error.message : 'Import failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
