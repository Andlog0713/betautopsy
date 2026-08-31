import type {
  AutopsyAnalysis,
  Bet,
  CheckInActionGate,
  CheckInCooldownContext,
  CheckInPlanContext,
  CheckInReflectionPrompt,
  CheckInRiskContext,
  CheckInRuleViolation,
  ControlPlan,
  ControlPlanSettings,
  ControlRule,
  ControlRuleSuggestion,
  ControlSystemSummary,
  Cooldown,
  CooldownSuggestion,
  PreBetCheckInRequest,
  Profile,
  RecoveryModeState,
  ReportControlSystem,
  ReportRiskTier,
  ReportRiskSummary,
  RiskEvent,
  RiskEventSeverity,
  RiskEventType,
} from '@/types';
import { SUPPORT_RESOURCES } from '@/lib/support-resources';
import { BET_COUNT_THRESHOLDS } from '@/lib/engine/constants/thresholds';
import { betSequencePartition, betSequenceTimeMs } from '@/lib/temporal-provenance';

type CheckInEvaluationResult = {
  actionGate: CheckInActionGate;
  ruleViolations: CheckInRuleViolation[];
  cooldown: CheckInCooldownContext | null;
  recentRiskContext: CheckInRiskContext[];
  planContext: CheckInPlanContext | null;
  reflectionPrompts: CheckInReflectionPrompt[];
  overrideRequired: boolean;
};

type RiskEventDraft = {
  event_type: RiskEventType;
  severity: RiskEventSeverity;
  summary: string;
  detail: string;
  recurrence_count: number;
  window_days: number;
  rule_id?: string | null;
  metadata?: Record<string, unknown>;
};

type CooldownDraft = {
  trigger_type: Cooldown['trigger_type'];
  trigger_reason: string;
  user_explanation: string;
  expires_at: string;
  rule_id?: string | null;
};

const MILLIS_PER_HOUR = 60 * 60 * 1000;
const MILLIS_PER_DAY = 24 * MILLIS_PER_HOUR;

function clampHour(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(23, Math.round(value)));
}

function firstSentence(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return '';
  const match = trimmed.match(/^[^.!?]+[.!?]?/);
  return (match?.[0] ?? trimmed).trim();
}

function toLocalHour(request: PreBetCheckInRequest): number {
  if (typeof request.localHour === 'number') return clampHour(request.localHour);
  return new Date(request.placedAt).getUTCHours();
}

function getActiveCooldown(cooldowns: Cooldown[], now = new Date()): Cooldown | null {
  return (
    cooldowns
      .filter((cooldown) => cooldown.status === 'active' && new Date(cooldown.expires_at).getTime() > now.getTime())
      .sort((a, b) => new Date(a.expires_at).getTime() - new Date(b.expires_at).getTime())[0] ?? null
  );
}

function getLossStreak(recentBets: Bet[]): number {
  const sorted = recentBets
    .filter((bet) => betSequencePartition(bet) === 'instant')
    .sort((a, b) => (betSequenceTimeMs(b) ?? 0) - (betSequenceTimeMs(a) ?? 0));
  let streak = 0;
  for (const bet of sorted) {
    if (bet.result === 'loss') {
      streak += 1;
      continue;
    }
    // Pending is unknown, not permission to look through it and stitch older
    // losses into a current run.
    break;
  }
  return streak;
}

function getCurrentSessionBetCount(recentBets: Bet[], placedAtIso: string): number {
  const target = new Date(placedAtIso).getTime();
  return recentBets.filter((bet) => {
    if (betSequencePartition(bet) !== 'instant') return false;
    const placed = betSequenceTimeMs(bet);
    if (placed === null) return false;
    const delta = target - placed;
    return delta >= 0 && delta <= 6 * MILLIS_PER_HOUR;
  }).length;
}

const LOSS_SEQUENCE_MIN_BETS = 10;
const LATE_NIGHT_MIN_BETS = 10;
const LONG_PARLAY_MIN_BETS = 10;

function formatRoundedMoney(value: number): string {
  return `$${Math.round(Math.abs(value)).toLocaleString('en-US')}`;
}

function formatRoundedNet(value: number): string {
  const prefix = value < 0 ? '-$' : value > 0 ? '+$' : '$';
  return `${prefix}${Math.round(Math.abs(value)).toLocaleString('en-US')}`;
}

function hasCanonicalRuleInputs(analysis: AutopsyAnalysis): boolean {
  return Boolean(
    analysis.summary
    && typeof analysis.summary.avg_stake === 'number'
    && Array.isArray(analysis.biases_detected)
    && typeof analysis.emotion_score === 'number',
  );
}

