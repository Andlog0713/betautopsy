import * as Sentry from '@sentry/nextjs';
import { createServiceRoleClient } from '@/lib/supabase-server';
import {
  sendApnsPush,
  summarizeSendResults,
  type DeviceTokenRow,
  type SendResult,
} from '@/lib/apns';

// Fire-and-forget "report ready" push orchestrator. Called from
// processUpgrade ONLY AFTER the full autopsy_reports row has been committed
// and is readable by GET /api/reports?upgraded_from= (and GET
// /api/reports/:id) — see the call site + ordering comment in
// lib/iap-upgrade.ts. If the push fired before the row were queryable, the
// iOS deep-link fetch on tap would find nothing and drop the user into an
// error. Always resolves; never throws, so a push failure can never affect
// the already-committed report.
//
// Mirrors maybeSendHeatedPush: sequential awaits across the user's active
// device tokens (no batching), per-token sandbox/production handled inside
// sendApnsPush, 410 -> mark inactive, 200 -> last_used_at. The
// notifications_sent ledger (UNIQUE(user_id, kind, ref_id), ref_id = the
// full report id) makes a redelivered webhook idempotent: at most one
// report_ready push per materialized report.

const PUSH_KIND = 'report_ready';

export async function maybeSendReportReadyPush(
  userId: string,
  reportId: string,
): Promise<void> {
  try {
    const supabase = createServiceRoleClient();

    // Idempotency: one report_ready push per report, even across a webhook
    // redelivery or a second processUpgrade run.
    const { data: existing } = await supabase
      .from('notifications_sent')
      .select('id')
      .eq('user_id', userId)
      .eq('kind', PUSH_KIND)
      .eq('ref_id', reportId)
      .maybeSingle();
    if (existing) return;

    const { data: tokenRows, error: tokenErr } = await supabase
      .from('device_tokens')
      .select('id, token, environment, bundle_id')
      .eq('user_id', userId)
      .is('inactive_at', null);
    if (tokenErr || !tokenRows || tokenRows.length === 0) return;

    const title = 'Your full autopsy is ready.';
    const body = 'Tap to read the dollar costs, recommendations, and full session timeline.';

    const results: SendResult[] = [];
    for (const row of tokenRows as DeviceTokenRow[]) {
      const result = await sendApnsPush(row, {
        title,
        body,
        kind: 'report_ready',
        reportId,
        sessionDate: '',
      });
      results.push(result);
      if (result.status === 'token_inactive') {
        await supabase
          .from('device_tokens')
          .update({ inactive_at: new Date().toISOString() })
          .eq('id', row.id);
      } else if (result.status === 'sent') {
        await supabase
          .from('device_tokens')
          .update({ last_used_at: new Date().toISOString() })
          .eq('id', row.id);
      }
    }

    const anySent = results.some(r => r.status === 'sent');
    const allInactive = results.length > 0
      && results.every(r => r.status === 'token_inactive');

    if (!anySent && !allInactive) return; // all transient → no ledger row

    const status = anySent ? 'sent' : 'token_inactive';
    await supabase
      .from('notifications_sent')
      .upsert(
        {
          user_id: userId,
          kind: PUSH_KIND,
          ref_id: reportId,
          status,
          apns_response: summarizeSendResults(results),
          report_id: reportId,
        },
        { onConflict: 'user_id,kind,ref_id', ignoreDuplicates: true },
      );
  } catch (err) {
    Sentry.captureException(err, {
      tags: { route: 'revenuecat_webhook', stage: 'report_ready_push' },
      extra: { user_id: userId, report_id: reportId },
    });
  }
}
