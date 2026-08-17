import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mocks Stripe's `checkout.sessions.create` so we can force a
// discount-related failure and assert it is NEVER retried at a
// different (higher, undiscounted) price. Every Stripe Price ID this
// module uses is the full, undiscounted amount - the coupon is the
// entire mechanism producing the advertised price - so a "helpful"
// retry-without-discount would silently double the charge.
const createSessionMock = vi.fn();

vi.mock('stripe', () => {
  return {
    default: class MockStripe {
      checkout = { sessions: { create: createSessionMock } };
    },
  };
});

describe('checkout coupon failure handling', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    createSessionMock.mockReset();
    vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_123');
    vi.stubEnv('STRIPE_PRO_PRICE_ID', 'price_pro_monthly');
    vi.stubEnv('STRIPE_REPORT_PRICE_ID', 'price_report');
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://www.betautopsy.com');
  });

  it('does NOT retry at the undiscounted price when Stripe rejects coupon_applies_to_nothing', async () => {
    vi.stubEnv('STRIPE_LAUNCH_PROMO', 'promo_launch');
    createSessionMock.mockRejectedValueOnce({
      type: 'StripeInvalidRequestError',
      code: 'coupon_applies_to_nothing',
      message: 'This coupon cannot be redeemed because it does not apply to anything in this order.',
    });

    const { createReportCheckoutSession } = await import('@/lib/stripe');
    await expect(
      createReportCheckoutSession('cus_123', 'user_123', 'report_123', false)
    ).rejects.toMatchObject({ code: 'coupon_applies_to_nothing' });

    // Exactly one attempt, with the discount attached. Never a second
    // call without it - that would charge $19.99 for something shown
    // to the customer as $9.99.
    expect(createSessionMock).toHaveBeenCalledTimes(1);
    expect(createSessionMock.mock.calls[0][0]).toMatchObject({
      discounts: [{ promotion_code: 'promo_launch' }],
    });
  });

  it('does not retry and propagates non-discount Stripe errors the same way', async () => {
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

  it('subscription checkout also blocks rather than retrying at full price on a discount failure', async () => {
    vi.stubEnv('STRIPE_LAUNCH_PROMO', 'promo_launch');
    createSessionMock.mockRejectedValueOnce({ code: 'coupon_applies_to_nothing' });

    const { createSubscriptionCheckoutSession } = await import('@/lib/stripe');
    await expect(
      createSubscriptionCheckoutSession('cus_123', 'user_123', 'monthly')
    ).rejects.toMatchObject({ code: 'coupon_applies_to_nothing' });

    expect(createSessionMock).toHaveBeenCalledTimes(1);
  });

  it('succeeds normally when no discount is configured', async () => {
    createSessionMock.mockResolvedValueOnce({ url: 'https://checkout.stripe.com/session_ok' });

    const { createReportCheckoutSession } = await import('@/lib/stripe');
    const url = await createReportCheckoutSession('cus_123', 'user_123', 'report_123', false);

    expect(url).toBe('https://checkout.stripe.com/session_ok');
    expect(createSessionMock).toHaveBeenCalledTimes(1);
    expect(createSessionMock.mock.calls[0][0]).toMatchObject({ allow_promotion_codes: true });
  });

  it('succeeds normally when the discount applies cleanly', async () => {
    vi.stubEnv('STRIPE_LAUNCH_PROMO', 'promo_launch');
    createSessionMock.mockResolvedValueOnce({ url: 'https://checkout.stripe.com/session_ok' });

    const { createReportCheckoutSession } = await import('@/lib/stripe');
    const url = await createReportCheckoutSession('cus_123', 'user_123', 'report_123', false);

    expect(url).toBe('https://checkout.stripe.com/session_ok');
    expect(createSessionMock).toHaveBeenCalledTimes(1);
  });
});
