import type { AutopsyAnalysis, Bet, ParsedBet, TimestampQuality } from '@/types';

export interface SourcedTimestamp {
  placed_at: string | null;
  source_placed_at: string;
  placed_date: string;
  placed_time: string | null;
  source_timezone: string | null;
  timestamp_quality: Exclude<TimestampQuality, 'legacy_unknown'>;
}

export type SourcedTimestampResult =
  | { value: SourcedTimestamp; error: null }
  | { value: null; error: string };

type TemporalFieldsLike = Pick<
  Bet,
  | 'placed_at'
  | 'source_placed_at'
  | 'placed_date'
  | 'placed_time'
  | 'source_timezone'
  | 'timestamp_quality'
  | 'recorded_date'
>;
type TemporalBetLike = TemporalFieldsLike & Pick<Bet, 'id'>;
type TemporalSequenceLike = TemporalBetLike & Partial<Pick<Bet, 'upload_id' | 'sportsbook'>>;

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const US_DATE = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
const ISO_DATETIME = /^(\d{4})-(\d{2})-(\d{2})[T\s](\d{1,2}):(\d{2})(?::(\d{2})(\.\d{1,9})?)?\s*(AM|PM)?\s*(Z|UTC|GMT|[+-]\d{2}(?::?\d{2})?)?$/i;
const US_DATETIME = /^(\d{1,2})\/(\d{1,2})\/(\d{4})[T\s](\d{1,2}):(\d{2})(?::(\d{2})(\.\d{1,9})?)?\s*(AM|PM)?\s*(Z|UTC|GMT|[+-]\d{2}(?::?\d{2})?)?$/i;
const LOCAL_TIME_BEHAVIOR_CLAIM = /\b(?:late[\s-]?night|overnight|midnight|dawn|morning|afternoon|evening|early[\s-]?morning|\d{1,2}(?::\d{2})?\s*(?:a\.?m\.?|p\.?m\.?))\b/i;
const UNPROVABLE_RESULT_SEQUENCE_CLAIM = /(?:\b(?:after|follow(?:ing|ed|s)?)\s+(?:(?:a|an|the|your)\s+)?(?:loss(?:es)?|win(?:s)?|losing|winning)\b|\bpost[\s-]?loss\b|\b(?:loss(?:es)?|win(?:s)?|result)\s+(?:caused|triggered|drove|made|pushed|led)\b|\b(?:loss(?:es)?|win(?:s)?)\s+(?:create|creates|created|cause|causes|caused|trigger|triggers|triggered)\b|\b(?:in response to|because of)\s+(?:(?:a|an|the|your)\s+)?(?:loss(?:es)?|win(?:s)?)\b)/i;

function pad2(value: number | string): string {
  return String(value).padStart(2, '0');
}

