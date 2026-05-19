import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the Anthropic-touching engine module so processUpgrade short-circuits
// before reaching runAutopsy. We're only exercising the fallback resolver.
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

// Track which tables get queried so we can assert the fallback path fired.
type QueryRecord = { table: string; op: string; args?: unknown };
const calls: QueryRecord[] = [];

// Stub supabase client. Each .from('table') returns a builder with the
// methods processUpgrade chains. The mock returns canned data per table,
// recording the call sequence.
function makeMockSupabase(opts: {
  analyzedUploadIds: string[] | null;
  fallbackUploadId: string | null;
  betsReturned: number;
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
        lte() { return builder; },
        gte() { return builder; },
        in() { return builder; },
        order() { return builder; },
        range() {
          if (table === 'bets') {
            return Promise.resolve({ data: opts.betsReturned > 0 ? [] : [], error: null });
          }
          return Promise.resolve({ data: [], error: null });
        },
        limit() { return builder; },
        async maybeSingle() {
          if (table === 'autopsy_reports') {
            const filters = builder._filters as Record<string, unknown>;
            if (filters.upgraded_from_snapshot_id) {
              return { data: null, error: null };
            }
          }
          if (table === 'uploads') {
            return opts.fallbackUploadId
              ? { data: { id: opts.fallbackUploadId }, error: null }
              : { data: null, error: null };
          }
          if (table === 'profiles') {
            return { data: { bankroll: null, streak_count: 0 }, error: null };
          }
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
                created_at: '2026-05-19T00:00:00Z',
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

describe('iap-upgrade fallback resolver', () => {
  it('queries uploads table when analyzed_upload_ids is empty', async () => {
    mockClient = makeMockSupabase({
      analyzedUploadIds: [],
      fallbackUploadId: 'upload-fallback-1',
      betsReturned: 0,
    });

    const { processUpgrade } = await import('@/lib/iap-upgrade');
    await processUpgrade({ snapshotId: 'snap-1', userId: 'user-1', transactionId: 'tx-1' });

    const uploadsQueried = calls.some((c) => c.table === 'uploads');
    expect(uploadsQueried).toBe(true);
  });

  it('does NOT query uploads table when analyzed_upload_ids is non-empty', async () => {
    mockClient = makeMockSupabase({
      analyzedUploadIds: ['upload-direct-1'],
      fallbackUploadId: null,
      betsReturned: 0,
    });

    vi.resetModules();
    vi.mock('@/lib/supabase-server', () => ({
      createServiceRoleClient: () => mockClient,
    }));
    const { processUpgrade } = await import('@/lib/iap-upgrade');
    await processUpgrade({ snapshotId: 'snap-2', userId: 'user-1', transactionId: 'tx-2' });

    const uploadsQueried = calls.some((c) => c.table === 'uploads');
    expect(uploadsQueried).toBe(false);
  });

  it('handles missing fallback upload gracefully (no throw to caller)', async () => {
    mockClient = makeMockSupabase({
      analyzedUploadIds: [],
      fallbackUploadId: null,
      betsReturned: 0,
    });

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