export function buildSuggestedRulesFromAnalysis(analysis: AutopsyAnalysis): ControlRuleSuggestion[] {
  if (!hasCanonicalRuleInputs(analysis)) return [];
  // Model-authored personal_rules are deliberately ignored. Every field on an
  // adoptable suggestion, including its action, threshold, evidence, and
  // sufficiency gate, is derived below from deterministic report fields.
  const suggestions: ControlRuleSuggestion[] = [];
  const summary = analysis.summary;
  const avgStake = summary.avg_stake || 0;
  const settledBets = analysis.sufficiency?.settledBets ?? 0;
  const postLossBias = analysis.biases_detected.find(
    (bias) => bias.bias_name === 'Post-Loss Escalation',
  );
  const postLossSample = postLossBias?.sample_size ?? 0;
  const stakeVolatilityBias = analysis.biases_detected.find(
    (bias) => bias.bias_name === 'Stake Volatility',
  );
  const stakeVolatilitySample = stakeVolatilityBias?.sample_size ?? 0;
  const lateNight = analysis.timing_analysis?.has_time_data
    && analysis.timing_analysis.local_time_confirmed === true
    ? analysis.timing_analysis.late_night_stats
    : null;
  const longParlayWhatIf = analysis.what_if_scenarios?.find(
    (scenario) => scenario.label === 'Eliminated all parlays over 3 legs',
  );
  const longParlayImprovement = longParlayWhatIf
    ? longParlayWhatIf.hypothetical - longParlayWhatIf.actual
    : 0;
  const affectedLongParlays = longParlayWhatIf?.affectedBets ?? 0;
  const sessionDetection = analysis.session_detection;
  const heatedSessionPercent = analysis.session_detection?.heatedSessionPercent ?? 0;

  if (
    postLossBias
    && postLossSample >= LOSS_SEQUENCE_MIN_BETS
  ) {
    suggestions.push({
      candidateId: 'loss_streak_stop',
      title: 'Stop after 3 straight losses',
      description: 'After 3 losses in a row, stop betting for the rest of the day.',
      rationale: 'This guardrail interrupts the repeated loss-sequence escalation detected in this report.',
      rule_type: 'loss_streak_stop',
      scope: 'session',
      scope_value: null,
      severity: 'critical',
      enforcement: 'hard',
      provenance: 'engine_recommended',
      trigger: { threshold: 3, cooldownHours: 24 },
      source: 'Post-Loss Escalation',
      evidence: {
        basis: 'bias',
        summary: `Post-Loss Escalation qualified across ${postLossSample} ordered bets.`,
        sampleSize: postLossSample,
      },
      sufficiency: {
        status: 'sufficient',
        observed: postLossSample,
        minimum: LOSS_SEQUENCE_MIN_BETS,
        unit: 'qualified_bets',
      },
    });
  }

  if (
    lateNight
    && lateNight.count >= LATE_NIGHT_MIN_BETS
    && lateNight.roi < 0
    && settledBets >= BET_COUNT_THRESHOLDS.biasesDetected
  ) {
    suggestions.push({
      candidateId: 'late_night_cutoff',
      title: 'No bets after 11:00 PM',
      description: 'No bets after 11:00 PM local time. Review lines in the morning instead.',
      rationale: `${lateNight.count} qualified late-night bets returned ${lateNight.roi.toFixed(1)}% ROI in this report.`,
      rule_type: 'late_night_cutoff',
      scope: 'time_window',
      scope_value: '23:00-04:00',
      severity: 'guardrail',
      enforcement: 'hard',
      provenance: 'engine_recommended',
      trigger: { startHour: 23, endHour: 4, recurrenceWindowDays: 14 },
      source: 'Timing analysis',
      evidence: {
        basis: 'timing',
        summary: `${lateNight.count} qualified late-night bets returned ${lateNight.roi.toFixed(1)}% ROI.`,
        sampleSize: lateNight.count,
      },
      sufficiency: {
        status: 'sufficient',
        observed: settledBets,
        minimum: BET_COUNT_THRESHOLDS.biasesDetected,
        unit: 'settled_bets',
      },
    });
  }

  if (
    longParlayWhatIf
    && affectedLongParlays >= LONG_PARLAY_MIN_BETS
    && longParlayImprovement > 0
  ) {
    suggestions.push({
      candidateId: 'no_long_parlays',
      title: 'Limit parlays to 3 legs',
      description: 'Do not place parlays with more than 3 legs until your next report.',
      rationale: `Removing those ${affectedLongParlays} bets would have improved this cohort's historical net by ${formatRoundedMoney(longParlayImprovement)}.`,
      rule_type: 'ban_category',
      scope: 'bet_type',
      scope_value: 'parlay',
      severity: 'guardrail',
      enforcement: 'hard',
      provenance: 'engine_recommended',
      trigger: { category: 'parlay', maxParlayLegs: 3 },
      source: 'No-long-parlays What-If',
      evidence: {
        basis: 'what_if',
        summary: `The same frozen cohort moved from ${formatRoundedNet(longParlayWhatIf.actual)} to ${formatRoundedNet(longParlayWhatIf.hypothetical)} without parlays over 3 legs.`,
        sampleSize: affectedLongParlays,
        actualProfit: longParlayWhatIf.actual,
        hypotheticalProfit: longParlayWhatIf.hypothetical,
        deltaProfit: longParlayImprovement,
      },
      sufficiency: {
        status: 'sufficient',
        observed: affectedLongParlays,
        minimum: LONG_PARLAY_MIN_BETS,
        unit: 'qualified_bets',
      },
    });
  }

  if (
    stakeVolatilityBias
    && stakeVolatilitySample >= LOSS_SEQUENCE_MIN_BETS
    && avgStake > 0
  ) {
    const maxStake = Math.max(10, Math.round(avgStake * 1.25 / 5) * 5);
    suggestions.push({
      candidateId: 'stake_cap',
      title: `Cap stake at $${maxStake}`,
      description: `No single bet can exceed $${maxStake} until your next report.`,
      rationale: 'A fixed ceiling keeps every stake within the engine-derived limit until the next report.',
      rule_type: 'stake_cap',
      scope: 'global',
      scope_value: null,
      severity: 'guardrail',
      enforcement: 'hard',
      provenance: 'engine_recommended',
      trigger: { maxStake, maxStakeMultiplier: 1.25 },
      source: 'Sizing discipline',
      evidence: {
        basis: 'sizing',
        summary: `Stake Volatility qualified across ${stakeVolatilitySample} bets; average stake was ${formatRoundedMoney(avgStake)}.`,
        sampleSize: stakeVolatilitySample,
      },
      sufficiency: {
        status: 'sufficient',
        observed: stakeVolatilitySample,
        minimum: LOSS_SEQUENCE_MIN_BETS,
        unit: 'qualified_bets',
      },
    });
  }

  if (
    sessionDetection
    && !sessionDetection.insufficient_data
    && sessionDetection.totalSessions >= BET_COUNT_THRESHOLDS.heatedSessionsMinSessions
    && sessionDetection.heatedSessionCount > 0
    && heatedSessionPercent >= 20
  ) {
    suggestions.push({
      candidateId: 'post_heated_session_pause',
      title: 'Automatic pause after a heated session',
      description: 'If a session is flagged as heated, no same-day betting after it ends.',
      rationale: 'A 24-hour pause adds friction after the engine classifies a session as heated.',
      rule_type: 'post_heated_session_pause',
      scope: 'session',
      scope_value: null,
      severity: 'critical',
      enforcement: 'hard',
      provenance: 'engine_recommended',
      trigger: { cooldownHours: 24, recurrenceWindowDays: 14 },
      source: 'Session detection',
      evidence: {
        basis: 'sessions',
        summary: `${sessionDetection.heatedSessionCount} of ${sessionDetection.totalSessions} sessions were classified as heated.`,
        sampleSize: sessionDetection.heatedSessionCount,
      },
      sufficiency: {
        status: 'sufficient',
        observed: sessionDetection.totalSessions,
        minimum: BET_COUNT_THRESHOLDS.heatedSessionsMinSessions,
        unit: 'sessions',
      },
    });
  }

  if (
    analysis.emotion_score >= 55
    && settledBets >= BET_COUNT_THRESHOLDS.emotionScore
    && analysis.emotion_score_insufficient_data !== true
  ) {
    suggestions.push({
      candidateId: 'emotion_block',
      title: 'Block angry or revenge-bet states',
      description: 'If you are angry, heated, or trying to win losses back, do not place the bet.',
      rationale: 'The deterministic emotion score met the engine threshold for a hard pause.',
      rule_type: 'emotion_block',
      scope: 'emotion_state',
      scope_value: null,
      severity: 'critical',
      enforcement: 'hard',
      provenance: 'engine_recommended',
      trigger: { blockedEmotions: ['angry', 'tilted', 'trying_to_win_it_back'] },
      source: 'Emotion score',
      evidence: {
        basis: 'emotion',
        summary: `The deterministic emotion score was ${analysis.emotion_score} across ${settledBets} settled bets.`,
        sampleSize: settledBets,
      },
      sufficiency: {
        status: 'sufficient',
        observed: settledBets,
        minimum: BET_COUNT_THRESHOLDS.emotionScore,
        unit: 'settled_bets',
      },
    });
  }

  return suggestions.slice(0, 8);
}