function daysInMonth(year: number, month: number): number {
  if (month === 2) {
    const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
    return leap ? 29 : 28;
  }
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

function validDate(year: number, month: number, day: number): boolean {
  return year >= 1900
    && year <= 2200
    && month >= 1
    && month <= 12
    && day >= 1
    && day <= daysInMonth(year, month);
}

function validTime(hour: number, minute: number, second: number): boolean {
  return hour >= 0 && hour <= 23
    && minute >= 0 && minute <= 59
    && second >= 0 && second <= 59;
}

function normalizeTimezone(raw: string | undefined): string | null {
  if (!raw) return null;
  const upper = raw.toUpperCase();
  if (upper === 'Z') return 'Z';
  if (upper === 'UTC' || upper === 'GMT') return upper;

  const match = /^([+-])(\d{2})(?::?(\d{2}))?$/.exec(raw);
  if (!match) return null;
  const hours = Number(match[2]);
  const minutes = Number(match[3] ?? 0);
  if (hours > 14 || minutes > 59 || (hours === 14 && minutes !== 0)) return null;
  return `${match[1]}${pad2(hours)}:${pad2(minutes)}`;
}

function normalizeHour(hour: number, meridiem?: string): number | null {
  if (!meridiem) return hour;
  if (hour < 1 || hour > 12) return null;
  if (meridiem.toUpperCase() === 'AM') return hour === 12 ? 0 : hour;
  return hour === 12 ? 12 : hour + 12;
}

function buildTimestamp(params: {
  raw: string;
  year: number;
  month: number;
  day: number;
  hour?: number;
  minute?: number;
  second?: number;
  fraction?: string;
  timezone?: string;
}): SourcedTimestampResult {
  const { raw, year, month, day } = params;
  if (!validDate(year, month, day)) {
    return { value: null, error: `Timestamp "${raw}" has an invalid calendar date` };
  }

  const placedDate = `${year}-${pad2(month)}-${pad2(day)}`;
  if (params.hour === undefined) {
    return {
      value: {
        placed_at: null,
        source_placed_at: raw,
        placed_date: placedDate,
        placed_time: null,
        source_timezone: null,
        timestamp_quality: 'date_only',
      },
      error: null,
    };
  }

  const hour = params.hour;
  const minute = params.minute ?? 0;
  const second = params.second ?? 0;
  if (!validTime(hour, minute, second)) {
    return { value: null, error: `Timestamp "${raw}" has an invalid clock time` };
  }

  const fraction = params.fraction ?? '';
  const placedTime = `${pad2(hour)}:${pad2(minute)}:${pad2(second)}${fraction}`;
  const sourceTimezone = normalizeTimezone(params.timezone);
  if (params.timezone && !sourceTimezone) {
    return { value: null, error: `Timestamp "${raw}" has an invalid timezone or UTC offset` };
  }

  if (!sourceTimezone) {
    return {
      value: {
        placed_at: null,
        source_placed_at: raw,
        placed_date: placedDate,
        placed_time: placedTime,
        source_timezone: null,
        timestamp_quality: 'local_datetime',
      },
      error: null,
    };
  }

  const normalizedZone = sourceTimezone === 'UTC' || sourceTimezone === 'GMT'
    ? 'Z'
    : sourceTimezone;
  const qualified = `${placedDate}T${placedTime}${normalizedZone}`;
  const instant = new Date(qualified);
  if (Number.isNaN(instant.getTime())) {
    return { value: null, error: `Could not parse timestamp "${raw}"` };
  }

  return {
    value: {
      placed_at: instant.toISOString(),
      source_placed_at: raw,
      placed_date: placedDate,
      placed_time: placedTime,
      source_timezone: sourceTimezone,
      timestamp_quality: 'instant',
    },
    error: null,
  };
}

/**
 * Parse exactly the temporal facts present in a source value. A missing clock
 * or timezone remains missing. Only a fully qualified timestamp becomes an
 * instant.
 */
export function parseSourcedTimestamp(rawValue: unknown): SourcedTimestampResult {
  if (typeof rawValue !== 'string' || rawValue.trim().length === 0) {
    return { value: null, error: 'placed_at must contain a source date or timestamp' };
  }
  const raw = rawValue.trim();

  const isoDate = ISO_DATE.exec(raw);
  if (isoDate) {
    return buildTimestamp({
      raw,
      year: Number(isoDate[1]),
      month: Number(isoDate[2]),
      day: Number(isoDate[3]),
    });
  }

  const usDate = US_DATE.exec(raw);
  if (usDate) {
    return buildTimestamp({
      raw,
      year: Number(usDate[3]),
      month: Number(usDate[1]),
      day: Number(usDate[2]),
    });
  }

  const isoDateTime = ISO_DATETIME.exec(raw);
  if (isoDateTime) {
    const hour = normalizeHour(Number(isoDateTime[4]), isoDateTime[8]);
    if (hour === null) {
      return { value: null, error: `Timestamp "${raw}" has an invalid clock time` };
    }
    return buildTimestamp({
      raw,
      year: Number(isoDateTime[1]),
      month: Number(isoDateTime[2]),
      day: Number(isoDateTime[3]),
      hour,
      minute: Number(isoDateTime[5]),
      second: Number(isoDateTime[6] ?? 0),
      fraction: isoDateTime[7],
      timezone: isoDateTime[9],
    });
  }

  const usDateTime = US_DATETIME.exec(raw);
  if (usDateTime) {
    const hour = normalizeHour(Number(usDateTime[4]), usDateTime[8]);
    if (hour === null) {
      return { value: null, error: `Timestamp "${raw}" has an invalid clock time` };
    }
    return buildTimestamp({
      raw,
      year: Number(usDateTime[3]),
      month: Number(usDateTime[1]),
      day: Number(usDateTime[2]),
      hour,
      minute: Number(usDateTime[5]),
      second: Number(usDateTime[6] ?? 0),
      fraction: usDateTime[7],
      timezone: usDateTime[9],
    });
  }

  return { value: null, error: `Could not parse source timestamp "${raw}"` };
}

export function canonicalizeParsedBetTemporalFields(bet: ParsedBet): ParsedBet {
  const parsed = parseSourcedTimestamp(bet.source_placed_at ?? bet.placed_at);
  if (!parsed.value) throw new Error(parsed.error);
  return { ...bet, ...parsed.value };
}

/**
 * Detect model-authored time-of-day claims that would require a confirmed
 * local clock. Source-clock observations are rendered by deterministic fields
 * instead, so model prose is held to the stricter local-time standard.
 */
export function containsLocalTimeBehaviorClaim(value: unknown): boolean {
  if (typeof value === 'string') return LOCAL_TIME_BEHAVIOR_CLAIM.test(value);
  if (Array.isArray(value)) return value.some(containsLocalTimeBehaviorClaim);
  if (!value || typeof value !== 'object') return false;
  return Object.values(value as Record<string, unknown>).some(containsLocalTimeBehaviorClaim);
}

/** Remove only the sentences that assert an unconfirmed local-time pattern. */
export function stripLocalTimeBehaviorSentences(text: unknown): string | undefined {
  if (typeof text !== 'string' || text.trim().length === 0) return undefined;
  const sentences = text.match(/[^.!?]+(?:[.!?]+|$)/g) ?? [text];
  const kept = sentences
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 0 && !containsLocalTimeBehaviorClaim(sentence));
  return kept.length > 0 ? kept.join(' ') : undefined;
}

