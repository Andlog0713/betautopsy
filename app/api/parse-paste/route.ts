import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { logErrorServer } from '@/lib/log-error-server';
import type { ParsedBet } from '@/types';

const SYSTEM_PROMPT = `You are a betting data parser. The user will paste raw text from a sportsbook, screenshot OCR, notes, or a spreadsheet copy-paste. Extract every bet into structured JSON.

Return a JSON object with:
{
  "bets": [...],
  "parse_notes": ["any warnings or assumptions you made"]
}

Each bet object must have these fields:
- placed_at: ISO 8601 date string (YYYY-MM-DDTHH:mm:ss). If only a date is given, use T12:00:00. If year is missing, assume the most recent occurrence.
- sport: string (e.g. "NFL", "NBA", "MLB", "NHL", "Soccer", "Tennis", "MMA", "Golf", "College Football", "College Basketball", etc.)
- league: string or null
- bet_type: one of "spread", "moneyline", "total", "prop", "parlay", "teaser", "future", "live", "other"
- description: string describing the bet (e.g. "Chiefs -3.5", "Over 45.5", "LeBron James Over 25.5 Points")
- odds: American odds as a number (e.g. -110, +150). If decimal odds given, convert: if decimal >= 2.0 then american = (decimal - 1) * 100; if decimal < 2.0 then american = -100 / (decimal - 1). Round to nearest integer.
- stake: number (dollar amount wagered)
- result: one of "win", "loss", "push", "void", "pending"
- payout: number (total amount returned including stake for wins; 0 for losses; stake for pushes)
- profit: number (payout - stake)
- sportsbook: string or null (e.g. "DraftKings", "FanDuel", "BetMGM", "Caesars")
- is_bonus_bet: boolean (true if free bet, bonus bet, or promo bet is mentioned)
- parlay_legs: number or null (number of legs if parlay, null otherwise)
- tags: string array or null
- notes: string or null

Important rules:
- If profit/payout can be calculated from odds + stake + result, calculate it even if not provided.
- For wins: if American odds > 0, profit = stake * (odds / 100); if odds < 0, profit = stake * (100 / Math.abs(odds)). Payout = stake + profit.
- For losses: profit = -stake, payout = 0.
- For pushes: profit = 0, payout = stake.
- For pending: profit = 0, payout = 0.
- Detect parlays from keywords like "parlay", "accumulator", "combo", multiple legs listed, or "+" separating selections.
- Map result synonyms: "won"/"w"/"hit"/"cashed" -> "win"; "lost"/"l"/"miss"/"missed" -> "loss"; "push"/"tie"/"draw"/"refund"/"cancelled" -> "push"; "void"/"canceled"/"no action" -> "void"; "pending"/"open"/"unsettled" -> "pending".
- Return ONLY the JSON object, no markdown fences, no explanation.`;

function normalizeOdds(odds: number): number {
  // If it looks like decimal odds (between 1.01 and 99), convert to American
  if (odds > 1 && odds < 100 && !Number.isInteger(odds)) {
    if (odds >= 2.0) {
      return Math.round((odds - 1) * 100);
    } else {
      return Math.round(-100 / (odds - 1));
    }
  }
  return Math.round(odds);
}

function normalizeResult(raw: string): ParsedBet['result'] {
  const lower = raw.toLowerCase().trim();
  if (['win', 'won', 'w', 'hit', 'cashed'].includes(lower)) return 'win';
  if (['loss', 'lost', 'l', 'miss', 'missed'].includes(lower)) return 'loss';
  if (['push', 'tie', 'draw', 'refund', 'cancelled'].includes(lower)) return 'push';
  if (['void', 'canceled', 'no action'].includes(lower)) return 'void';
  if (['pending', 'open', 'unsettled'].includes(lower)) return 'pending';
  return 'pending';
}

