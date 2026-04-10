import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { checkRateLimit } from '@/lib/rate-limit';
import { logErrorServer } from '@/lib/log-error-server';
import type { AutopsyAnalysis } from '@/types';

const SYSTEM_PROMPT = `You are BetAutopsy's report analyst. You answer questions about this specific user's betting behavioral analysis report. Be specific and reference their actual numbers from the report data. Keep answers under 200 words. Never give betting picks, tout services, or financial advice. Never recommend specific bets. If asked something outside the scope of this report, say so. Always defer to the grades, scores, and classifications already in this report. Do not re-evaluate or contradict them.`;

/** Strip internal fields and large arrays, keep only what Claude needs. */
function trimReportContext(analysis: AutopsyAnalysis): Record<string, unknown> {
  const trimmed: Record<string, unknown> = {};

  // Curated subset of fields
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

  // Strip any remaining underscore-prefixed fields
  for (const key of Object.keys(trimmed)) {
    if (key.startsWith('_')) delete trimmed[key];
  }

  return trimmed;
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

    // Rate limit: 5 questions per hour per user
    if (!(await checkRateLimit(`ask-report:${user.id}`, 5, 60 * 60 * 1000))) {
      return NextResponse.json(
        { error: 'You can ask 5 questions per hour. Try again later.' },
        { status: 429 }
      );
    }

    // Load report (ownership enforced via user_id match)
    const { data: report, error: reportError } = await supabase
      .from('autopsy_reports')
      .select('id, report_json, is_paid')
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

    const trimmedContext = trimReportContext(analysis);

    const anthropic = new Anthropic();
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      temperature: 0.3,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Here is my BetAutopsy report:\n\n${JSON.stringify(trimmedContext, null, 2)}\n\nMy question: ${question}`,
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
