import { NextResponse } from 'next/server';
import { getAuthenticatedClient } from '@/lib/supabase-from-request';
import { logErrorServer } from '@/lib/log-error-server';
import {
  ACTION_CHECKOFF_STATUSES,
  type ActionCheckoffRequest,
  type ActionCheckoffStatus,
} from '@/types';

// POST /api/action-checkoffs
// Upsert a single check-off row keyed by (user_id, recommendation_id).
// completed and dismissed are mutually exclusive at write time:
//   status=completed -> completed_at=now, dismissed_at=null
//   status=dismissed -> dismissed_at=now, completed_at=null
//   status=reset     -> both null (undo path used by iOS UndoToast)
//
// recommendation_id format is "${report_id}:${priority}" where priority
// is the engine integer on each Recommendation. The body's report_id
// must match the report_id half of recommendation_id; we don't trust
// the client to split correctly.

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const RECOMMENDATION_ID_REGEX = /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}):(\d+)$/i;

interface RawBody {
  report_id?: unknown;
  recommendation_id?: unknown;
  status?: unknown;
}

function validate(body: RawBody): { ok: true; value: ActionCheckoffRequest } | { ok: false; error: string } {
  if (typeof body.report_id !== 'string' || !UUID_REGEX.test(body.report_id)) {
    return { ok: false, error: 'report_id must be a UUID' };
  }
  if (typeof body.recommendation_id !== 'string') {
    return { ok: false, error: 'recommendation_id is required' };
  }
  const match = RECOMMENDATION_ID_REGEX.exec(body.recommendation_id);
  if (!match) {
    return { ok: false, error: 'recommendation_id must match <report_uuid>:<priority>' };
  }
  if (match[1].toLowerCase() !== body.report_id.toLowerCase()) {
    return { ok: false, error: 'recommendation_id report half does not match report_id' };
  }
  if (typeof body.status !== 'string'
    || !ACTION_CHECKOFF_STATUSES.includes(body.status as ActionCheckoffStatus)) {
    return { ok: false, error: 'status must be completed, dismissed, or reset' };
  }
  return {
    ok: true,
    value: {
      report_id: body.report_id,
      recommendation_id: body.recommendation_id,
      status: body.status as ActionCheckoffStatus,
    },
  };
}

export async function POST(request: Request) {
  const { supabase, user, error: authError } = await getAuthenticatedClient(request);
  if (authError || !user || !supabase) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: RawBody;
  try {
    body = (await request.json()) as RawBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const validated = validate(body);
  if (!validated.ok) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }
  const { report_id, recommendation_id, status } = validated.value;

  const now = new Date().toISOString();
  let completedAt: string | null = null;
  let dismissedAt: string | null = null;
  if (status === 'completed') completedAt = now;
  else if (status === 'dismissed') dismissedAt = now;
  // reset: both null

  const { data, error } = await supabase
    .from('action_checkoffs')
    .upsert(
      {
        user_id: user.id,
        report_id,
        recommendation_id,
        completed_at: completedAt,
        dismissed_at: dismissedAt,
      },
      { onConflict: 'user_id,recommendation_id' },
    )
    .select()
    .single();

  if (error || !data) {
    logErrorServer(error, {
      path: '/api/action-checkoffs',
      userId: user.id,
      metadata: { stage: 'upsert', recommendation_id, status },
    });
    return NextResponse.json({ error: 'Failed to save check-off' }, { status: 500 });
  }

  return NextResponse.json({ checkoff: data });
}
