import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mocks Stripe's `checkout.sessions.create` so we can force a
// discount-related failure on the first call and assert the retry drops
// the discount instead of propagating the error.
const createSessionMock = vi.fn();

vi.mock('stripe', () => {
  return {
    default: class MockStripe {
      checkout = { sessions: { create: createSessionMock } };
    },
  };
});

describe('checkout coupon fallback', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    createSessionMock.mockReset();
    vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_123');
    vi.stubEnv('STRIPE_PRO_PRICE_ID', 'price_pro_monthly');
    vi.stubEnv('STRIPE_REPORT_PRICE_ID', 'price_report');
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://www.betautopsy.com');
  });

  it('retries without a discount when Stripe rejects coupon_applies_to_nothing', async () => {
    vi.stubEnv('STRIPE_LAUNCH_PROMO', 'promo_launch');
    createSessionMock
      .mockRejectedValueOnce({
        type: 'StripeInvalidRequestError',
        code: 'coupon_applies_to_nothing',
        message: 'This coupon cannot be redeemed because it does not apply to anything in this order.',
      })
      .mockResolvedValueOnce({ url: 'https://checkout.stripe.com/session_ok' });

    const { createReportCheckoutSession } = await import('@/lib/stripe');
    const url = await createReportCheckoutSession('cus_123', 'user_123', 'report_123', false);

    expect(url).toBe('https://checkout.stripe.com/session_ok');
    expect(createSessionMock).toHaveBeenCalledTimes(2);

    // First call carried the discount.
    expect(createSessionMock.mock.calls[0][0]).toMatchObject({
      discounts: [{ promotion_code: 'promo_launch' }],
    });
    // Retry dropped it entirely (no discounts, no allow_promotion_codes).
    const retryParams = createSessionMock.mock.calls[1][0];
    expect(retryParams.discounts).toBeUndefined();
    expect(retryParams.allow_promotion_codes).toBeUndefined();
    expect(retryParams.line_items).toEqual([{ price: 'price_report', quantity: 1 }]);
  });

  it('does not retry and propagates non-discount Stripe errors', async () => {
    vi.stubEnv('STRIPE_LAUNCH_PROMO', 'promo_launch');
    createSessionMock.mockRejectedValueOnce({
      type: 'StripeInvalidRequestError',
      code: 'resource_missing',
      param: 'customer',
      message: 'No such customer',
    });

    const { createReportCheckoutSession } = await import('@/lib/stripe');
    await expect(
      createReportCheckoutSession('cus_missing', 'user_123', 'report_123', false)
    ).rejects.toMatchObject({ code: 'resource_missing' });

    expect(createSessionMock).toHaveBeenCalledTimes(1);
  });

  it('subscription checkout also falls back on a discount failure', async () => {
    vi.stubEnv('STRIPE_LAUNCH_PROMO', 'promo_launch');
    createSessionMock
      .mockRejectedValueOnce({ code: 'coupon_applies_to_nothing' })
      .mockResolvedValueOnce({ url: 'https://checkout.stripe.com/sub_ok' });

    const { createSubscriptionCheckoutSession } = await import('@/lib/stripe');
    const url = await createSubscriptionCheckoutSession('cus_123', 'user_123', 'monthly');

    expect(url).toBe('https://checkout.stripe.com/sub_ok');
    expect(createSessionMock).toHaveBeenCalledTimes(2);
  });

  it('no retry needed when no launch promo is configured', async () => {
    createSessionMock.mockResolvedValueOnce({ url: 'https://checkout.stripe.com/session_ok' });

    const { createReportCheckoutSession } = await import('@/lib/stripe');
    const url = await createReportCheckoutSession('cus_123', 'user_123', 'report_123', false);

    expect(url).toBe('https://checkout.stripe.com/session_ok');
    expect(createSessionMock).toHaveBeenCalledTimes(1);
    expect(createSessionMock.mock.calls[0][0]).toMatchObject({ allow_promotion_codes: true });
  });
});
