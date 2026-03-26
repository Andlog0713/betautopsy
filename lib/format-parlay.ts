import type { Bet } from '@/types';

/**
 * Detect if a bet is a parlay based on bet_type or parlay_legs.
 */
function isParlay(bet: Pick<Bet, 'bet_type' | 'parlay_legs' | 'description'>): boolean {
  return bet.bet_type === 'parlay' || (bet.parlay_legs != null && bet.parlay_legs > 1);
}

/**
 * Parse parlay legs from a description string (Pikkit uses " | " separator).
 */
function parseLegs(description: string): string[] {
  const legs = description.split(' | ').map((l) => l.trim()).filter(Boolean);
  return legs.length > 1 ? legs : [description];
}

/**
 * Shorten a single leg description — extract the key info.
 * "Suwon KT Sonicboom Moneyline Suwon KT Sonicboom vs Seoul Samsung Thunders" → "Suwon KT Sonicboom ML"
 */
function shortenLeg(leg: string): string {
  // Already short enough
  if (leg.length <= 40) return leg;
  // Try to grab everything before "vs" or the second team mention
  const vsIdx = leg.indexOf(' vs ');
  if (vsIdx > 0) return leg.slice(0, vsIdx).trim();
  // Just truncate
  return leg.slice(0, 38) + '…';
}

/**
 * Full format — for bets page, upload detail. Shows each leg on its own line.
 * Returns an array of leg strings + a header.
 */
export function formatParlayFull(bet: Pick<Bet, 'bet_type' | 'parlay_legs' | 'description' | 'odds'>): {
  isParlay: boolean;
  header: string;
  legs: string[];
  oddsStr: string;
} {
  if (!isParlay(bet)) {
    return { isParlay: false, header: '', legs: [bet.description], oddsStr: '' };
  }
  const legs = parseLegs(bet.description);
  const legCount = bet.parlay_legs ?? legs.length;
  const oddsStr = bet.odds > 0 ? `+${bet.odds}` : `${bet.odds}`;
  return {
    isParlay: true,
    header: `${legCount}-Leg Parlay (${oddsStr})`,
    legs: legs.map((l) => shortenLeg(l)),
    oddsStr,
  };
}

/**
 * Compact format — for email, share cards, report summaries.
 * Returns a single string like "3-Leg: Chiefs ML, Celtics -4.5, Lakers ML"
 * If too many legs, shows first 2 + "and X more"
 */
export function formatParlayCompact(bet: Pick<Bet, 'bet_type' | 'parlay_legs' | 'description' | 'odds'>, maxChars = 80): string {
  if (!isParlay(bet)) {
    return bet.description.length > maxChars ? bet.description.slice(0, maxChars - 1) + '…' : bet.description;
  }
  const legs = parseLegs(bet.description);
  const legCount = bet.parlay_legs ?? legs.length;
  const shortened = legs.map(shortenLeg);

  // Try showing all legs
  const prefix = `${legCount}-Leg: `;
  const allLegs = prefix + shortened.join(', ');
  if (allLegs.length <= maxChars) return allLegs;

  // Show first 2 + "and X more"
  const first2 = prefix + shortened.slice(0, 2).join(', ');
  const remaining = legCount - 2;
  if (remaining > 0) return `${first2}, +${remaining} more`;
  return first2;
}

/**
 * Claude format — for the bet table sent to the AI engine.
 * Returns "[3L PARLAY] Chiefs ML | Celtics -4.5 | Lakers ML"
 */
export function formatParlayForClaude(bet: Pick<Bet, 'bet_type' | 'parlay_legs' | 'description' | 'odds'>): string {
  if (!isParlay(bet)) return bet.description;
  const legs = parseLegs(bet.description);
  const legCount = bet.parlay_legs ?? legs.length;
  const shortened = legs.map(shortenLeg);
  return `[${legCount}L PARLAY] ${shortened.join(' | ')}`;
}

/**
 * For table display — returns description that fits in a table cell.
 * Parlays show "3-Leg Parlay" as a badge-style prefix.
 */
export function formatBetDescription(bet: Pick<Bet, 'bet_type' | 'parlay_legs' | 'description' | 'odds'>): {
  isParlay: boolean;
  label: string;
  legs: string[];
} {
  if (!isParlay(bet)) {
    return { isParlay: false, label: bet.description, legs: [] };
  }
  const legs = parseLegs(bet.description).map(shortenLeg);
  const legCount = bet.parlay_legs ?? legs.length;
  return {
    isParlay: true,
    label: `${legCount}-Leg Parlay`,
    legs,
  };
}
