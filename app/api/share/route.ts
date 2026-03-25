import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase-server';
import type { AutopsyAnalysis, Profile } from '@/types';
import { logErrorServer } from '@/lib/log-error-server';

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
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

    const analysis = report.report_json as AutopsyAnalysis;

    // Find best edge and biggest leak from strategic leaks
    const leaks = analysis.strategic_leaks ?? [];
    const bestEdge = leaks.filter((l) => l.roi_impact > 0).sort((a, b) => b.roi_impact - a.roi_impact)[0];
    const biggestLeak = leaks.filter((l) => l.roi_impact < 0).sort((a, b) => a.roi_impact - b.roi_impact)[0];

    // Share data: card summary for OG/metadata + full report for viewing
    const shareData = {
      grade: analysis.summary.overall_grade,
      emotion_score: analysis.tilt_score,
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
      .select('id, data')
      .eq('report_id', report_id)
      .single();

    if (existing) {
      const existingData = existing.data as Record<string, unknown> | null;
      // Update old tokens that don't have the full report
      if (!existingData?.report_json) {
        await dbClient
          .from('share_tokens')
          .update({ data: shareData })
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
