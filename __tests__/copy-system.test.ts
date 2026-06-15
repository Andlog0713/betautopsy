import { describe, it, expect } from 'vitest';
import { normalizeWireText, FABRICATED_POPULATION_STAT_RX } from '@/lib/copy-system';
import { scoreCheckIn } from '@/lib/check-in-scorer';
import type { PreBetCheckInRequest } from '@/types';

// ── Pure mechanical normalizer ────────────────────────────────────────

describe('normalizeWireText', () => {
  it('replaces em-dash separators with sentence breaks and recapitalizes', () => {
    expect(normalizeWireText('Pause now—you just lost')).toBe('Pause now. You just lost');
    expect(normalizeWireText('Pause now — you just lost')).toBe('Pause now. You just lost');
    expect(normalizeWireText('Stop here—')).toBe('Stop here.');
  });

  it('replaces en-dash separators between non-digits but preserves numeric ranges', () => {
    expect(normalizeWireText('Heated session – you were betting big')).toBe(
      'Heated session. You were betting big',
    );
    expect(normalizeWireText('Your ROI is -12% across 5–10 bets')).toBe(
      'Your ROI is -12% across 5–10 bets',
    );
  });

  it('replaces exclamation marks with periods', () => {
    expect(normalizeWireText('Stop now!')).toBe('Stop now.');
    expect(normalizeWireText('Wait! Reset!')).toBe('Wait. Reset.');
  });

  it('does NOT substitute vocabulary: a word the user typed survives verbatim', () => {
    // The old tilt->chasing swap is gone. Mechanical normalization never
    // rewrites words — it would corrupt the record of what the user wrote,
    // and brand vocabulary only governs BetAutopsy-authored copy.
    expect(normalizeWireText('You are tilting again')).toBe('You are tilting again');
    expect(normalizeWireText('Tilt is the problem')).toBe('Tilt is the problem');
    // Only the dash and exclamation are touched; "tilting" is left intact.
    expect(normalizeWireText('You are tilting—stop now!')).toBe('You are tilting. Stop now.');
  });

  it('is idempotent and a no-op on already-clean copy', () => {
    const clean = 'Your ROI between 11pm and 4am is -23% across 14 bets.';
    expect(normalizeWireText(clean)).toBe(clean);
    const dirty = 'You were tilting—stop now!';
    const once = normalizeWireText(dirty);
    expect(normalizeWireText(once)).toBe(once);
  });

  it('never introduces or alters a number', () => {
    const cases = [
      'This stake is 3.5x your rolling median of $120.',
      'Your last bet was a $250 loss 12 minutes ago.',
      'Your parlay ROI is -18% across 7 bets. Straight bets in NBA are 4%.',
    ];
    for (const c of cases) {
      const out = normalizeWireText(c);
      expect(out.replace(/\D/g, '')).toBe(c.replace(/\D/g, ''));
    }
  });

  it('handles empty / falsy input', () => {
    expect(normalizeWireText('')).toBe('');
  });

  it('FABRICATED_POPULATION_STAT_RX flags invented population claims, not real stats', () => {
    expect(FABRICATED_POPULATION_STAT_RX.test('73% of bettors chase losses')).toBe(true);
    expect(FABRICATED_POPULATION_STAT_RX.test('61% of sports bettors chase')).toBe(true);
    expect(FABRICATED_POPULATION_STAT_RX.test('Your ROI is -23% across 14 bets')).toBe(false);
    expect(FABRICATED_POPULATION_STAT_RX.test('This stake is 3.5x your median')).toBe(false);
  });
});

// ── Scorer integration ───────────────────────────────────────────────

const TABLES = [
  'autopsy_reports',
  'bets',
  'control_plans',
  'control_rules',
  'cooldowns',
  'risk_events',
] as const;
type Table = (typeof TABLES)[number];

// Minimal thenable query-builder mock covering scoreCheckIn's chains:
//   autopsy_reports/control_plans end in .maybeSingle();
//   bets/control_rules/cooldowns/risk_events are awaited after .order()/.limit().
function makeSupabase(rows: Partial<Record<Table, unknown>>) {
  return {
    from(table: string) {
      const data = rows[table as Table];
      const builder: Record<string, unknown> = {
        select: () => builder,
        eq: () => builder,
        order: () => builder,
        limit: () => builder,
        maybeSingle: () => Promise.resolve({ data: data ?? null, error: null }),
        then: (resolve: (v: { data: unknown; error: null }) => unknown) =>
          resolve({ data: data ?? [], error: null }),
      };
      return builder;
    },
  };
}

const lateNightRequest: PreBetCheckInRequest = {
  sport: 'NBA',
  stake: 50,
  odds: -110,
  betType: 'spread',
  placedAt: '2026-06-10T02:30:00.000Z',
  localHour: 2, // late-night window
};

// Fires every author-controlled flag branch in a single call: late-night
// (high, with ROI detail), above-usual-stake, recent-loss (high), post-loss
// escalation composite, and parlay-in-tough-context.
const multiFlagRequest: PreBetCheckInRequest = {
  sport: 'NBA',
  stake: 200, // 4x the $50 rolling median -> above-usual-stake fires
  odds: -110,
  betType: 'parlay',
  placedAt: '2026-06-10T02:30:00.000Z',
  localHour: 2,
};

