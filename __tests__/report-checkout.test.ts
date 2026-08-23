import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createReportCheckout: vi.fn(),
  createSubscriptionCheckout: vi.fn(),
  retrieveReportCheckout: vi.fn(),
  getCustomer: vi.fn(),
  snapshot: {
    id: '00000000-0000-4000-8000-000000000001',
    user_id: 'user-1',
    report_type: 'snapshot',
    is_paid: false,
    analyzed_bet_ids: ['00000000-0000-4000-8000-000000000010'],
    analyzed_upload_ids: ['00000000-0000-4000-8000-000000000020'],
  } as Record<string, unknown>,
  existingChildCount: 0,
  fulfillment: {
    status: 'unpaid',
    paid_at: null,
    checkout_session_id: null,
  } as Record<string, unknown> | null,
  persistedCheckoutIds: [] as string[],
}));

function queryBuilder(table: string) {
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    update: vi.fn(() => builder),
    single: vi.fn(async () => {
      if (table === 'profiles') {
        return {
          data: {
            id: 'user-1',
            email: 'bettor@example.com',
            subscription_tier: 'free',
            stripe_customer_id: 'cus-1',
          },
          error: null,
        };
      }
      return { data: mocks.snapshot, error: null };
    }),
    maybeSingle: vi.fn(async () => {
      if (table === 'report_fulfillments') {
        return { data: mocks.fulfillment, error: null };
      }
      return { data: null, error: null };
    }),
    then(resolve: (value: { count: number; error: null }) => unknown) {
      return Promise.resolve({ count: mocks.existingChildCount, error: null }).then(resolve);
    },
  };
  return builder;
}

const supabase = { from: vi.fn((table: string) => queryBuilder(table)) };

const serviceClient = {
  from: vi.fn(() => {
    const builder = {
      update: vi.fn((value: { checkout_session_id?: string }) => {
        if (value.checkout_session_id) mocks.persistedCheckoutIds.push(value.checkout_session_id);
        return builder;
      }),
      eq: vi.fn(() => builder),
      is: vi.fn(async () => ({ error: null })),
    };
    return builder;
  }),
};

vi.mock('@/lib/supabase-from-request', () => ({
  getAuthenticatedClient: vi.fn(async () => ({
    supabase,
    user: { id: 'user-1', email: 'bettor@example.com' },
    error: null,
  })),
}));

vi.mock('@/lib/stripe', () => ({
  isStripeConfigured: () => true,
  getOrCreateCustomer: mocks.getCustomer,
  createReportCheckoutSession: mocks.createReportCheckout,
  retrieveReportCheckoutSession: mocks.retrieveReportCheckout,
  createSubscriptionCheckoutSession: mocks.createSubscriptionCheckout,
}));

vi.mock('@/lib/supabase-server', () => ({
  createServiceRoleClient: () => serviceClient,
}));

vi.mock('@/lib/log-error-server', () => ({ logErrorServer: vi.fn() }));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.snapshot = {
    id: '00000000-0000-4000-8000-000000000001',
    user_id: 'user-1',
    report_type: 'snapshot',
    is_paid: false,
    analyzed_bet_ids: ['00000000-0000-4000-8000-000000000010'],
    analyzed_upload_ids: ['00000000-0000-4000-8000-000000000020'],
  };
  mocks.existingChildCount = 0;
  mocks.fulfillment = {
    status: 'unpaid',
    paid_at: null,
    checkout_session_id: null,
  };
  mocks.persistedCheckoutIds = [];
  mocks.getCustomer.mockResolvedValue({ customerId: 'cus-1', created: false });
  mocks.createReportCheckout.mockResolvedValue({
    id: 'cs-new',
    url: 'https://checkout.stripe.test/session',
  });
  mocks.retrieveReportCheckout.mockResolvedValue(null);
});

