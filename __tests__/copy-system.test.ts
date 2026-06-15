import { describe, it, expect } from 'vitest';
import { enforceCopySystem, FABRICATED_POPULATION_STAT_RX } from '@/lib/copy-system';
import { scoreCheckIn } from '@/lib/check-in-scorer';
import type { PreBetCheckInRequest } from '@/types';

// ── Pure gate ─────────────────────────────────────────────────────────

describe('enforceCopySystem', () => {
  it('replaces em-dash separators with sentence breaks and recapitalizes', () => {
    expect(enforceCopySystem('Pause now—you just lost')).toBe('Pause now. You just lost');
    expect(enforceCopySystem('Pause now — you just lost')).toBe('Pause now. You just lost');
    expect(enforceCopySystem('Stop here—')).toBe('Stop here.');
  });

  it('replaces en-dash separators between non-digits but preserves numeric ranges', () => {
    expect(enforceCopySystem('Heated session – you were betting big')).toBe(
      'Heated session. You were betting big',
    );
    expect(enforceCopySystem('Your ROI is -12% across 5–10 bets')).toBe(
      'Your ROI is -12% across 5–10 bets',
    );
  });

  it('strips the tilt family into brand vocabulary, preserving case', () => {
    expect(enforceCopySystem('You are tilting again')).toBe('You are chasing again');
    expect(enforceCopySystem('Tilt is the problem')).toBe('Chasing is the problem');
    expect(enforceCopySystem('You tilted hard')).toBe('You chasing hard');
    // word-boundary: does not touch substrings like "tilted" inside other words? n/a here
    expect(enforceCopySystem('quintilts')).toBe('quintilts');
  });

  it('replaces exclamation marks with periods', () => {
    expect(enforceCopySystem('Stop now!')).toBe('Stop now.');
    expect(enforceCopySystem('Wait! Reset!')).toBe('Wait. Reset.');
  });

  it('is idempotent and a no-op on already-clean copy', () => {
    const clean = 'Your ROI between 11pm and 4am is -23% across 14 bets.';
    expect(enforceCopySystem(clean)).toBe(clean);
    const dirty = 'You are tilting—stop now!';
    const once = enforceCopySystem(dirty);
    expect(enforceCopySystem(once)).toBe(once);
  });

  it('never introduces or alters a number', () => {
    const cases = [
      'This stake is 3.5x your rolling median of $120.',
      'Your last bet was a $250 loss 12 minutes ago.',
      'Your parlay ROI is -18% across 7 bets. Straight bets in NBA are 4%.',
    ];
    for (const c of cases) {
      const out = enforceCopySystem(c);
      expect(out.replace(/\D/g, '')).toBe(c.replace(/\D/g, ''));
    }
  });

  it('handles empty / falsy input', () => {
    expect(enforceCopySystem('')).toBe('');
  });

  it('FABRICATED_POPULATION_STAT_RX flags invented population claims, not real stats', () => {
    expect(FABRICATED_POPULATION_STAT_RX.test('73% of bettors chase losses')).toBe(true);
    expect(FABRICATED_POPULATION_STAT_RX.test('61% of sports bettors tilt')).toBe(true);
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

describe('scoreCheckIn copy compliance', () => {
  it('every shipped flag + summary string is COPY_SYSTEM-clean', async () => {
    const report = {
      report_json: {
        timing_analysis: { late_night_stats: { count: 14, roi: -23 } },
        biases_detected: [],
      },
    };
    const supabase = makeSupabase({ autopsy_reports: report }) as never;

    const result = await scoreCheckIn(lateNightRequest, 'user-1', supabase);

    const strings = [
      result.summary,
      ...result.flags.flatMap((f) => [f.title, f.detail]),
    ];
    expect(strings.length).toBeGreaterThan(1); // late-night flag fired + summary

    for (const s of strings) {
      expect(s).not.toMatch(/[—–]/); // no em/en dash
      expect(s).not.toMatch(/!/); // no exclamation
      expect(s).not.toMatch(/\btilt/i); // no tilt family
      expect(s).not.toMatch(FABRICATED_POPULATION_STAT_RX); // no fabricated stats
      expect(enforceCopySystem(s)).toBe(s); // gate is fixed-point on shipped copy
    }
  });

  it('cleans a dirty upstream cooldown trigger_reason embedded in the summary', async () => {
    // control-system surfaces the raw DB cooldown.trigger_reason as the
    // check-in cooldown summary, which computeSummary embeds. A reason that
    // bypasses COPY_SYSTEM would otherwise reach iOS verbatim.
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
    expect(result.summary).not.toMatch(/[—–]/);
    expect(result.summary).not.toMatch(/!/);
    expect(result.summary).not.toMatch(/\btilt/i);
    expect(result.summary).toContain('chasing');
  });
});
