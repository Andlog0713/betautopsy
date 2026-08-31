// UTC-accessor helpers for bet-timestamp date/time math.
//
// Qualified bet instants (non-null Bet.placed_at values) are stored as UTC
// ISO strings. Reading them with Date.prototype's LOCAL accessors
// silently reinterprets that UTC instant in the RUNNING PROCESS's local
// timezone - correct only by accident when the process happens to run in
// UTC (Vercel's serverless default, but not guaranteed: a local dev
// machine, `vitest` on a laptop set to a non-UTC zone, or a future infra
// change can all diverge silently, shifting a bet across a day boundary
// or into a different hour bucket with no visible error). These wrappers
// make the UTC intent explicit and give every call site the same, single,
// correct accessor to reach for instead of each one needing to remember
// "always .getUTCX, never .getX" ad hoc.

export function getUTCHour(dateInput: string | Date): number {
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  return d.getUTCHours();
}

export function getUTCMinute(dateInput: string | Date): number {
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  return d.getUTCMinutes();
}

// 0 = Sunday, 6 = Saturday - matches Date.prototype.getDay's convention,
// just read from the UTC calendar instead of the process's local one.
export function getUTCDayOfWeek(dateInput: string | Date): number {
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  return d.getUTCDay();
}

// True when a qualified instant falls exactly at midnight UTC. This says
// nothing about source provenance: a genuine midnight value remains real
// clock data, while date-only rows now have placed_at = null. New analysis
// should use the provenance helpers in temporal-provenance.ts.
export function isMidnightUTC(dateInput: string | Date): boolean {
  return getUTCHour(dateInput) === 0 && getUTCMinute(dateInput) === 0;
}

// toLocaleDateString/toLocaleTimeString format in the RUNNING PROCESS's
// local timezone by default, same class of bug as the accessors above -
// explicit `timeZone: 'UTC'` makes the display deterministic regardless of
// runtime. Signatures match the call sites this replaces (month/day only
// vs full date; always 12-hour minute-precision time).
export function formatUTCMonthDay(dateInput: string | Date): string {
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

export function formatUTCDate(dateInput: string | Date): string {
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });
}

export function formatUTCTime(dateInput: string | Date): string {
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'UTC' });
}
