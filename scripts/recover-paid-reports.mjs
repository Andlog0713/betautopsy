#!/usr/bin/env node

// Usage:
//   node --env-file=.env.local scripts/recover-paid-reports.mjs
//   node --env-file=.env.local scripts/recover-paid-reports.mjs --snapshot <uuid>
//   node --env-file=.env.local scripts/recover-paid-reports.mjs --snapshot <uuid> --execute
//
// The default is read-only. --execute only requeues one explicitly selected,
// recoverable snapshot. The protected daily sweep performs generation.

import { createClient } from '@supabase/supabase-js';

const args = process.argv.slice(2);
const execute = args.includes('--execute');
const snapshotFlag = args.indexOf('--snapshot');
const snapshotId = snapshotFlag >= 0 ? args[snapshotFlag + 1] : null;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

if (snapshotFlag >= 0 && (!snapshotId || !uuidPattern.test(snapshotId))) {
  throw new Error('--snapshot requires a valid UUID');
}

if (execute && !snapshotId) {
  throw new Error('--execute requires one explicit --snapshot UUID');
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

let snapshotQuery = supabase
  .from('autopsy_reports')
  .select('id, user_id, analyzed_bet_ids, analyzed_bets_snapshot, analyzed_upload_ids, is_paid, report_type')
  .eq('report_type', 'snapshot')
  .eq('is_paid', true)
  .order('created_at', { ascending: true });

if (snapshotId) snapshotQuery = snapshotQuery.eq('id', snapshotId);

const { data: snapshots, error: snapshotsError } = await snapshotQuery;
if (snapshotsError) throw new Error(`Failed to list paid snapshots: ${snapshotsError.message}`);

const snapshotIds = (snapshots ?? []).map((snapshot) => snapshot.id);
let children = [];
let fulfillments = [];

if (snapshotIds.length > 0) {
  const [{ data: childRows, error: childError }, { data: fulfillmentRows, error: fulfillmentError }] =
    await Promise.all([
      supabase
        .from('autopsy_reports')
        .select('id, upgraded_from_snapshot_id')
        .in('upgraded_from_snapshot_id', snapshotIds),
      supabase
        .from('report_fulfillments')
        .select('id, snapshot_report_id, status, attempt_count, paid_at, next_attempt_at, last_error')
        .in('snapshot_report_id', snapshotIds),
    ]);

  if (childError) throw new Error(`Failed to list full reports: ${childError.message}`);
  if (fulfillmentError) {
    throw new Error(`Failed to list fulfillment states: ${fulfillmentError.message}`);
  }
  children = childRows ?? [];
  fulfillments = fulfillmentRows ?? [];
}

const childBySnapshot = new Map(
  children.map((child) => [child.upgraded_from_snapshot_id, child.id]),
);
const fulfillmentBySnapshot = new Map(
  fulfillments.map((fulfillment) => [fulfillment.snapshot_report_id, fulfillment]),
);

const findings = (snapshots ?? []).map((snapshot) => {
  const exactCount = Array.isArray(snapshot.analyzed_bet_ids)
    ? snapshot.analyzed_bet_ids.length
    : 0;
  const frozenCount = Array.isArray(snapshot.analyzed_bets_snapshot)
    ? snapshot.analyzed_bets_snapshot.length
    : 0;
  const uploadCount = Array.isArray(snapshot.analyzed_upload_ids)
    ? snapshot.analyzed_upload_ids.length
    : 0;
  const completedReportId = childBySnapshot.get(snapshot.id) ?? null;
  const fulfillment = fulfillmentBySnapshot.get(snapshot.id) ?? null;

  let classification;
  if (completedReportId) classification = 'already_completed';
  else if (!fulfillment) classification = 'missing_fulfillment';
  else if (!fulfillment.paid_at) classification = 'payment_not_recorded';
  else if (frozenCount > 0) classification = 'recoverable_frozen_inputs';
  else if (exactCount > 0) classification = 'recoverable_exact_cohort';
  else if (uploadCount > 0) classification = 'recoverable_upload_lock';
  else classification = 'scope_unrecoverable';

  return {
    snapshot_id: snapshot.id,
    user_id: snapshot.user_id,
    classification,
    frozen_bet_count: frozenCount,
    exact_bet_count: exactCount,
    upload_lock_count: uploadCount,
    completed_report_id: completedReportId,
    fulfillment_status: fulfillment?.status ?? null,
    attempt_count: fulfillment?.attempt_count ?? null,
    next_attempt_at: fulfillment?.next_attempt_at ?? null,
    last_error: fulfillment?.last_error ?? null,
  };
});

console.log(JSON.stringify({ mode: execute ? 'execute' : 'dry_run', findings }, null, 2));

if (execute) {
  const finding = findings[0];
  if (!finding) throw new Error('No paid snapshot matched --snapshot');
  if (!finding.classification.startsWith('recoverable_')) {
    throw new Error(`Snapshot cannot be requeued: ${finding.classification}`);
  }

  const { data: requeued, error: requeueError } = await supabase.rpc(
    'requeue_report_fulfillment',
    { p_snapshot_report_id: snapshotId },
  );
  if (requeueError) throw new Error(`Failed to requeue snapshot: ${requeueError.message}`);
  if (!requeued) throw new Error('Snapshot was not in a requeueable paid state');

  console.log(JSON.stringify({ requeued: true, snapshot_id: snapshotId }, null, 2));
}
