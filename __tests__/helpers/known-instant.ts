import { parseSourcedTimestamp } from '@/lib/temporal-provenance';
import type { Bet } from '@/types';

/**
 * Test-fixture assertion that a supplied ISO timestamp is the source value,
 * not a legacy normalized value with unknown provenance.
 */
export function markFixtureTimestampAsSourced<T extends Bet>(bet: T): T {
  if (!bet.placed_at || bet.timestamp_quality || bet.source_placed_at) return bet;
  const parsed = parseSourcedTimestamp(bet.placed_at);
  if (!parsed.value || parsed.value.timestamp_quality !== 'instant') {
    throw new Error(parsed.error ?? 'Fixture timestamp must identify an instant');
  }
  return { ...bet, ...parsed.value };
}
