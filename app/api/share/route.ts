import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase-server';
import { getAuthenticatedClient } from '@/lib/supabase-from-request';
import type { AutopsyAnalysis, Profile } from '@/types';
import { logErrorServer } from '@/lib/log-error-server';
import { attachCanonicalControlRules } from '@/lib/control-system';
import { sanitizeUnconfirmedLocalTimeClaims } from '@/lib/temporal-provenance';

export async function POST(request: Request) {
  try {
    const { supabase, user, error: authError } = await getAuthenticatedClient(request);

    if (authError || !user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { report_id } = await request.json();
    if (!report_id) {
      return NextResponse.json({ error: 'report_id required' }, { status: 400 });
    }

    // Fetch report (try own first, then admin fallback)
    let report = (await supabase
      .from('autopsy_reports')
      .select('*')
      .eq('id', report_id)
      .eq('user_id', user.id)
      .single()).data;

    if (!report) {
      // Admin fallback: bypass RLS
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single();

      if (profile && (profile as Profile).is_admin) {
        const adminClient = createServiceRoleClient();
        report = (await adminClient
          .from('autopsy_reports')
          .select('*')
          .eq('id', report_id)
          .single()).data;
      }
    }

    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    const storedAnalysis = sanitizeUnconfirmedLocalTimeClaims(
      report.report_json as AutopsyAnalysis,
    );
    const analysis = report.report_type === 'snapshot'
      ? storedAnalysis
      : attachCanonicalControlRules(storedAnalysis);

    // Find best edge and biggest leak from strategic leaks
    const leaks = analysis.strategic_leaks ?? [];
    const bestEdge = leaks.filter((l) => l.roi_impact > 0).sort((a, b) => b.roi_impact - a.roi_impact)[0];
    const biggestLeak = leaks.filter((l) => l.roi_impact < 0).sort((a, b) => a.roi_impact - b.roi_impact)[0];

    // Share data: card summary for OG/metadata + full report for viewing
    const shareData = {
      grade: analysis.summary.overall_grade,
      emotion_score: analysis.emotion_score ?? analysis.tilt_score,
      roi_percent: analysis.summary.roi_percent,
      win_rate: (() => {
        const parts = (analysis.summary.record ?? '').split('-').map(Number);
        const wins = parts[0] || 0;
        const total = analysis.summary.total_bets || 1;
        return Math.round((wins / total) * 1000) / 10;
      })(),
      total_bets: analysis.summary.total_bets,
      record: analysis.summary.record,
      best_edge: bestEdge ? { category: bestEdge.category, roi: bestEdge.roi_impact } : null,
      biggest_leak: biggestLeak ? { category: biggestLeak.category, roi: biggestLeak.roi_impact } : null,
      sharp_score: analysis.edge_profile?.sharp_score ?? null,
      archetype: analysis.betting_archetype ?? null,
      date: report.created_at,
      report_json: analysis,
      tier: 'free' as string,
      // Lets SharedReport derive isSnapshot the same way the working
      // dashboard case does (report.report_type === 'snapshot'), so the
      // read-only view actually locks what the engine locked instead of
      // silently defaulting to the unlocked full-report rendering path.
      report_type: report.report_type as string,
    };

    // Use service role for admin sharing other users' reports (bypasses RLS)
    const isOwnReport = report.user_id === user.id;
    const dbClient = isOwnReport ? supabase : createServiceRoleClient();

    // Fetch the report owner's tier
    const { data: ownerProfile } = await dbClient
      .from('profiles')
      .select('subscription_tier')
      .eq('id', report.user_id)
      .single();
    shareData.tier = ownerProfile?.subscription_tier ?? 'free';

    // Check if share token already exists for this report
    const { data: existing } = await dbClient
      .from('share_tokens')
      .select('id, data, revoked')
      .eq('report_id', report_id)
      .single();

    if (existing) {
      const existingData = existing.data as Record<string, unknown> | null;
      const needsDataRefresh = !existingData?.report_json || !existingData?.report_type;
      // Revoked (either the 2026-08-16 mass-revoke migration, or a user's
      // own earlier explicit unshare) does not permanently kill the link -
      // this POST call IS the explicit share action; re-activate rather
      // than returning a dead id the read path will treat as expired.
      if (existing.revoked || needsDataRefresh) {
        await dbClient
          .from('share_tokens')
          .update({ data: shareData, revoked: false })
          .eq('id', existing.id);
      }
      return NextResponse.json({ share_id: existing.id });
    }

    const { data: token, error: insertErr } = await dbClient
      .from('share_tokens')
      .insert({
        report_id: report_id,
        user_id: report.user_id,
        data: shareData,
      })
      .select('id')
      .single();

    if (insertErr) {
      return NextResponse.json({ error: 'Could not create share link' }, { status: 500 });
    }

    return NextResponse.json({ share_id: token.id });
  } catch (error) {
    console.error('Share error:', error);
    logErrorServer(error, { path: '/api/share' });
    return NextResponse.json({ error: 'Share failed' }, { status: 500 });
  }
}

// Read-only existence check for the caller's own report - does NOT mint or
// re-activate anything, unlike POST (which IS the explicit share action).
// Lets ShareModal show "Delete shared link" for a link minted in a past
// session, not just one minted this session (shareUrl was previously only
// ever set by ensureShareUrl's own POST response). A revoked token reports
// as no active share, matching POST's own re-activate-on-next-share
// semantics - the modal should show "Copy report link" for it, not
// "Delete," until the user re-shares.
export async function GET(request: Request) {
  try {
    const { supabase, user, error: authError } = await getAuthenticatedClient(request);
    if (authError || !user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const reportId = searchParams.get('report_id');
    if (!reportId) {
      return NextResponse.json({ error: 'report_id required' }, { status: 400 });
    }

    const { data: existing } = await supabase
      .from('share_tokens')
      .select('id, revoked')
      .eq('report_id', reportId)
      .eq('user_id', user.id)
      .single();

    return NextResponse.json({ share_id: existing && !existing.revoked ? existing.id : null });
  } catch (error) {
    console.error('Share lookup error:', error);
    logErrorServer(error, { path: '/api/share', metadata: { method: 'GET' } });
    return NextResponse.json({ error: 'Lookup failed' }, { status: 500 });
  }
}

// Revoke: takes the public link down without deleting the row (the report
// owner can re-share later via POST, which un-revokes rather than minting
// a second token). Scoped to the caller's own report_id - RLS on
// share_tokens (Users can view own share tokens) already limits SELECT to
// the owner, and this update is scoped the same way.
export async function DELETE(request: Request) {
  try {
    const { supabase, user, error: authError } = await getAuthenticatedClient(request);
    if (authError || !user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { report_id } = await request.json();
    if (!report_id) {
      return NextResponse.json({ error: 'report_id required' }, { status: 400 });
    }

    const { error: updateErr } = await supabase
      .from('share_tokens')
      .update({ revoked: true })
      .eq('report_id', report_id)
      .eq('user_id', user.id);

    if (updateErr) {
      return NextResponse.json({ error: 'Could not revoke share link' }, { status: 500 });
    }

    return NextResponse.json({ revoked: true });
  } catch (error) {
    console.error('Share revoke error:', error);
    logErrorServer(error, { path: '/api/share', metadata: { method: 'DELETE' } });
    return NextResponse.json({ error: 'Revoke failed' }, { status: 500 });
  }
}