/**
 * Remove model prose that treats source row order as settlement order. Bet
 * exports do not include settlement timestamps, so those causal claims are
 * unsupported even when the final result on each row is known.
 */
export function stripUnprovableResultSequenceSentences(text: unknown): string | undefined {
  if (typeof text !== 'string' || text.trim().length === 0) return undefined;
  const sentences = text.match(/[^.!?]+(?:[.!?]+|$)/g) ?? [text];
  const kept = sentences
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 0 && !UNPROVABLE_RESULT_SEQUENCE_CLAIM.test(sentence));
  return kept.length > 0 ? kept.join(' ') : undefined;
}

export function filterLocalTimeBehaviorClaims<T>(items: T[] | undefined): T[] {
  return (items ?? []).filter((item) => !containsLocalTimeBehaviorClaim(item));
}

/**
 * Remove local-time claims from saved analyses that do not confirm a local
 * clock. Reports created before provenance fields existed also lose temporal
 * sections whose original clock basis cannot be established.
 */
export function sanitizeUnconfirmedLocalTimeClaims(analysis: AutopsyAnalysis): AutopsyAnalysis {
  analysis = {
    ...analysis,
    contradictions: analysis.contradictions?.map((contradiction) => {
      if (contradiction.annualCost === undefined) return contradiction;
      const { annualCost: _unsupportedAnnualCost, ...rest } = contradiction;
      void _unsupportedAnnualCost;
      const sentences = contradiction.insight.match(/[^.!?]+(?:[.!?]+|$)/g) ?? [contradiction.insight];
      const insight = sentences
        .map((sentence) => sentence.trim())
        .filter((sentence) => !/(?:\bannual(?:ly)?\b|\bper year\b|\/year\b)/i.test(sentence))
        .join(' ')
        || `${contradiction.volumeData}. ${contradiction.edgeData}.`;
      return { ...rest, insight };
    }),
  };
  const localTimeConfirmed = analysis.timing_analysis?.local_time_confirmed === true;
  const hasTemporalProvenance = analysis.timing_analysis?.clock_basis === 'source_clock';
  const hasSupportedClock = localTimeConfirmed || hasTemporalProvenance;
  const safeText = (value: string | undefined, fallback = ''): string => {
    const sequenceSafe = stripUnprovableResultSequenceSentences(value);
    if (!sequenceSafe) return fallback;
    if (localTimeConfirmed) return sequenceSafe;
    return stripLocalTimeBehaviorSentences(sequenceSafe) ?? fallback;
  };
  const filterUnsupportedLocalTime = <T>(items: T[] | undefined): T[] => (
    localTimeConfirmed ? (items ?? []) : filterLocalTimeBehaviorClaims(items)
  );
  const diagnosisFallback = 'Time-of-day conclusions are unavailable because this report does not confirm a local clock.';
  const executiveDiagnosis = analysis.executiveDiagnosis
    ? {
        insightSnapshot: safeText(analysis.executiveDiagnosis.insightSnapshot, diagnosisFallback),
        ...(analysis.executiveDiagnosis.insightFull
          ? { insightFull: safeText(analysis.executiveDiagnosis.insightFull, diagnosisFallback) }
          : {}),
      }
    : undefined;
  const sessionAnalysis = hasSupportedClock && analysis.session_analysis
    ? {
        ...analysis.session_analysis,
        worst_session: {
          ...analysis.session_analysis.worst_session,
          description: safeText(analysis.session_analysis.worst_session.description),
        },
        best_session: {
          ...analysis.session_analysis.best_session,
          description: safeText(analysis.session_analysis.best_session.description),
        },
      }
    : undefined;
  const controlSystem = analysis.control_system
    ? {
        ...analysis.control_system,
        headline: safeText(analysis.control_system.headline, 'Use the controls supported by this report.'),
        topRisks: filterUnsupportedLocalTime(analysis.control_system.topRisks).map((risk) => ({
          ...risk,
          detail: safeText(risk.detail),
          evidence: safeText(risk.evidence),
        })),
        hardRules: filterUnsupportedLocalTime(analysis.control_system.hardRules),
        softRules: filterUnsupportedLocalTime(analysis.control_system.softRules),
        cooldownSuggestions: filterUnsupportedLocalTime(analysis.control_system.cooldownSuggestions),
        relapseTriggers: filterUnsupportedLocalTime(analysis.control_system.relapseTriggers),
        nextWeekFocus: safeText(analysis.control_system.nextWeekFocus, 'Follow the controls supported by this report.'),
      }
    : undefined;
  let betiq = analysis.betiq;
  if (!hasTemporalProvenance && analysis.betiq && !analysis.betiq.insufficient_data) {
    const timingScore = analysis.betiq.components?.timing;
    if (typeof timingScore === 'number' && Number.isFinite(timingScore)) {
      betiq = {
        ...analysis.betiq,
        score: Math.max(0, Math.min(100, analysis.betiq.score - timingScore + 5)),
        components: { ...analysis.betiq.components, timing: 5 },
        interpretation: 'This score uses the report inputs that do not require local-time provenance. Timing stays neutral because the report does not confirm a local clock.',
      };
    } else if (analysis.betiq.interpretation) {
      // Some legacy and test payloads contain a partial BetIQ object. Preserve
      // unknown component values instead of inventing a score adjustment.
      betiq = {
        ...analysis.betiq,
        interpretation: safeText(analysis.betiq.interpretation),
      };
    }
  }

  return {
    ...analysis,
    biases_detected: (analysis.biases_detected ?? [])
      .filter((bias) => !containsLocalTimeBehaviorClaim(bias.bias_name))
      .map((bias) => ({
        ...bias,
        description: safeText(bias.description),
        evidence: safeText(bias.evidence),
        fix: safeText(bias.fix),
      })),
    strategic_leaks: (analysis.strategic_leaks ?? [])
      .filter((leak) => !containsLocalTimeBehaviorClaim(leak.category))
      .map((leak) => ({
        ...leak,
        detail: safeText(leak.detail),
        suggestion: safeText(leak.suggestion),
      })),
    behavioral_patterns: filterUnsupportedLocalTime(analysis.behavioral_patterns)
      .map((pattern) => ({
        ...pattern,
        pattern_name: safeText(pattern.pattern_name),
        description: safeText(pattern.description),
        frequency: safeText(pattern.frequency),
        data_points: safeText(pattern.data_points),
      }))
      .filter((pattern) => pattern.pattern_name.length > 0 && pattern.description.length > 0),
    recommendations: filterUnsupportedLocalTime(analysis.recommendations)
      .map((recommendation) => ({
        ...recommendation,
        title: safeText(recommendation.title),
        description: safeText(recommendation.description),
        expected_improvement: safeText(recommendation.expected_improvement),
      }))
      .filter((recommendation) => recommendation.title.length > 0 && recommendation.description.length > 0),
    personal_rules: filterUnsupportedLocalTime(analysis.personal_rules),
    executive_diagnosis: analysis.executive_diagnosis
      ? safeText(analysis.executive_diagnosis, diagnosisFallback)
      : undefined,
    executiveDiagnosis,
    pertinent_negatives: filterUnsupportedLocalTime(analysis.pertinent_negatives),
    session_analysis: sessionAnalysis,
    timing_analysis: hasSupportedClock ? analysis.timing_analysis : undefined,
    session_detection: hasSupportedClock ? analysis.session_detection : undefined,
    bet_annotations: hasSupportedClock ? analysis.bet_annotations : undefined,
    edge_profile: analysis.edge_profile
      ? {
          ...analysis.edge_profile,
          reallocation_advice: safeText(analysis.edge_profile.reallocation_advice),
        }
      : undefined,
    betiq,
    patternsSnapshot: hasSupportedClock
      ? analysis.patternsSnapshot
      : analysis.patternsSnapshot?.filter((entry) => entry.kind !== 'worst_hour' && entry.kind !== 'longest_skid'),
    control_system: controlSystem,
  };
}

