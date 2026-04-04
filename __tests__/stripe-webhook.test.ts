import { describe, it, expect, vi, beforeEach } from 'vitest';
import { tierFromPriceId } from '@/lib/stripe';

// ── tierFromPriceId tests ──

describe('tierFromPriceId', () => {
  beforeEach(() => {
    vi.stubEnv('STRIPE_PRO_PRICE_ID', 'price_pro_monthly');
    vi.stubEnv('STRIPE_PRO_ANNUAL_PRICE_ID', 'price_pro_annual');
  });

  it('returns pro for monthly pro price ID', () => {
    expect(tierFromPriceId('price_pro_monthly')).toBe('pro');
  });

  it('returns pro for annual pro price ID', () => {
    expect(tierFromPriceId('price_pro_annual')).toBe('pro');
  });

  it('returns null for unknown price ID', () => {
    expect(tierFromPriceId('price_unknown_123')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(tierFromPriceId('')).toBeNull();
  });
});

// ── Webhook event handler logic tests ──

describe('webhook handler logic', () => {
  function handleCheckoutCompleted(session: {
    mode: 'subscription' | 'payment';
    metadata?: { supabase_user_id?: string; tier?: string; report_id?: string; type?: string };
    customer?: string;
    payment_intent?: string;
  }): { userId: string; update: Record<string, string | number | boolean | null> } | null {
    if (session.mode === 'payment') {
      const reportId = session.metadata?.report_id;
      const userId = session.metadata?.supabase_user_id;
      if (!reportId || !userId) return null;
      return {
        userId,
        update: {
          is_paid: true,
          stripe_payment_intent_id: session.payment_intent || null,
        },
      };
    }

    const userId = session.metadata?.supabase_user_id;
    if (!userId) return null;

    return {
      userId,
      update: {
        subscription_tier: 'pro',
        subscription_status: 'active',
        stripe_customer_id: session.customer as string,
        reports_used_this_period: 0,
      },
    };
  }

  function handleSubscriptionUpdated(subscription: {
    customer: string;
    status: string;
    items: { data: { price: { id: string } }[] };
  }): { customerId: string; update: Record<string, string> } | null {
    const customerId = subscription.customer;
    const priceId = subscription.items.data[0]?.price?.id;
    if (!priceId) return null;

    const tier = tierFromPriceId(priceId);
    const update: Record<string, string> = {};

    if (tier) update.subscription_tier = tier;

    const status = subscription.status;
    if (status === 'active' || status === 'trialing') {
      update.subscription_status = 'active';
    } else if (status === 'past_due') {
      update.subscription_status = 'past_due';
    } else if (status === 'canceled' || status === 'unpaid') {
      update.subscription_status = 'canceled';
      update.subscription_tier = 'free';
    }

    return { customerId, update };
  }

  function handleSubscriptionDeleted(subscription: {
    customer: string;
  }): { customerId: string; update: Record<string, string> } {
    return {
      customerId: subscription.customer,
      update: {
        subscription_tier: 'free',
        subscription_status: 'canceled',
      },
    };
  }

  function handlePaymentFailed(invoice: {
    customer: string;
  }): { customerId: string; update: Record<string, string> } {
    return {
      customerId: invoice.customer,
      update: {
        subscription_status: 'past_due',
      },
    };
  }

  beforeEach(() => {
    vi.stubEnv('STRIPE_PRO_PRICE_ID', 'price_pro_monthly');
    vi.stubEnv('STRIPE_PRO_ANNUAL_PRICE_ID', 'price_pro_annual');
  });

  // ── checkout.session.completed (subscription) ──

  describe('checkout.session.completed - subscription', () => {
    it('sets tier to pro and status to active', () => {
      const result = handleCheckoutCompleted({
        mode: 'subscription',
        metadata: { supabase_user_id: 'user-123', tier: 'pro' },
        customer: 'cus_abc',
      });

      expect(result).not.toBeNull();
      expect(result!.userId).toBe('user-123');
      expect(result!.update.subscription_tier).toBe('pro');
      expect(result!.update.subscription_status).toBe('active');
      expect(result!.update.stripe_customer_id).toBe('cus_abc');
      expect(result!.update.reports_used_this_period).toBe(0);
    });

    it('returns null when metadata is missing user ID', () => {
      const result = handleCheckoutCompleted({
        mode: 'subscription',
        metadata: { tier: 'pro' },
        customer: 'cus_abc',
      });

      expect(result).toBeNull();
    });
  });

  // ── checkout.session.completed (payment / report purchase) ──

  describe('checkout.session.completed - report purchase', () => {
    it('marks report as paid', () => {
      const result = handleCheckoutCompleted({
        mode: 'payment',
        metadata: { supabase_user_id: 'user-123', report_id: 'rpt-456', type: 'report_purchase' },
        payment_intent: 'pi_abc',
      });

      expect(result).not.toBeNull();
      expect(result!.update.is_paid).toBe(true);
      expect(result!.update.stripe_payment_intent_id).toBe('pi_abc');
    });

    it('returns null when report_id is missing', () => {
      const result = handleCheckoutCompleted({
        mode: 'payment',
        metadata: { supabase_user_id: 'user-123' },
        payment_intent: 'pi_abc',
      });

      expect(result).toBeNull();
    });
  });

  // ── customer.subscription.updated ──

  describe('customer.subscription.updated', () => {
    it('upgrades to pro when status is active', () => {
      const result = handleSubscriptionUpdated({
        customer: 'cus_abc',
        status: 'active',
        items: { data: [{ price: { id: 'price_pro_monthly' } }] },
      });

      expect(result!.update.subscription_tier).toBe('pro');
      expect(result!.update.subscription_status).toBe('active');
    });

    it('handles annual pro price ID', () => {
      const result = handleSubscriptionUpdated({
        customer: 'cus_abc',
        status: 'active',
        items: { data: [{ price: { id: 'price_pro_annual' } }] },
      });

      expect(result!.update.subscription_tier).toBe('pro');
    });

    it('sets status to active for trialing subscriptions', () => {
      const result = handleSubscriptionUpdated({
        customer: 'cus_abc',
        status: 'trialing',
        items: { data: [{ price: { id: 'price_pro_monthly' } }] },
      });

      expect(result!.update.subscription_status).toBe('active');
    });

    it('sets past_due status', () => {
      const result = handleSubscriptionUpdated({
        customer: 'cus_abc',
        status: 'past_due',
        items: { data: [{ price: { id: 'price_pro_monthly' } }] },
      });

      expect(result!.update.subscription_status).toBe('past_due');
      expect(result!.update.subscription_tier).toBe('pro');
    });

    it('downgrades to free when canceled', () => {
      const result = handleSubscriptionUpdated({
        customer: 'cus_abc',
        status: 'canceled',
        items: { data: [{ price: { id: 'price_pro_monthly' } }] },
      });

      expect(result!.update.subscription_tier).toBe('free');
      expect(result!.update.subscription_status).toBe('canceled');
    });

    it('downgrades to free when unpaid', () => {
      const result = handleSubscriptionUpdated({
        customer: 'cus_abc',
        status: 'unpaid',
        items: { data: [{ price: { id: 'price_pro_monthly' } }] },
      });

      expect(result!.update.subscription_tier).toBe('free');
      expect(result!.update.subscription_status).toBe('canceled');
    });

    it('returns null when no items data', () => {
      const result = handleSubscriptionUpdated({
        customer: 'cus_abc',
        status: 'active',
        items: { data: [] },
      });

      expect(result).toBeNull();
    });

    it('does not set tier for unknown price ID but still sets status', () => {
      const result = handleSubscriptionUpdated({
        customer: 'cus_abc',
        status: 'active',
        items: { data: [{ price: { id: 'price_unknown' } }] },
      });

      expect(result!.update.subscription_tier).toBeUndefined();
      expect(result!.update.subscription_status).toBe('active');
    });
  });

  // ── customer.subscription.deleted ──

  describe('customer.subscription.deleted', () => {
    it('always downgrades to free + canceled', () => {
      const result = handleSubscriptionDeleted({ customer: 'cus_abc' });

      expect(result.update.subscription_tier).toBe('free');
      expect(result.update.subscription_status).toBe('canceled');
      expect(result.customerId).toBe('cus_abc');
    });
  });

  // ── invoice.payment_failed ──

  describe('invoice.payment_failed', () => {
    it('sets status to past_due', () => {
      const result = handlePaymentFailed({ customer: 'cus_abc' });

      expect(result.update.subscription_status).toBe('past_due');
      expect(result.customerId).toBe('cus_abc');
    });

    it('does not change tier on payment failure', () => {
      const result = handlePaymentFailed({ customer: 'cus_abc' });

      expect(result.update.subscription_tier).toBeUndefined();
    });
  });

  // ── Edge cases ──

  describe('tier transition edge cases', () => {
    it('monthly → annual switch keeps same tier', () => {
      const monthly = handleSubscriptionUpdated({
        customer: 'cus_abc',
        status: 'active',
        items: { data: [{ price: { id: 'price_pro_monthly' } }] },
      });

      const annual = handleSubscriptionUpdated({
        customer: 'cus_abc',
        status: 'active',
        items: { data: [{ price: { id: 'price_pro_annual' } }] },
      });

      expect(monthly!.update.subscription_tier).toBe('pro');
      expect(annual!.update.subscription_tier).toBe('pro');
    });

    it('payment failure followed by deletion results in free + canceled', () => {
      const failed = handlePaymentFailed({ customer: 'cus_abc' });
      expect(failed.update.subscription_status).toBe('past_due');

      const deleted = handleSubscriptionDeleted({ customer: 'cus_abc' });
      expect(deleted.update.subscription_tier).toBe('free');
      expect(deleted.update.subscription_status).toBe('canceled');
    });
  });
});
