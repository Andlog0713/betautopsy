import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { processUpgrade, validateFrozenBetCohort } from '@/lib/iap-upgrade';

const pipelineMocks = vi.hoisted(() => ({
  generate: vi.fn(),
}));

vi.mock('@/lib/full-report-pipeline', () => ({
  FullReportPersistenceError: class FullReportPersistenceError extends Error {},
  generateAndPersistFullReport: pipelineMocks.generate,
}));

// Mock the Anthropic-touching engine module so processUpgrade short-circuits
// before reaching runAutopsy. We're only exercising cohort resolution.
vi.mock('@/lib/autopsy-engine', () => ({
  runAutopsy: vi.fn(),
  calculateMetrics: vi.fn(),
  calculateDisciplineScore: vi.fn(),
  calculateBetIQ: vi.fn(),
  estimatePercentile: vi.fn(),
  calculateEnhancedTilt: vi.fn(),
  detectSportSpecificPatterns: vi.fn(),
}));

vi.mock('@/lib/log-error-server', () => ({
  logErrorServer: vi.fn(),
}));

// Track which tables get queried and which filters get applied so we can
// assert cohort resolution. A legacy snapshot with neither exact bet ids nor
// a nonempty upload lock is unrecoverable because current account history is
// mutable and may not match what the customer paid to unlock.
type QueryRecord = { table: string; op: string; args?: unknown };
const calls: QueryRecord[] = [];

// Stub supabase client. Each .from('table') returns a builder with the
// methods processUpgrade chains. The mock returns canned data per table,
// recording the call sequence. Filter/order/transform methods all return the
// builder so any chain order resolves; .range() is the awaited terminal.
function makeMockSupabase(opts: {
  analyzedUploadIds: string[] | null;
  analyzedBetIds?: string[] | null;
  frozenBets?: unknown;
  betCountAnalyzed?: number;
}) {
  return {
    from(table: string) {
      const builder: Record<string, unknown> = {
        _table: table,
        _filters: {} as Record<string, unknown>,
        select(cols: string) {
          calls.push({ table, op: 'select', args: cols });
          return builder;
        },
        eq(col: string, val: unknown) {
          (builder._filters as Record<string, unknown>)[col] = val;
          return builder;
        },
        in(col: string, vals: unknown) {
          calls.push({ table, op: 'in', args: { col, vals } });
          return builder;
        },
        lte() { return builder; },
        gte() { return builder; },
        order() { return builder; },
        range() {
          // Empty bets cohort: forces processUpgrade to throw "no bets found"
          // (caught internally, no rethrow) AFTER cohort resolution, which is
          // the only thing under test here.
          return Promise.resolve({ data: [], error: null });
        },
        limit() { return builder; },
        async maybeSingle() {
          if (table === 'profiles') {
            return { data: { bankroll: null, streak_count: 0 }, error: null };
          }
          // autopsy_reports existing-full guard: no prior child.
          return { data: null, error: null };
        },
        async single() {
          if (table === 'autopsy_reports') {
            return {
              data: {
                id: 'snap-1',
                user_id: 'user-1',
                bet_count_analyzed: opts.betCountAnalyzed ?? 20,
                analyzed_upload_ids: opts.analyzedUploadIds,
                analyzed_bet_ids: opts.analyzedBetIds ?? null,
                analyzed_sportsbook: null,
                analyzed_bets_snapshot: opts.frozenBets ?? null,
              },
              error: null,
            };
          }
          return { data: null, error: null };
        },
      };
      return builder;
    },
  } as never;
}

vi.mock('@/lib/supabase-server', () => ({
  createServiceRoleClient: () => mockClient,
}));

let mockClient: ReturnType<typeof makeMockSupabase>;

beforeEach(() => {
  calls.length = 0;
  pipelineMocks.generate.mockResolvedValue({
    reusedExisting: true,
    report: { id: 'full-report-1' },
    tokensUsed: 0,
  });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('iap-upgrade cohort resolution (P0 fix)', () => {
  it('refuses a legacy snapshot with no immutable cohort instead of using current history', async () => {
    mockClient = makeMockSupabase({ analyzedUploadIds: [], analyzedBetIds: null });

    await processUpgrade({ snapshotId: 'snap-1', userId: 'user-1', transactionId: 'tx-1' });

    const uploadsQueried = calls.some((c) => c.table === 'uploads');
    expect(uploadsQueried).toBe(false);

    const betsQueried = calls.some((c) => c.table === 'bets');
    expect(betsQueried).toBe(false);
  });

  it('non-empty analyzed_upload_ids: filters the bets query by that upload set, no uploads-table query', async () => {
    mockClient = makeMockSupabase({
      analyzedUploadIds: ['upload-direct-1'],
      analyzedBetIds: null,
    });

    await processUpgrade({ snapshotId: 'snap-2', userId: 'user-1', transactionId: 'tx-2' });

    const uploadsQueried = calls.some((c) => c.table === 'uploads');
    expect(uploadsQueried).toBe(false);

    const betsUploadFilter = calls.find(
      (c) => c.table === 'bets' && c.op === 'in' &&
        (c.args as { col?: string })?.col === 'upload_id'
    );
    expect(betsUploadFilter).toBeDefined();
    expect((betsUploadFilter!.args as { vals?: unknown }).vals).toEqual(['upload-direct-1']);
  });

  it('keeps the legacy processUpgrade wrapper non-throwing for compatibility', async () => {
    mockClient = makeMockSupabase({ analyzedUploadIds: [], analyzedBetIds: null });

    await expect(
      processUpgrade({ snapshotId: 'snap-3', userId: 'user-1', transactionId: 'tx-3' })
    ).resolves.toBeUndefined();
  });

  it('uses a validated frozen cohort without resolving mutable bet rows', async () => {
    const frozen = [
      { id: 'bet-1', user_id: 'user-1', placed_at: '2026-08-20T12:00:00Z' },
      { id: 'bet-2', user_id: 'user-1', placed_at: '2026-08-21T12:00:00Z' },
    ];
    mockClient = makeMockSupabase({
      analyzedUploadIds: ['upload-direct-1'],
      analyzedBetIds: ['bet-1', 'bet-2'],
      frozenBets: frozen,
      betCountAnalyzed: 2,
    });

    await processUpgrade({ snapshotId: 'snap-frozen', userId: 'user-1', transactionId: 'tx-frozen' });

    expect(pipelineMocks.generate).toHaveBeenCalledWith(expect.objectContaining({
      bets: frozen,
      analyzedUploadIds: ['upload-direct-1'],
    }));
    expect(calls.some((call) => call.table === 'bets' && call.op === 'range')).toBe(false);
    expect(calls.some(
      (call) => call.table === 'bets' && call.op === 'in'
        && (call.args as { col?: string })?.col === 'id',
    )).toBe(false);
  });

  it('fails closed when frozen count or IDs disagree with snapshot metadata', () => {
    const validIdentity = {
      id: 'bet-1',
      user_id: 'user-1',
      placed_at: '2026-08-20T12:00:00Z',
    };

    expect(() => validateFrozenBetCohort({
      snapshotId: 'snap-bad-count',
      userId: 'user-1',
      frozenValue: [validIdentity],
      analyzedBetIds: ['bet-1'],
      betCountAnalyzed: 2,
    })).toThrow(/count 1 does not match 2/);

    expect(() => validateFrozenBetCohort({
      snapshotId: 'snap-bad-ids',
      userId: 'user-1',
      frozenValue: [validIdentity],
      analyzedBetIds: ['bet-other'],
      betCountAnalyzed: 1,
    })).toThrow(/bet ids do not match/);
  });
});