export function buildPersonalRulesFromSuggestions(
  suggestions: ControlRuleSuggestion[],
) {
  return suggestions.map((suggestion) => ({
    rule: suggestion.description,
    reason: suggestion.rationale,
    based_on: suggestion.source,
    candidate_id: suggestion.candidateId,
    rule_type: suggestion.rule_type,
    scope: suggestion.scope,
    scope_value: suggestion.scope_value,
    severity: suggestion.severity,
    enforcement: suggestion.enforcement,
    provenance: suggestion.provenance,
    trigger: suggestion.trigger,
    evidence: suggestion.evidence,
    sufficiency: suggestion.sufficiency,
  }));
}

export function findCanonicalRuleSuggestion(
  analysis: AutopsyAnalysis,
  title: string,
  ruleType: ControlRuleSuggestion['rule_type'],
): ControlRuleSuggestion | undefined {
  return buildSuggestedRulesFromAnalysis(analysis).find((candidate) => (
    candidate.title === title && candidate.rule_type === ruleType
  ));
}

function buildPlanSettings(analysis: AutopsyAnalysis, rules: ControlRuleSuggestion[]): ControlPlanSettings {
  const stakeCap = rules.find((rule) => rule.rule_type === 'stake_cap')?.trigger.maxStake ?? null;
  const lossStop = rules.find((rule) => rule.rule_type === 'loss_streak_stop')?.trigger.threshold ?? null;
  const lateNight = rules.find((rule) => rule.rule_type === 'late_night_cutoff')?.trigger.startHour ?? null;
  const sessionLimit = rules.find((rule) => rule.rule_type === 'session_limit')?.trigger.sessionLimit
    ?? ((analysis.session_detection?.heatedSessionCount ?? 0) > 0 ? 4 : null);
  const bannedBetCategories = rules
    .filter(
      (rule) => rule.rule_type === 'ban_category' && rule.trigger.maxParlayLegs == null,
    )
    .map((rule) => rule.scope_value ?? rule.trigger.category ?? rule.title)
    .filter(Boolean);
  const waitMinutes = rules.find((rule) => rule.rule_type === 'cooldown_after_loss')?.trigger.waitMinutes
    ?? (analysis.biases_detected.some((bias) => bias.bias_name === 'Post-Loss Escalation') ? 30 : null);

  return {
    bettingHours: {
      startHour: null,
      endHour: lateNight,
      timezoneLabel: analysis.timing_analysis?.clock_label ?? 'Time basis unavailable',
    },
    maximumUnitSize: stakeCap,
    bannedBetCategories,
    sessionLimit,
    lossStreakStop: lossStop,
    lateNightCutoffHour: lateNight,
    postLossWaitingPeriodMinutes: waitMinutes,
    reflectionQuestion: 'Would I still place this if my last bet had won?',
  };
}

export function buildSuggestedPlanFromAnalysis(
  analysis: AutopsyAnalysis,
  sourceReportId: string | null,
): ControlPlan {
  const rules = buildSuggestedRulesFromAnalysis(analysis);
  const settings = buildPlanSettings(analysis, rules);
  const topRisk = analysis.biases_detected[0]?.bias_name ?? 'Behavioral drift';
  const whyThisMatters = firstSentence(
    analysis.biases_detected[0]?.evidence
    ?? analysis.strategic_leaks[0]?.detail
    ?? 'Your highest-risk moments are repeating. A live plan turns that pattern into a rule before the next session.'
  );

  return {
    id: `suggested-${sourceReportId ?? 'latest'}`,
    user_id: '',
    name: 'My Control Plan',
    status: 'draft',
    source_report_id: sourceReportId,
    settings,
    accountability_message: `I am using this plan to slow the exact pattern behind ${topRisk.toLowerCase()}.`,
    why_this_matters: whyThisMatters,
    decisions: [],
    activated_at: null,
    created_at: new Date(0).toISOString(),
    updated_at: new Date(0).toISOString(),
  };
}