export function temporalFieldsAgree(
  raw: Record<string, unknown>,
  parsed: SourcedTimestamp,
): boolean {
  const rawPlacedAt = raw.placed_at;
  if (rawPlacedAt !== undefined) {
    if (parsed.placed_at) {
      if (typeof rawPlacedAt !== 'string') return false;
      const rawInstant = new Date(rawPlacedAt);
      if (Number.isNaN(rawInstant.getTime()) || rawInstant.toISOString() !== parsed.placed_at) return false;
    } else if (
      rawPlacedAt !== null
      && !(raw.source_placed_at === undefined && rawPlacedAt === parsed.source_placed_at)
    ) {
      return false;
    }
  }

  const checks: Array<[string, unknown]> = [
    ['source_placed_at', parsed.source_placed_at],
    ['placed_date', parsed.placed_date],
    ['placed_time', parsed.placed_time],
    ['source_timezone', parsed.source_timezone],
    ['timestamp_quality', parsed.timestamp_quality],
  ];
  return checks.every(([key, expected]) => raw[key] === undefined || raw[key] === expected);
}

function qualityOf(bet: TemporalFieldsLike): TimestampQuality | null {
  if (bet.timestamp_quality) return bet.timestamp_quality;
  if (!bet.source_placed_at) return bet.placed_at ? 'legacy_unknown' : null;
  const parsed = parseSourcedTimestamp(bet.source_placed_at);
  return parsed.value?.timestamp_quality ?? null;
}

