import type { ParsedBet } from '@/types';
import { SupabaseClient } from '@supabase/supabase-js';

export interface ImportResult {
  bets_imported: number;
  duplicates_skipped: number;
  upload_id: string | null;
  errors: string[];
}

function dupKey(date: string, description: string, odds: number, stake: number): string {
  const dayOnly = date.split('T')[0];
  return `${dayOnly}|${description.trim().toLowerCase()}|${odds}|${stake}`;
}

export async function importBets(
  supabase: SupabaseClient,
  userId: string,
  bets: ParsedBet[],
  source?: string // 'csv' | 'paste' | 'manual' or a filename
): Promise<ImportResult> {
  const errors: string[] = [];

  // ── Smart Duplicate Detection ──

  // Group upload bets by their duplicate key with counts
  const uploadGroups = new Map<string, ParsedBet[]>();
  for (const bet of bets) {
    const key = dupKey(bet.placed_at, bet.description, bet.odds, bet.stake);
    const group = uploadGroups.get(key) ?? [];
    group.push(bet);
    uploadGroups.set(key, group);
  }

  // Fetch ALL existing bets for this user to count matches (paginate to avoid row limits)
  const existingBets: { placed_at: string; description: string; odds: number; stake: number }[] = [];
  let rangeStart = 0;
  const PAGE_SIZE = 1000;
  while (true) {
    const { data: page } = await supabase
      .from('bets')
      .select('placed_at, description, odds, stake')
      .eq('user_id', userId)
      .range(rangeStart, rangeStart + PAGE_SIZE - 1);
    if (!page || page.length === 0) break;
    existingBets.push(...page);
    if (page.length < PAGE_SIZE) break;
    rangeStart += PAGE_SIZE;
  }

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
    return {
      bets_imported: 0,
      duplicates_skipped: duplicatesSkipped,
      upload_id: null,
      errors,
    };
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
      user_id: userId,
      filename: source ?? 'paste-import',
      bet_count: betsToInsert.length,
      sportsbook: dominantBook,
    })
    .select('id')
    .single();
  if (!uploadErr && uploadRecord) {
    uploadId = uploadRecord.id;
  }

  // Get current bet count for profile update
  const { data: profile } = await supabase
    .from('profiles')
    .select('bet_count')
    .eq('id', userId)
    .single();
  const currentCount = profile?.bet_count ?? 0;

  // Insert bets in batches of 100
  let totalInserted = 0;

  for (let i = 0; i < betsToInsert.length; i += 100) {
    const batch = betsToInsert.slice(i, i + 100).map((bet) => ({
      user_id: userId,
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
    await supabase.from('profiles').update({ bet_count: currentCount + totalInserted }).eq('id', userId);
    if (uploadId) await supabase.from('uploads').update({ bet_count: totalInserted }).eq('id', uploadId);
  }

  return {
    bets_imported: totalInserted,
    duplicates_skipped: duplicatesSkipped,
    upload_id: uploadId,
    errors,
  };
}