function buildTopRisks(analysis: AutopsyAnalysis): ReportRiskSummary[] {
  const risks: ReportRiskSummary[] = analysis.biases_detected
    .slice(0, 2)
    .map((bias) => ({
      title: bias.bias_name,
      detail: firstSentence(bias.description || bias.fix || bias.evidence),
      evidence: firstSentence(bias.evidence || bias.fix || bias.description),
    }));

  if ((analysis.session_detection?.heatedSessionCount ?? 0) > 0) {
    risks.push({
      title: 'Heated session relapse',
      detail: `You logged ${analysis.session_detection?.heatedSessionCount} heated sessions. Those are the moments your control system needs to treat differently.`,
      evidence: firstSentence(analysis.session_detection?.insight ?? 'Heated sessions are a repeating pattern in your data.'),
    });
  }

  return risks.slice(0, 3);
}

function buildCooldownSuggestions(analysis: AutopsyAnalysis, rules: ControlRuleSuggestion[]): CooldownSuggestion[] {
  const suggestions: CooldownSuggestion[] = [];

  if (analysis.biases_detected.some((bias) => bias.bias_name === 'Post-Loss Escalation')) {
    suggestions.push({
      trigger: 'Post-loss escalation',
      label: '30-minute reset after a loss',
      durationLabel: '30 minutes',
      durationHours: 0.5,
      reason: 'A short pause adds friction before the next stake decision. This is a harm-reduction control, not a claim about what caused the historical sequence.',
    });
  }

  if ((analysis.session_detection?.heatedSessionCount ?? 0) > 0) {
    suggestions.push({
      trigger: 'Heated session',
      label: 'Next-day lockout after a heated session',
      durationLabel: '24 hours',
      durationHours: 24,
      reason: 'A next-day lockout adds friction after a heated session. This is a harm-reduction control, not a claim of predicted profit.',
    });
  }

  if (rules.some((rule) => rule.rule_type === 'late_night_cutoff')) {
    suggestions.push({
      trigger: 'Late-night behavior',
      label: 'Sleep-on-it cooldown',
      durationLabel: 'Until tomorrow at 8:00 AM',
      durationHours: 8,
      reason: 'If the cutoff is already broken, the safest next move is to hand the decision to tomorrow-you.',
    });
  }

  return suggestions.slice(0, 3);
}

// ── Recovery-mode risk thresholds (INTERIM, conservative) ──────────────────
//
// Calibration query (2026-06-10): prod had n=6 full reports with emotion_score,
// degenerate (all ~73, test data) — too sparse to set a real percentile cutoff.
// At interim 80, zero current reports reach the recovery tier, which is the
// intended conservative posture (err toward UNDER-flagging; the safer-gambling
// messaging literature says false positives are costly — reactance, self-stigma,
// message fatigue). codex's old 70 cutoff landed at ~p33 (over-flagging).
//
// DO NOT market the recovery feature until the calibration query is re-run on a
// real population and RECOVERY_EMOTION_CUTOFF is moved to roughly p90-p95.
//
// HARD DEPENDENCY: emotion_score and heatedSessionPercent change when their
// deterministic inputs change. Re-run calibration before changing these
// cutoffs because a math change can move a user between tiers even when their
// behavior did not change.
const RECOVERY_EMOTION_CUTOFF = 80; // Tier 2 gate (raised from codex's 70)
const RECOVERY_HEATED_PCT = 35;     // Tier 2 corroboration floor
const ELEVATED_EMOTION_MIN = 60;    // Tier 1 lower bound
const ELEVATED_HEATED_PCT = 20;     // Tier 1 lower bound

// Three-tier report classification (PGSI-style: confident clinical framing only
// at the top). Evaluated top-down.
export function classifyReportRiskTier(analysis: AutopsyAnalysis): ReportRiskTier {
  const criticalBiases = analysis.biases_detected.filter((bias) => bias.severity === 'critical').length;
  const severeBiases = analysis.biases_detected.filter((bias) => bias.severity === 'high' || bias.severity === 'critical').length;
  const emotion = analysis.emotion_score;
  const heatedPct = analysis.session_detection?.heatedSessionPercent ?? 0;

  // Tier 2 (recovery): the emotion signal AND corroboration, never either alone.
  // The conjunction is the single most important guard — it stops one bad
  // weekend from tripping the clinical tier. Check-in corroboration is only
  // available in the live deriveRecoveryModeState, not at report-generation time.
  if (emotion >= RECOVERY_EMOTION_CUTOFF && (criticalBiases > 0 || heatedPct >= RECOVERY_HEATED_PCT)) {
    return 'recovery';
  }

  // Tier 1 (elevated): anything elevated that did NOT meet the recovery
  // conjunction. This tier is benign (a single light-touch note, no clinical
  // framing, no helpline), so it is intentionally generous — a high emotion
  // score WITHOUT corroboration, or a single critical bias, still earns a
  // heads-up rather than falling through to no-flag. The over-flagging concern
  // applies to the clinical tier (Tier 2) above, which stays tightly gated.
  // NOTE: spec said "exactly 2 severe biases"; implemented as >= 2 (so 3+ also
  // qualifies) plus a single critical bias. Flagged for review.
  if (
    emotion >= ELEVATED_EMOTION_MIN
    || criticalBiases >= 1
    || severeBiases >= 2
    || heatedPct >= ELEVATED_HEATED_PCT
  ) {
    return 'elevated';
  }

  return 'none';
}

function recoveryRecommendedFromAnalysis(analysis: AutopsyAnalysis): boolean {
  return classifyReportRiskTier(analysis) === 'recovery';
}