export function betTimestampQuality(bet: TemporalFieldsLike): TimestampQuality | null {
  return qualityOf(bet);
}

function parsedFallback(bet: TemporalFieldsLike): SourcedTimestamp | null {
  if (!bet.source_placed_at) return null;
  const parsed = parseSourcedTimestamp(bet.source_placed_at);
  return parsed.value;
}

export function betRecordedDate(bet: TemporalFieldsLike): string | null {
  if (bet.placed_date) return bet.placed_date;
  if (bet.recorded_date) return bet.recorded_date;
  if (qualityOf(bet) === 'legacy_unknown') return bet.placed_at?.slice(0, 10) ?? null;
  return parsedFallback(bet)?.placed_date ?? bet.placed_at?.slice(0, 10) ?? null;
}

export function betSourceTime(bet: TemporalFieldsLike): string | null {
  const quality = qualityOf(bet);
  if (quality === 'date_only' || quality === 'legacy_unknown') return null;
  return bet.placed_time ?? parsedFallback(bet)?.placed_time ?? null;
}

export function betSourceHour(bet: TemporalFieldsLike): number | null {
  const time = betSourceTime(bet);
  if (!time) return null;
  const hour = Number(time.slice(0, 2));
  return Number.isInteger(hour) && hour >= 0 && hour <= 23 ? hour : null;
}

export function betSourceMinute(bet: TemporalFieldsLike): number | null {
  const time = betSourceTime(bet);
  if (!time) return null;
  const minute = Number(time.slice(3, 5));
  return Number.isInteger(minute) && minute >= 0 && minute <= 59 ? minute : null;
}

export function betSourceDayOfWeek(bet: TemporalFieldsLike): number | null {
  if (qualityOf(bet) === 'legacy_unknown') return null;
  const date = betRecordedDate(bet);
  if (!date || !ISO_DATE.test(date)) return null;
  return new Date(`${date}T00:00:00Z`).getUTCDay();
}

export function betHasKnownTimezone(bet: TemporalFieldsLike): boolean {
  return qualityOf(bet) === 'instant' && Boolean(bet.source_timezone ?? parsedFallback(bet)?.source_timezone);
}

export function betHasLegacyUnknownTime(bet: TemporalFieldsLike): boolean {
  return qualityOf(bet) === 'legacy_unknown';
}

export function betSequenceTimeMs(bet: TemporalFieldsLike): number | null {
  const quality = qualityOf(bet);
  if (quality === 'legacy_unknown' || quality === 'date_only') return null;
  if (quality === 'instant') {
    const instant = bet.placed_at ? new Date(bet.placed_at).getTime() : Number.NaN;
    return Number.isFinite(instant) ? instant : null;
  }

  const date = betRecordedDate(bet);
  const time = betSourceTime(bet);
  if (!date || !time) return null;
  const localClock = new Date(`${date}T${time}Z`).getTime();
  return Number.isFinite(localClock) ? localClock : null;
}

