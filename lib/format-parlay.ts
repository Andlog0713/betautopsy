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
 * "Minas Tenis Clube Money Line Minas Tenis Clube vs Tokyo" → "Minas Tenis Clube ML"
 * "CLE Cavaliers Moneyline SA Spurs at CLE Cavaliers" → "CLE Cavaliers ML"
 */
function shortenLeg(leg: string): string {
  // Already short enough
  if (leg.length <= 30) return leg;

  // Detect bet type keywords and extract team + type
  const betTypes: [RegExp, string][] = [
    [/\bMoney\s?Line\b/i, 'ML'],
    [/\bMoneyline\b/i, 'ML'],
    [/\bSpread\b/i, 'Spread'],
    [/\bOver\b/i, 'Over'],
    [/\bUnder\b/i, 'Under'],
    [/\bTotal\b/i, 'Total'],
  ];

  for (const [regex, short] of betTypes) {
    const match = leg.match(regex);
    if (match && match.index !== undefined) {
      // Grab everything before the bet type as the team name
      let team = leg.slice(0, match.index).trim();
      // If there's a number after (spread/total), grab it
      const afterType = leg.slice(match.index + match[0].length).trim();
      const numMatch = afterType.match(/^[+-]?\d+\.?\d*/);
      const num = numMatch ? ` ${numMatch[0]}` : '';
      // Truncate team name if still too long
      if (team.length > 20) team = team.slice(0, 18) + '…';
      return `${team} ${short}${num}`;
    }
  }

  // Try to grab everything before "vs" or "at"
  const splitIdx = leg.search(/\b(vs|at)\b/i);
  if (splitIdx > 0) {
    const team = leg.slice(0, splitIdx).trim();
    return team.length > 25 ? team.slice(0, 23) + '…' : team;
  }

  // Just truncate
  return leg.slice(0, 28) + '…';
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
