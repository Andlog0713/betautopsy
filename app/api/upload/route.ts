import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { parseCSV } from '@/lib/csv-parser';
import { TIER_LIMITS } from '@/types';
import type { ParsedBet, Profile, SubscriptionTier } from '@/types';

// Generate a duplicate key from a bet's core fields
function dupKey(date: string, description: string, odds: number, stake: number): string {
  const dayOnly = date.split('T')[0]; // truncate to date
  return `${dayOnly}|${description.trim().toLowerCase()}|${odds}|${stake}`;
}

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const typedProfile = profile as Profile;
    const tier = typedProfile.subscription_tier as SubscriptionTier;
    const limits = TIER_LIMITS[tier];

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
      return NextResponse.json(
        { error: 'No valid bets found in CSV', errors, column_mapping },
        { status: 400 }
      );
    }

    // ── Smart Duplicate Detection ──

    // Group upload bets by their duplicate key with counts
    const uploadGroups = new Map<string, ParsedBet[]>();
    for (const bet of bets) {
      const key = dupKey(bet.placed_at, bet.description, bet.odds, bet.stake);
      const group = uploadGroups.get(key) ?? [];
      group.push(bet);
      uploadGroups.set(key, group);
    }

    // Fetch existing bets for this user to count matches
    const { data: existingBets } = await supabase
      .from('bets')
      .select('placed_at, description, odds, stake')
      .eq('user_id', user.id);

    // Count existing bets by duplicate key
    const existingCounts = new Map<string, number>();
    for (const eb of existingBets ?? []) {
      const key = dupKey(eb.placed_at, eb.description, eb.odds, eb.stake);
      existingCounts.set(key, (existingCounts.get(key) ?? 0) + 1);
    }

    // Determine which bets to actually insert (difference-based)
    const betsToInsert: ParsedBet[] = [];
    let duplicatesSkipped = 0;

    uploadGroups.forEach((group, key) => {
      const existingCount = existingCounts.get(key) ?? 0;
      const newCount = group.length;
      const toInsert = Math.max(0, newCount - existingCount);
      duplicatesSkipped += newCount - toInsert;

      // Take only the first `toInsert` from this group
      for (let i = 0; i < toInsert; i++) {
        betsToInsert.push(group[i]);
      }
    });

    if (betsToInsert.length === 0) {
      return NextResponse.json({
        bets_imported: 0,
        duplicates_skipped: duplicatesSkipped,
        upload_id: null,
        errors,
        warnings,
      });
    }

    // Detect dominant sportsbook
    const bookCounts = new Map<string, number>();
    betsToInsert.forEach((b) => {
      if (b.sportsbook) bookCounts.set(b.sportsbook, (bookCounts.get(b.sportsbook) ?? 0) + 1);
    });
    let dominantBook: string | null = null;
    if (bookCounts.size === 1) {
      dominantBook = Array.from(bookCounts.keys())[0];
    }

    // Create upload record (may fail if table doesn't exist yet — that's OK)
    let uploadId: string | null = null;
    const { data: uploadRecord, error: uploadErr } = await supabase
      .from('uploads')
      .insert({
        user_id: user.id,
        filename: file.name,
        bet_count: betsToInsert.length,
        sportsbook: dominantBook,
      })
      .select('id')
      .single();
    if (!uploadErr && uploadRecord) {
      uploadId = uploadRecord.id;
    } else if (uploadErr) {
      // Upload record creation failed — non-critical, continue with bet insertion
    }

    const currentCount = typedProfile.bet_count ?? 0;
    let finalBets = betsToInsert;

    // Insert bets in batches of 100
    let totalInserted = 0;

    for (let i = 0; i < finalBets.length; i += 100) {
      const batch = finalBets.slice(i, i + 100).map((bet) => ({
        user_id: user.id,
        placed_at: bet.placed_at,
        sport: bet.sport,
        league: bet.league ?? null,
        bet_type: bet.bet_type,
        description: bet.description,
        odds: bet.odds,
        stake: bet.stake,
        result: bet.result,
        payout: bet.payout,
        profit: bet.profit,
        sportsbook: bet.sportsbook ?? null,
        is_bonus_bet: bet.is_bonus_bet,
        parlay_legs: bet.parlay_legs ?? null,
        tags: bet.tags ?? null,
        notes: bet.notes ?? null,
        ...(uploadId ? { upload_id: uploadId } : {}),
      }));

      const { error: insertError, data: inserted } = await supabase
        .from('bets')
        .insert(batch)
        .select('id');

      if (insertError) {
        errors.push(`Batch insert failed at row ${i + 1}: ${insertError.message}`);
      } else {
        totalInserted += inserted?.length ?? batch.length;
      }
    }

    // Update bet_count on profile and upload record
    if (totalInserted > 0) {
      await supabase.from('profiles').update({ bet_count: currentCount + totalInserted }).eq('id', user.id);
      if (uploadId) await supabase.from('uploads').update({ bet_count: totalInserted }).eq('id', uploadId);
    }

    return NextResponse.json({
      bets_imported: totalInserted,
      duplicates_skipped: duplicatesSkipped,
      upload_id: uploadId,
      errors,
      warnings,
    });
  } catch (error) {
    console.error('Upload error:', error);
    const message = error instanceof Error ? error.message : 'Upload failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
