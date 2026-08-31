import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Bet, ParsedBet } from '@/types';
import { calculateMetrics } from '@/lib/autopsy-engine';
import { parseCSV } from '@/lib/csv-parser';
import { resolveBetsForReportScope } from '@/lib/report-cohort';

type Row = Record<string, unknown>;

class Query {
  private equals: Array<[string, unknown]> = [];
  private inclusions: Array<[string, unknown[]]> = [];
  private lowerBounds: Array<[string, string]> = [];
  private upperBounds: Array<[string, string]> = [];
  private inclusiveUpperBounds: Array<[string, string]> = [];
  private orderBy: [string, boolean] | null = null;
  private bounds: [number, number] | null = null;

  constructor(private readonly rows: object[]) {}

  select() { return this; }
  eq(column: string, value: unknown) { this.equals.push([column, value]); return this; }
  in(column: string, values: unknown[]) { this.inclusions.push([column, values]); return this; }
  gte(column: string, value: string) { this.lowerBounds.push([column, value]); return this; }
  lt(column: string, value: string) { this.upperBounds.push([column, value]); return this; }
  lte(column: string, value: string) { this.inclusiveUpperBounds.push([column, value]); return this; }
  order(column: string, options?: { ascending?: boolean }) {
    this.orderBy = [column, options?.ascending !== false];
    return this;
  }
  range(start: number, end: number) { this.bounds = [start, end]; return this; }

  private execute() {
    let data = this.rows.filter((value) => {
      const row = value as Row;
      return this.equals.every(([column, expected]) => row[column] === expected)
      && this.inclusions.every(([column, values]) => values.includes(row[column]))
      && this.lowerBounds.every(([column, lower]) => String(row[column]) >= lower)
      && this.upperBounds.every(([column, upper]) => String(row[column]) < upper)
      && this.inclusiveUpperBounds.every(([column, upper]) => String(row[column]) <= upper);
    });
    if (this.orderBy) {
      const [column, ascending] = this.orderBy;
      data = [...data].sort((leftValue, rightValue) => {
        const left = leftValue as Row;
        const right = rightValue as Row;
        const comparison = String(left[column]).localeCompare(String(right[column]));
        return ascending ? comparison : -comparison;
      });
    }
    if (this.bounds) data = data.slice(this.bounds[0], this.bounds[1] + 1);
    return { data, error: null };
  }

  then<TResult1 = { data: object[]; error: null }>(
    onfulfilled?: ((value: { data: object[]; error: null }) => TResult1 | PromiseLike<TResult1>) | null,
  ): Promise<TResult1> {
    return Promise.resolve(this.execute()).then(onfulfilled ?? undefined);
  }
}

function makeClient(tables: Record<string, object[]>): SupabaseClient {
  return {
    from(table: string) {
      return new Query(tables[table] ?? []);
    },
  } as unknown as SupabaseClient;
}

function makeBet(id: string, placedAt: string, uploadId: string | null): Bet {
  return {
    id,
    user_id: 'user-1',
    placed_at: placedAt,
    sport: 'NFL',
    league: 'NFL',
    bet_type: 'spread',
    description: id,
    odds: -110,
    stake: 100,
    result: 'loss',
    payout: 0,
    profit: -100,
    sportsbook: 'DraftKings',
    is_bonus_bet: false,
    parlay_legs: null,
    tags: null,
    notes: null,
    upload_id: uploadId,
    created_at: placedAt,
  };
}

function storedBet(
  parsed: ParsedBet,
  id: string,
  uploadId: string,
): Bet {
  return {
    id,
    user_id: 'user-1',
    upload_id: uploadId,
    placed_at: parsed.placed_at,
    source_placed_at: parsed.source_placed_at,
    placed_date: parsed.placed_date,
    placed_time: parsed.placed_time,
    source_timezone: parsed.source_timezone,
    timestamp_quality: parsed.timestamp_quality,
    recorded_date: parsed.placed_date,
    sport: parsed.sport,
    league: parsed.league ?? null,
    bet_type: parsed.bet_type,
    description: parsed.description,
    odds: parsed.odds,
    stake: parsed.stake,
    result: parsed.result,
    payout: parsed.payout,
    profit: parsed.profit,
    sportsbook: parsed.sportsbook ?? null,
    is_bonus_bet: parsed.is_bonus_bet,
    parlay_legs: parsed.parlay_legs ?? null,
    tags: parsed.tags ?? null,
    notes: parsed.notes ?? null,
    settlement_type: parsed.settlement_type ?? null,
    created_at: '2026-02-01T00:00:00.000Z',
  };
}

