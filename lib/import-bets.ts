import type { ParsedBet } from '@/types';
import { SupabaseClient } from '@supabase/supabase-js';
import {
  betRecordedDate,
  betSourceTime,
  betTemporalIdentity,
  betTimestampQuality,
  canonicalizeParsedBetTemporalFields,
} from '@/lib/temporal-provenance';

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
  placed_at: string | null;
  source_placed_at?: string | null;
  placed_date?: string | null;
  placed_time?: string | null;
  source_timezone?: string | null;
  timestamp_quality?: 'instant' | 'local_datetime' | 'date_only' | 'legacy_unknown' | null;
  recorded_date?: string | null;
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
  existing_temporal_upgrade: {
    placed_at: string | null;
    source_placed_at: string;
    placed_date: string;
    placed_time: string | null;
    source_timezone: string | null;
    timestamp_quality: 'instant' | 'local_datetime' | 'date_only';
  } | null;
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

function analyticalFacts(bet: Omit<ExistingBetIdentity, 'id'> | ParsedBet): unknown[] {
  return [
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
  ];
}

function dupKey(bet: Omit<ExistingBetIdentity, 'id'> | ParsedBet): string {
  // Reuse an existing row only when every analytical fact agrees. The prior
  // day/description/odds/stake key could collapse two different settlements,
  // books, or same-day wagers into one logical bet.
  return JSON.stringify([betTemporalIdentity(bet), ...analyticalFacts(bet)]);
}

function legacyDateFallbackKey(bet: Omit<ExistingBetIdentity, 'id'> | ParsedBet): string {
  return JSON.stringify([betRecordedDate(bet), ...analyticalFacts(bet)]);
}

function legacyLocalClockFallbackKey(bet: Omit<ExistingBetIdentity, 'id'> | ParsedBet): string {
  const quality = betTimestampQuality(bet);
  const time = quality === 'legacy_unknown'
    ? bet.placed_at?.slice(11, 19) ?? null
    : betSourceTime(bet);
  return JSON.stringify([betRecordedDate(bet), time, ...analyticalFacts(bet)]);
}

function temporalUpgrade(
  existing: ExistingBetIdentity,
  incoming: ParsedBet,
): BetImportPlanEntry['existing_temporal_upgrade'] {
  if (betTimestampQuality(existing) !== 'legacy_unknown') return null;
  if (
    !incoming.source_placed_at
    || !incoming.placed_date
    || !incoming.timestamp_quality
  ) return null;
  return {
    placed_at: incoming.placed_at,
    source_placed_at: incoming.source_placed_at,
    placed_date: incoming.placed_date,
    placed_time: incoming.placed_time ?? null,
    source_timezone: incoming.source_timezone ?? null,
    timestamp_quality: incoming.timestamp_quality,
  };
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
  const existingByKey = new Map<string, ExistingBetIdentity[]>();
  const legacyByDateKey = new Map<string, ExistingBetIdentity[]>();
  const legacyByLocalClockKey = new Map<string, ExistingBetIdentity[]>();
  for (const existing of existingBets) {
    const key = dupKey(existing);
    const exactMatches = existingByKey.get(key) ?? [];
    exactMatches.push(existing);
    existingByKey.set(key, exactMatches);
    if (betTimestampQuality(existing) === 'legacy_unknown') {
      const dateKey = legacyDateFallbackKey(existing);
      const dateMatches = legacyByDateKey.get(dateKey) ?? [];
      dateMatches.push(existing);
      legacyByDateKey.set(dateKey, dateMatches);
      const localClockKey = legacyLocalClockFallbackKey(existing);
      const localClockMatches = legacyByLocalClockKey.get(localClockKey) ?? [];
      localClockMatches.push(existing);
      legacyByLocalClockKey.set(localClockKey, localClockMatches);
    }
  }
  for (const matches of [
    ...existingByKey.values(),
    ...legacyByDateKey.values(),
    ...legacyByLocalClockKey.values(),
  ]) {
    matches.sort((a, b) => a.id.localeCompare(b.id));
  }

  const consumedIds = new Set<string>();
  const takeFirstUnused = (matches: ExistingBetIdentity[] | undefined): ExistingBetIdentity | null => {
    const match = matches?.find((candidate) => !consumedIds.has(candidate.id)) ?? null;
    if (match) consumedIds.add(match.id);
    return match;
  };
  const entries = bets.map((bet, position): BetImportPlanEntry => {
    let existing = takeFirstUnused(existingByKey.get(dupKey(bet)));
    if (!existing && bet.timestamp_quality === 'date_only') {
      existing = takeFirstUnused(legacyByDateKey.get(legacyDateFallbackKey(bet)));
    }
    if (!existing && bet.timestamp_quality === 'local_datetime') {
      existing = takeFirstUnused(legacyByLocalClockKey.get(legacyLocalClockFallbackKey(bet)));
    }
    return {
      position,
      bet,
      existing_bet_id: existing?.id ?? null,
      existing_temporal_upgrade: existing ? temporalUpgrade(existing, bet) : null,
    };
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
  const canonicalBets = bets.map(canonicalizeParsedBetTemporalFields);
  const existingBets: ExistingBetIdentity[] = [];
  let rangeStart = 0;
  const pageSize = 1000;

  while (true) {
    const { data: page, error } = await supabase
      .from('bets')
      .select('id, placed_at, source_placed_at, placed_date, placed_time, source_timezone, timestamp_quality, recorded_date, sport, league, bet_type, description, odds, stake, result, payout, profit, sportsbook, is_bonus_bet, parlay_legs, settlement_type')
      .eq('user_id', userId)
      .order('id', { ascending: true })
      .range(rangeStart, rangeStart + pageSize - 1);

    if (error) throw new Error(`Failed to check existing bets: ${error.message}`);
    if (!page || page.length === 0) break;
    existingBets.push(...(page as ExistingBetIdentity[]));
    if (page.length < pageSize) break;
    rangeStart += pageSize;
  }

  return buildBetImportPlan(canonicalBets, existingBets);
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
  const canonicalBets = bets.map(canonicalizeParsedBetTemporalFields);

  if (canonicalBets.length === 0) {
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

  const plan = await planBetImport(supabase, userId, canonicalBets);

  // The upload row represents the submitted logical cohort, not only rows
  // newly inserted into bets. It therefore exists even for an all-duplicate
  // re-upload and its bet_count is the full submitted logical count.
  const bookCounts = new Map<string, number>();
  canonicalBets.forEach((bet) => {
    if (bet.sportsbook) {
      bookCounts.set(bet.sportsbook, (bookCounts.get(bet.sportsbook) ?? 0) + 1);
    }
  });
  const dominantBook = bookCounts.size === 1 && bookCounts.values().next().value === canonicalBets.length
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
        source_placed_at: bet.source_placed_at,
        placed_date: bet.placed_date,
        placed_time: bet.placed_time,
        source_timezone: bet.source_timezone,
        timestamp_quality: bet.timestamp_quality,
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

    const temporalUpgrades = plan.entries.filter(
      (entry) => entry.existing_bet_id && entry.existing_temporal_upgrade,
    );
    for (const entry of temporalUpgrades) {
      const { error: upgradeError } = await supabase
        .from('bets')
        .update(entry.existing_temporal_upgrade!)
        .eq('id', entry.existing_bet_id!)
        .eq('user_id', userId);
      if (upgradeError) {
        throw new Error(`Failed to preserve source timestamp for existing bet ${entry.existing_bet_id}: ${upgradeError.message}`);
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
