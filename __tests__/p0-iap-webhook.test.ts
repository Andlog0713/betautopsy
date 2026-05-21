import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';

// P0 regression suite for the IAP unlock row-corruption bug.
//
// Exercises the REAL RevenueCat webhook route handler against PRODUCTION
// Supabase (service role), with fixtures hard-isolated under a reserved
// user_id UUID namespace. Two seams are mocked:
//   1. @vercel/functions waitUntil  -> capture the background processUpgrade
//      promise so the test can await its completion (and DB writes) before
//      asserting. Production fires it post-response via waitUntil.
//   2. @/lib/autopsy-engine        -> avoid real Anthropic calls. The engine
//      output is irrelevant here; we assert on cohort fields
//      (bet_count_analyzed, analyzed_upload_ids, upgraded_from_snapshot_id)
//      which are resolved from the real DB query under test.
//
// NAMESPACE NOTE: the brief specified a `TEST_P0_<timestamp>_` user_id
// prefix, but user_id is a uuid FK chain (autopsy_reports/bets/uploads
// .user_id -> profiles.id -> auth.users.id), so a text prefix is not a
// valid value and arbitrary uuids fail profiles_id_fkey. We honor the
// intent (hard isolation + complete cleanup, never touching real users) by
// provisioning dedicated throwaway auth users via the admin API, tagged by
// a per-run marker in their email (p0-test-<run>-<idx>@example.com) and
// upload filenames. Teardown deletes the app rows explicitly (FK-safe
// order, including the non-cascading iap_transactions / discipline_scores
// ledgers) and then deletes each auth user, which cascades the profile.

const bgPromises: Promise<unknown>[] = [];
vi.mock('@vercel/functions', () => ({
  waitUntil: (p: Promise<unknown>) => { bgPromises.push(p); },
}));

vi.mock('@/lib/autopsy-engine', () => ({
  runAutopsy: vi.fn(async () => ({
    analysis: {}, markdown: 'test-markdown', tokensUsed: 1, model: 'test-model',
  })),
  // settled = wins + losses = 2 < emotionScore threshold (50), so the
  // emotion path stays insufficient and estimatePercentile is never called.
  calculateMetrics: vi.fn(() => ({ summary: { wins: 1, losses: 1 } })),
  // insufficient_data:true skips both the percentile call and the
  // discipline_scores ledger insert, keeping the fixture footprint minimal.
  calculateDisciplineScore: vi.fn(() => ({
    insufficient_data: true, total: 0, tracking: 0, sizing: 0, control: 0, strategy: 0,
  })),
  calculateBetIQ: vi.fn(() => ({})),
  estimatePercentile: vi.fn(() => 50),
  calculateEnhancedTilt: vi.fn(() => ({})),
  detectSportSpecificPatterns: vi.fn(() => []),
}));

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const WEBHOOK_SECRET = process.env.REVENUECAT_WEBHOOK_SECRET;

const admin = createClient(SUPABASE_URL ?? '', SERVICE_KEY ?? '', {
  auth: { persistSession: false },
});

// Per-run marker (ms since epoch, hex) used in throwaway-user emails and
// upload filenames so leftover fixtures are identifiable.
const RUN = Date.now().toString(16);
const createdUserIds: string[] = [];

async function makeUser(idx: number): Promise<string> {
  const { data, error } = await admin.auth.admin.createUser({
    email: `p0-test-${RUN}-${idx}@example.com`,
    email_confirm: true,
    password: `P0test!${RUN}${idx}`,
  });
  if (error || !data?.user) throw new Error(`auth createUser: ${error?.message ?? 'no user returned'}`);
  const id = data.user.id;
  createdUserIds.push(id);
  // A profile trigger may already have created the row; upsert is safe either way.
  const { error: pErr } = await admin
    .from('profiles')
    .upsert({ id, bankroll: null, streak_count: 0 }, { onConflict: 'id' });
  if (pErr) throw new Error(`profiles upsert (${id}): ${pErr.message}`);
  return id;
}

