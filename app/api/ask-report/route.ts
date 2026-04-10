import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { checkRateLimit } from '@/lib/rate-limit';
import { logErrorServer } from '@/lib/log-error-server';
import type { AutopsyAnalysis, Bet } from '@/types';

const SYSTEM_PROMPT = `You are BetAutopsy's report analyst. You answer questions about this specific user's betting behavioral analysis report and their underlying bet data. Be specific and reference their actual numbers. Keep answers under 200 words. Never give betting picks, tout services, or financial advice. Never recommend specific bets. If asked something outside the scope of this report, say so. Always defer to the grades, scores, and classifications already in this report. Do not re-evaluate or contradict them.`;

/** Strip internal fields, keep curated analysis fields. */
function trimReportContext(analysis: AutopsyAnalysis): Record<string, unknown> {
  const trimmed: Record<string, unknown> = {};

  if (analysis.summary) trimmed.summary = analysis.summary;
  if (analysis.biases_detected) trimmed.biases_detected = analysis.biases_detected;
  if (analysis.strategic_leaks) trimmed.strategic_leaks = analysis.strategic_leaks;
  if (analysis.behavioral_patterns) trimmed.behavioral_patterns = analysis.behavioral_patterns;
  if (analysis.recommendations) trimmed.recommendations = analysis.recommendations;
  if (analysis.emotion_score != null) trimmed.emotion_score = analysis.emotion_score;
  if (analysis.discipline_score) trimmed.discipline_score = analysis.discipline_score;
  if (analysis.betting_archetype) trimmed.betting_archetype = analysis.betting_archetype;
  if (analysis.edge_profile) trimmed.edge_profile = analysis.edge_profile;
  if (analysis.sport_specific_findings) trimmed.sport_specific_findings = analysis.sport_specific_findings;
  if (analysis.odds_analysis) trimmed.odds_analysis = analysis.odds_analysis;
  if (analysis.timing_analysis) trimmed.timing_analysis = analysis.timing_analysis;
  if (analysis.session_analysis) trimmed.session_analysis = analysis.session_analysis;
  if (analysis.session_detection?.sessionGradeDistribution) {
    trimmed.session_grade_distribution = analysis.session_detection.sessionGradeDistribution;
  }

  for (const key of Object.keys(trimmed)) {
    if (key.startsWith('_')) delete trimmed[key];
  }

  return trimmed;
}

/**
 * Aggregate raw bets into a compact stats summary (~2K tokens regardless
 * of bet count). Gives Claude sport/type/day/sportsbook breakdowns without
 * sending every individual row.
 */
