import type { ParsedBet } from '@/types';
import { SupabaseClient } from '@supabase/supabase-js';

export interface ImportResult {
  bets_imported: number;
  duplicates_skipped: number;
  upload_id: string | null;
  errors: string[];
  logical_bets: number;
  existing_bets: number;
  new_bets: number;
}

interface ExistingBetIdentity {
  id: string;
  placed_at: string;
  sport: string;
  league?: string | null;
  bet_type: string;
  description: string;
  odds: number;
  stake: number;
  result: ParsedBet['result'];
  payout: number;
  profit: number;
  sportsbook?: string | null;
  is_bonus_bet: boolean;
  parlay_legs?: number | null;
  settlement_type?: 'cash_out' | null;
}

export interface BetImportPlanEntry {
  position: number;
  bet: ParsedBet;
  existing_bet_id: string | null;
}

export interface BetImportPlan {
  entries: BetImportPlanEntry[];
  logical_bets: number;
  existing_bets: number;
  new_bets: number;
}

function normalizedText(value: string | null | undefined): string {
  return value?.trim().toLowerCase() ?? '';
}

function dupKey(bet: Omit<ExistingBetIdentity, 'id'> | ParsedBet): string {
  // Reuse an existing row only when every analytical fact agrees. The prior
  // day/description/odds/stake key could collapse two different settlements,
  // books, or same-day wagers into one logical bet.
  return JSON.stringify([
    bet.placed_at,
    normalizedText(bet.sport),
    normalizedText(bet.league),
    normalizedText(bet.bet_type),
    normalizedText(bet.description),
    Number(bet.odds),
    Number(bet.stake),
    bet.result,
    Number(bet.payout),
    Number(bet.profit),
    normalizedText(bet.sportsbook),
    bet.is_bonus_bet,
    bet.parlay_legs ?? null,
    bet.settlement_type ?? null,
  ]);
}

/**
 * Match one submitted logical cohort against existing rows without writing.
 *
 * Difference-based multiplicity is preserved: if the file contains two rows
 * with the same key and the account contains one, the first occurrence uses
 * the existing row and the second is planned as a new insert. Existing IDs are
 * sorted so preview and commit choose the same rows when account state has not
 * changed between requests.
 */
export function buildBetImportPlan(
  bets: ParsedBet[],
  existingBets: ExistingBetIdentity[]
): BetImportPlan {
  const existingByKey = new Map<string, string[]>();
  for (const existing of existingBets) {
    const key = dupKey(existing);
    const ids = existingByKey.get(key) ?? [];
    ids.push(existing.id);
    existingByKey.set(key, ids);
  }
  for (const ids of existingByKey.values()) ids.sort();

  const consumedByKey = new Map<string, number>();
  const entries = bets.map((bet, position): BetImportPlanEntry => {
    const key = dupKey(bet);
    const consumed = consumedByKey.get(key) ?? 0;
    const existingBetId = existingByKey.get(key)?.[consumed] ?? null;
    consumedByKey.set(key, consumed + 1);
    return { position, bet, existing_bet_id: existingBetId };
  });

  const existingCount = entries.filter((entry) => entry.existing_bet_id !== null).length;
  return {
    entries,
    logical_bets: entries.length,
    existing_bets: existingCount,
    new_bets: entries.length - existingCount,
  };
}

/** Build the same read-only match plan used later by importBets(). */
export async function planBetImport(
  supabase: SupabaseClient,
  userId: string,
  bets: ParsedBet[]
): Promise<BetImportPlan> {
  const existingBets: ExistingBetIdentity[] = [];
  let rangeStart = 0;
  const pageSize = 1000;

  while (true) {
    const { data: page, error } = await supabase
      .from('bets')
      .select('id, placed_at, sport, league, bet_type, description, odds, stake, result, payout, profit, sportsbook, is_bonus_bet, parlay_legs, settlement_type')
      .eq('user_id', userId)
      .order('id', { ascending: true })
      .range(rangeStart, rangeStart + pageSize - 1);

    if (error) throw new Error(`Failed to check existing bets: ${error.message}`);
    if (!page || page.length === 0) break;
    existingBets.push(...(page as ExistingBetIdentity[]));
    if (page.length < pageSize) break;
    rangeStart += pageSize;
  }

  return buildBetImportPlan(bets, existingBets);
}