export function buildReportControlSystem(
  analysis: AutopsyAnalysis,
  rules = buildSuggestedRulesFromAnalysis(analysis),
): ReportControlSystem {
  const hardRules = rules.filter((rule) => rule.enforcement === 'hard');
  const softRules = rules.filter((rule) => rule.enforcement === 'soft');
  const riskTier = classifyReportRiskTier(analysis);
  const recoveryModeRecommended = riskTier === 'recovery';
  const status = riskTier === 'recovery'
    ? 'recovery_mode'
    : riskTier === 'elevated'
    ? 'watch_mode'
    : 'support_mode';
  const confirmedLateNightRisk = analysis.timing_analysis?.local_time_confirmed === true
    && (analysis.timing_analysis.late_night_stats?.count ?? 0) > 0;

  return {
    controlStatus: status,
    headline: recoveryModeRecommended
      ? 'The next step is not more confidence. It is more friction.'
      : 'Your report should end in operating rules, not vague advice.',
    topRisks: buildTopRisks(analysis),
    hardRules,
    softRules,
    cooldownSuggestions: buildCooldownSuggestions(analysis, rules),
    relapseTriggers: [
      ...(confirmedLateNightRisk ? ['Late-night betting windows'] : []),
      'A higher-stake decision following a known loss',
      'Returning to the same leaking category under stress',
    ],
    nextWeekFocus: hardRules[0]?.description
      ?? softRules[0]?.description
      ?? 'Pick one live rule and make it the easiest behavior to follow this week.',
    planTemplate: buildPlanSettings(analysis, rules),
    recoveryModeRecommended,
    riskTier,
    supportResources: SUPPORT_RESOURCES,
  };
}

/**
 * Rebuilds every user-facing rule surface from deterministic report fields.
 * This is used for new report assembly and at read time so historical saved
 * reports cannot keep exposing model-authored personal_rules or control rules.
 */
export function attachCanonicalControlRules(analysis: AutopsyAnalysis): AutopsyAnalysis {
  if (!hasCanonicalRuleInputs(analysis)) return analysis;
  const rules = buildSuggestedRulesFromAnalysis(analysis);
  const canonicalAnalysis: AutopsyAnalysis = {
    ...analysis,
    personal_rules: buildPersonalRulesFromSuggestions(rules),
  };
  return {
    ...canonicalAnalysis,
    control_system: buildReportControlSystem(canonicalAnalysis, rules),
  };
}

export function deriveRecoveryModeState(params: {
  profile: Profile | null;
  analysis: AutopsyAnalysis | null;
  riskEvents: RiskEvent[];
  cooldowns: Cooldown[];
  recentCheckIns?: Array<{ bet_quality_score: number; recommendation: string; created_at: string }>;
}): RecoveryModeState {
  const { profile, analysis, riskEvents, cooldowns, recentCheckIns = [] } = params;

  if (profile?.manual_recovery_mode) {
    return {
      active: true,
      level: 'recovery',
      manual: true,
      startedAt: profile.recovery_mode_started_at,
      summary: profile.recovery_mode_reason || 'Manual Recovery Mode is active.',
      supportMessage: 'The product will prioritize cooldowns, plan adherence, and support resources over streak language.',
      triggers: ['Manually enabled by the user'],
    };
  }

  const repeatedOverrides = riskEvents.filter((event) => event.event_type === 'cooldown_override').length;
  const repeatedViolations = riskEvents.filter((event) => event.event_type === 'rule_violation').length;
  const highRiskEvents = riskEvents.filter((event) => event.severity === 'high' || event.severity === 'critical').length;
  const activeCooldown = getActiveCooldown(cooldowns);
  const lowScores = recentCheckIns.filter((checkIn) => checkIn.bet_quality_score <= 45).length;
  const heatedPct = analysis?.session_detection?.heatedSessionPercent ?? 0;
  const severeBiases = analysis?.biases_detected.filter((bias) => bias.severity === 'high' || bias.severity === 'critical').length ?? 0;
  const emotionScore = analysis?.emotion_score ?? 0;

  const triggerLabels: string[] = [];
  if (activeCooldown) triggerLabels.push('An active cooldown is still running');
  if (heatedPct >= ELEVATED_HEATED_PCT) triggerLabels.push(`Heated sessions make up ${Math.round(heatedPct)}% of tracked sessions`);
  if (repeatedOverrides >= 2) triggerLabels.push('Cooldown overrides have become a repeat pattern');
  if (repeatedViolations >= 3) triggerLabels.push('Rule violations are stacking up');
  if (lowScores >= 2) triggerLabels.push('Recent check-ins are repeatedly landing in the danger zone');
  if (severeBiases >= 2) triggerLabels.push('Multiple high-risk report findings are still active');
  if (emotionScore >= RECOVERY_EMOTION_CUTOFF) triggerLabels.push('Emotion score is in the high range');

  // Auto Recovery Mode requires SUSTAINED, CORROBORATED signal, never a single
  // threshold cross. Each branch pairs a repeated behavioral signal with a
  // current risk context, so one noisy week cannot trip the clinical tier.
  // (The manual toggle above always wins.) Single signals below only raise the
  // level to 'elevated' — which keeps rules visible but uses no clinical framing.
  const autoRecovery =
    (repeatedViolations >= 3 && (activeCooldown !== null || heatedPct >= RECOVERY_HEATED_PCT))
    || (repeatedOverrides >= 2 && severeBiases >= 2)
    || (lowScores >= 3 && (heatedPct >= ELEVATED_HEATED_PCT || severeBiases >= 2));

  const active = autoRecovery;
  const level: RecoveryModeState['level'] = autoRecovery
    ? 'recovery'
    : triggerLabels.length > 0
    ? 'elevated'
    : 'watch';

  const summary = level === 'recovery'
    ? 'Recovery Mode is active because the same harm pattern is reappearing across multiple signals, not because of one noisy result.'
    : level === 'elevated'
    ? 'Risk is elevated. Keep control rules visible and slow things down, but no clinical framing yet.'
    : 'No active Recovery Mode. Control rules stay visible; the product uses a normal support tone.';

  const supportMessage = level === 'recovery'
    ? 'Foreground plan adherence, current cooldowns, recent risk events, and support resources. De-emphasize hype.'
    : 'Keep rules visible and reinforce process discipline without using streak hype as the primary motivator.';

  return {
    active,
    level,
    manual: false,
    startedAt: activeCooldown?.triggered_at ?? null,
    summary,
    supportMessage,
    triggers: triggerLabels,
  };
}