describe('resolveBetsForReportScope', () => {
  it('resolves a logical upload through all memberships, including reused bets', async () => {
    const reused = makeBet('bet-reused', '2026-01-01T12:00:00.000Z', 'older-upload');
    const inserted = makeBet('bet-inserted', '2026-01-02T12:00:00.000Z', 'logical-upload');
    const unrelated = makeBet('bet-unrelated', '2026-01-03T12:00:00.000Z', 'other-upload');
    const client = makeClient({
      upload_bets: [
        { upload_id: 'logical-upload', bet_id: reused.id, user_id: 'user-1', position: 0 },
        { upload_id: 'logical-upload', bet_id: inserted.id, user_id: 'user-1', position: 1 },
      ],
      bets: [reused, inserted, unrelated],
    });

    const result = await resolveBetsForReportScope(client, {
      userId: 'user-1',
      uploadIds: ['logical-upload'],
    });

    expect(result.map((bet) => bet.id)).toEqual(['bet-reused', 'bet-inserted']);
  });

  it('prefers the frozen analyzed IDs over later upload and account changes', async () => {
    const frozen = makeBet('bet-frozen', '2026-01-01T12:00:00.000Z', 'upload-1');
    const later = makeBet('bet-later', '2026-02-01T12:00:00.000Z', 'upload-1');
    const client = makeClient({
      upload_bets: [
        { upload_id: 'upload-1', bet_id: frozen.id, user_id: 'user-1', position: 0 },
        { upload_id: 'upload-1', bet_id: later.id, user_id: 'user-1', position: 1 },
      ],
      bets: [frozen, later],
    });

    const result = await resolveBetsForReportScope(client, {
      userId: 'user-1',
      analyzedBetIds: [frozen.id],
      uploadIds: ['upload-1'],
    });

    expect(result.map((bet) => bet.id)).toEqual(['bet-frozen']);
  });

  it('treats an explicitly empty frozen cohort as empty', async () => {
    const client = makeClient({ bets: [makeBet('bet-1', '2026-01-01T12:00:00.000Z', null)] });
    await expect(resolveBetsForReportScope(client, {
      userId: 'user-1',
      analyzedBetIds: [],
    })).resolves.toEqual([]);
  });

  it('fails instead of silently shrinking when a frozen bet is unavailable', async () => {
    const available = makeBet('bet-available', '2026-01-01T12:00:00.000Z', 'upload-1');
    const client = makeClient({ bets: [available] });

    await expect(resolveBetsForReportScope(client, {
      userId: 'user-1',
      analyzedBetIds: [available.id, 'bet-deleted'],
    })).rejects.toThrow('scope_incomplete: 1 of 2 frozen bets are unavailable');
  });

  it('does not reapply mutable filters to an exact frozen ID cohort', async () => {
    const frozen = makeBet('bet-frozen', '2026-01-01T12:00:00.000Z', 'upload-1');
    frozen.sportsbook = 'FanDuel';
    const client = makeClient({ bets: [frozen] });

    const result = await resolveBetsForReportScope(client, {
      userId: 'user-1',
      analyzedBetIds: [frozen.id],
      sportsbook: 'DraftKings',
      dateFrom: '2027-01-01',
      dateTo: '2027-02-01',
    });

    expect(result.map((bet) => bet.id)).toEqual(['bet-frozen']);
  });

  it('includes date-only bets at both inclusive date boundaries', async () => {
    const parsed = parseCSV([
      'date,sport,bet_type,description,odds,stake,result,profit,sportsbook',
      '2026-01-01,NFL,spread,Before,-110,100,loss,-100,DraftKings',
      '2026-01-02,NFL,spread,Start,-110,100,loss,-100,DraftKings',
      '2026-01-03,NFL,spread,End,-110,100,loss,-100,DraftKings',
      '2026-01-04,NFL,spread,After,-110,100,loss,-100,DraftKings',
    ].join('\n'));
    const rows = parsed.bets.map((bet, index) => storedBet(bet, `bet-${index}`, 'upload-1'));
    const client = makeClient({ bets: rows });

    const result = await resolveBetsForReportScope(client, {
      userId: 'user-1',
      dateFrom: '2026-01-02',
      dateTo: '2026-01-03',
    });

    expect(result.map((bet) => bet.description)).toEqual(['Start', 'End']);
  });

  it('feeds all 200 logical bets to the engine after a 122-overlap re-upload', async () => {
    const fixturePath = path.join(
      __dirname,
      'fixtures/ingestion/hierarchical-real-draftkings-export.csv',
    );
    const parsed = parseCSV(readFileSync(fixturePath, 'utf8'));
    expect(parsed.errors).toEqual([]);
    expect(parsed.bets).toHaveLength(200);

    const rows = parsed.bets.map((bet, index) => storedBet(
      bet,
      index < 122 ? `existing-${index}` : `inserted-${index}`,
      index < 122 ? 'older-upload' : 'logical-upload',
    ));
    const memberships = rows.map((bet, position) => ({
      upload_id: 'logical-upload',
      bet_id: bet.id,
      user_id: 'user-1',
      position,
    }));
    const client = makeClient({ upload_bets: memberships, bets: rows });

    const cohort = await resolveBetsForReportScope(client, {
      userId: 'user-1',
      uploadIds: ['logical-upload'],
    });
    const metrics = calculateMetrics(cohort);

    expect(cohort).toHaveLength(200);
    expect(new Set(cohort.map((bet) => bet.id))).toHaveLength(200);
    expect(cohort.filter((bet) => bet.upload_id === 'older-upload')).toHaveLength(122);
    expect(cohort.filter((bet) => bet.upload_id === 'logical-upload')).toHaveLength(78);
    expect(metrics.summary.total_bets).toBe(200);
    expect(metrics.summary.roi_percent).toBe(-15.82);
  });
});
