import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ParsedBet } from '@/types';
import { parseCSV } from '@/lib/csv-parser';
import { buildBetImportPlan, importBets, planBetImport } from '@/lib/import-bets';

interface ExistingIdentity {
  id: string;
  upload_id?: string | null;
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

function existingIdentity(bet: ParsedBet, id: string): ExistingIdentity {
  return {
    id,
    placed_at: bet.placed_at,
    sport: bet.sport,
    league: bet.league,
    bet_type: bet.bet_type,
    description: bet.description,
    odds: bet.odds,
    stake: bet.stake,
    result: bet.result,
    payout: bet.payout,
    profit: bet.profit,
    sportsbook: bet.sportsbook,
    is_bonus_bet: bet.is_bonus_bet,
    parlay_legs: bet.parlay_legs,
    settlement_type: bet.settlement_type,
  };
}

function draftKingsBets(): ParsedBet[] {
  const fixturePath = path.join(__dirname, 'fixtures/ingestion/hierarchical-real-draftkings-export.csv');
  const parsed = parseCSV(readFileSync(fixturePath, 'utf-8'));
  expect(parsed.errors).toHaveLength(0);
  expect(parsed.bets).toHaveLength(200);
  return parsed.bets;
}

function makeBet(overrides: Partial<ParsedBet> = {}): ParsedBet {
  return {
    placed_at: '2026-01-01T12:00:00.000Z',
    sport: 'NFL',
    bet_type: 'spread',
    description: 'Chiefs -3.5',
    odds: -110,
    stake: 100,
    result: 'loss',
    payout: 0,
    profit: -100,
    sportsbook: 'DraftKings',
    is_bonus_bet: false,
    ...overrides,
  };
}

function parseSyntheticExport(rows: string[]): ParsedBet[] {
  const parsed = parseCSV([
    'date,sport,bet_type,description,odds,stake,result,profit,sportsbook',
    ...rows,
  ].join('\n'));
  expect(parsed.errors).toHaveLength(0);
  expect(parsed.warnings).toHaveLength(0);
  expect(parsed.bets).toHaveLength(rows.length);
  return parsed.bets;
}

interface RecordedInsert {
  table: string;
  payload: Record<string, unknown> | Record<string, unknown>[];
}

function makeImportClient(existing: ExistingIdentity[]) {
  const inserts: RecordedInsert[] = [];
  const updates: RecordedInsert[] = [];
  const deletes: Array<{ table: string; ids?: unknown[]; id?: unknown }> = [];
  let storedBets = existing.map((bet) => ({ ...bet }));
  const uploads: Array<Record<string, unknown>> = [];
  const memberships: Array<Record<string, unknown>> = [];
  let profileBetCount = existing.length;
  let uploadSequence = 0;

  function from(table: string) {
    let operation: 'select' | 'insert' | 'update' | 'delete' = 'select';
    let payload: Record<string, unknown> | Record<string, unknown>[] | undefined;
    let selected = '';
    let eqId: unknown;
    let inIds: unknown[] | undefined;
    let rangeStart = 0;
    let rangeEnd = 999;

    const builder = {
      select(columns: string) {
        selected = columns;
        return builder;
      },
      insert(value: Record<string, unknown> | Record<string, unknown>[]) {
        operation = 'insert';
        payload = value;
        inserts.push({ table, payload: value });
        return builder;
      },
      update(value: Record<string, unknown>) {
        operation = 'update';
        payload = value;
        updates.push({ table, payload: value });
        return builder;
      },
      delete() {
        operation = 'delete';
        return builder;
      },
      eq(column: string, value: unknown) {
        if (column === 'id') eqId = value;
        return builder;
      },
      order() {
        return builder;
      },
      in(column: string, value: unknown[]) {
        if (column === 'id') inIds = value;
        return builder;
      },
      range(start: number, end: number) {
        rangeStart = start;
        rangeEnd = end;
        if (table === 'bets' && operation === 'select') {
          return Promise.resolve({ data: storedBets.slice(rangeStart, rangeEnd + 1), error: null });
        }
        return Promise.resolve({ data: [], error: null });
      },
      single() {
        if (table === 'uploads' && operation === 'insert') {
          const id = `logical-upload-${++uploadSequence}`;
          uploads.push({ id, ...(payload as Record<string, unknown>) });
          return Promise.resolve({ data: { id }, error: null });
        }
        if (table === 'profiles' && operation === 'select') {
          return Promise.resolve({ data: { bet_count: profileBetCount }, error: null });
        }
        return Promise.resolve({ data: null, error: null });
      },
      then(resolve: (value: { data: unknown; error: null }) => unknown) {
        if (operation === 'insert' && table === 'bets') {
          const rows = (
            Array.isArray(payload) ? payload : payload ? [payload] : []
          ) as unknown as ExistingIdentity[];
          storedBets.push(...rows.map((row) => ({ ...row })));
        }
        if (operation === 'insert' && table === 'upload_bets') {
          const rows = (
            Array.isArray(payload) ? payload : payload ? [payload] : []
          ) as Record<string, unknown>[];
          memberships.push(...rows.map((row) => ({ ...row })));
        }
        if (operation === 'update' && table === 'profiles') {
          profileBetCount = Number((payload as Record<string, unknown>).bet_count);
        }
        if (operation === 'delete') {
          deletes.push({ table, ids: inIds, id: eqId });
          if (table === 'bets' && inIds) {
            storedBets = storedBets.filter((bet) => !inIds?.includes(bet.id));
          }
        }
        return Promise.resolve({ data: selected ? [] : null, error: null }).then(resolve);
      },
    };

    return builder;
  }

  return {
    client: { from } as unknown as SupabaseClient,
    inserts,
    updates,
    deletes,
    state: {
      get bets() { return storedBets; },
      uploads,
      memberships,
      get profileBetCount() { return profileBetCount; },
    },
  };
}

describe('buildBetImportPlan', () => {
  it('plans the real 200-bet cohort as 122 existing and 78 new without shrinking its scope', () => {
    const bets = draftKingsBets();
    const existing = bets.slice(0, 122).map((bet, index) => existingIdentity(bet, `existing-${index}`));

    const plan = buildBetImportPlan(bets, existing);

    expect(plan.logical_bets).toBe(200);
    expect(plan.existing_bets).toBe(122);
    expect(plan.new_bets).toBe(78);
    expect(plan.entries).toHaveLength(200);
    expect(plan.entries.filter((entry) => entry.existing_bet_id === null)).toHaveLength(78);

    // This is the discriminator for the production bug: filtering by the
    // new canonical upload_id would see 78, while the logical membership is 200.
    expect(plan.entries.length).not.toBe(plan.new_bets);
  });

  it('does not reuse a same-looking row when its settlement or sportsbook differs', () => {
    const first = makeBet();
    const second = makeBet({ sportsbook: 'FanDuel', result: 'win', profit: 90.91, payout: 190.91 });
    const plan = buildBetImportPlan([first, second], [existingIdentity(first, 'existing-1')]);

    expect(plan.existing_bets).toBe(1);
    expect(plan.new_bets).toBe(1);
    expect(plan.entries.map((entry) => entry.existing_bet_id)).toEqual(['existing-1', null]);
  });

  it('distinguishes two otherwise identical wagers placed at different times', () => {
    const first = makeBet({ placed_at: '2026-01-01T12:00:00.000Z' });
    const later = makeBet({ placed_at: '2026-01-01T20:00:00.000Z' });
    const plan = buildBetImportPlan([later], [existingIdentity(first, 'existing-1')]);

    expect(plan.existing_bets).toBe(0);
    expect(plan.new_bets).toBe(1);
  });
});

describe('importBets logical memberships', () => {
  it('commits overlapping export windows without duplicating historical bets', async () => {
    const firstExport = parseSyntheticExport([
      '2026-06-01T12:00:00Z,NFL,spread,Alpha -3.5,-110,100,loss,-100,DraftKings',
      '2026-06-02T12:00:00Z,NBA,moneyline,Bravo ML,+150,50,win,75,DraftKings',
      '2026-06-03T12:00:00Z,MLB,total,Charlie Under 8.5,-110,40,loss,-40,DraftKings',
      '2026-06-04T12:00:00Z,NHL,moneyline,Delta ML,+120,60,win,72,DraftKings',
    ]);
    const secondExport = parseSyntheticExport([
      '2026-06-03T12:00:00Z,MLB,total,Charlie Under 8.5,-110,40,loss,-40,DraftKings',
      '2026-06-04T12:00:00Z,NHL,moneyline,Delta ML,+120,60,win,72,DraftKings',
      '2026-06-05T12:00:00Z,WNBA,spread,Echo +4.5,-110,80,loss,-80,DraftKings',
      '2026-06-06T12:00:00Z,NCAAB,total,Foxtrot Over 145.5,-110,25,win,22.73,DraftKings',
    ]);
    const mock = makeImportClient([]);

    const firstPreview = await planBetImport(mock.client, 'user-1', firstExport);
    const firstResult = await importBets(mock.client, 'user-1', firstExport, 'window-one.csv');
    const secondPreview = await planBetImport(mock.client, 'user-1', secondExport);
    const secondResult = await importBets(mock.client, 'user-1', secondExport, 'window-two.csv');

    expect(firstPreview).toMatchObject({ logical_bets: 4, existing_bets: 0, new_bets: 4 });
    expect(firstResult).toMatchObject({
      bets_imported: 4,
      duplicates_skipped: 0,
      logical_bets: 4,
      existing_bets: 0,
      new_bets: 4,
      upload_id: 'logical-upload-1',
    });
    expect(secondPreview).toMatchObject({ logical_bets: 4, existing_bets: 2, new_bets: 2 });
    expect(secondResult).toMatchObject({
      bets_imported: 2,
      duplicates_skipped: 2,
      logical_bets: 4,
      existing_bets: 2,
      new_bets: 2,
      upload_id: 'logical-upload-2',
    });

    expect(mock.state.bets).toHaveLength(6);
    expect(mock.state.profileBetCount).toBe(6);
    expect(mock.state.uploads.map((upload) => upload.bet_count)).toEqual([4, 4]);

    const firstMembers = mock.state.memberships.filter((row) => row.upload_id === 'logical-upload-1');
    const secondMembers = mock.state.memberships.filter((row) => row.upload_id === 'logical-upload-2');
    expect(firstMembers).toHaveLength(4);
    expect(secondMembers).toHaveLength(4);

    const canonicalSecondRows = mock.state.bets.filter((bet) => bet.upload_id === 'logical-upload-2');
    expect(canonicalSecondRows.map((bet) => bet.description)).toEqual([
      'Echo +4.5',
      'Foxtrot Over 145.5',
    ]);
    expect(secondMembers.map((row) => row.bet_id)).toEqual([
      mock.state.bets.find((bet) => bet.description === 'Charlie Under 8.5')?.id,
      mock.state.bets.find((bet) => bet.description === 'Delta ML')?.id,
      canonicalSecondRows[0].id,
      canonicalSecondRows[1].id,
    ]);

    const finalStake = mock.state.bets.reduce((sum, bet) => sum + bet.stake, 0);
    const finalNet = mock.state.bets.reduce((sum, bet) => sum + bet.profit, 0);
    expect(finalStake).toBeCloseTo(355, 2);
    expect(finalNet).toBeCloseTo(-50.27, 2);
  });

  it('inserts only 78 new rows but persists all 200 ordered members', async () => {
    const bets = draftKingsBets();
    const existing = bets.slice(0, 122).map((bet, index) => existingIdentity(bet, `existing-${String(index).padStart(3, '0')}`));
    const mock = makeImportClient(existing);

    const result = await importBets(mock.client, 'user-1', bets, 'draftkings.csv');

    expect(result).toMatchObject({
      bets_imported: 78,
      duplicates_skipped: 122,
      upload_id: 'logical-upload-1',
      logical_bets: 200,
      existing_bets: 122,
      new_bets: 78,
    });

    const uploadInsert = mock.inserts.find((entry) => entry.table === 'uploads');
    expect(uploadInsert?.payload).toMatchObject({ bet_count: 200, filename: 'draftkings.csv' });

    const betRows = mock.inserts
      .filter((entry) => entry.table === 'bets')
      .flatMap((entry) => entry.payload as Record<string, unknown>[]);
    expect(betRows).toHaveLength(78);
    expect(betRows.every((row) => row.upload_id === 'logical-upload-1')).toBe(true);

    const members = mock.inserts
      .filter((entry) => entry.table === 'upload_bets')
      .flatMap((entry) => entry.payload as Record<string, unknown>[]);
    expect(members).toHaveLength(200);
    expect(new Set(members.map((row) => row.bet_id)).size).toBe(200);
    expect(members.map((row) => row.position)).toEqual(Array.from({ length: 200 }, (_, index) => index));
  });

  it('creates a usable 200-member logical upload when every bet already exists', async () => {
    const bets = draftKingsBets();
    const existing = bets.map((bet, index) => existingIdentity(bet, `existing-${String(index).padStart(3, '0')}`));
    const mock = makeImportClient(existing);

    const result = await importBets(mock.client, 'user-1', bets, 'draftkings.csv');

    expect(result).toMatchObject({
      bets_imported: 0,
      duplicates_skipped: 200,
      upload_id: 'logical-upload-1',
      logical_bets: 200,
      existing_bets: 200,
      new_bets: 0,
    });
    expect(mock.inserts.filter((entry) => entry.table === 'bets')).toHaveLength(0);
    const members = mock.inserts
      .filter((entry) => entry.table === 'upload_bets')
      .flatMap((entry) => entry.payload as Record<string, unknown>[]);
    expect(members).toHaveLength(200);
  });

  it('does not label an upload with one sportsbook when another row is unknown', async () => {
    const bets = [makeBet(), makeBet({
      placed_at: '2026-01-02T12:00:00.000Z',
      sportsbook: undefined,
    })];
    const mock = makeImportClient([]);

    await importBets(mock.client, 'user-1', bets, 'mixed.csv');

    const uploadInsert = mock.inserts.find((entry) => entry.table === 'uploads');
    expect(uploadInsert?.payload).toMatchObject({ sportsbook: null });
  });
});