describe('one-time report checkout', () => {
  it('rejects new Pro subscription checkout before creating Stripe state', async () => {
    const { POST } = await import('@/app/api/checkout/route');
    const response = await POST(new Request('https://app.test/api/checkout', {
      method: 'POST',
      body: JSON.stringify({
        type: 'subscription',
        interval: 'monthly',
      }),
    }));

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      error: 'New Pro subscriptions are not available.',
    });
    expect(mocks.getCustomer).not.toHaveBeenCalled();
    expect(mocks.createSubscriptionCheckout).not.toHaveBeenCalled();
  });

  it('opens the existing $19.99 report checkout for an exact eligible snapshot', async () => {
    const { POST } = await import('@/app/api/checkout/route');
    const response = await POST(new Request('https://app.test/api/checkout', {
      method: 'POST',
      body: JSON.stringify({
        type: 'report',
        snapshotReportId: '00000000-0000-4000-8000-000000000001',
      }),
    }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ url: 'https://checkout.stripe.test/session' });
    expect(mocks.createReportCheckout).toHaveBeenCalledWith(
      'cus-1',
      'user-1',
      '00000000-0000-4000-8000-000000000001',
      false,
      null,
    );
    expect(mocks.persistedCheckoutIds).toEqual(['cs-new']);
  });

  it('refuses to charge for a legacy snapshot whose cohort cannot be recovered', async () => {
    mocks.snapshot = {
      ...mocks.snapshot,
      analyzed_bet_ids: null,
      analyzed_upload_ids: [],
    };

    const { POST } = await import('@/app/api/checkout/route');
    const response = await POST(new Request('https://app.test/api/checkout', {
      method: 'POST',
      body: JSON.stringify({
        type: 'report',
        snapshotReportId: '00000000-0000-4000-8000-000000000001',
      }),
    }));

    expect(response.status).toBe(409);
    expect(mocks.createReportCheckout).not.toHaveBeenCalled();
  });

  it('refuses to sell another unlock when a child already exists', async () => {
    mocks.existingChildCount = 1;

    const { POST } = await import('@/app/api/checkout/route');
    const response = await POST(new Request('https://app.test/api/checkout', {
      method: 'POST',
      body: JSON.stringify({
        type: 'report',
        snapshotReportId: '00000000-0000-4000-8000-000000000001',
      }),
    }));

    expect(response.status).toBe(400);
    expect(mocks.createReportCheckout).not.toHaveBeenCalled();
  });

  it('reuses one still-open checkout instead of creating another charge path', async () => {
    mocks.fulfillment = {
      status: 'unpaid',
      paid_at: null,
      checkout_session_id: 'cs-open',
    };
    mocks.retrieveReportCheckout.mockResolvedValue({
      id: 'cs-open',
      url: 'https://checkout.stripe.test/open',
      status: 'open',
      paymentStatus: 'unpaid',
    });

    const { POST } = await import('@/app/api/checkout/route');
    const response = await POST(new Request('https://app.test/api/checkout', {
      method: 'POST',
      body: JSON.stringify({
        type: 'report',
        snapshotReportId: '00000000-0000-4000-8000-000000000001',
      }),
    }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ url: 'https://checkout.stripe.test/open' });
    expect(mocks.createReportCheckout).not.toHaveBeenCalled();
  });

  it('refuses another checkout when Stripe already received payment', async () => {
    mocks.fulfillment = {
      status: 'unpaid',
      paid_at: null,
      checkout_session_id: 'cs-paid',
    };
    mocks.retrieveReportCheckout.mockResolvedValue({
      id: 'cs-paid',
      url: null,
      status: 'complete',
      paymentStatus: 'paid',
    });

    const { POST } = await import('@/app/api/checkout/route');
    const response = await POST(new Request('https://app.test/api/checkout', {
      method: 'POST',
      body: JSON.stringify({
        type: 'report',
        snapshotReportId: '00000000-0000-4000-8000-000000000001',
      }),
    }));

    expect(response.status).toBe(409);
    expect(mocks.createReportCheckout).not.toHaveBeenCalled();
  });
});
