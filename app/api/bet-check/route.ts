import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import Anthropic from '@anthropic-ai/sdk';
import { checkRateLimit } from '@/lib/rate-limit';
import { sanitizeForPrompt } from '@/lib/utils';
import { logErrorServer } from '@/lib/log-error-server';
import type { Bet, Profile } from '@/types';

const SYSTEM_PROMPT = `You are BetAutopsy's Live Bet Check. A user is about to place a bet. Given their recent betting history, analyze this potential bet for behavioral red flags in 3-4 sentences. Be direct and specific.

Check for:
- Loss chasing: Are they increasing stakes after recent losses?
- Emotional patterns: Have they been on a losing streak? Are they betting more frequently than usual?
- Known leaks: Based on their history, do they lose money on this type of bet (sport, bet type, odds range)?
- Stake sizing: Is this bet unusually large compared to their average?
- Parlay patterns: If it's a parlay, what's their parlay track record?
- Time patterns: Are they betting at unusual times or high volume today?

Format your response as:
SIGNAL: [GREEN/YELLOW/RED]
[Your 3-4 sentence analysis]

GREEN = nothing concerning, looks disciplined
YELLOW = minor concern worth noting
RED = strong behavioral red flag, recommend pausing

Never recommend specific bets or predict outcomes. Only analyze behavior.`;

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limit: 30 checks per hour
    if (!checkRateLimit(user.id + ':betcheck', 30, 60 * 60 * 1000)) {
      return NextResponse.json({ error: "You've hit the check limit. Try again in a few minutes." }, { status: 429 });
    }

    // Check tier
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_tier')
      .eq('id', user.id)
      .single();

    if (!profile || (profile as Profile).subscription_tier !== 'sharp') {
      return NextResponse.json(
        { error: 'Live Bet Check is available on the Sharp plan.' },
        { status: 403 }
      );
    }

    const body = await request.json();

    if (!body.description || body.stake === undefined) {
      return NextResponse.json({ error: 'Description and stake are required' }, { status: 400 });
    }

    // Sanitize user inputs
    const description = sanitizeForPrompt(body.description, 300);
    const odds = sanitizeForPrompt(body.odds || '', 20);
    const stake = Number(body.stake);
    const sport = sanitizeForPrompt(body.sport || '', 50);
    const bet_type = sanitizeForPrompt(body.bet_type || '', 50);

    if (isNaN(stake) || stake <= 0) {
      return NextResponse.json({ error: 'Invalid stake amount' }, { status: 400 });
    }

    // Fetch last 50 bets for context
    const { data: recentBets } = await supabase
      .from('bets')
      .select('*')
      .eq('user_id', user.id)
      .order('placed_at', { ascending: false })
      .limit(50);

    const bets = (recentBets ?? []) as Bet[];

    // Build context
    const totalStake = bets.reduce((s, b) => s + Number(b.stake), 0);
    const avgStake = bets.length > 0 ? totalStake / bets.length : 0;

    const today = new Date().toISOString().split('T')[0];
    const betsToday = bets.filter(
      (b) => b.placed_at.startsWith(today) || b.created_at.startsWith(today)
    ).length;

    const last5 = bets.slice(0, 5).map((b) => b.result);

    // Format recent history for Claude
    const historyLines = bets.slice(0, 20).map((b) => {
      const date = new Date(b.placed_at).toISOString().split('T')[0];
      const oddsStr = b.odds > 0 ? `+${b.odds}` : `${b.odds}`;
      return `${date} | ${b.sport} | ${b.bet_type} | ${b.description} | ${oddsStr} | $${Number(b.stake).toFixed(0)} | ${b.result} | ${Number(b.profit) >= 0 ? '+' : ''}$${Number(b.profit).toFixed(0)}`;
    });

    // Sport-specific stats
    const sportBets = bets.filter((b) => b.sport.toLowerCase() === (sport || '').toLowerCase());
    const sportProfit = sportBets.reduce((s, b) => s + Number(b.profit), 0);
    const sportStaked = sportBets.reduce((s, b) => s + Number(b.stake), 0);
    const sportROI = sportStaked > 0 ? (sportProfit / sportStaked) * 100 : 0;

    // Bet type stats
    const typeBets = bets.filter((b) => b.bet_type.toLowerCase() === (bet_type || '').toLowerCase());
    const typeProfit = typeBets.reduce((s, b) => s + Number(b.profit), 0);
    const typeStaked = typeBets.reduce((s, b) => s + Number(b.stake), 0);
    const typeROI = typeStaked > 0 ? (typeProfit / typeStaked) * 100 : 0;

    // Recent streak
    let streak = 0;
    let streakType = '';
    for (const b of bets) {
      if (b.result !== 'win' && b.result !== 'loss') continue;
      if (!streakType) streakType = b.result;
      if (b.result === streakType) streak++;
      else break;
    }

    const userMessage = `<user_bet>
Description: ${description}
Odds: ${odds || 'not specified'}
Stake: $${stake}
Sport: ${sport || 'not specified'}
Bet Type: ${bet_type || 'not specified'}
</user_bet>

USER CONTEXT:
- Total bets tracked: ${bets.length}
- Average stake: $${avgStake.toFixed(0)}
- Bets placed today: ${betsToday}
- Current streak: ${streak} ${streakType}s in a row
- Last 5 results: ${last5.join(', ') || 'no history'}
- ${sport} ROI: ${sportROI.toFixed(1)}% (${sportBets.length} bets)
- ${bet_type} ROI: ${typeROI.toFixed(1)}% (${typeBets.length} bets)
- This stake vs average: ${avgStake > 0 ? `${((stake / avgStake) * 100).toFixed(0)}% of avg` : 'N/A'}

RECENT BETS (last 20):
DATE       | SPORT  | TYPE       | DESCRIPTION                | ODDS   | STAKE  | RESULT | PROFIT
${historyLines.join('\n') || 'No bet history yet'}`;

    // Call Haiku
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      temperature: 0,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    });

    const textBlock = message.content.find((block) => block.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      return NextResponse.json({ error: 'No response from analysis engine' }, { status: 500 });
    }

    const responseText = textBlock.text.trim();

    // Parse signal
    let signal: 'green' | 'yellow' | 'red' = 'yellow';
    if (/SIGNAL:\s*GREEN/i.test(responseText)) signal = 'green';
    else if (/SIGNAL:\s*RED/i.test(responseText)) signal = 'red';
    else if (/SIGNAL:\s*YELLOW/i.test(responseText)) signal = 'yellow';

    // Strip the SIGNAL line from analysis text
    const analysis = responseText.replace(/SIGNAL:\s*\[?(GREEN|YELLOW|RED)\]?\s*/i, '').trim();

    return NextResponse.json({
      signal,
      analysis,
      recent_context: {
        last_5_results: last5,
        avg_stake: Math.round(avgStake),
        bets_today: betsToday,
      },
    });
  } catch (error) {
    console.error('Bet check error:', error);
    logErrorServer(error, { path: '/api/bet-check' });
    const message = error instanceof Error ? error.message : 'Bet check failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
