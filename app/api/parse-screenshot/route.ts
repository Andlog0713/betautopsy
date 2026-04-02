import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import Anthropic from '@anthropic-ai/sdk';
import { logErrorServer } from '@/lib/log-error-server';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Multiple images may take longer

const PARSE_SYSTEM_PROMPT = `You are a data extraction engine for BetAutopsy. Extract structured sports bet data from screenshots of sportsbook apps and websites.

The screenshots will show bet slips, settled bet history pages, or bet confirmation screens. A single screenshot may contain MULTIPLE bets (e.g., a settled bets history page showing 10-30 bets).

EXTRACTION RULES:
1. Extract ALL settled/completed bets visible in the screenshot. A screenshot of a history page may show many bets — extract every single one.
2. Skip pending, open, cashed out early, or unsettled bets.
3. Skip deposits, withdrawals, bonuses, casino games, and navigation elements.
4. For parlays: combine all leg descriptions with " + " separator. Use the OVERALL parlay odds, stake, result, and profit — not individual legs. Count the legs.
5. For same-game parlays (SGP): treat as a single parlay bet. Combine leg descriptions.
6. Profit calculation: For wins, profit = (payout - stake). For losses, profit = -stake. For pushes, profit = 0.
7. If you can identify the sportsbook from logos, colors, or branding (DraftKings blue, FanDuel blue/navy, BetMGM gold, Caesars green, theScore Bet, Fanatics, bet365, BetRivers), include it.
8. Infer sport from team/player names: NBA teams → NBA, NFL teams → NFL, MLB teams → MLB, NHL teams → NHL, soccer → Soccer, UFC/MMA → MMA, PGA → Golf, ATP/WTA → Tennis.
9. Infer bet_type: spreads have +/- point numbers, totals have over/under, moneylines are straight wins, props mention player stats, parlays have multiple legs, futures are season-long.
10. Read dates carefully from the screenshot. Use YYYY-MM-DD format.
11. Read odds carefully — they may be in American (-110, +150) or decimal (1.91, 2.50) format.
12. If text is partially cut off or blurry, make your best guess and note it in parse_notes.

RESPOND WITH ONLY valid JSON, no markdown fences:
{
  "bets": [
    {
      "date": "2025-01-05",
      "sport": "NFL",
      "bet_type": "spread",
      "description": "Chiefs -3.5",
      "odds": -110,
      "stake": 100,
      "result": "win",
      "profit": 90.91,
      "sportsbook": "DraftKings",
      "parlay_legs": null
    }
  ],
  "parse_notes": ["Extracted 12 bets from settled history page", "1 bet partially cut off at bottom — skipped"]
}

If no bets found: {"bets": [], "parse_notes": ["No settled bet data found in this screenshot. Make sure the screenshot shows your Settled/History page, not Open Bets."]}`;

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No screenshots provided' }, { status: 400 });
    }

    if (files.length > 10) {
      return NextResponse.json({ error: 'Maximum 10 screenshots per upload. Upload in batches.' }, { status: 400 });
    }

    // Validate files
    const maxSize = 10 * 1024 * 1024; // 10MB per image
    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        return NextResponse.json({ error: `${file.name} is not an image file.` }, { status: 400 });
      }
      if (file.size > maxSize) {
        return NextResponse.json({ error: `${file.name} is too large (max 10MB per image).` }, { status: 400 });
      }
    }

    // Convert all images to base64
    const imageContents: Anthropic.ImageBlockParam[] = [];
    for (const file of files) {
      const buffer = await file.arrayBuffer();
      const base64 = Buffer.from(buffer).toString('base64');
      const mediaType = file.type as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
      imageContents.push({
        type: 'image',
        source: { type: 'base64', media_type: mediaType, data: base64 },
      });
    }

    // Build message with all images
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 16000, // Higher limit for multiple screenshots with many bets
      system: PARSE_SYSTEM_PROMPT,
      messages: [{
        role: 'user',
        content: [
          ...imageContents,
          {
            type: 'text',
            text: files.length > 1
              ? `Extract ALL settled bets from these ${files.length} screenshots. Each screenshot may contain multiple bets. Combine all bets into a single response.`
              : 'Extract ALL settled bets from this screenshot. It may contain multiple bets.',
          },
        ],
      }],
    });

    const responseText = response.content
      .filter(block => block.type === 'text')
      .map(block => block.text)
      .join('');

    const cleaned = responseText
      .replace(/```json\s*/g, '')
      .replace(/```\s*/g, '')
      .trim();

    let parsed: { bets: Record<string, unknown>[]; parse_notes: string[] };
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      console.error('Failed to parse Claude response:', cleaned.substring(0, 500));
      return NextResponse.json(
        { error: "Couldn't read the screenshot. Try a clearer image or crop to just the bet history." },
        { status: 422 }
      );
    }

    if (!parsed.bets || !Array.isArray(parsed.bets)) {
      return NextResponse.json(
        { error: "Couldn't extract bets from the screenshot. Make sure it shows settled/completed bets." },
        { status: 422 }
      );
    }

    // Validate and normalize each bet (same logic as parse-paste)
    const validBets = [];
    const notes = parsed.parse_notes || [];

    for (const b of parsed.bets) {
      if (!b.date || !b.description || b.odds === undefined || b.stake === undefined || !b.result) continue;

      let odds = Number(b.odds);
      if (!isNaN(odds) && odds > 1 && odds < 20 && !Number.isInteger(odds)) {
        odds = odds >= 2.0 ? Math.round((odds - 1) * 100) : Math.round(-100 / (odds - 1));
      }

      const resultMap: Record<string, string> = {
        win: 'win', won: 'win', w: 'win', hit: 'win',
        loss: 'loss', lost: 'loss', l: 'loss', miss: 'loss',
        push: 'push', draw: 'push', tie: 'push',
        void: 'void', voided: 'void', cancelled: 'void', canceled: 'void',
      };
      const result = resultMap[String(b.result).toLowerCase().trim()] || String(b.result);
      if (!['win', 'loss', 'push', 'void'].includes(result)) continue;

      const stake = Math.abs(Number(b.stake));
      if (isNaN(stake) || stake <= 0) continue;
      if (isNaN(odds)) continue;

      let profit = Number(b.profit);
      if (isNaN(profit)) {
        if (result === 'win') {
          profit = odds > 0 ? stake * (odds / 100) : stake * (100 / Math.abs(odds));
        } else if (result === 'loss') {
          profit = -stake;
        } else {
          profit = 0;
        }
      }

      let date = String(b.date);
      try {
        const d = new Date(date);
        if (!isNaN(d.getTime())) date = d.toISOString().split('T')[0];
      } catch { /* keep original */ }

      validBets.push({
        placed_at: date,
        sport: String(b.sport || 'Other'),
        bet_type: String(b.bet_type || 'other'),
        description: String(b.description).substring(0, 500),
        odds,
        stake: Number(stake.toFixed(2)),
        result,
        payout: result === 'win' ? Number((stake + profit).toFixed(2)) : result === 'push' ? stake : 0,
        profit: Number(profit.toFixed(2)),
        sportsbook: b.sportsbook ? String(b.sportsbook) : null,
        parlay_legs: b.parlay_legs ? Number(b.parlay_legs) : null,
        is_bonus_bet: false,
        league: null,
      });
    }

    return NextResponse.json({
      bets: validBets,
      parse_notes: notes,
      screenshot_count: files.length,
    });

  } catch (error) {
    console.error('Parse-screenshot error:', error);
    logErrorServer(error, { path: '/api/parse-screenshot' });
    return NextResponse.json({ error: 'Failed to process screenshots' }, { status: 500 });
  }
}
