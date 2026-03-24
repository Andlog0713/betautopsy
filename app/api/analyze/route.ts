import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { runAutopsy, calculateMetrics, calculateDisciplineScore } from '@/lib/autopsy-engine';
import { checkRateLimit } from '@/lib/rate-limit';
import { TIER_LIMITS } from '@/types';
import type { Bet, Profile, SubscriptionTier, ProgressSnapshot } from '@/types';

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limit: 5 reports per hour
    if (!checkRateLimit(user.id, 5, 60 * 60 * 1000)) {
      return NextResponse.json({ error: "You've hit the hourly analysis limit. Try again in a few minutes." }, { status: 429 });
    }

    // Get profile and check tier limits
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const tier = (profile as Profile).subscription_tier as SubscriptionTier;
    const limits = TIER_LIMITS[tier];

    // Daily report cap by tier (Pro: 10/day, Sharp: 25/day)
    const dailyCaps: Record<string, number> = { free: 1, pro: 10, sharp: 25 };
    const dailyCap = dailyCaps[tier] ?? 10;
    if (!checkRateLimit(user.id + ':daily', dailyCap, 24 * 60 * 60 * 1000)) {
      return NextResponse.json({ error: `You've reached your daily limit of ${dailyCap} reports. Resets tomorrow.` }, { status: 429 });
    }

    // Check report limits for free tier
    if (limits.maxReports !== null) {
      const { count } = await supabase
        .from('autopsy_reports')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      if ((count ?? 0) >= limits.maxReports) {
        return NextResponse.json(
          { error: `Free tier is limited to ${limits.maxReports} report. Upgrade to Pro for unlimited reports.` },
          { status: 403 }
        );
      }
    }

    // Parse optional body
    let reportType: 'full' | 'weekly' | 'quick' = 'full';
    let dateFrom: string | null = null;
    let dateTo: string | null = null;
    let uploadIds: string[] = [];
    let sportsbook: string | null = null;
    let filterLabel = '';
    try {
      const body = await request.json();
      if (body.report_type) reportType = body.report_type;
      if (body.date_from) dateFrom = body.date_from;
      if (body.date_to) dateTo = body.date_to;
      if (body.upload_id) uploadIds = [body.upload_id];
      if (body.upload_ids && Array.isArray(body.upload_ids)) uploadIds = body.upload_ids;
      if (body.sportsbook) sportsbook = body.sportsbook;
    } catch {
      // No body or invalid JSON is fine, use defaults
    }

    // Input validation
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const dateRegex = /^\d{4}-\d{2}-\d{2}/;
    if (dateFrom && (!dateRegex.test(dateFrom) || isNaN(Date.parse(dateFrom)))) {
      return NextResponse.json({ error: 'Invalid start date format.' }, { status: 400 });
    }
    if (dateTo && (!dateRegex.test(dateTo) || isNaN(Date.parse(dateTo)))) {
      return NextResponse.json({ error: 'Invalid end date format.' }, { status: 400 });
    }
    for (const uid of uploadIds) {
      if (!uuidRegex.test(uid)) {
        return NextResponse.json({ error: 'Invalid upload ID.' }, { status: 400 });
      }
    }

    // Fetch user's bets with optional filters
    let query = supabase
      .from('bets')
      .select('*')
      .eq('user_id', user.id)
      .order('placed_at', { ascending: true });

    if (uploadIds.length === 1) {
      query = query.eq('upload_id', uploadIds[0]);
      filterLabel = 'upload';
    } else if (uploadIds.length > 1) {
      query = query.in('upload_id', uploadIds);
      filterLabel = 'uploads';
    }
    if (sportsbook) {
      query = query.eq('sportsbook', sportsbook);
      filterLabel = filterLabel || 'sportsbook';
    }
    if (dateFrom) {
      query = query.gte('placed_at', new Date(dateFrom).toISOString());
    }
    if (dateTo) {
      const endDate = new Date(dateTo);
      endDate.setDate(endDate.getDate() + 1);
      query = query.lt('placed_at', endDate.toISOString());
    }

    const { data: bets, error: betsError } = await query;

    if (betsError) {
      return NextResponse.json({ error: 'Failed to fetch bets' }, { status: 500 });
    }

    const betList = (bets ?? []) as Bet[];

    if (betList.length === 0) {
      const rangeMsg = dateFrom || dateTo ? ' in the selected date range' : '';
      return NextResponse.json({ error: `No bets found${rangeMsg}. Upload some bets first.` }, { status: 400 });
    }

    // Enforce per-report bet limit (free tier = 50 most recent)
    const totalBetCount = betList.length;
    let betsToAnalyze = betList;
    let tierLimited = false;

    if (limits.maxBetsPerReport !== null && betList.length > limits.maxBetsPerReport) {
      // Sort descending to get most recent, take the limit, then reverse to chronological
      const sorted = [...betList].sort(
        (a, b) => new Date(b.placed_at).getTime() - new Date(a.placed_at).getTime()
      );
      betsToAnalyze = sorted.slice(0, limits.maxBetsPerReport).reverse();
      tierLimited = true;
    }

    // Note: betting_style and betting_goal fields do not exist on the Profile type (types/index.ts).
    // If these fields are added to the DB and Profile type in the future, pass them to runAutopsy here.

    // Run the autopsy (pass bankroll for context)
    const userBankroll = (profile as Profile).bankroll;
    const { analysis, markdown, tokensUsed, model } = await runAutopsy(betsToAnalyze, userBankroll);

    // Estimate cost
    const costCents = Math.ceil(tokensUsed * 0.001);

    // Determine date range
    const dateStart = betsToAnalyze[0]?.placed_at ?? null;
    const dateEnd = betsToAnalyze[betsToAnalyze.length - 1]?.placed_at ?? null;

    // Save report
    const { data: report, error: insertError } = await supabase
      .from('autopsy_reports')
      .insert({
        user_id: user.id,
        report_type: reportType,
        bet_count_analyzed: betsToAnalyze.length,
        date_range_start: dateStart,
        date_range_end: dateEnd,
        report_json: analysis,
        report_markdown: markdown,
        model_used: model,
        tokens_used: tokensUsed,
        cost_cents: costCents,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Failed to save report:', insertError);
    }

    // ── Streak Logic ──
    try {
      const typedProfile2 = profile as Profile;
      const today = new Date().toISOString().split('T')[0];
      let newStreak = typedProfile2.streak_count ?? 0;
      const lastDate = typedProfile2.streak_last_date;
      const daysSince = lastDate ? Math.floor((Date.now() - new Date(lastDate).getTime()) / 86400000) : null;

      if (daysSince === null) {
        newStreak = 1; // first ever
      } else if (daysSince >= 5 && daysSince <= 21) {
        newStreak += 1; // valid increment
      } else if (daysSince > 21) {
        newStreak = 1; // streak broke
      }
      // daysSince < 5: don't increment, too soon

      const newBest = Math.max(newStreak, typedProfile2.streak_best ?? 0);
      await supabase.from('profiles').update({
        streak_count: newStreak,
        streak_last_date: today,
        streak_best: newBest,
      }).eq('id', user.id);
    } catch (streakErr) {
      console.error('Failed to update streak:', streakErr);
    }

    // ── Discipline Score ──
    let disciplineResult = { total: 0, tracking: 0, sizing: 0, control: 0, strategy: 0 };
    try {
      const metricsForDiscipline = calculateMetrics(betsToAnalyze, userBankroll);

      // Get previous snapshot for comparison
      const { data: prevSnaps } = await supabase
        .from('progress_snapshots')
        .select('*')
        .eq('user_id', user.id)
        .order('snapshot_date', { ascending: false })
        .limit(1);
      const prevSnap = (prevSnaps && prevSnaps.length > 0) ? prevSnaps[0] as ProgressSnapshot : null;

      // Get report count
      const { count: rptCount } = await supabase
        .from('autopsy_reports')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id);

      // Check if uploaded recently
      const twoWeeksAgo = new Date(Date.now() - 14 * 86400000).toISOString();
      const { count: recentUploadCount } = await supabase
        .from('bets')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', twoWeeksAgo);

      const typedProfile3 = profile as Profile;
      disciplineResult = calculateDisciplineScore(metricsForDiscipline, {
        hasBankroll: !!typedProfile3.bankroll,
        reportCount: (rptCount ?? 0) + 1, // +1 for the one we just saved
        streakCount: typedProfile3.streak_count ?? 0,
        uploadedRecently: (recentUploadCount ?? 0) > 0,
        prevSnapshot: prevSnap ? {
          tilt_score: prevSnap.tilt_score,
          stake_cv: undefined, // not stored in snapshots
          parlay_percent: prevSnap.parlay_percent,
          loss_chase_ratio: prevSnap.loss_chase_ratio,
        } : null,
      });

      // Add to analysis
      analysis.discipline_score = disciplineResult;
    } catch (discErr) {
      console.error('Failed to calculate discipline score:', discErr);
    }

    // ── Save progress snapshot ──
    try {
      const metricsSnap = calculateMetrics(betsToAnalyze, userBankroll);
      await supabase.from('progress_snapshots').upsert({
        user_id: user.id,
        snapshot_date: new Date().toISOString().split('T')[0],
        total_bets: betsToAnalyze.length,
        total_profit: metricsSnap.summary.total_profit,
        roi_percent: metricsSnap.summary.roi_percent,
        win_rate: metricsSnap.summary.win_rate,
        tilt_score: metricsSnap.tilt_score,
        avg_stake: metricsSnap.summary.avg_stake,
        parlay_percent: metricsSnap.parlay_stats.parlay_percent,
        loss_chase_ratio: metricsSnap.loss_chase_ratio,
        bankroll_health: metricsSnap.bankroll_health,
        overall_grade: metricsSnap.summary.overall_grade,
        discipline_score: disciplineResult.total,
      }, { onConflict: 'user_id,snapshot_date' });
    } catch (snapErr) {
      console.error('Failed to save snapshot:', snapErr);
    }

    const meta = { tier_limited: tierLimited, total_bets: totalBetCount, analyzed_bets: betsToAnalyze, filter: filterLabel || null };

    if (insertError) {
      return NextResponse.json({ report: { report_json: analysis, report_markdown: markdown }, ...meta });
    }

    return NextResponse.json({ report, ...meta });
  } catch (error) {
    console.error('Analysis error:', error);
    const message = error instanceof Error ? error.message : 'Analysis failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