export function buildControlSystemSummary(params: {
  rules: ControlRule[];
  cooldowns: Cooldown[];
  riskEvents: RiskEvent[];
  recoveryMode: RecoveryModeState;
}): ControlSystemSummary {
  const activeRules = params.rules.filter((rule) => rule.status === 'active');
  const activeCooldown = getActiveCooldown(params.cooldowns);
  const recentHighRiskEvents = params.riskEvents.filter(
    (event) => event.severity === 'high' || event.severity === 'critical'
  ).length;
  const repeatEvent = [...params.riskEvents]
    .filter((event) => event.recurrence_count >= 2)
    .sort((a, b) => b.recurrence_count - a.recurrence_count)[0];

  return {
    topMessage: params.recoveryMode.active
      ? params.recoveryMode.summary
      : activeRules.length > 0
      ? `You have ${activeRules.length} live operating rule${activeRules.length === 1 ? '' : 's'} protecting your next session.`
      : 'No live control rules yet. The next step is to adopt the ones your report already surfaced.',
    activeRuleCount: activeRules.length,
    hardRuleCount: activeRules.filter((rule) => rule.enforcement === 'hard').length,
    softRuleCount: activeRules.filter((rule) => rule.enforcement === 'soft').length,
    activeCooldownHoursRemaining: activeCooldown
      ? Math.max(0, Math.ceil((new Date(activeCooldown.expires_at).getTime() - Date.now()) / MILLIS_PER_HOUR))
      : null,
    recentHighRiskEvents,
    repeatPatternMessage: repeatEvent
      ? `${repeatEvent.summary}. This is the ${repeatEvent.recurrence_count}th time in ${repeatEvent.window_days} days.`
      : null,
  };
}

function buildRecentRiskContext(riskEvents: RiskEvent[]): CheckInRiskContext[] {
  return riskEvents
    .filter((event) => event.recurrence_count >= 2 || event.severity === 'high' || event.severity === 'critical')
    .sort((a, b) => {
      const severityRank = { info: 0, warning: 1, high: 2, critical: 3 };
      return severityRank[b.severity] - severityRank[a.severity];
    })
    .slice(0, 3)
    .map((event) => ({
      eventType: event.event_type,
      severity: event.severity,
      summary: event.summary,
      recurrenceCount: event.recurrence_count,
      windowDays: event.window_days,
    }));
}

