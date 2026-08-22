import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  queue: vi.fn(),
  process: vi.fn(),
  waitUntil: vi.fn(),
  logError: vi.fn(),
  ledgerUpsert: vi.fn(),
}));

const snapshotBuilder = {
  select: vi.fn(() => snapshotBuilder),
  eq: vi.fn(() => snapshotBuilder),
  maybeSingle: vi.fn(),
};

const serviceClient = {
  from: vi.fn((table: string) => {
    if (table === 'autopsy_reports') return snapshotBuilder;
    if (table === 'iap_transactions') return { upsert: mocks.ledgerUpsert };
    throw new Error(`Unexpected table: ${table}`);
  }),
};

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => serviceClient),
}));

vi.mock('@vercel/functions', () => ({
  waitUntil: mocks.waitUntil,
}));

vi.mock('@/lib/paid-report-fulfillment', () => ({
  queuePaidReportFulfillment: mocks.queue,
  processPaidReportFulfillment: mocks.process,
}));

vi.mock('@/lib/log-error-server', () => ({
  logErrorServer: mocks.logError,
}));

beforeEach(() => {
  vi.clearAllMocks();
  process.env.REVENUECAT_WEBHOOK_SECRET = 'revenuecat-secret';
  snapshotBuilder.maybeSingle.mockResolvedValue({
    data: { id: 'snapshot-1', user_id: 'user-1', report_type: 'snapshot' },
    error: null,
  });
  mocks.queue.mockResolvedValue({
    fulfillmentId: 'fulfillment-1',
    status: 'paid_queued',
    shouldStart: true,
    paymentConflict: false,
  });
  mocks.process.mockResolvedValue({ status: 'completed' });
  mocks.ledgerUpsert.mockResolvedValue({ error: null });
  mocks.logError.mockResolvedValue(undefined);
});

describe('RevenueCat paid report fulfillment route', () => {
  it('queues the durable job even when the provider ledger may already exist', async () => {
    const request = new NextRequest('https://app.test/api/webhooks/revenuecat', {
      method: 'POST',
      headers: {
        authorization: 'revenuecat-secret',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        event: {
          type: 'NON_RENEWING_PURCHASE',
          app_user_id: 'user-1',
          transaction_id: 'transaction-1',
          product_id: 'single_report_v1',
          subscriber_attributes: {
            pending_report_unlock_id: { value: 'snapshot-1' },
          },
        },
      }),
    });

    const { POST } = await import('@/app/api/webhooks/revenuecat/route');
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe('paid_queued');
    expect(mocks.queue).toHaveBeenCalledWith({
      snapshotId: 'snapshot-1',
      userId: 'user-1',
      provider: 'revenuecat',
      providerEventId: 'transaction-1',
      paymentReference: 'transaction-1',
    }, serviceClient);
    expect(mocks.ledgerUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ transaction_id: 'transaction-1' }),
      { onConflict: 'transaction_id', ignoreDuplicates: true },
    );
    expect(mocks.process).toHaveBeenCalledWith({ snapshotId: 'snapshot-1' });
    expect(mocks.waitUntil).toHaveBeenCalledTimes(1);
  });

  it('never fulfills an unrelated RevenueCat product', async () => {
    const request = new NextRequest('https://app.test/api/webhooks/revenuecat', {
      method: 'POST',
      headers: {
        authorization: 'revenuecat-secret',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        event: {
          type: 'NON_RENEWING_PURCHASE',
          app_user_id: 'user-1',
          transaction_id: 'transaction-other',
          product_id: 'unrelated_product',
          subscriber_attributes: {
            pending_report_unlock_id: { value: 'snapshot-1' },
          },
        },
      }),
    });

    const { POST } = await import('@/app/api/webhooks/revenuecat/route');
    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ status: 'invalid_product' });
    expect(mocks.queue).not.toHaveBeenCalled();
    expect(mocks.process).not.toHaveBeenCalled();
  });

  it('asks RevenueCat to retry a persisted generation failure', async () => {
    mocks.process.mockResolvedValue({
      status: 'retryable_failure',
      snapshotId: 'snapshot-1',
      attemptCount: 1,
      retryPersisted: true,
    });
    const request = new NextRequest('https://app.test/api/webhooks/revenuecat', {
      method: 'POST',
      headers: {
        authorization: 'revenuecat-secret',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        event: {
          type: 'NON_RENEWING_PURCHASE',
          app_user_id: 'user-1',
          transaction_id: 'transaction-retry',
          product_id: 'single_report_v1',
          subscriber_attributes: {
            pending_report_unlock_id: { value: 'snapshot-1' },
          },
        },
      }),
    });

    const { POST } = await import('@/app/api/webhooks/revenuecat/route');
    const response = await POST(request);

    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ status: 'fulfillment_pending' });
  });
});
