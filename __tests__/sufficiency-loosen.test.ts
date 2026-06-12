import { describe, it, expect } from 'vitest';
import { applySmallSampleBiasTier, buildSufficiencyState, isLimitedSample } from '@/lib/engine/sufficiency';
import { calculateMetrics, runSnapshot } from '@/lib/autopsy-engine';
import { selectHeroSession } from '@/lib/engine/charts';
import type { Bet, SeverityTier } from '@/types';

// ── helpers ──────────────────────────────────────────────────────────

let betSeq = 0;
function makeBet(overrides: Partial<Bet> = {}): Bet {
  betSeq++;
  return {
    id: `bet-${betSeq}`,
    user_id: 'user-1',
    placed_at: '2026-03-01T17:00:00.000Z',
    sport: 'NFL',
    league: null,
    bet_type: 'spread',
    description: `Test bet ${betSeq}`,
    odds: -110,
    stake: 100,
    result: 'loss',
    payout: 0,
    profit: -100,
    sportsbook: null,
    is_bonus_bet: false,
    parlay_legs: null,
    tags: null,
    notes: null,
    upload_id: null,
    created_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

// One settled bet per day at noon — no sessions glue, no late-night noise.
function dailyBets(count: number, override: (i: number) => Partial<Bet>): Bet[] {
  betSeq = 0;
  const base = new Date('2026-01-01T12:00:00.000Z').getTime();
  return Array.from({ length: count }, (_, i) =>
    makeBet({
      placed_at: new Date(base + i * 86400000).toISOString(),
      ...override(i),
    }),
  );
}

const mixed = (i: number): Partial<Bet> =>
  i % 2 === 0
    ? { result: 'win', profit: 90, payout: 190 }
    : { result: 'loss', profit: -100, payout: 0 };

// 75 settled, 85% parlays with worse ROI than straights -> Heavy Parlay
// Tendency fires at CRITICAL pre-cap; Favorite-Heavy Lean (all -110,
// negative ROI) fires HIGH pre-cap. Uniform stakes keep Stake Volatility out.
function parlayHeavyCohort(): Bet[] {
  return dailyBets(75, (i) => {
    if (i < 64) {
      return {
        bet_type: 'parlay',
        parlay_legs: 3,
        result: i % 3 === 0 ? 'win' : 'loss',
        profit: i % 3 === 0 ? 250 : -100,
        payout: i % 3 === 0 ? 350 : 0,
        odds: -110,
      };
    }
    return mixed(i);
  });
}

// ── unit: applySmallSampleBiasTier ───────────────────────────────────

describe('applySmallSampleBiasTier', () => {
  const bias = (name: string, severity: SeverityTier, sample = 50) => ({
    bias_name: name, severity, data: 'x', sample_size: sample,
  });

  it('band edges: 29 -> empty, 30 -> filtered, 100 -> untouched', () => {
    const input = [bias('Stake Volatility', 'critical'), bias('Category Concentration Leak', 'critical')];
    expect(applySmallSampleBiasTier(input, 29)).toEqual([]);
    expect(applySmallSampleBiasTier(input, 30).map(b => b.bias_name)).toEqual(['Stake Volatility']);
    expect(applySmallSampleBiasTier(input, 100)).toEqual(input);
  });

  it('caps severity at medium inside the band, leaves low alone', () => {
    const out = applySmallSampleBiasTier(
      [bias('Heavy Parlay Tendency', 'critical'), bias('Favorite-Heavy Lean', 'high'), bias('Post-Loss Escalation', 'low')],
      60,
    );
    expect(out.map(b => b.severity)).toEqual(['medium', 'medium', 'low']);
  });

  it('drops allowlisted biases whose own sample is under 10 in the band', () => {
    const out = applySmallSampleBiasTier(
      [bias('Post-Loss Escalation', 'high', 7), bias('Favorite-Heavy Lean', 'high', 40)],
      60,
    );
    expect(out.map(b => b.bias_name)).toEqual(['Favorite-Heavy Lean']);
  });

  it('never admits non-allowlist detectors in the band', () => {
    const out = applySmallSampleBiasTier(
      [
        bias('Category Concentration Leak', 'critical'),
        bias('High-Volume Category Leak', 'critical'),
        bias('Late-Night Betting', 'high'),
        bias('Sustained Late-Night Concentration', 'high'),
        bias('Emotional Session Pattern', 'high'),
        bias('Chronic Emotional Drag', 'high'),
      ],
      75,
    );
    expect(out).toEqual([]);
  });
});

// ── unit: buildSufficiencyState ──────────────────────────────────────

describe('buildSufficiencyState', () => {
  it('maps tiers + gated surfaces at each floor', () => {
    const building = buildSufficiencyState(28, 10);
    expect(building.tier).toBe('building');
    expect(building.gated).toEqual(expect.arrayContaining([
      'biases', 'biases_full_tier', 'strategic_leaks', 'behavioral_patterns',
      'enhanced_tilt', 'betiq', 'betting_archetype', 'emotion_score',
      'discipline_score', 'heated_aggregates',
    ]));

    const limited = buildSufficiencyState(75, 25);
    expect(limited.tier).toBe('limited');
    expect(limited.gated).not.toContain('biases');
    expect(limited.gated).toContain('biases_full_tier');
    expect(limited.gated).toContain('strategic_leaks');
    expect(limited.gated).not.toContain('betiq');          // >= 50
    expect(limited.gated).not.toContain('heated_aggregates'); // >= 20 sessions

    const full = buildSufficiencyState(150, 25);
    expect(full.tier).toBe('full');
    expect(full.gated).toEqual([]);
    expect(full.settledBets).toBe(150);
  });

  it('isLimitedSample matches the band', () => {
    expect(isLimitedSample(29)).toBe(false);
    expect(isLimitedSample(30)).toBe(true);
    expect(isLimitedSample(99)).toBe(true);
    expect(isLimitedSample(100)).toBe(false);
  });
});

// ── personas through the engine ──────────────────────────────────────

describe('persona: 28 settled (building)', () => {
  it('no biases, but sufficiency says why', async () => {
    const { analysis } = await runSnapshot(dailyBets(28, mixed));
    expect(analysis.biases_detected).toEqual([]);
    expect(analysis.sufficiency?.tier).toBe('building');
    expect(analysis.sufficiency?.settledBets).toBe(28);
    expect(analysis.sufficiency?.gated).toContain('biases');
    expect(analysis.recommendations).toEqual([]);
  });
});

describe('persona: 75 settled (limited)', () => {
  it('allowlist biases fire capped at medium with forced low confidence; paywall counts them', async () => {
    const { analysis } = await runSnapshot(parlayHeavyCohort());
    expect(analysis.sufficiency?.tier).toBe('limited');
    expect(analysis.biases_detected.length).toBeGreaterThan(0);
    const names = analysis.biases_detected.map(b => b.bias_name);
    expect(names).toContain('Heavy Parlay Tendency');
    for (const b of analysis.biases_detected) {
      expect(['low', 'medium']).toContain(b.severity);
      expect(b.confidence).toBe('low');
    }
    // the small-sample experience: teaser + paywall + recommendations light up
    expect(analysis._snapshot_counts?.total_biases).toBeGreaterThan(0);
    expect(analysis._snapshot_teaser?.biasNames.length).toBeGreaterThan(0);
    expect(analysis.recommendations.length).toBeGreaterThanOrEqual(1);
  });

  it('category detectors never fire in the band even on a deeply negative category', async () => {
    // 40 NBA prop wipeout + 35 mixed NFL: Category Concentration would fire
    // at full tier (n>=10, roi<=-20, dollar share) but must stay out at 75.
    const bets = dailyBets(75, (i) =>
      i < 40
        ? { sport: 'NBA', bet_type: 'prop', result: 'loss', profit: -100, payout: 0 }
        : mixed(i),
    );
    const { analysis } = await runSnapshot(bets);
    const names = analysis.biases_detected.map(b => b.bias_name);
    expect(names).not.toContain('Category Concentration Leak');
    expect(names).not.toContain('High-Volume Category Leak');
  });

  it('snapshot dollar scrub still applies to small-sample bias evidence', async () => {
    // Wild stake swings -> Stake Volatility fires in band; its data string
    // carries dollars ("Bet sizes range from $X to $Y") that snapshot
    // evidence must scrub.
    const bets = dailyBets(75, (i) => ({
      ...mixed(i),
      stake: i % 10 === 0 ? 2000 : 10,
      profit: (i % 2 === 0 ? 0.9 : -1) * (i % 10 === 0 ? 2000 : 10),
    }));
    const { analysis } = await runSnapshot(bets);
    const sv = analysis.biases_detected.find(b => b.bias_name === 'Stake Volatility');
    expect(sv).toBeDefined();
    if (sv?.evidence_visibility === 'visible') {
      // scrubDollarsInSentence replaces values with the $••• blur token —
      // no real dollar digits may survive.
      expect(sv.evidence).not.toMatch(/\$\d/);
      expect(sv.evidence).toContain('$•••');
    }
  });
});

describe('persona: 150 settled (full)', () => {
  it('severities uncapped, confidence not forced, gated empty', async () => {
    const bets = dailyBets(150, (i) => ({
      ...mixed(i),
      stake: i % 15 === 0 ? 2000 : 10,
      profit: (i % 2 === 0 ? 0.9 : -1) * (i % 15 === 0 ? 2000 : 10),
    }));
    const { analysis } = await runSnapshot(bets);
    expect(analysis.sufficiency?.tier).toBe('full');
    expect(analysis.sufficiency?.gated).toEqual([]);
    const sv = analysis.biases_detected.find(b => b.bias_name === 'Stake Volatility');
    expect(sv).toBeDefined();
    expect(sv!.severity).toBe('critical');       // uncapped
    expect(sv!.confidence).toBe('high');         // n=150, not forced low
  });
});

// ── T8 hero parity regression ────────────────────────────────────────

describe('hero-session parity (T8)', () => {
  it('snapshot silhouette and selectHeroSession agree on a small cohort', async () => {
    // A 12-bet chase session (heated by construction) + calm filler.
    betSeq = 0;
    const base = new Date('2026-02-01T17:00:00.000Z').getTime();
    const stakes = [50, 70, 95, 120, 150, 60, 85, 115, 145, 180, 220, 260];
    const session = stakes.map((stake, i) =>
      makeBet({
        placed_at: new Date(base + i * 10 * 60000).toISOString(),
        stake,
        result: i === 5 ? 'win' : 'loss',
        profit: i === 5 ? Math.round(stake * 0.91) : -stake,
        payout: i === 5 ? stake * 2 : 0,
      }),
    );
    const filler = Array.from({ length: 20 }, (_, i) =>
      makeBet({
        placed_at: new Date(base + (i + 2) * 86400000).toISOString(),
        ...mixed(i),
      }),
    );
    const bets = [...session, ...filler];

    const metrics = calculateMetrics(bets);
    const hero = selectHeroSession(metrics.sessionDetection);
    expect(hero).not.toBeNull();

    const { analysis } = await runSnapshot(bets);
    expect(analysis._snapshot_teaser?.worstSessionDate).toBe(hero!.date);
  });
});