async function makeUpload(userId: string, betCount: number): Promise<string> {
  const { data, error } = await admin
    .from('uploads')
    .insert({ user_id: userId, filename: `TEST_P0_${RUN}.csv`, bet_count: betCount })
    .select('id')
    .single();
  if (error) throw new Error(`uploads insert: ${error.message}`);
  return data!.id as string;
}

async function makeBets(
  userId: string,
  uploadId: string | null,
  count: number,
  baseTimeMs: number,
): Promise<void> {
  const rows = Array.from({ length: count }, (_, i) => ({
    user_id: userId,
    upload_id: uploadId,
    placed_at: new Date(baseTimeMs + i * 60_000).toISOString(),
    sport: 'NFL',
    bet_type: 'straight',
    description: `test bet ${i}`,
    odds: -110,
    stake: 10,
    result: i % 2 === 0 ? 'win' : 'loss',
  }));
  const { error } = await admin.from('bets').insert(rows);
  if (error) throw new Error(`bets insert: ${error.message}`);
}

async function makeSnapshot(
  userId: string,
  opts: { analyzedUploadIds: string[] | null; betCount: number; createdAt?: string },
): Promise<string> {
  const row: Record<string, unknown> = {
    user_id: userId,
    report_type: 'snapshot',
    is_paid: false,
    bet_count_analyzed: opts.betCount,
    report_json: {},
    report_markdown: '',
    analyzed_upload_ids: opts.analyzedUploadIds,
    analyzed_sportsbook: null,
  };
  if (opts.createdAt) row.created_at = opts.createdAt;
  const { data, error } = await admin.from('autopsy_reports').insert(row).select('id').single();
  if (error) throw new Error(`snapshot insert: ${error.message}`);
  return data!.id as string;
}

function purchaseEvent(opts: {
  userId: string;
  snapshotId: string;
  transactionId: string;
}): Record<string, unknown> {
  return {
    type: 'NON_RENEWING_PURCHASE',
    app_user_id: opts.userId,
    transaction_id: opts.transactionId,
    product_id: 'single_report_v1',
    subscriber_attributes: { pending_report_unlock_id: { value: opts.snapshotId } },
  };
}

async function fireWebhook(event: Record<string, unknown>): Promise<{ status?: string }> {
  const request = new NextRequest('https://app.local/api/webhooks/revenuecat', {
    method: 'POST',
    headers: { authorization: WEBHOOK_SECRET ?? '', 'content-type': 'application/json' },
    body: JSON.stringify({ event }),
  });
  const { POST } = await import('@/app/api/webhooks/revenuecat/route');
  const res = await POST(request);
  const body = await res.json();
  // Drain the background processUpgrade work the route deferred via waitUntil.
  await Promise.all(bgPromises.splice(0));
  return body;
}

interface ChildRow {
  id: string;
  report_type: string;
  is_paid: boolean;
  bet_count_analyzed: number;
  analyzed_upload_ids: string[] | null;
  upgraded_from_snapshot_id: string | null;
}

async function childrenOf(snapshotId: string): Promise<ChildRow[]> {
  const { data, error } = await admin
    .from('autopsy_reports')
    .select('id, report_type, is_paid, bet_count_analyzed, analyzed_upload_ids, upgraded_from_snapshot_id')
    .eq('upgraded_from_snapshot_id', snapshotId);
  if (error) throw new Error(`childrenOf: ${error.message}`);
  return (data ?? []) as ChildRow[];
}

async function ledgerCount(transactionId: string): Promise<number> {
  const { count, error } = await admin
    .from('iap_transactions')
    .select('id', { count: 'exact', head: true })
    .eq('transaction_id', transactionId);
  if (error) throw new Error(`ledgerCount: ${error.message}`);
  return count ?? 0;
}