const multiFlagReport = {
  report_json: {
    timing_analysis: { late_night_stats: { count: 14, roi: -23 } },
    biases_detected: [{ bias_name: 'Post-Loss Escalation', severity: 'high' }],
  },
};

// Most-recent-first (scoreCheckIn relies on the query order, not re-sorting).
// 12 settled bets, all $50 -> median $50. Six parlays net negative -> bad
// parlay ROI; index 0 is a loss 30 min before placedAt -> recent-loss fires.
const multiFlagBets = [
  { id: 'b0', placed_at: '2026-06-10T02:00:00.000Z', stake: 50, profit: -50, result: 'loss', sport: 'NBA', bet_type: 'parlay' },
  { id: 'b1', placed_at: '2026-06-09T23:00:00.000Z', stake: 50, profit: -50, result: 'loss', sport: 'NBA', bet_type: 'parlay' },
  { id: 'b2', placed_at: '2026-06-09T22:00:00.000Z', stake: 50, profit: 30, result: 'win', sport: 'NBA', bet_type: 'parlay' },
  { id: 'b3', placed_at: '2026-06-09T21:00:00.000Z', stake: 50, profit: -50, result: 'loss', sport: 'NBA', bet_type: 'parlay' },
  { id: 'b4', placed_at: '2026-06-09T20:00:00.000Z', stake: 50, profit: -50, result: 'loss', sport: 'NBA', bet_type: 'parlay' },
  { id: 'b5', placed_at: '2026-06-09T19:00:00.000Z', stake: 50, profit: 20, result: 'win', sport: 'NBA', bet_type: 'parlay' },
  { id: 'b6', placed_at: '2026-06-09T18:00:00.000Z', stake: 50, profit: 10, result: 'win', sport: 'NBA', bet_type: 'spread' },
  { id: 'b7', placed_at: '2026-06-09T17:00:00.000Z', stake: 50, profit: -50, result: 'loss', sport: 'NBA', bet_type: 'spread' },
  { id: 'b8', placed_at: '2026-06-09T16:00:00.000Z', stake: 50, profit: 40, result: 'win', sport: 'NBA', bet_type: 'spread' },
  { id: 'b9', placed_at: '2026-06-09T15:00:00.000Z', stake: 50, profit: -50, result: 'loss', sport: 'NBA', bet_type: 'spread' },
  { id: 'b10', placed_at: '2026-06-09T14:00:00.000Z', stake: 50, profit: 25, result: 'win', sport: 'NBA', bet_type: 'spread' },
  { id: 'b11', placed_at: '2026-06-09T13:00:00.000Z', stake: 50, profit: -50, result: 'loss', sport: 'NBA', bet_type: 'spread' },
];

const BANNED = [
  { rx: /[—–]/, label: 'em/en dash' },
  { rx: /!/, label: 'exclamation' },
  { rx: /\btilt/i, label: 'tilt family' },
];

describe('scoreCheckIn author-copy compliance', () => {
  // CI guard: author-controlled scorer strings are no longer normalized at
  // runtime, so a hand-edited string with a banned token would ship verbatim.
  // This fails the build if any produced flag/summary contains one. Fix the
  // offending source literal by hand.
  it('every shipped flag + summary string is free of banned tokens', async () => {
    const scenarios = await Promise.all([
      // Rich path: all five flag branches + the multi-flag summary branch.
      scoreCheckIn(
        multiFlagRequest,
        'user-1',
        makeSupabase({ autopsy_reports: multiFlagReport, bets: multiFlagBets }) as never,
      ),
      // No-history path: late-night fallback flag + the no-history summary.
      scoreCheckIn(lateNightRequest, 'user-2', makeSupabase({}) as never),
    ]);

    const strings = scenarios.flatMap((result) => [
      result.summary,
      ...result.flags.flatMap((f) => [f.title, f.detail]),
    ]);
    // Sanity: the rich path alone should have produced several flags.
    expect(scenarios[0].flags.length).toBeGreaterThanOrEqual(4);

    for (const s of strings) {
      for (const { rx, label } of BANNED) {
        expect(s, `banned token (${label}) in shipped scorer string: "${s}"`).not.toMatch(rx);
      }
      expect(s).not.toMatch(FABRICATED_POPULATION_STAT_RX); // no fabricated stats
    }
  });

  it('mechanically normalizes a dirty embedded cooldown trigger_reason, without rewriting vocabulary', async () => {
    // control-system surfaces the raw DB cooldown.trigger_reason as the
    // check-in cooldown summary, which computeSummary embeds. That value comes
    // from a write site accepting client-supplied free text, so it can carry
    // dashes/exclamations a user typed. We clean those mechanically but do NOT
    // substitute the user's words.
    const cooldown = {
      id: 'cd-1',
      status: 'active',
      expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      trigger_reason: 'Heated session — you were tilting!',
      trigger_type: 'heated_session',
    };
    const supabase = makeSupabase({ cooldowns: [cooldown] }) as never;

    const result = await scoreCheckIn(lateNightRequest, 'user-1', supabase);

    expect(result.summary).toContain('Cooldown active.');
    expect(result.summary).not.toMatch(/[—–]/); // dash separator normalized
    expect(result.summary).not.toMatch(/!/); // exclamation normalized
    // The user's own word is preserved verbatim (no tilt->chasing swap), and
    // the brand word is NOT injected into user vocabulary.
    expect(result.summary).toContain('tilting');
    expect(result.summary).not.toContain('chasing');
  });
});