async function cleanUpFailedImport(
  supabase: SupabaseClient,
  uploadId: string,
  insertedBetIds: string[]
): Promise<void> {
  for (let i = 0; i < insertedBetIds.length; i += 100) {
    await supabase.from('bets').delete().in('id', insertedBetIds.slice(i, i + 100));
  }
  await supabase.from('uploads').delete().eq('id', uploadId);
}

export async function importBets(
  supabase: SupabaseClient,
  userId: string,
  bets: ParsedBet[],
  source?: string // 'csv' | 'paste' | 'manual' or a filename
): Promise<ImportResult> {
  const errors: string[] = [];

  if (bets.length === 0) {
    return {
      bets_imported: 0,
      duplicates_skipped: 0,
      upload_id: null,
      errors,
      logical_bets: 0,
      existing_bets: 0,
      new_bets: 0,
    };
  }

  const plan = await planBetImport(supabase, userId, bets);

  // The upload row represents the submitted logical cohort, not only rows
  // newly inserted into bets. It therefore exists even for an all-duplicate
  // re-upload and its bet_count is the full submitted logical count.
  const bookCounts = new Map<string, number>();
  bets.forEach((bet) => {
    if (bet.sportsbook) {
      bookCounts.set(bet.sportsbook, (bookCounts.get(bet.sportsbook) ?? 0) + 1);
    }
  });
  const dominantBook = bookCounts.size === 1 && bookCounts.values().next().value === bets.length
    ? Array.from(bookCounts.keys())[0]
    : null;

  const { data: uploadRecord, error: uploadError } = await supabase
    .from('uploads')
    .insert({
      user_id: userId,
      filename: source ?? 'paste-import',
      bet_count: plan.logical_bets,
      sportsbook: dominantBook,
    })
    .select('id')
    .single();

  if (uploadError || !uploadRecord?.id) {
    throw new Error(`Failed to create logical upload: ${uploadError?.message ?? 'no upload id returned'}`);
  }
  const uploadId = uploadRecord.id as string;

  const newEntries = plan.entries
    .filter((entry) => entry.existing_bet_id === null)
    .map((entry) => ({ ...entry, inserted_bet_id: crypto.randomUUID() }));
  const insertedBetIds = newEntries.map((entry) => entry.inserted_bet_id);

  try {
    for (let i = 0; i < newEntries.length; i += 100) {
      const batch = newEntries.slice(i, i + 100).map(({ bet, inserted_bet_id }) => ({
        id: inserted_bet_id,
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
        settlement_type: bet.settlement_type ?? null,
        upload_id: uploadId,
      }));

      const { error: insertError } = await supabase.from('bets').insert(batch);
      if (insertError) {
        throw new Error(`Batch insert failed at row ${i + 1}: ${insertError.message}`);
      }
    }

    const insertedIdByPosition = new Map(
      newEntries.map((entry) => [entry.position, entry.inserted_bet_id])
    );
    const memberships = plan.entries.map((entry) => ({
      upload_id: uploadId,
      bet_id: entry.existing_bet_id ?? insertedIdByPosition.get(entry.position)!,
      user_id: userId,
      position: entry.position,
    }));

    for (let i = 0; i < memberships.length; i += 500) {
      const { error: membershipError } = await supabase
        .from('upload_bets')
        .insert(memberships.slice(i, i + 500));
      if (membershipError) {
        throw new Error(`Failed to save logical upload membership: ${membershipError.message}`);
      }
    }
  } catch (error) {
    await cleanUpFailedImport(supabase, uploadId, insertedBetIds);
    throw error;
  }

  // Profile bet_count tracks stored unique rows, not logical cohort size.
  if (newEntries.length > 0) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('bet_count')
      .eq('id', userId)
      .single();
    const currentCount = profile?.bet_count ?? 0;
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ bet_count: currentCount + newEntries.length })
      .eq('id', userId);
    if (profileError) errors.push(`Profile bet count update failed: ${profileError.message}`);
  }

  return {
    bets_imported: newEntries.length,
    duplicates_skipped: plan.existing_bets,
    upload_id: uploadId,
    errors,
    logical_bets: plan.logical_bets,
    existing_bets: plan.existing_bets,
    new_bets: newEntries.length,
  };
}