export function betSequencePartition(bet: TemporalSequenceLike): string | null {
  const quality = qualityOf(bet);
  if (quality === 'instant' && betSequenceTimeMs(bet) !== null) return 'instant';
  if (quality !== 'local_datetime' || betSequenceTimeMs(bet) === null) return null;
  if (bet.upload_id && bet.sportsbook) return `local:upload:${bet.upload_id}:book:${bet.sportsbook}`;
  if (bet.upload_id) return `local:upload:${bet.upload_id}`;
  if (bet.sportsbook) return `local:book:${bet.sportsbook}`;
  return null;
}

export function comparableBetSequences<T extends TemporalSequenceLike>(bets: T[]): T[][] {
  const groups = new Map<string, T[]>();
  for (const bet of bets) {
    const partition = betSequencePartition(bet);
    if (!partition) continue;
    const group = groups.get(partition) ?? [];
    group.push(bet);
    groups.set(partition, group);
  }
  return Array.from(groups.values()).map((group) => group.sort((a, b) => {
    const aTime = betSequenceTimeMs(a);
    const bTime = betSequenceTimeMs(b);
    if (aTime !== null && bTime !== null && aTime !== bTime) return aTime - bTime;
    return a.id.localeCompare(b.id);
  }));
}

function presentationTimeMs(bet: TemporalFieldsLike): number | null {
  const sequenceTime = betSequenceTimeMs(bet);
  if (sequenceTime !== null) return sequenceTime;
  const date = betRecordedDate(bet);
  if (!date) return null;
  const endOfRecordedDay = new Date(`${date}T23:59:59.999Z`).getTime();
  return Number.isFinite(endOfRecordedDay) ? endOfRecordedDay : null;
}

export function compareBetsByRecordedTime(a: TemporalBetLike, b: TemporalBetLike): number {
  // This is a deterministic presentation order, not permission to compare
  // bets across provenance partitions in behavioral analysis. Exact instants
  // use their real chronology. A timezone-naive source clock uses a neutral
  // wall-clock key. Date-only and legacy rows sort after known clocks on the
  // same recorded date without manufacturing a stored time or timezone.
  const aKey = presentationTimeMs(a);
  const bKey = presentationTimeMs(b);
  if (aKey !== null && bKey !== null && aKey !== bKey) return aKey - bKey;
  if (aKey !== null && bKey === null) return -1;
  if (aKey === null && bKey !== null) return 1;
  return a.id.localeCompare(b.id);
}

export function manualDateTemporalFields(date: string): SourcedTimestamp {
  const parsed = parseSourcedTimestamp(date);
  if (!parsed.value || parsed.value.timestamp_quality !== 'date_only') {
    throw new Error(parsed.error ?? 'Manual bet date must be a valid calendar date');
  }
  return parsed.value;
}

export function formatRecordedDate(
  bet: TemporalFieldsLike,
  options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' },
): string {
  const date = betRecordedDate(bet);
  if (!date) return 'Date unknown';
  return formatCalendarDate(date, options);
}

export function formatCalendarDate(
  date: string,
  options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' },
): string {
  if (!ISO_DATE.test(date)) return 'Date unknown';
  return new Date(`${date}T00:00:00Z`).toLocaleDateString('en-US', { ...options, timeZone: 'UTC' });
}

export function formatSourceTime(bet: TemporalFieldsLike): string | null {
  const time = betSourceTime(bet);
  if (!time) return null;
  const hour = Number(time.slice(0, 2));
  const minute = time.slice(3, 5);
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minute} ${hour >= 12 ? 'PM' : 'AM'}`;
}

export function betTemporalIdentity(bet: TemporalFieldsLike): string {
  const quality = qualityOf(bet);
  if (quality === 'instant' || quality === 'legacy_unknown') {
    return bet.placed_at ? `instant:${bet.placed_at}` : 'unknown';
  }
  const date = betRecordedDate(bet);
  if (quality === 'local_datetime') {
    const time = betSourceTime(bet);
    return date && time ? `local:${date}T${time}` : 'unknown';
  }
  if (quality === 'date_only') return date ? `date:${date}` : 'unknown';
  return bet.placed_at ? `instant:${bet.placed_at}` : date ? `date:${date}` : 'unknown';
}