function calculateProfit(odds: number, stake: number, result: ParsedBet['result']): { profit: number; payout: number } {
  if (result === 'loss') return { profit: -stake, payout: 0 };
  if (result === 'push') return { profit: 0, payout: stake };
  if (result === 'pending' || result === 'void') return { profit: 0, payout: 0 };
  // win
  let profit: number;
  if (odds > 0) {
    profit = stake * (odds / 100);
  } else {
    profit = stake * (100 / Math.abs(odds));
  }
  profit = Math.round(profit * 100) / 100;
  return { profit, payout: Math.round((stake + profit) * 100) / 100 };
}

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { text, sportsbook_hint } = body as { text?: string; sportsbook_hint?: string };

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'text field is required' }, { status: 400 });
    }

    if (text.length < 30) {
      return NextResponse.json({ error: 'Text too short. Minimum 30 characters.' }, { status: 400 });
    }

    if (text.length > 100_000) {
      return NextResponse.json({ error: 'Text too long. Maximum 100,000 characters.' }, { status: 400 });
    }

    const userMessage = sportsbook_hint
      ? `Sportsbook: ${sportsbook_hint}\n\n${text}`
      : text;

    const anthropic = new Anthropic();

    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 8000,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    });

    // Extract text content from response
    const responseText = message.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('');

    // Parse JSON response
    let parsed: { bets: Record<string, unknown>[]; parse_notes?: string[] };
    try {
      // Strip markdown fences if present
      const cleaned = responseText.replace(/^```(?:json)?\s*\n?/m, '').replace(/\n?```\s*$/m, '');
      parsed = JSON.parse(cleaned);
    } catch {
      return NextResponse.json(
        { error: 'Failed to parse Claude response as JSON', raw: responseText },
        { status: 502 }
      );
    }

    if (!Array.isArray(parsed.bets)) {
      return NextResponse.json(
        { error: 'Claude response missing bets array', raw: responseText },
        { status: 502 }
      );
    }

    // Validate and normalize each bet
    const parseNotes: string[] = parsed.parse_notes ?? [];
    const validatedBets: ParsedBet[] = [];

    for (let i = 0; i < parsed.bets.length; i++) {
      const raw = parsed.bets[i];
      try {
        const odds = normalizeOdds(Number(raw.odds) || -110);
        const stake = Math.abs(Number(raw.stake) || 0);
        const result = normalizeResult(String(raw.result ?? 'pending'));

        if (stake === 0) {
          parseNotes.push(`Bet ${i + 1}: skipped, no stake amount found`);
          continue;
        }

        // Calculate profit/payout if missing or inconsistent
        let profit = Number(raw.profit) || 0;
        let payout = Number(raw.payout) || 0;
        const calculated = calculateProfit(odds, stake, result);

        // Use calculated values if raw ones are missing or clearly wrong
        if (profit === 0 && result === 'win') {
          profit = calculated.profit;
          payout = calculated.payout;
        } else if (profit === 0 && result === 'loss') {
          profit = calculated.profit;
          payout = calculated.payout;
        } else if (payout === 0 && result !== 'loss' && result !== 'pending' && result !== 'void') {
          payout = calculated.payout;
          profit = calculated.profit;
        }

        const bet: ParsedBet = {
          placed_at: String(raw.placed_at ?? new Date().toISOString()),
          sport: String(raw.sport ?? 'Unknown'),
          league: raw.league ? String(raw.league) : undefined,
          bet_type: String(raw.bet_type ?? 'other'),
          description: String(raw.description ?? ''),
          odds,
          stake,
          result,
          payout: Math.round(payout * 100) / 100,
          profit: Math.round(profit * 100) / 100,
          sportsbook: raw.sportsbook ? String(raw.sportsbook) : (sportsbook_hint ?? undefined),
          is_bonus_bet: Boolean(raw.is_bonus_bet),
          parlay_legs: raw.parlay_legs ? Number(raw.parlay_legs) : undefined,
          tags: Array.isArray(raw.tags) ? raw.tags.map(String) : undefined,
          notes: raw.notes ? String(raw.notes) : undefined,
        };

        validatedBets.push(bet);
      } catch {
        parseNotes.push(`Bet ${i + 1}: skipped due to validation error`);
      }
    }

    return NextResponse.json({
      bets: validatedBets,
      parse_notes: parseNotes,
      raw_text_length: text.length,
    });
  } catch (error) {
    console.error('Parse-paste error:', error);
    logErrorServer(error, { path: '/api/parse-paste' });
    const message = error instanceof Error ? error.message : 'Parse failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
