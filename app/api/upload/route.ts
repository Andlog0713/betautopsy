import { NextResponse } from 'next/server';
import { getAuthenticatedClient } from '@/lib/supabase-from-request';
import { parseCSV } from '@/lib/csv-parser';
import { importBets } from '@/lib/import-bets';
import { logErrorServer } from '@/lib/log-error-server';
import type { UploadPreviewResponse } from '@/types';

export async function POST(request: Request) {
  try {
    const { supabase, user, error: authError } = await getAuthenticatedClient(request);

    if (authError || !user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse the uploaded file
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const isPreview = formData.get('preview') === 'true';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // File type validation
    if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
      return NextResponse.json({ error: 'Only CSV files are accepted.' }, { status: 400 });
    }

    // File size validation (10MB max)
    const MAX_FILE_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File too large. Maximum size is 10MB.' }, { status: 413 });
    }

    const text = await file.text();
    const { bets, errors, warnings, column_mapping, collapse } = parseCSV(text);

    if (bets.length === 0) {
      // Surface the most specific error the parser produced. The csv-parser
      // emits messages like "Could not find required column: stake. Found
      // columns: date, sport, ..." which are much more actionable than
      // the generic "No valid bets found" fallback. Prepend a one-line
      // explainer and a link to the template so users know where to go
      // next.
      const firstSpecificError = errors.find((e) => e && e.length > 0);
      const detail = firstSpecificError
        ? `${firstSpecificError}`
        : "We couldn't read any bets from this file.";
      return NextResponse.json(
        {
          error: `${detail} Download the CSV template at /example-bets.csv if you're not sure what format we expect.`,
          errors,
          column_mapping,
        },
        { status: 400 }
      );
    }

    // Minimal pre-commit review: bet count, staked, net, date range — not
    // a row-by-row audit. Nothing is written to the DB on this branch;
    // the client re-POSTs the same file without `preview` to actually
    // commit. Surfaces exactly the gap that let 499 rows silently become
    // 200 bets: rows_in_file vs. bet_count are shown separately whenever
    // the collapse pass changed anything.
    if (isPreview) {
      const totalStaked = bets.reduce((sum, b) => sum + b.stake, 0);
      const totalNet = bets.reduce((sum, b) => sum + b.profit, 0);
      const dates = bets.map((b) => b.placed_at).sort();
      const preview: UploadPreviewResponse = {
        preview: true,
        bet_count: bets.length,
        rows_in_file: collapse.rowsIn,
        total_staked: totalStaked,
        total_net: totalNet,
        date_range_start: dates[0] ?? null,
        date_range_end: dates[dates.length - 1] ?? null,
        errors,
        warnings,
      };
      return NextResponse.json(preview);
    }

    const result = await importBets(supabase, user.id, bets, file.name);

    return NextResponse.json({
      ...result,
      errors: [...result.errors, ...errors],
      warnings,
    });
  } catch (error) {
    console.error('Upload error:', error);
    logErrorServer(error, { path: '/api/upload' });
    return NextResponse.json({ error: 'Upload failed. Please check your file and try again.' }, { status: 500 });
  }
}
