import * as Sentry from '@sentry/nextjs';
import { createServiceRoleClient } from '@/lib/supabase-server';
import {
  sendApnsPush,
  summarizeSendResults,
  type DeviceTokenRow,
  type SendResult,
} from '@/lib/apns';
import {
  pickHeatedSessionForPush,
  composeRefId,
  buildHeatedCopy,
  normalizeSessionDate,
} from '@/lib/push-heated';
import type { AutopsyAnalysis } from '@/types';

// Fire-and-forget heated-session push orchestrator. Called from
// /api/analyze after the autopsy_reports row is committed. Always
// resolves; never throws. Failures are reported to Sentry and never
// surfaced to the user.
//
// One push per analyze run (one heated session per report). Sequential
// awaits across the user's active device tokens — NO batching. The
// notifications_sent ledger uses an UNIQUE(user_id, kind, ref_id) upsert
// with ignoreDuplicates so a concurrent /api/analyze cannot send twice.
//
// status='sent' inserted when at least one token succeeded (200).
// status='token_inactive' inserted when every token returned 410.
// Nothing inserted when every token returned a transient error —
// the next /api/analyze retries.

const PUSH_KIND = 'heated_session';

export async function maybeSendHeatedPush(
  userId: string,
  reportId: string,
  analysis: AutopsyAnalysis,
): Promise<void> {
  try {
    const session = pickHeatedSessionForPush(analysis);
    if (!session) return;

    const refId = composeRefId(session);
    if (!refId) return;

    const supabase = createServiceRoleClient();

    const { data: existing } = await supabase
      .from('notifications_sent')
      .select('id')
      .eq('user_id', userId)
      .eq('kind', PUSH_KIND)
      .eq('ref_id', refId)
      .maybeSingle();
    if (existing) return;

    const { data: tokenRows, error: tokenErr } = await supabase
      .from('device_tokens')
      .select('id, token, environment, bundle_id')
      .eq('user_id', userId)
      .is('inactive_at', null);
    if (tokenErr || !tokenRows || tokenRows.length === 0) return;

    const sessionDate = normalizeSessionDate(session.date) ?? '';
    const copy = buildHeatedCopy(session);

    const results: SendResult[] = [];
    for (const row of tokenRows as DeviceTokenRow[]) {
      const result = await sendApnsPush(row, {
        title: copy.title,
        body: copy.body,
        kind: 'heated_session',
        reportId,
        sessionDate,
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

    if (!anySent && !allInactive) return; // all transient → retry next run

    const status = anySent ? 'sent' : 'token_inactive';
    await supabase
      .from('notifications_sent')
      .upsert(
        {
          user_id: userId,
          kind: PUSH_KIND,
          ref_id: refId,
          status,
          apns_response: summarizeSendResults(results),
          report_id: reportId,
        },
        { onConflict: 'user_id,kind,ref_id', ignoreDuplicates: true },
      );
  } catch (err) {
    Sentry.captureException(err, {
      tags: { route: 'analyze', stage: 'heated_push' },
      extra: { user_id: userId, report_id: reportId },
    });
  }
}
