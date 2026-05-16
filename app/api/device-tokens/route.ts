import { NextResponse } from 'next/server';
import { getAuthenticatedClient } from '@/lib/supabase-from-request';
import { logErrorServer } from '@/lib/log-error-server';

// iOS posts here on first launch after permission grant and on every
// subsequent app open. Upsert by (user_id, token) refreshes
// environment / bundle_id / last_used_at and clears inactive_at if the
// token was previously marked dead by a 410 from APNs.
//
// DELETE is intentionally absent (v1.1). Permission denial on iOS is
// silent — no client call here.

interface DeviceTokenRegistration {
  token?: unknown;
  environment?: unknown;
  bundle_id?: unknown;
  platform?: unknown;
}

const HEX_TOKEN_RE = /^[0-9a-f]+$/i;

export async function POST(request: Request) {
  try {
    const { supabase, user, error: authError } = await getAuthenticatedClient(request);
    if (authError || !user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body: DeviceTokenRegistration;
    try {
      body = (await request.json()) as DeviceTokenRegistration;
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    if (typeof body.token !== 'string' || !body.token.trim()) {
      return NextResponse.json({ error: 'token is required' }, { status: 400 });
    }
    // APNs device tokens are hex. Normalize to lowercase so re-registrations
    // with different casing collapse on the (user_id, token) unique constraint.
    const token = body.token.trim().toLowerCase();
    if (token.length < 16 || token.length > 200 || !HEX_TOKEN_RE.test(token)) {
      return NextResponse.json({ error: 'Invalid device token format' }, { status: 400 });
    }

    // environment is optional on the wire; fall back to APNS_ENV. Per-token
    // environment is the source of truth at send time (lib/apns.ts).
    let environment: 'sandbox' | 'production';
    if (body.environment === 'sandbox' || body.environment === 'production') {
      environment = body.environment;
    } else if (body.environment !== undefined) {
      return NextResponse.json({ error: 'environment must be sandbox or production' }, { status: 400 });
    } else {
      const fallback = process.env.APNS_ENV;
      if (fallback === 'sandbox' || fallback === 'development') {
        environment = 'sandbox';
      } else if (fallback === 'production') {
        environment = 'production';
      } else {
        return NextResponse.json({ error: 'environment is required' }, { status: 400 });
      }
    }

    let bundleId: string;
    if (typeof body.bundle_id === 'string' && body.bundle_id.trim()) {
      bundleId = body.bundle_id.trim();
    } else {
      const fallback = process.env.APNS_BUNDLE_ID;
      if (!fallback) {
        return NextResponse.json({ error: 'bundle_id is required' }, { status: 400 });
      }
      bundleId = fallback;
    }

    const platform = typeof body.platform === 'string' && body.platform.trim()
      ? body.platform.trim()
      : 'ios';

    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from('device_tokens')
      .upsert(
        {
          user_id: user.id,
          token,
          environment,
          bundle_id: bundleId,
          platform,
          last_used_at: now,
          updated_at: now,
          // Clear the dead-token flag on re-register. iOS would not be
          // posting if push permission were still denied or the app was
          // uninstalled.
          inactive_at: null,
        },
        { onConflict: 'user_id,token' }
      )
      .select('id')
      .single();

    if (error) {
      logErrorServer(error, { path: '/api/device-tokens', metadata: { stage: 'upsert' } });
      return NextResponse.json({ error: 'Failed to register device token' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, device_token_id: data?.id ?? null });
  } catch (err) {
    logErrorServer(err, { path: '/api/device-tokens' });
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
