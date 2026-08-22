import type { SupabaseClient } from '@supabase/supabase-js';
import type { Bet } from '@/types';

const PAGE_SIZE = 1000;
const ID_CHUNK_SIZE = 200;

interface ReportScope {
  userId: string;
  analyzedBetIds?: string[] | null;
  uploadIds?: string[];
  sportsbook?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
  maxBets?: number;
}

interface UploadMembership {
  bet_id: string;
  position: number;
}

function uniqueIds(ids: string[]): string[] {
  return [...new Set(ids)];
}

function mostRecentAscending(bets: Bet[], maxBets?: number): Bet[] {
  const ascending = [...bets].sort((a, b) => {
    const byDate = new Date(a.placed_at).getTime() - new Date(b.placed_at).getTime();
    return byDate || a.id.localeCompare(b.id);
  });

  if (!maxBets || ascending.length <= maxBets) return ascending;
  return ascending.slice(ascending.length - maxBets);
}

async function fetchBetsByIds(
  supabase: SupabaseClient,
  scope: ReportScope,
  ids: string[],
): Promise<Bet[]> {
  const bets: Bet[] = [];
  const expectedIds = uniqueIds(ids);

  for (let offset = 0; offset < expectedIds.length; offset += ID_CHUNK_SIZE) {
    let query = supabase
      .from('bets')
      .select('*')
      .eq('user_id', scope.userId)
      .in('id', expectedIds.slice(offset, offset + ID_CHUNK_SIZE));

    const { data, error } = await query;
    if (error) throw new Error(`Failed to fetch report cohort bets: ${error.message}`);
    bets.push(...((data ?? []) as Bet[]));
  }

  const returnedIds = new Set(bets.map((bet) => bet.id));
  const missingIds = expectedIds.filter((id) => !returnedIds.has(id));
  if (missingIds.length > 0) {
    throw new Error(
      `scope_incomplete: ${missingIds.length} of ${expectedIds.length} frozen bets are unavailable`,
    );
  }

  return bets;
}

async function membershipBetIds(
  supabase: SupabaseClient,
  userId: string,
  uploadIds: string[],
): Promise<string[]> {
  const memberships: UploadMembership[] = [];

  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await supabase
      .from('upload_bets')
      .select('bet_id, position')
      .eq('user_id', userId)
      .in('upload_id', uploadIds)
      .order('position', { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) throw new Error(`Failed to resolve logical upload: ${error.message}`);
    const page = (data ?? []) as UploadMembership[];
    memberships.push(...page);
    if (page.length < PAGE_SIZE) break;
  }

  return uniqueIds(memberships.map((membership) => membership.bet_id));
}

async function fetchLegacyUploadBets(
  supabase: SupabaseClient,
  scope: ReportScope,
  uploadIds: string[],
): Promise<Bet[]> {
  const bets: Bet[] = [];

  for (let offset = 0; ; offset += PAGE_SIZE) {
    let query = supabase
      .from('bets')
      .select('*')
      .eq('user_id', scope.userId)
      .in('upload_id', uploadIds)
      .order('placed_at', { ascending: true });

    if (scope.sportsbook) query = query.eq('sportsbook', scope.sportsbook);
    if (scope.dateFrom) query = query.gte('placed_at', new Date(scope.dateFrom).toISOString());
    if (scope.dateTo) {
      const exclusiveEnd = new Date(scope.dateTo);
      exclusiveEnd.setDate(exclusiveEnd.getDate() + 1);
      query = query.lt('placed_at', exclusiveEnd.toISOString());
    }

    const { data, error } = await query.range(offset, offset + PAGE_SIZE - 1);
    if (error) throw new Error(`Failed to fetch legacy upload cohort: ${error.message}`);
    const page = (data ?? []) as Bet[];
    bets.push(...page);
    if (page.length < PAGE_SIZE) break;
  }

  return bets;
}

async function fetchAllUserBets(
  supabase: SupabaseClient,
  scope: ReportScope,
): Promise<Bet[]> {
  const bets: Bet[] = [];

  for (let offset = 0; ; offset += PAGE_SIZE) {
    let query = supabase
      .from('bets')
      .select('*')
      .eq('user_id', scope.userId)
      .order('placed_at', { ascending: true });

    if (scope.sportsbook) query = query.eq('sportsbook', scope.sportsbook);
    if (scope.dateFrom) query = query.gte('placed_at', new Date(scope.dateFrom).toISOString());
    if (scope.dateTo) {
      const exclusiveEnd = new Date(scope.dateTo);
      exclusiveEnd.setDate(exclusiveEnd.getDate() + 1);
      query = query.lt('placed_at', exclusiveEnd.toISOString());
    }

    const { data, error } = await query.range(offset, offset + PAGE_SIZE - 1);
    if (error) throw new Error(`Failed to fetch report cohort: ${error.message}`);
    const page = (data ?? []) as Bet[];
    bets.push(...page);
    if (page.length < PAGE_SIZE) break;
  }

  return bets;
}

// New reports persist analyzedBetIds, which is the immutable source of truth.
// uploadIds remain as an additive-compatible fallback for legacy snapshots.
export async function resolveBetsForReportScope(
  supabase: SupabaseClient,
  scope: ReportScope,
): Promise<Bet[]> {
  if (scope.analyzedBetIds !== undefined && scope.analyzedBetIds !== null) {
    if (scope.analyzedBetIds.length === 0) return [];
    const bets = await fetchBetsByIds(supabase, scope, uniqueIds(scope.analyzedBetIds));
    return mostRecentAscending(bets, scope.maxBets);
  }

  const uploadIds = uniqueIds(scope.uploadIds ?? []);
  if (uploadIds.length > 0) {
    const ids = await membershipBetIds(supabase, scope.userId, uploadIds);
    const bets = ids.length > 0
      ? await fetchBetsByIds(supabase, scope, ids)
      : await fetchLegacyUploadBets(supabase, scope, uploadIds);
    return mostRecentAscending(bets, scope.maxBets);
  }

  const bets = await fetchAllUserBets(supabase, scope);
  return mostRecentAscending(bets, scope.maxBets);
}