function aggregateBets(bets: Bet[]): string {
  if (bets.length === 0) return '';

  const settled = bets.filter((b) => b.result === 'win' || b.result === 'loss');
  const totalStake = bets.reduce((s, b) => s + b.stake, 0);
  const totalProfit = bets.reduce((s, b) => s + b.profit, 0);
  const wins = settled.filter((b) => b.result === 'win').length;
  const stakes = bets.map((b) => b.stake);
  const minStake = Math.min(...stakes);
  const maxStake = Math.max(...stakes);
  const avgStake = totalStake / bets.length;
  const stddev = Math.sqrt(
    stakes.reduce((sum, s) => sum + (s - avgStake) ** 2, 0) / stakes.length
  );

  // Group by dimension
  function groupROI(key: (b: Bet) => string) {
    const groups: Record<string, { count: number; wins: number; profit: number; stake: number }> = {};
    for (const b of bets) {
      const k = key(b) || 'Unknown';
      if (!groups[k]) groups[k] = { count: 0, wins: 0, profit: 0, stake: 0 };
      groups[k].count++;
      groups[k].stake += b.stake;
      groups[k].profit += b.profit;
      if (b.result === 'win') groups[k].wins++;
    }
    return Object.entries(groups)
      .sort((a, b) => b[1].count - a[1].count)
      .map(([name, g]) => {
        const winRate = g.count > 0 ? ((g.wins / g.count) * 100).toFixed(1) : '0';
        const roi = g.stake > 0 ? ((g.profit / g.stake) * 100).toFixed(1) : '0';
        return `  ${name}: ${g.count} bets, ${winRate}% win, ${roi}% ROI, $${Math.round(g.profit)} profit`;
      })
      .join('\n');
  }

  // Day of week
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayBreakdown = groupROI((b) => dayNames[new Date(b.placed_at).getUTCDay()]);

  // Last 10 bets for recency context
  const recentBets = [...bets]
    .sort((a, b) => new Date(b.placed_at).getTime() - new Date(a.placed_at).getTime())
    .slice(0, 10)
    .map((b) => `  ${b.placed_at.slice(0, 10)} | ${b.sport} | ${b.bet_type} | ${b.description} | ${b.odds > 0 ? '+' : ''}${b.odds} | $${b.stake} | ${b.result} | $${b.profit}`)
    .join('\n');

  return `
=== BET DATA SUMMARY (${bets.length} bets) ===

Overview: ${bets.length} total, ${settled.length} settled, ${wins}W-${settled.length - wins}L, $${Math.round(totalProfit)} net profit
Win rate: ${settled.length > 0 ? ((wins / settled.length) * 100).toFixed(1) : 0}%
ROI: ${totalStake > 0 ? ((totalProfit / totalStake) * 100).toFixed(1) : 0}%
Stake range: $${Math.round(minStake)} - $${Math.round(maxStake)}, avg $${Math.round(avgStake)}, stddev $${Math.round(stddev)}

By Sport:
${groupROI((b) => b.sport)}

By Bet Type:
${groupROI((b) => b.bet_type)}

By Sportsbook:
${groupROI((b) => b.sportsbook ?? 'Unknown')}

By Day of Week:
${dayBreakdown}

Last 10 Bets:
${recentBets}`;
}

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { question, report_id } = body as { question?: string; report_id?: string };

    if (!question || typeof question !== 'string' || question.length < 1 || question.length > 500) {
      return NextResponse.json({ error: 'Question must be 1-500 characters.' }, { status: 400 });
    }

    if (!report_id || typeof report_id !== 'string') {
      return NextResponse.json({ error: 'report_id is required.' }, { status: 400 });
    }

    if (!(await checkRateLimit(`ask-report:${user.id}`, 15, 60 * 60 * 1000))) {
      return NextResponse.json(
        { error: 'You can ask 15 questions per hour. Try again later.' },
        { status: 429 }
      );
    }

    const { data: report, error: reportError } = await supabase
      .from('autopsy_reports')
      .select('id, report_json, is_paid, date_range_start, date_range_end')
      .eq('id', report_id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (reportError || !report) {
      return NextResponse.json({ error: 'Report not found.' }, { status: 404 });
    }

    if (!report.is_paid) {
      return NextResponse.json({ error: 'Ask Your Autopsy is available on paid reports.' }, { status: 403 });
    }

    const analysis = report.report_json as AutopsyAnalysis | null;
    if (!analysis) {
      return NextResponse.json({ error: 'Report data is missing.' }, { status: 404 });
    }

    // Fetch the actual bets that made up this report and aggregate them
    let betSummary = '';
    if (report.date_range_start && report.date_range_end) {
      const { data: bets } = await supabase
        .from('bets')
        .select('placed_at, sport, league, bet_type, description, odds, stake, result, profit, sportsbook, is_bonus_bet, parlay_legs')
        .eq('user_id', user.id)
        .gte('placed_at', report.date_range_start)
        .lte('placed_at', report.date_range_end)
        .order('placed_at', { ascending: true });

      if (bets && bets.length > 0) {
        betSummary = aggregateBets(bets as Bet[]);
      }
    }

    const trimmedContext = trimReportContext(analysis);

    const anthropic = new Anthropic();
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      temperature: 0.3,
      system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
      messages: [
        {
          role: 'user',
          content: `Here is my BetAutopsy report:\n\n${JSON.stringify(trimmedContext, null, 2)}${betSummary}\n\nMy question: ${question}`,
        },
      ],
    });

    const answer = message.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('');

    return NextResponse.json({ answer });
  } catch (error) {
    const rawMessage = error instanceof Error ? error.message : String(error);
    const lower = rawMessage.toLowerCase();

    logErrorServer(error, { path: '/api/ask-report' });

    if (lower.includes('overloaded') || lower.includes('529')) {
      return NextResponse.json(
        { error: 'Report analyst is busy. Try again in a moment.' },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}
