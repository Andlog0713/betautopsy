import { NextResponse } from 'next/server';
import { getAuthenticatedClient } from '@/lib/supabase-from-request';
import { importBets } from '@/lib/import-bets';
import { logErrorServer } from '@/lib/log-error-server';
import { isValidParsedBet, parsedBetValidationError } from '@/lib/parsed-bet-validation';
import type { ParsedBet } from '@/types';

export async function POST(request: Request) {
  try {
    const { supabase, user, error: authError } = await getAuthenticatedClient(request);

    if (authError || !user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { bets, source } = body as { bets?: unknown[]; source?: string };

    if (!Array.isArray(bets) || bets.length === 0) {
      return NextResponse.json({ error: 'bets array is required and must not be empty' }, { status: 400 });
    }

    if (bets.length > 500) {
      return NextResponse.json({ error: 'Maximum 500 bets per import' }, { status: 400 });
    }

    // Client-parsed imports bypass parseCSV, so validate every analytical
    // field here instead of allowing database defaults to turn unknowns into
    // zero, pending, or an empty category.
    const invalidReasons = bets
      .map(parsedBetValidationError)
      .filter((reason): reason is string => reason !== null);
    const validBets = bets.filter(isValidParsedBet) as ParsedBet[];
    if (validBets.length === 0) {
      return NextResponse.json({
        error: 'No valid bets found. Required analytical fields must be explicit and valid.',
        rows_in_file: bets.length,
        rows_skipped: bets.length,
        validation_errors: invalidReasons,
      }, { status: 400 });
    }

    const result = await importBets(supabase, user.id, validBets, source ?? 'paste-import');
    const rowsSkipped = bets.length - validBets.length;
    const errors = [...result.errors];
    if (rowsSkipped > 0) errors.push(`${rowsSkipped} bet(s) skipped due to unknown or invalid required fields.`);

    return NextResponse.json({
      ...result,
      errors,
      rows_in_file: bets.length,
      rows_skipped: rowsSkipped,
      validation_errors: invalidReasons,
    });
  } catch (error) {
    console.error('Upload-parsed error:', error);
    logErrorServer(error, { path: '/api/upload-parsed' });
    const message = error instanceof Error ? error.message : 'Import failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
