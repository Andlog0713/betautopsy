import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { waitUntil } from '@vercel/functions';
import { logErrorServer } from '@/lib/log-error-server';
import {
  processPaidReportFulfillment,
  queuePaidReportFulfillment,
} from '@/lib/paid-report-fulfillment';

// Service-role client — webhook is called by RevenueCat, not a user
// session. Mirrors app/api/webhook/route.ts (Stripe). RLS is bypassed
// for both the iap_transactions ledger insert and the eventual child
// autopsy_reports insert in Commit 3.
function createServiceClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() { return []; },
        setAll() {},
      },
    }
  );
}

// Only purchase events trigger an unlock. Consumables fire
// NON_RENEWING_PURCHASE; INITIAL_PURCHASE is included for future-proofing
// if the product is ever migrated to a non-consumable. RENEWAL /
// CANCELLATION / EXPIRATION / REFUND / TRANSFER are ignored for v1 —
// refund handling is parked for v1.1.
const PROCESS_TYPES = new Set(['INITIAL_PURCHASE', 'NON_RENEWING_PURCHASE']);
const DEFAULT_REPORT_PRODUCT_IDS = ['single_report_v1'];

function reportProductIds(): Set<string> {
  const configured = process.env.REVENUECAT_REPORT_PRODUCT_IDS
    ?.split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  return new Set(configured?.length ? configured : DEFAULT_REPORT_PRODUCT_IDS);
}

// Match /api/analyze:25 — the waitUntil-invoked engine re-run is a Sonnet
// full-report run, which can take 30-120s on the 5000-bet max-cap. The
// route's synchronous body completes in <1s, but the Vercel function
// instance has to stay alive past response close until the waitUntil
// Promise resolves. maxDuration caps that wait at 300s (Pro plan cap).
export const maxDuration = 300;
const PROVIDER_ACK_WAIT_MS = 5_000;

async function fulfillmentNeedsProviderRetry(
  work: ReturnType<typeof processPaidReportFulfillment>,
): Promise<boolean> {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  try {
    const result = await Promise.race([
      work,
      new Promise<'timeout'>((resolve) => {
        timeout = setTimeout(() => resolve('timeout'), PROVIDER_ACK_WAIT_MS);
      }),
    ]);
    return result === 'timeout' || result.status !== 'completed';
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

export async function POST(request: NextRequest) {
  const auth = request.headers.get('authorization');
  if (!auth || auth !== process.env.REVENUECAT_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let payload: { event?: Record<string, unknown> };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const event = payload?.event;
  if (!event) {
    return NextResponse.json({ received: true, status: 'no_event' }, { status: 200 });
  }

  const eventType = event.type as string | undefined;
  if (!eventType || !PROCESS_TYPES.has(eventType)) {
    return NextResponse.json(
      { received: true, status: 'ignored', event_type: eventType ?? null },
      { status: 200 }
    );
  }

  const userId = event.app_user_id as string | undefined;
  const transactionId = event.transaction_id as string | undefined;
  const productId = event.product_id as string | undefined;
  const subscriberAttributes = event.subscriber_attributes as
    | Record<string, { value?: string } | undefined>
    | undefined;
  const snapshotReportId = subscriberAttributes?.pending_report_unlock_id?.value;

  if (!userId || !transactionId || !productId || !snapshotReportId) {
    await logErrorServer(new Error('RevenueCat webhook missing required fields'), {
      path: '/api/webhooks/revenuecat',
      metadata: {
        event_type: eventType,
        has_userId: !!userId,
        has_txId: !!transactionId,
        has_productId: !!productId,
        has_snapshotReportId: !!snapshotReportId,
        raw: event,
      },
    });
    return NextResponse.json({ received: true, status: 'missing_fields' }, { status: 200 });
  }

  if (!reportProductIds().has(productId)) {
    await logErrorServer(new Error('RevenueCat purchase used an unsupported product'), {
      path: '/api/webhooks/revenuecat',
      userId,
      metadata: { snapshotReportId, transactionId, productId, event_type: eventType },
    });
    return NextResponse.json(
      { received: true, status: 'invalid_product' },
      { status: 200 },
    );
  }

  const supabase = createServiceClient();

  const { data: snapshot, error: snapshotErr } = await supabase
    .from('autopsy_reports')
    .select('id, user_id, report_type')
    .eq('id', snapshotReportId)
    .eq('user_id', userId)
    .eq('report_type', 'snapshot')
    .maybeSingle();

  if (snapshotErr || !snapshot) {
    await logErrorServer(snapshotErr ?? new Error('Snapshot not found for IAP unlock'), {
      path: '/api/webhooks/revenuecat',
      userId,
      metadata: { snapshotReportId, transactionId, productId, event_type: eventType },
    });
    return NextResponse.json({ received: true, status: 'report_not_found' }, { status: 200 });
  }

  let queued: Awaited<ReturnType<typeof queuePaidReportFulfillment>>;
  try {
    queued = await queuePaidReportFulfillment({
      snapshotId: snapshotReportId,
      userId,
      provider: 'revenuecat',
      providerEventId: transactionId,
      paymentReference: transactionId,
    }, supabase);
  } catch (queueError) {
    await logErrorServer(queueError, {
      path: '/api/webhooks/revenuecat',
      userId,
      metadata: { snapshotReportId, transactionId, stage: 'queue_fulfillment' },
    });
    return NextResponse.json({ error: 'Fulfillment queue failed' }, { status: 500 });
  }

  // Keep the provider audit ledger independently of the fulfillment queue.
  // A duplicate delivery re-drives an unfinished durable job instead of
  // short-circuiting merely because this ledger row already exists.
  const { error: ledgerErr } = await supabase
    .from('iap_transactions')
    .upsert(
      {
        user_id: userId,
        transaction_id: transactionId,
        product_id: productId,
        report_id: snapshotReportId,
        event_type: eventType,
        raw_event: event,
      },
      { onConflict: 'transaction_id', ignoreDuplicates: true },
    );

  if (ledgerErr) {
    await logErrorServer(ledgerErr, {
      path: '/api/webhooks/revenuecat',
      userId,
      metadata: { snapshotReportId, transactionId, stage: 'iap_transactions_insert' },
    });
  }

  if (queued.paymentConflict) {
    await logErrorServer(new Error('RevenueCat payment conflicts with existing fulfillment'), {
      path: '/api/webhooks/revenuecat',
      userId,
      metadata: { snapshotReportId, transactionId, productId },
    });
    return NextResponse.json({ received: true, status: 'payment_conflict' }, { status: 200 });
  }

  if (queued.shouldStart) {
    const work = processPaidReportFulfillment({ snapshotId: snapshotReportId });
    waitUntil(work);
    if (await fulfillmentNeedsProviderRetry(work)) {
      return NextResponse.json(
        { received: false, status: 'fulfillment_pending' },
        { status: 503 },
      );
    }
  } else if (queued.status !== 'completed') {
    return NextResponse.json(
      { received: false, status: 'fulfillment_pending' },
      { status: 503 },
    );
  }

  return NextResponse.json(
    { received: true, status: queued.status },
    { status: 200 },
  );
}
