import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  generate: vi.fn(),
  logError: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock('@/lib/iap-upgrade', () => ({
  generateFullReportFromSnapshot: mocks.generate,
}));

vi.mock('@/lib/log-error-server', () => ({
  logErrorServer: mocks.logError,
}));

vi.mock('@/lib/supabase-server', () => ({
  createServiceRoleClient: () => ({ rpc: mocks.rpc }),
}));

function claim(attemptCount = 1) {
  return {
    fulfillment_id: 'fulfillment-1',
    snapshot_report_id: 'snapshot-1',
    user_id: 'user-1',
    provider: 'stripe',
    provider_event_id: 'event-1',
    payment_reference: 'payment-1',
    attempt_count: attemptCount,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.logError.mockResolvedValue(undefined);
});

describe('paid report fulfillment worker', () => {
  it('does not invoke generation when no paid job can be claimed', async () => {
    mocks.rpc.mockResolvedValueOnce({ data: [], error: null });

    const { processPaidReportFulfillment } = await import('@/lib/paid-report-fulfillment');
    await expect(processPaidReportFulfillment({ snapshotId: 'snapshot-1' }))
      .resolves.toEqual({ status: 'idle' });

    expect(mocks.rpc).toHaveBeenCalledWith('claim_report_fulfillment', {
      p_snapshot_report_id: 'snapshot-1',
    });
    expect(mocks.generate).not.toHaveBeenCalled();
  });

  it('completes a claimed paid job with the generated child report', async () => {
    mocks.rpc
      .mockResolvedValueOnce({ data: [claim()], error: null })
      .mockResolvedValueOnce({ data: null, error: null });
    mocks.generate.mockResolvedValue('full-report-1');

    const { processPaidReportFulfillment } = await import('@/lib/paid-report-fulfillment');
    const result = await processPaidReportFulfillment({ snapshotId: 'snapshot-1' });

    expect(mocks.generate).toHaveBeenCalledWith({
      snapshotId: 'snapshot-1',
      userId: 'user-1',
      transactionId: 'payment-1',
    });
    expect(mocks.rpc).toHaveBeenLastCalledWith('complete_report_fulfillment', {
      p_fulfillment_id: 'fulfillment-1',
      p_completed_report_id: 'full-report-1',
    });
    expect(result).toEqual({
      status: 'completed',
      snapshotId: 'snapshot-1',
      reportId: 'full-report-1',
      attemptCount: 1,
    });
  });

  it('persists generation failure for a later retry', async () => {
    mocks.rpc
      .mockResolvedValueOnce({ data: [claim()], error: null })
      .mockResolvedValueOnce({ data: null, error: null });
    mocks.generate.mockRejectedValue(new Error('engine timeout'));

    const { processPaidReportFulfillment } = await import('@/lib/paid-report-fulfillment');
    const result = await processPaidReportFulfillment({ snapshotId: 'snapshot-1' });

    expect(mocks.rpc).toHaveBeenLastCalledWith('fail_report_fulfillment', {
      p_fulfillment_id: 'fulfillment-1',
      p_error: 'engine timeout',
    });
    expect(result).toEqual({
      status: 'retryable_failure',
      snapshotId: 'snapshot-1',
      attemptCount: 1,
      retryPersisted: true,
    });
  });

  it('can reclaim an interrupted attempt and then complete it safely', async () => {
    mocks.rpc
      .mockResolvedValueOnce({ data: [claim(2)], error: null })
      .mockResolvedValueOnce({ data: null, error: null });
    mocks.generate.mockResolvedValue('existing-full-report');

    const { processPaidReportFulfillment } = await import('@/lib/paid-report-fulfillment');
    const result = await processPaidReportFulfillment();

    expect(result).toMatchObject({
      status: 'completed',
      reportId: 'existing-full-report',
      attemptCount: 2,
    });
    expect(mocks.rpc).toHaveBeenLastCalledWith('complete_report_fulfillment', {
      p_fulfillment_id: 'fulfillment-1',
      p_completed_report_id: 'existing-full-report',
    });
  });
});
