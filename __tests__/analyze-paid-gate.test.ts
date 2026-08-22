import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getAuthenticatedClient: vi.fn(),
  checkRateLimit: vi.fn(),
  generateFull: vi.fn(),
  runSnapshot: vi.fn(),
  resolveScope: vi.fn(),
  logError: vi.fn(),
}));

vi.mock('@/lib/supabase-from-request', () => ({
  getAuthenticatedClient: mocks.getAuthenticatedClient,
}));

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: mocks.checkRateLimit,
}));

vi.mock('@/lib/full-report-pipeline', () => ({
  FullReportPersistenceError: class FullReportPersistenceError extends Error {},
  generateAndPersistFullReport: mocks.generateFull,
}));

vi.mock('@/lib/autopsy-engine', () => ({
  runSnapshot: mocks.runSnapshot,
  calculateMetrics: vi.fn(),
  calculateMetricsOnly: vi.fn(),
  calculateDisciplineScore: vi.fn(),
}));

vi.mock('@/lib/report-cohort', () => ({
  resolveBetsForReportScope: mocks.resolveScope,
}));

vi.mock('@/lib/log-error-server', () => ({
  logErrorServer: mocks.logError,
}));

vi.mock('@/lib/supabase-server', () => ({
  createServiceRoleClient: vi.fn(),
}));

import { POST } from '@/app/api/analyze/route';

interface PaidGateOptions {
  paidReport?: { id: string; report_type: string } | null;
  paidReportError?: unknown;
  fulfillment?: {
    status: string;
    completed_report_id: string | null;
    paid_at: string | null;
  } | null;
  fulfillmentError?: unknown;
}

function makeSupabase(options: PaidGateOptions) {
  const selects: Array<{ table: string; columns: string }> = [];

  const client = {
    from(table: string) {
      const builder: Record<string, unknown> = {
        select(columns: string) {
          selects.push({ table, columns });
          return builder;
        },
        eq() { return builder; },
        async single() {
          if (table === 'profiles') {
            return {
              data: {
                id: 'user-1',
                email: 'bettor@example.com',
                subscription_tier: 'free',
                created_at: '2026-08-01T00:00:00Z',
              },
              error: null,
            };
          }
          return { data: null, error: null };
        },
        async maybeSingle() {
          if (table === 'autopsy_reports') {
            return {
              data: options.paidReport ?? null,
              error: options.paidReportError ?? null,
            };
          }
          if (table === 'report_fulfillments') {
            return {
              data: options.fulfillment ?? null,
              error: options.fulfillmentError ?? null,
            };
          }
          return { data: null, error: null };
        },
      };
      return builder;
    },
  };

  return { client, selects };
}

function paidRequest() {
  return new Request('https://app.test/api/analyze', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      report_type: 'full',
      paid_snapshot_id: '11111111-1111-1111-1111-111111111111',
    }),
  });
}

async function run(options: PaidGateOptions) {
  const supabase = makeSupabase(options);
  mocks.getAuthenticatedClient.mockResolvedValue({
    supabase: supabase.client,
    user: { id: 'user-1', email: 'bettor@example.com' },
    error: null,
  });
  const response = await POST(paidRequest());
  return { response, selects: supabase.selects };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.checkRateLimit.mockResolvedValue(true);
});

describe('POST /api/analyze paid snapshot gate', () => {
  it('requires an actual snapshot and a fulfillment with paid_at', async () => {
    const wrongType = await run({
      paidReport: { id: 'report-1', report_type: 'full' },
    });
    expect(wrongType.response.status).toBe(402);

    const unpaid = await run({
      paidReport: { id: 'snapshot-1', report_type: 'snapshot' },
      fulfillment: {
        status: 'paid_queued',
        completed_report_id: null,
        paid_at: null,
      },
    });
    expect(unpaid.response.status).toBe(402);
    expect(unpaid.selects).toContainEqual({
      table: 'report_fulfillments',
      columns: 'status, completed_report_id, paid_at',
    });
  });

  it('returns 500 when either verification query fails', async () => {
    const snapshotFailure = await run({
      paidReportError: { message: 'snapshot query failed' },
    });
    expect(snapshotFailure.response.status).toBe(500);

    const fulfillmentFailure = await run({
      paidReport: { id: 'snapshot-1', report_type: 'snapshot' },
      fulfillmentError: { message: 'fulfillment query failed' },
    });
    expect(fulfillmentFailure.response.status).toBe(500);
    expect(mocks.logError).toHaveBeenCalled();
  });

  it.each(['paid_queued', 'generating', 'retryable_failure'])(
    'returns 202 for server-owned %s fulfillment without starting an engine',
    async (status) => {
      const { response } = await run({
        paidReport: { id: 'snapshot-1', report_type: 'snapshot' },
        fulfillment: {
          status,
          completed_report_id: null,
          paid_at: '2026-08-22T12:00:00Z',
        },
      });

      expect(response.status).toBe(202);
      expect(await response.json()).toMatchObject({ status });
      expect(mocks.generateFull).not.toHaveBeenCalled();
      expect(mocks.runSnapshot).not.toHaveBeenCalled();
      expect(mocks.resolveScope).not.toHaveBeenCalled();
    },
  );

  it('returns already unlocked for completed fulfillment', async () => {
    const { response } = await run({
      paidReport: { id: 'snapshot-1', report_type: 'snapshot' },
      fulfillment: {
        status: 'completed',
        completed_report_id: 'full-report-1',
        paid_at: '2026-08-22T12:00:00Z',
      },
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: 'This report has already been unlocked. View it in your report history.',
    });
    expect(mocks.generateFull).not.toHaveBeenCalled();
  });
});
