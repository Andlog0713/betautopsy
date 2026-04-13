import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { parseCSV } from '@/lib/csv-parser';
import { importBets } from '@/lib/import-bets';
import { logErrorServer } from '@/lib/log-error-server';

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse the uploaded file
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

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
    const { bets, errors, warnings, column_mapping } = parseCSV(text);

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