function evaluateSingleRule(
  rule: ControlRule,
  request: PreBetCheckInRequest,
  recentBets: Bet[],
  recentRiskEvents: RiskEvent[],
): CheckInRuleViolation | null {
  if (rule.status !== 'active') return null;

  const localHour = toLocalHour(request);
  const lowerBetType = request.betType.toLowerCase();
  const lowerSport = request.sport.toLowerCase();
  const reflection = request.reflection;

  switch (rule.rule_type) {
    case 'loss_streak_stop': {
      const threshold = rule.trigger.threshold ?? 3;
      const streak = getLossStreak(recentBets);
      if (streak >= threshold) {
        return {
          ruleId: rule.id,
          ruleType: rule.rule_type,
          title: rule.title,
          ruleText: rule.description,
          enforcement: rule.enforcement,
          severity: rule.severity,
          reason: `You are already on a ${streak}-loss streak. This rule was written for exactly this spot.`,
        };
      }
      return null;
    }
    case 'late_night_cutoff': {
      const startHour = rule.trigger.startHour ?? 23;
      const endHour = rule.trigger.endHour ?? 4;
      const inWindow = startHour <= endHour
        ? localHour >= startHour && localHour < endHour
        : localHour >= startHour || localHour < endHour;
      if (inWindow) {
        return {
          ruleId: rule.id,
          ruleType: rule.rule_type,
          title: rule.title,
          ruleText: rule.description,
          enforcement: rule.enforcement,
          severity: rule.severity,
          reason: 'This check-in lands inside your restricted late-night window.',
        };
      }
      return null;
    }
    case 'ban_category': {
      const category = (rule.scope_value ?? rule.trigger.category ?? '').toLowerCase();
      const maxParlayLegs = rule.trigger.maxParlayLegs;
      const hitsCategory =
        lowerBetType.includes(category)
        || lowerSport === category
        || (category === 'parlay' && lowerBetType === 'parlay')
        || (category === 'prop' && lowerBetType === 'prop');
      if (category === 'parlay' && maxParlayLegs != null) {
        if (!hitsCategory || request.parlayLegs == null || request.parlayLegs <= maxParlayLegs) {
          return null;
        }
        return {
          ruleId: rule.id,
          ruleType: rule.rule_type,
          title: rule.title,
          ruleText: rule.description,
          enforcement: rule.enforcement,
          severity: rule.severity,
          reason: `This ${request.parlayLegs}-leg parlay exceeds your current ${maxParlayLegs}-leg limit.`,
        };
      }
      if (category && hitsCategory) {
        return {
          ruleId: rule.id,
          ruleType: rule.rule_type,
          title: rule.title,
          ruleText: rule.description,
          enforcement: rule.enforcement,
          severity: rule.severity,
          reason: `This bet matches your current ${category} restriction.`,
        };
      }
      return null;
    }
    case 'stake_cap': {
      const cap = rule.trigger.maxStake;
      const multiplier = rule.trigger.maxStakeMultiplier;
      const medianStake = [...recentBets]
        .filter((bet) => bet.result === 'win' || bet.result === 'loss')
        .map((bet) => Number(bet.stake))
        .sort((a, b) => a - b);
      const median = medianStake.length > 0 ? medianStake[Math.floor(medianStake.length / 2)] : null;
      if (cap != null && request.stake > cap) {
        return {
          ruleId: rule.id,
          ruleType: rule.rule_type,
          title: rule.title,
          ruleText: rule.description,
          enforcement: rule.enforcement,
          severity: rule.severity,
          reason: `This stake is above your cap of $${cap.toFixed(0)}.`,
        };
      }
      if (median != null && multiplier != null && request.stake > median * multiplier) {
        return {
          ruleId: rule.id,
          ruleType: rule.rule_type,
          title: rule.title,
          ruleText: rule.description,
          enforcement: rule.enforcement,
          severity: rule.severity,
          reason: `This stake is above your ${multiplier.toFixed(2)}x rolling median limit.`,
        };
      }
      return null;
    }
    case 'session_limit': {
      const limit = rule.trigger.sessionLimit ?? 4;
      const currentCount = getCurrentSessionBetCount(recentBets, request.placedAt);
      if (currentCount >= limit) {
        return {
          ruleId: rule.id,
          ruleType: rule.rule_type,
          title: rule.title,
          ruleText: rule.description,
          enforcement: rule.enforcement,
          severity: rule.severity,
          reason: `This would be bet ${currentCount + 1} inside the same session, above your cap of ${limit}.`,
        };
      }
      return null;
    }
    case 'cooldown_after_loss': {
      // Bet rows store placement time and final result, not settlement time.
      // An explicit active cooldown can still enforce this control, but the
      // evaluator must not manufacture the missing start time from placed_at.
      return null;
    }
    case 'emotion_block': {
      const blockedEmotions = new Set((rule.trigger.blockedEmotions ?? []).map((emotion) => emotion.toLowerCase()));
      const state = reflection?.emotionalState?.toLowerCase();
      if ((state && blockedEmotions.has(state)) || reflection?.tryingToWinBackLosses) {
        return {
          ruleId: rule.id,
          ruleType: rule.rule_type,
          title: rule.title,
          ruleText: rule.description,
          enforcement: rule.enforcement,
          severity: rule.severity,
          reason: reflection?.tryingToWinBackLosses
            ? 'You marked that you are trying to win losses back.'
            : `You marked your current state as ${state}.`,
        };
      }
      return null;
    }
    case 'post_heated_session_pause': {
      const recentHeated = recentRiskEvents.find((event) => event.event_type === 'heated_session');
      if (recentHeated && Date.now() - new Date(recentHeated.event_at).getTime() <= MILLIS_PER_DAY) {
        return {
          ruleId: rule.id,
          ruleType: rule.rule_type,
          title: rule.title,
          ruleText: rule.description,
          enforcement: rule.enforcement,
          severity: rule.severity,
          reason: 'A heated session was logged recently. This rule keeps you out of the same-day relapse window.',
        };
      }
      return null;
    }
    case 'rapid_fire_limit': {
      const lastBet = recentBets
        .filter((bet) => betSequencePartition(bet) === 'instant')
        .sort((a, b) => (betSequenceTimeMs(b) ?? 0) - (betSequenceTimeMs(a) ?? 0))[0];
      const waitMinutes = rule.trigger.waitMinutes ?? 30;
      if (!lastBet) return null;
      const lastBetTime = betSequenceTimeMs(lastBet);
      if (lastBetTime === null) return null;
      const minutesSince = (new Date(request.placedAt).getTime() - lastBetTime) / 60000;
      if (minutesSince >= 0 && minutesSince < waitMinutes) {
        return {
          ruleId: rule.id,
          ruleType: rule.rule_type,
          title: rule.title,
          ruleText: rule.description,
          enforcement: rule.enforcement,
          severity: rule.severity,
          reason: `This check-in comes ${Math.round(minutesSince)} minutes after the last bet. Your rapid-fire guardrail is ${waitMinutes} minutes.`,
        };
      }
      return null;
    }
    default:
      return null;
  }
}

export function evaluateCheckInAgainstControlState(params: {
  request: PreBetCheckInRequest;
  rules: ControlRule[];
  cooldowns: Cooldown[];
  riskEvents: RiskEvent[];
  recentBets: Bet[];
  activePlan: ControlPlan | null;
}): CheckInEvaluationResult {
  const { request, rules, cooldowns, riskEvents, recentBets, activePlan } = params;
  const activeCooldown = getActiveCooldown(cooldowns);
  const ruleViolations = rules
    .map((rule) => evaluateSingleRule(rule, request, recentBets, riskEvents))
    .filter((violation): violation is CheckInRuleViolation => Boolean(violation));

  const recentRiskContext = buildRecentRiskContext(riskEvents);
  const planContext = activePlan
    ? {
        planName: activePlan.name,
        adherenceSummary: [
          activePlan.settings.maximumUnitSize ? `Max unit $${activePlan.settings.maximumUnitSize}` : null,
          activePlan.settings.lossStreakStop ? `Stop after ${activePlan.settings.lossStreakStop} losses` : null,
          activePlan.settings.lateNightCutoffHour != null ? `No bets after ${activePlan.settings.lateNightCutoffHour}:00` : null,
        ].filter(Boolean).join(' · '),
        referencedRules: rules.filter((rule) => rule.status === 'active').slice(0, 3).map((rule) => rule.title),
      }
    : null;

  const reflectionPrompts: CheckInReflectionPrompt[] = [
    { id: 'purpose', question: 'Why are you placing this bet?', responseType: 'text' },
    { id: 'chasing', question: 'Are you trying to win back prior losses?', responseType: 'boolean' },
    { id: 'counterfactual', question: 'Would you place this if your last bet had won?', responseType: 'boolean' },
  ];

  const hasHardViolation = ruleViolations.some((violation) => violation.enforcement === 'hard');
  const hasSoftViolation = ruleViolations.some((violation) => violation.enforcement === 'soft');
  const reflectionSignals = Boolean(
    request.reflection?.tryingToWinBackLosses
    || request.reflection?.emotionalState === 'angry'
    || request.reflection?.emotionalState === 'tilted'
    || request.reflection?.wouldBetIfLastBetWon === false
  );

  const actionGate: CheckInActionGate = activeCooldown || hasHardViolation
    ? 'blocked'
    : hasSoftViolation || recentRiskContext.length > 0 || reflectionSignals
    ? 'reflection_required'
    : 'clear';

  return {
    actionGate,
    ruleViolations,
    cooldown: activeCooldown
      ? {
          active: true,
          cooldownId: activeCooldown.id,
          expiresAt: activeCooldown.expires_at,
          summary: activeCooldown.trigger_reason,
          triggerType: activeCooldown.trigger_type,
        }
      : null,
    recentRiskContext,
    planContext,
    reflectionPrompts: actionGate === 'clear' ? [] : reflectionPrompts,
    overrideRequired: actionGate === 'blocked',
  };
}

