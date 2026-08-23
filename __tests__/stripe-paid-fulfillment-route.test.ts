import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  constructEvent: vi.fn(),
  queue: vi.fn(),
  process: vi.fn(),
  waitUntil: vi.fn(),
  sendMetaEvent: vi.fn(),
  logError: vi.fn(),
  profileUpdate: vi.fn(),
}));

const serviceClient = {
  from: vi.fn((table: string) => {
    if (table !== 'profiles') throw new Error(`Unexpected table: ${table}`);
    return {
      update: vi.fn(() => ({
        eq: mocks.profileUpdate,
      })),
    };
  }),
};

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => serviceClient),
}));

vi.mock('@vercel/functions', () => ({
  waitUntil: mocks.waitUntil,
}));

vi.mock('@/lib/stripe', () => ({
  getStripe: () => ({ webhooks: { constructEvent: mocks.constructEvent } }),
  tierFromPriceId: vi.fn(),
  createCustomerPortalSession: vi.fn(),
}));

vi.mock('@/lib/paid-report-fulfillment', () => ({
  queuePaidReportFulfillment: mocks.queue,
  processPaidReportFulfillment: mocks.process,
}));

vi.mock('@/lib/meta-capi', () => ({
  sendMetaEvent: mocks.sendMetaEvent,
}));

vi.mock('@/lib/log-error-server', () => ({
  logErrorServer: mocks.logError,
}));

vi.mock('@/lib/resend', () => ({
  isResendConfigured: () => false,
  getResend: vi.fn(),
}));

vi.mock('@/lib/onboarding-emails', () => ({
  renderPaymentFailedEmail: vi.fn(),
}));

function paidCheckoutEvent(
  type = 'checkout.session.completed',
  paymentStatus = 'paid',
) {
  return {
    id: 'evt_paid_1',
    type,
    data: {
      object: {
        id: 'cs_paid_1',
        mode: 'payment',
        payment_status: paymentStatus,
        payment_intent: 'pi_paid_1',
        customer: 'cus_1',
        metadata: {
          report_id: '00000000-0000-4000-8000-000000000001',
          supabase_user_id: '00000000-0000-4000-8000-000000000002',
        },
        customer_details: { email: 'bettor@example.com' },
        amount_total: 1999,
        currency: 'usd',
      },
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.constructEvent.mockReturnValue(paidCheckoutEvent());
  mocks.queue.mockResolvedValue({
    fulfillmentId: 'fulfillment-1',
    status: 'paid_queued',
    shouldStart: true,
    paymentConflict: false,
  });
  mocks.process.mockResolvedValue({ status: 'completed' });
  mocks.profileUpdate.mockResolvedValue({ error: null });
  mocks.sendMetaEvent.mockResolvedValue(undefined);
});

describe('Stripe paid report fulfillment route', () => {
  it('queues verified payment and starts the durable worker without a success-page visit', async () => {
    const { POST } = await import('@/app/api/webhook/route');
    const response = await POST(new Request('https://app.test/api/webhook', {
      method: 'POST',
      headers: { 'stripe-signature': 'valid-signature' },
      body: '{}',
    }));

    expect(response.status).toBe(200);
    expect(mocks.queue).toHaveBeenCalledWith({
      snapshotId: '00000000-0000-4000-8000-000000000001',
      userId: '00000000-0000-4000-8000-000000000002',
      provider: 'stripe',
      providerEventId: 'evt_paid_1',
      paymentReference: 'pi_paid_1',
      checkoutSessionId: 'cs_paid_1',
    }, serviceClient);
    expect(mocks.process).toHaveBeenCalledWith({
      snapshotId: '00000000-0000-4000-8000-000000000001',
    });
    expect(mocks.waitUntil).toHaveBeenCalledTimes(1);
  });

  it('replays the queue transaction but does not start a completed job again', async () => {
    mocks.queue.mockResolvedValue({
      fulfillmentId: 'fulfillment-1',
      status: 'completed',
      shouldStart: false,
      paymentConflict: false,
    });

    const { POST } = await import('@/app/api/webhook/route');
    const response = await POST(new Request('https://app.test/api/webhook', {
      method: 'POST',
      headers: { 'stripe-signature': 'valid-signature' },
      body: '{}',
    }));

    expect(response.status).toBe(200);
    expect(mocks.queue).toHaveBeenCalledTimes(1);
    expect(mocks.process).not.toHaveBeenCalled();
    expect(mocks.waitUntil).not.toHaveBeenCalled();
  });

  it('waits for async payment success before queueing fulfillment', async () => {
    const { POST } = await import('@/app/api/webhook/route');
    mocks.constructEvent.mockReturnValue(
      paidCheckoutEvent('checkout.session.completed', 'unpaid'),
    );

    const completedResponse = await POST(new Request('https://app.test/api/webhook', {
      method: 'POST',
      headers: { 'stripe-signature': 'valid-signature' },
      body: '{}',
    }));
    expect(completedResponse.status).toBe(200);
    expect(mocks.queue).not.toHaveBeenCalled();

    mocks.constructEvent.mockReturnValue(
      paidCheckoutEvent('checkout.session.async_payment_succeeded', 'paid'),
    );
    const successResponse = await POST(new Request('https://app.test/api/webhook', {
      method: 'POST',
      headers: { 'stripe-signature': 'valid-signature' },
      body: '{}',
    }));

    expect(successResponse.status).toBe(200);
    expect(mocks.queue).toHaveBeenCalledTimes(1);
    expect(mocks.waitUntil).toHaveBeenCalledTimes(1);
  });

  it('asks Stripe to retry when generation records a retryable failure', async () => {
    mocks.process.mockResolvedValue({
      status: 'retryable_failure',
      snapshotId: '00000000-0000-4000-8000-000000000001',
      attemptCount: 1,
      retryPersisted: true,
    });

    const { POST } = await import('@/app/api/webhook/route');
    const response = await POST(new Request('https://app.test/api/webhook', {
      method: 'POST',
      headers: { 'stripe-signature': 'valid-signature' },
      body: '{}',
    }));

    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ status: 'fulfillment_pending' });
    expect(mocks.waitUntil).toHaveBeenCalledTimes(1);
  });

  it('keeps Stripe retries alive while another worker owns the lease', async () => {
    mocks.queue.mockResolvedValue({
      fulfillmentId: 'fulfillment-1',
      status: 'generating',
      shouldStart: false,
      paymentConflict: false,
    });

    const { POST } = await import('@/app/api/webhook/route');
    const response = await POST(new Request('https://app.test/api/webhook', {
      method: 'POST',
      headers: { 'stripe-signature': 'valid-signature' },
      body: '{}',
    }));

    expect(response.status).toBe(503);
    expect(mocks.process).not.toHaveBeenCalled();
  });
});
