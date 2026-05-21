import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

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
// assert cohort resolution. P0 fix contract: empty analyzed_upload_ids must
// NOT query the uploads table (no single-upload substitution) and must NOT
// apply an upload_id filter on the bets query (no-filter = full history,
// mirroring /api/analyze). Non-empty must apply the upload_id filter.
type QueryRecord = { table: string; op: string; args?: unknown };
const calls: QueryRecord[] = [];

// Stub supabase client. Each .from('table') returns a builder with the
// methods processUpgrade chains. The mock returns canned data per table,
// recording the call sequence. Filter/order/transform methods all return the
// builder so any chain order resolves; .range() is the awaited terminal.
function makeMockSupabase(opts: {
  analyzedUploadIds: string[] | null;
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
                analyzed_upload_ids: opts.analyzedUploadIds,
                analyzed_sportsbook: null,
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
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('iap-upgrade cohort resolution (P0 fix)', () => {
  it('empty analyzed_upload_ids: no uploads-table query, no upload_id filter (full-history mirror)', async () => {
    mockClient = makeMockSupabase({ analyzedUploadIds: [] });

    vi.resetModules();
    vi.mock('@/lib/supabase-server', () => ({
      createServiceRoleClient: () => mockClient,
    }));
    const { processUpgrade } = await import('@/lib/iap-upgrade');
    await processUpgrade({ snapshotId: 'snap-1', userId: 'user-1', transactionId: 'tx-1' });

    // The P0 bug substituted the most-recent single upload from the uploads
    // table. The fix must never do that.
    const uploadsQueried = calls.some((c) => c.table === 'uploads');
    expect(uploadsQueried).toBe(false);

    // And the bets query must run with NO upload_id filter (full history).
    const betsUploadFilter = calls.some(
      (c) => c.table === 'bets' && c.op === 'in' &&
        (c.args as { col?: string })?.col === 'upload_id'
    );
    expect(betsUploadFilter).toBe(false);
  });

  it('non-empty analyzed_upload_ids: filters the bets query by that upload set, no uploads-table query', async () => {
    mockClient = makeMockSupabase({ analyzedUploadIds: ['upload-direct-1'] });

    vi.resetModules();
    vi.mock('@/lib/supabase-server', () => ({
      createServiceRoleClient: () => mockClient,
    }));
    const { processUpgrade } = await import('@/lib/iap-upgrade');
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

  it('resolves without throwing to the caller even when the cohort is empty', async () => {
    mockClient = makeMockSupabase({ analyzedUploadIds: [] });

    vi.resetModules();
    vi.mock('@/lib/supabase-server', () => ({
      createServiceRoleClient: () => mockClient,
    }));
    const { processUpgrade } = await import('@/lib/iap-upgrade');
    await expect(
      processUpgrade({ snapshotId: 'snap-3', userId: 'user-1', transactionId: 'tx-3' })
    ).resolves.toBeUndefined();
  });
});
