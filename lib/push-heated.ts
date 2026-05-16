import type { AutopsyAnalysis, DetectedSession } from '@/types';

// Pure helpers for heated-session push selection. Kept side-effect free
// so /api/analyze can call them inline and __tests__ can exercise the
// shape decisions without a network or DB. All side effects (Supabase
// reads/writes, APNs fetch) happen at the caller.

// Engine writes session.date as either ISO ("2025-11-03") OR human
// ("Nov 26, 2023") depending on report vintage. Both must round-trip
// to YYYY-MM-DD so the idempotency ref_id is stable across re-analyses.
export function normalizeSessionDate(raw: string | undefined | null): string | null {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // ISO prefix: "2025-11-03" or "2025-11-03T..." — accept the date part.
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(trimmed);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    return `${y}-${m}-${d}`;
  }

  // Human format: "Nov 26, 2023". Date.parse handles this on every
  // supported V8; we read UTC components to avoid TZ drift.
  const ms = Date.parse(trimmed);
  if (Number.isNaN(ms)) return null;
  const dt = new Date(ms);
  const y = dt.getUTCFullYear();
  const m = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const d = String(dt.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Composite idempotency key. session.id is a per-report sequence
// ("SESSION-004") that is NOT stable across analyses — re-running the
// same dataset reuses the same SESSION-N ids for different real-world
// sessions. The real-world session moment is (date, startTime).
export function composeRefId(session: DetectedSession): string | null {
  const iso = normalizeSessionDate(session.date);
  if (!iso) return null;
  if (!session.startTime || typeof session.startTime !== 'string') return null;
  return `${iso}:${session.startTime}`;
}

// 14-day freshness window from NOW (not report generation date). A user
// who uploads a 2-year-old CSV gets ZERO push notifications: their
// heated sessions all fail this filter. A small negative tolerance
// catches clock skew on future-dated session strings.
const FRESHNESS_WINDOW_DAYS = 14;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function isSessionFresh(
  session: DetectedSession,
  now: number = Date.now()
): boolean {
  const iso = normalizeSessionDate(session.date);
  if (!iso) return false;
  const sessionMs = Date.parse(`${iso}T00:00:00Z`);
  if (Number.isNaN(sessionMs)) return false;
  const ageDays = (now - sessionMs) / MS_PER_DAY;
  return ageDays >= -1 && ageDays <= FRESHNESS_WINDOW_DAYS;
}

export interface HeatedPushCopy {
  title: string;
  body: string;
}

// Body copy per locked template. lateNight conjunction adds " night"
// to weekday when the session crossed into late-night territory. All
// numeric fields read directly from the engine (session.bets, NOT
// betIndices.length, since the engine canonicalizes the count itself).
export function buildHeatedCopy(session: DetectedSession): HeatedPushCopy {
  const weekday = (session.dayOfWeek && session.dayOfWeek.trim()) || 'Recent';
  const dayPhrase = session.lateNight ? `${weekday} night` : weekday;
  const betCount = Math.max(0, Math.floor(session.bets ?? 0));
  const durationHours = Math.max(1, Math.round((session.durationMinutes ?? 0) / 60));
  return {
    title: 'Heated session detected',
    body: `We caught a heated session. ${dayPhrase}, ${betCount} bets in ${durationHours}h. Tap to see the autopsy.`,
  };
}

// One push per analyze run. Selects the MOST RECENT heated session
// within the freshness window. Ties broken by later startTime. Returns
// null if nothing qualifies — caller skips the push entirely.
export function pickHeatedSessionForPush(
  analysis: AutopsyAnalysis,
  now: number = Date.now()
): DetectedSession | null {
  const sessions = analysis.session_detection?.sessions ?? [];
  type Candidate = { session: DetectedSession; iso: string };
  const candidates: Candidate[] = [];
  for (const s of sessions) {
    if (!s.isHeated) continue;
    if (!isSessionFresh(s, now)) continue;
    const iso = normalizeSessionDate(s.date);
    if (!iso) continue;
    candidates.push({ session: s, iso });
  }
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => {
    if (a.iso !== b.iso) return a.iso < b.iso ? 1 : -1;
    return (b.session.startTime || '').localeCompare(a.session.startTime || '');
  });
  return candidates[0].session;
}
