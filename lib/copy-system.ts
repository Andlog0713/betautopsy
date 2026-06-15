/**
 * Mechanical normalizer for UNTRUSTED dynamic text the server embeds in copy
 * shipped to native (iOS).
 *
 * The one such value today is the control-system cooldown `trigger_reason`.
 * It originates at a manual-cooldown write site (POST /api/control-system,
 * action `start_cooldown`) that accepts client-supplied free text with no
 * whitelist, so it can carry em/en-dashes, exclamation marks, and off-brand
 * vocabulary a user typed. control-system surfaces it verbatim as
 * `cooldown.summary`, which the check-in scorer interpolates into `summary`
 * and ships over the wire — bypassing the iOS COPY_SYSTEM layer.
 *
 * This applies ONLY the deterministic, value-preserving subset of COPY_SYSTEM
 * that is safe to run on arbitrary text:
 *   1. Em-dash / en-dash separators -> sentence breaks (no dash on the wire).
 *   2. Exclamation marks            -> periods.
 *
 * It deliberately does NOT substitute vocabulary. The old tilt->chasing swap
 * was wrong on both ends: rewriting words a user typed corrupts the record of
 * what they actually wrote, and the brand-vocabulary rule governs
 * BetAutopsy-authored copy, not user input. Author-controlled scorer strings
 * (flag titles/details, computeSummary's own branches) are kept clean at
 * source and guarded by a CI test (see __tests__/copy-system.test.ts), never
 * mutated at runtime.
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
 * Mechanically normalizes a piece of untrusted dynamic text before it crosses
 * the wire. Idempotent and digit-preserving: clean copy passes through
 * unchanged, and no rule ever introduces, alters, or substitutes a word or a
 * number — only dash separators and exclamation marks are rewritten.
 */
export function normalizeWireText(text: string): string {
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

  // 2. No exclamation marks.
  out = out.replace(/!/g, '.');

  // Tidy doubled sentence punctuation / whitespace the transforms can create.
  out = out.replace(/\.(?:\s*\.)+/g, '.').replace(/\s{2,}/g, ' ').trim();

  return out;
}
