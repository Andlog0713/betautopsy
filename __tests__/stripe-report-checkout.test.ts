import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createSession: vi.fn(),
  retrieveSession: vi.fn(),
}));

vi.mock('stripe', () => ({
  default: class StripeMock {
    checkout = {
      sessions: {
        create: mocks.createSession,
        retrieve: mocks.retrieveSession,
      },
    };
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  process.env.STRIPE_SECRET_KEY = 'sk_test_unit';
  process.env.STRIPE_REPORT_PRICE_ID = 'price_report';
  process.env.STRIPE_EXTRA_REPORT_PRICE_ID = 'price_extra';
  delete process.env.STRIPE_PRO_PRICE_ID;
  process.env.NEXT_PUBLIC_APP_URL = 'https://app.test';
  mocks.createSession.mockResolvedValue({
    id: 'cs-1',
    url: 'https://checkout.stripe.test/cs-1',
  });
});

describe('Stripe payment configuration', () => {
  it('depends on the one-time report price rather than a retired Pro price', async () => {
    const { isStripeConfigured } = await import('@/lib/stripe');

    expect(isStripeConfigured()).toBe(true);

    delete process.env.STRIPE_REPORT_PRICE_ID;
    expect(isStripeConfigured()).toBe(false);
  });
});

describe('report Checkout Session idempotency', () => {
  it('uses one deterministic key for concurrent initial checkout attempts', async () => {
    const { createReportCheckoutSession } = await import('@/lib/stripe');
    const first = createReportCheckoutSession('cus-1', 'user-1', 'snapshot-1');
    const second = createReportCheckoutSession('cus-1', 'user-1', 'snapshot-1');

    await expect(Promise.all([first, second])).resolves.toEqual([
      { id: 'cs-1', url: 'https://checkout.stripe.test/cs-1' },
      { id: 'cs-1', url: 'https://checkout.stripe.test/cs-1' },
    ]);
    expect(mocks.createSession).toHaveBeenCalledTimes(2);
    for (const call of mocks.createSession.mock.calls) {
      expect(call[1]).toEqual({ idempotencyKey: 'report:snapshot-1:initial' });
    }
  });

  it('anchors one replacement generation to the expired prior session', async () => {
    const { createReportCheckoutSession } = await import('@/lib/stripe');
    await createReportCheckoutSession(
      'cus-1',
      'user-1',
      'snapshot-1',
      false,
      'cs-expired',
    );

    expect(mocks.createSession.mock.calls[0][1]).toEqual({
      idempotencyKey: 'report:snapshot-1:cs-expired',
    });
  });
});
