/**
 * COPY_SYSTEM gate for server-generated copy that ships to native (iOS).
 *
 * Native surfaces run the COPY_SYSTEM.md rules in the iOS layer. But some
 * strings are generated on the SERVER and handed straight to iOS over the
 * wire, bypassing that layer entirely — most notably the pre-bet check-in
 * `summary` and `flags[].title` / `flags[].detail`. Those strings (and the
 * upstream control-system `trigger_reason` that flows into the summary) never
 * pass through COPY_SYSTEM. This module re-implements the deterministic,
 * value-preserving subset of those rules so server copy meets the same bar
 * before it crosses the wire.
 *
 * Rules enforced at runtime (mechanical, safe to apply to any string):
 *   1. Em-dash / en-dash separators  -> sentence breaks (no dash on the wire).
 *   2. "tilt" family                 -> brand vocabulary ("chasing").
 *   3. Exclamation marks             -> periods.
 *
 * "No fabricated stats" is intentionally NOT a runtime transform: a regex
 * cannot distinguish a computed stat from an invented one, and stripping real
 * numbers would be worse than the problem. It is enforced by construction —
 * every number in check-in copy derives from the user's own bets — and locked
 * by a test that scans produced copy for fabricated-population patterns.
 * FABRICATED_POPULATION_STAT_RX is exported for that guard.
 */

// Matches fabricated population claims like "73% of bettors" / "61% of sports
// bettors". Real check-in stats ("ROI is -23% across 14 bets") never match —
// they have no "of <population>" tail. Used by tests, not at runtime.
export const FABRICATED_POPULATION_STAT_RX =
  /\b\d{1,3}(?:\.\d+)?\s*%\s+of\s+(?:bettors|sports\s+bettors|people|players|users|gamblers)\b/i;

/**
 * Routes a server-generated string through the COPY_SYSTEM gate. Idempotent
 * and digit-preserving: clean copy passes through unchanged, and no rule ever
 * introduces or alters a number.
 */
export function enforceCopySystem(text: string): string {
  if (!text) return text;
  let out = text;

  // 1. Dash separators -> sentence breaks, recapitalizing the next word.
  //    Em-dash (U+2014) is always a separator. En-dash (U+2013) is treated as
  //    a separator only between two non-digits, so numeric ranges ("5–10")
  //    survive intact.
  out = out.replace(/\s*—\s*(.)?/g, (_m, c?: string) =>
    c ? `. ${c.toUpperCase()}` : '. ',
  );
  out = out.replace(/(\D)\s*–\s*(\D)/g, (_m, p: string, c: string) =>
    `${p}. ${c.toUpperCase()}`,
  );

  // 2. No "tilt" family. Preserves leading capitalization.
  out = out.replace(/\btilt(?:ing|ed|s)?\b/gi, (m) =>
    /^[A-Z]/.test(m) ? 'Chasing' : 'chasing',
  );

  // 3. No exclamation marks.
  out = out.replace(/!/g, '.');

  // Tidy doubled sentence punctuation / whitespace the transforms can create.
  out = out.replace(/\.(?:\s*\.)+/g, '.').replace(/\s{2,}/g, ' ').trim();

  return out;
}
