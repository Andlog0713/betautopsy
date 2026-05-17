import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { waitUntil } from '@vercel/functions';
import { logErrorServer } from '@/lib/log-error-server';
import { processUpgrade } from '@/lib/iap-upgrade';

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

  const supabase = createServiceClient();

  const { data: existingTx } = await supabase
    .from('iap_transactions')
    .select('id')
    .eq('transaction_id', transactionId)
    .maybeSingle();

  if (existingTx) {
    return NextResponse.json({ received: true, status: 'already_processed' }, { status: 200 });
  }

  const { data: snapshot, error: snapshotErr } = await supabase
    .from('autopsy_reports')
    .select('id, user_id, report_type, analyzed_upload_ids, analyzed_sportsbook')
    .eq('id', snapshotReportId)
    .eq('user_id', userId)
    .maybeSingle();

  if (snapshotErr || !snapshot) {
    await logErrorServer(snapshotErr ?? new Error('Snapshot not found for IAP unlock'), {
      path: '/api/webhooks/revenuecat',
      userId,
      metadata: { snapshotReportId, transactionId, productId, event_type: eventType },
    });
    return NextResponse.json({ received: true, status: 'report_not_found' }, { status: 200 });
  }

  // Already-upgraded guard: a prior webhook (different transactionId, e.g.
  // user re-purchased after a failed first attempt) already produced the
  // child row. Record the ledger row for completeness and skip the engine.
  const { count: existingChildCount } = await supabase
    .from('autopsy_reports')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('upgraded_from_snapshot_id', snapshotReportId);

  if ((existingChildCount ?? 0) > 0) {
    await supabase.from('iap_transactions').insert({
      user_id: userId,
      transaction_id: transactionId,
      product_id: productId,
      report_id: snapshotReportId,
      event_type: eventType,
      raw_event: event,
    });
    return NextResponse.json({ received: true, status: 'already_upgraded' }, { status: 200 });
  }

  // Insert ledger row BEFORE waitUntil so the record is durable even if
  // the function dies before the background engine work completes. The
  // existence of the row is the work-queue entry; processUpgrade is
  // idempotent and safe to re-drive against it.
  const { error: ledgerErr } = await supabase
    .from('iap_transactions')
    .insert({
      user_id: userId,
      transaction_id: transactionId,
      product_id: productId,
      report_id: snapshotReportId,
      event_type: eventType,
      raw_event: event,
    });

  if (ledgerErr) {
    await logErrorServer(ledgerErr, {
      path: '/api/webhooks/revenuecat',
      userId,
      metadata: { snapshotReportId, transactionId, stage: 'iap_transactions_insert' },
    });
    return NextResponse.json({ received: true, status: 'ledger_insert_failed' }, { status: 200 });
  }

  waitUntil(processUpgrade({ snapshotId: snapshotReportId, userId, transactionId }));

  return NextResponse.json({ received: true, status: 'queued' }, { status: 200 });
}