function recurrenceCountForType(riskEvents: RiskEvent[], type: RiskEventType, windowDays: number): number {
  const cutoff = Date.now() - windowDays * MILLIS_PER_DAY;
  return riskEvents.filter(
    (event) => event.event_type === type && new Date(event.event_at).getTime() >= cutoff
  ).length + 1;
}

function mapRuleTypeToRiskEvent(ruleType: ControlRule['rule_type']): RiskEventType {
  switch (ruleType) {
    case 'late_night_cutoff':
      return 'late_night_bet';
    case 'stake_cap':
      return 'oversized_stake';
    case 'loss_streak_stop':
      return 'loss_streak_breach';
    case 'cooldown_after_loss':
      return 'post_loss_escalation';
    case 'ban_category':
      return 'bet_type_relapse';
    case 'rapid_fire_limit':
      return 'rapid_fire_session';
    case 'emotion_block':
      return 'emotion_trigger';
    default:
      return 'rule_violation';
  }
}

export function buildRiskEventDraftsFromCheckIn(params: {
  flags: Array<{ title: string; detail: string; severity: 'high' | 'medium' | 'low' | 'info' }>;
  evaluation: CheckInEvaluationResult;
  riskEvents: RiskEvent[];
}): RiskEventDraft[] {
  const drafts: RiskEventDraft[] = [];

  for (const violation of params.evaluation.ruleViolations) {
    const eventType = mapRuleTypeToRiskEvent(violation.ruleType);
    drafts.push({
      event_type: eventType,
      severity: violation.severity === 'critical' ? 'critical' : violation.severity === 'guardrail' ? 'high' : 'warning',
      summary: violation.title,
      detail: violation.reason,
      recurrence_count: recurrenceCountForType(params.riskEvents, eventType, 14),
      window_days: 14,
      rule_id: violation.ruleId,
      metadata: { enforcement: violation.enforcement },
    });
  }

  for (const flag of params.flags) {
    const title = flag.title.toLowerCase();
    const eventType: RiskEventType | null = title.includes('late-night')
      ? 'late_night_bet'
      : title.includes('above usual stake')
      ? 'oversized_stake'
      : title.includes('post-loss escalation')
      ? 'post_loss_escalation'
      : null;
    if (!eventType) continue;
    drafts.push({
      event_type: eventType,
      severity: flag.severity === 'high' ? 'high' : flag.severity === 'medium' ? 'warning' : 'info',
      summary: flag.title,
      detail: flag.detail,
      recurrence_count: recurrenceCountForType(params.riskEvents, eventType, 12),
      window_days: 12,
    });
  }

  return drafts;
}

export function buildCooldownDraftFromEvaluation(
  evaluation: CheckInEvaluationResult,
  request: PreBetCheckInRequest,
): CooldownDraft | null {
  if (evaluation.cooldown?.active) return null;
  if (evaluation.actionGate !== 'blocked') return null;

  const hardViolation = evaluation.ruleViolations.find((violation) => violation.enforcement === 'hard');
  const now = new Date(request.placedAt);

  if (hardViolation?.ruleText.toLowerCase().includes('late-night')) {
    return {
      trigger_type: 'rule_violation',
      trigger_reason: 'Late-night cutoff rule violated.',
      user_explanation: 'You are inside a restricted late-night window.',
      expires_at: new Date(now.getTime() + 8 * MILLIS_PER_HOUR).toISOString(),
      rule_id: hardViolation.ruleId,
    };
  }

  if (hardViolation?.ruleText.toLowerCase().includes('loss')) {
    return {
      trigger_type: 'rule_violation',
      trigger_reason: 'Loss-streak stop rule activated.',
      user_explanation: 'Your control plan says the session ends here.',
      expires_at: new Date(now.getTime() + 24 * MILLIS_PER_HOUR).toISOString(),
      rule_id: hardViolation.ruleId,
    };
  }

  return {
    trigger_type: 'rule_violation',
    trigger_reason: 'A hard rule blocked this check-in.',
    user_explanation: 'The product is forcing a pause because the current bet conflicts with your live control rules.',
    expires_at: new Date(now.getTime() + 2 * MILLIS_PER_HOUR).toISOString(),
    rule_id: hardViolation?.ruleId ?? null,
  };
}

export function activeRecoveryLanguage(recoveryMode: RecoveryModeState): {
  dashboardEyebrow: string;
  dashboardHeadline: string;
  dashboardBody: string;
} {
  if (!recoveryMode.active) {
    return {
      dashboardEyebrow: 'CONTROL SYSTEM',
      dashboardHeadline: 'Build rules before the next risky session writes them for you.',
      dashboardBody: 'Adopt your plan, keep live guardrails visible, and turn report findings into active product behavior.',
    };
  }

  return {
    dashboardEyebrow: 'RECOVERY MODE',
    dashboardHeadline: 'The priority right now is restraint, not momentum.',
    dashboardBody: recoveryMode.supportMessage,
  };
}