beforeAll(() => {
  if (!SUPABASE_URL || !SERVICE_KEY || !WEBHOOK_SECRET) {
    throw new Error(
      'Missing required env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, REVENUECAT_WEBHOOK_SECRET. ' +
      'Run with these exported (see the npx vitest invocation in the P0 handoff).',
    );
  }
});

afterAll(async () => {
  if (createdUserIds.length === 0) return;
  // FK-safe teardown. iap_transactions + discipline_scores do not cascade
  // from a user delete, so clear them first by user_id; bets/reports/uploads
  // are deleted explicitly for determinism, then the auth user delete
  // cascades the profile.
  await admin.from('iap_transactions').delete().in('user_id', createdUserIds);
  await admin.from('discipline_scores').delete().in('user_id', createdUserIds);
  await admin.from('bets').delete().in('user_id', createdUserIds);
  await admin.from('autopsy_reports').delete().in('user_id', createdUserIds);
  await admin.from('uploads').delete().in('user_id', createdUserIds);
  for (const id of createdUserIds) {
    await admin.auth.admin.deleteUser(id).catch(() => { /* best-effort */ });
  }
});

describe('P0 IAP webhook row-flip scenarios', () => {
  it('TEST_1 single report unlock: child analyzes the snapshot upload cohort', async () => {
    const user = await makeUser(1);
    const upload = await makeUpload(user, 12);
    await makeBets(user, upload, 12, Date.parse('2026-05-01T00:00:00Z'));
    const snap = await makeSnapshot(user, { analyzedUploadIds: [upload], betCount: 12 });

    const body = await fireWebhook(purchaseEvent({
      userId: user, snapshotId: snap, transactionId: `tx_${RUN}_1`,
    }));
    expect(body.status).toBe('queued');

    const children = await childrenOf(snap);
    expect(children).toHaveLength(1);
    expect(children[0].report_type).toBe('full');
    expect(children[0].is_paid).toBe(true);
    expect(children[0].bet_count_analyzed).toBe(12);
    expect(children[0].analyzed_upload_ids).toEqual([upload]);
  });

  it('TEST_2 multiple snapshots: only the targeted snapshot is upgraded', async () => {
    const user = await makeUser(2);
    const uB = await makeUpload(user, 11);
    const uC = await makeUpload(user, 13);
    const uD = await makeUpload(user, 17);
    await makeBets(user, uB, 11, Date.parse('2026-05-02T00:00:00Z'));
    await makeBets(user, uC, 13, Date.parse('2026-05-03T00:00:00Z'));
    await makeBets(user, uD, 17, Date.parse('2026-05-04T00:00:00Z'));
    const snapB = await makeSnapshot(user, { analyzedUploadIds: [uB], betCount: 11 });
    const snapC = await makeSnapshot(user, { analyzedUploadIds: [uC], betCount: 13 });
    const snapD = await makeSnapshot(user, { analyzedUploadIds: [uD], betCount: 17 });

    // Target C (not oldest, not newest).
    await fireWebhook(purchaseEvent({
      userId: user, snapshotId: snapC, transactionId: `tx_${RUN}_2`,
    }));

    expect(await childrenOf(snapC)).toHaveLength(1);
    expect((await childrenOf(snapC))[0].bet_count_analyzed).toBe(13);
    expect(await childrenOf(snapB)).toHaveLength(0);
    expect(await childrenOf(snapD)).toHaveLength(0);
  });

  it('TEST_3 idempotency: repeat delivery does not double-flip or double-ledger', async () => {
    const user = await makeUser(3);
    const upload = await makeUpload(user, 14);
    await makeBets(user, upload, 14, Date.parse('2026-05-05T00:00:00Z'));
    const snap = await makeSnapshot(user, { analyzedUploadIds: [upload], betCount: 14 });
    const txId = `tx_${RUN}_3`;

    const first = await fireWebhook(purchaseEvent({ userId: user, snapshotId: snap, transactionId: txId }));
    expect(first.status).toBe('queued');

    const second = await fireWebhook(purchaseEvent({ userId: user, snapshotId: snap, transactionId: txId }));
    expect(second.status).toBe('already_processed');

    // Exactly one child, exactly one ledger row.
    expect(await childrenOf(snap)).toHaveLength(1);
    expect(await ledgerCount(txId)).toBe(1);
  });

  it('TEST_4 empty analyzed_upload_ids: child uses full-history cohort, not a single upload (P0 regression)', async () => {
    const user = await makeUser(4);
    // Two distinct uploads. The pre-fix fallback would have grabbed only the
    // most-recent single upload (16 bets). The fix must analyze the full
    // no-filter cohort (16 + 9 = 25) and persist analyzed_upload_ids=[].
    const uOld = await makeUpload(user, 9);
    const uNew = await makeUpload(user, 16);
    await makeBets(user, uOld, 9, Date.parse('2026-05-06T00:00:00Z'));
    await makeBets(user, uNew, 16, Date.parse('2026-05-07T00:00:00Z'));
    const snap = await makeSnapshot(user, { analyzedUploadIds: [], betCount: 25 });

    await fireWebhook(purchaseEvent({
      userId: user, snapshotId: snap, transactionId: `tx_${RUN}_4`,
    }));

    const children = await childrenOf(snap);
    expect(children).toHaveLength(1);
    expect(children[0].bet_count_analyzed).toBe(25);
    expect(children[0].analyzed_upload_ids).toEqual([]);
  });

  it('TEST_5 mismatched user: report_id owned by another user does not flip anything', async () => {
    const user5 = await makeUser(5);
    const user6 = await makeUser(6);
    const u5 = await makeUpload(user5, 10);
    const u6 = await makeUpload(user6, 18);
    await makeBets(user5, u5, 10, Date.parse('2026-05-08T00:00:00Z'));
    await makeBets(user6, u6, 18, Date.parse('2026-05-09T00:00:00Z'));
    const snapH = await makeSnapshot(user5, { analyzedUploadIds: [u5], betCount: 10 });
    const snapI = await makeSnapshot(user6, { analyzedUploadIds: [u6], betCount: 18 });

    // app_user_id = user5 but report_id = user6's snapshot.
    const body = await fireWebhook(purchaseEvent({
      userId: user5, snapshotId: snapI, transactionId: `tx_${RUN}_5`,
    }));
    expect(body.status).toBe('report_not_found');

    expect(await childrenOf(snapI)).toHaveLength(0);
    expect(await childrenOf(snapH)).toHaveLength(0);
  });

  it('TEST_6 drift: empty cohort includes bets added after the snapshot (no time bounding)', async () => {
    const user = await makeUser(7);
    const t0 = Date.parse('2026-05-10T00:00:00Z');
    // Pre-T0 upload/bets, then post-T0 upload/bets. Snapshot created at T0
    // with empty analyzed_upload_ids. The locked Q1 contract mirrors
    // /api/analyze (no created_at bounding), so the full re-run cohort must
    // include the post-T0 bets too.
    const uPre = await makeUpload(user, 8);
    await makeBets(user, uPre, 8, t0 - 5 * 86_400_000);
    const snap = await makeSnapshot(user, {
      analyzedUploadIds: [],
      betCount: 8,
      createdAt: new Date(t0).toISOString(),
    });
    const uPost = await makeUpload(user, 7);
    await makeBets(user, uPost, 7, t0 + 5 * 86_400_000);

    await fireWebhook(purchaseEvent({
      userId: user, snapshotId: snap, transactionId: `tx_${RUN}_6`,
    }));

    const children = await childrenOf(snap);
    expect(children).toHaveLength(1);
    // 8 pre-T0 + 7 post-T0 = 15. A created_at-bounded cohort would be 8.
    expect(children[0].bet_count_analyzed).toBe(15);
    expect(children[0].analyzed_upload_ids).toEqual([]);
  });
});
