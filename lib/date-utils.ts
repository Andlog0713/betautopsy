// UTC-accessor helpers for bet-timestamp date/time math.
//
// Bet timestamps (Bet.placed_at) are stored as UTC ISO strings. Reading
// them with Date.prototype's LOCAL accessors (getHours/getDay/getMinutes)
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

// True when the timestamp is exactly midnight (00:00 UTC) - the signature
// of a date-only source value (no real time component) that got coerced
// to a Date at parse time, not a genuine midnight bet placement. Used to
// gate has_time_data wherever a real recorded clock time matters
// (hour-of-day analysis). Day-of-week does NOT need this gate: the date
// portion is known and valid regardless of whether the time is real.
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
