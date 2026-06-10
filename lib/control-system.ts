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
  PersonalRule,
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

function extractNumber(text: string): number | null {
  const match = text.match(/(\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) : null;
}

function extractDollar(text: string): number | null {
  const match = text.match(/\$([\d,]+(?:\.\d+)?)/);
  return match ? Number(match[1].replace(/,/g, '')) : null;
}

function sentenceCase(text: string): string {
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1);
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
  const sorted = [...recentBets].sort((a, b) => new Date(b.placed_at).getTime() - new Date(a.placed_at).getTime());
  let streak = 0;
  for (const bet of sorted) {
    if (bet.result === 'loss') {
      streak += 1;
      continue;
    }
    if (bet.result === 'win' || bet.result === 'push' || bet.result === 'void') break;
  }
  return streak;
}

function getCurrentSessionBetCount(recentBets: Bet[], placedAtIso: string): number {
  const target = new Date(placedAtIso).getTime();
  return recentBets.filter((bet) => {
    const placed = new Date(bet.placed_at).getTime();
    const delta = target - placed;
    return delta >= 0 && delta <= 6 * MILLIS_PER_HOUR;
  }).length;
}

function ruleTypeFromText(rule: string): ControlRuleSuggestion['rule_type'] {
  const lower = rule.toLowerCase();
  if (lower.includes('loss') && (lower.includes('stop') || lower.includes('done'))) return 'loss_streak_stop';
  if (lower.includes('after') && lower.includes('pm')) return 'late_night_cutoff';
  if (lower.includes('after') && lower.includes('loss') && lower.includes('cooldown')) return 'cooldown_after_loss';
  if (lower.includes('emotion') || lower.includes('angry') || lower.includes('tilted')) return 'emotion_block';
  if (lower.includes('session')) return 'session_limit';
  if (lower.includes('stake') || lower.includes('bet more than') || lower.includes('unit')) return 'stake_cap';
  if (lower.includes('rapid') || lower.includes('minutes of a loss')) return 'rapid_fire_limit';
  if (lower.includes('no ') || lower.includes('never') || lower.includes('ban')) return 'ban_category';
  return 'custom';
}

function inferRuleSuggestion(rule: PersonalRule): ControlRuleSuggestion {
  const ruleText = rule.rule.trim();
  const lower = ruleText.toLowerCase();
  const ruleType = rule.rule_type ?? ruleTypeFromText(ruleText);
  const numberValue = extractNumber(ruleText);
  const dollarValue = extractDollar(ruleText) ?? extractDollar(rule.reason);
  const trigger = rule.trigger ?? {};

  if (ruleType === 'loss_streak_stop' && numberValue) trigger.threshold = numberValue;
  if (ruleType === 'late_night_cutoff') {
    const hourMatch = lower.match(/after (\d{1,2})(?::\d{2})?\s*(am|pm)/);
    if (hourMatch) {
      let hour = Number(hourMatch[1]) % 12;
      if (hourMatch[2] === 'pm') hour += 12;
      trigger.startHour = hour;
    }
  }
  if (ruleType === 'stake_cap') {
    if (dollarValue) trigger.maxStake = dollarValue;
    if (lower.includes('median') && numberValue) trigger.maxStakeMultiplier = numberValue;
  }
  if (ruleType === 'session_limit' && numberValue) trigger.sessionLimit = numberValue;
  if (ruleType === 'cooldown_after_loss' && numberValue) trigger.waitMinutes = numberValue;
  if (ruleType === 'emotion_block') {
    trigger.blockedEmotions = ['angry', 'tilted', 'trying_to_win_it_back'];
  }
  if (ruleType === 'ban_category') {
    if (lower.includes('parlay')) {
      trigger.category = 'parlay';
    } else if (lower.includes('prop')) {
      trigger.category = 'prop';
    } else if (lower.includes('nba')) {
      trigger.category = 'nba';
    } else if (lower.includes('dfs')) {
      trigger.category = 'dfs';
    }
  }

  const hard =
    rule.enforcement === 'hard'
    || lower.startsWith('no ')
    || lower.startsWith('never')
    || lower.includes('stop for the day')
    || lower.includes('do not place');

  return {
    title: sentenceCase(ruleText.replace(/\.$/, '')),
    description: ruleText,
    rationale: rule.reason,
    rule_type: ruleType,
    scope: rule.scope ?? 'global',
    scope_value: rule.scope_value ?? null,
    severity: rule.severity ?? (hard ? 'critical' : 'guardrail'),
    enforcement: rule.enforcement ?? (hard ? 'hard' : 'soft'),
    provenance: rule.provenance ?? 'engine_recommended',
    trigger,
    source: rule.based_on,
  };
}

function hasRuleLike(rules: ControlRuleSuggestion[], type: ControlRuleSuggestion['rule_type'], category?: string): boolean {
  return rules.some((rule) => {
    if (rule.rule_type !== type) return false;
    if (!category) return true;
    return rule.trigger.category?.toLowerCase() === category.toLowerCase()
      || rule.scope_value?.toLowerCase() === category.toLowerCase()
      || rule.description.toLowerCase().includes(category.toLowerCase());
  });
}

export function buildSuggestedRulesFromAnalysis(analysis: AutopsyAnalysis): ControlRuleSuggestion[] {
  const suggestions = (analysis.personal_rules ?? []).map(inferRuleSuggestion);
  const summary = analysis.summary;
  const avgStake = summary.avg_stake || 0;
  const heatedSessionPercent = analysis.session_detection?.heatedSessionPercent ?? 0;

  if (
    analysis.biases_detected.some((bias) => bias.bias_name === 'Post-Loss Escalation')
    && !hasRuleLike(suggestions, 'loss_streak_stop')
  ) {
    suggestions.push({
      title: 'Stop after 3 straight losses',
      description: 'After 3 losses in a row, stop betting for the rest of the day.',
      rationale: 'Your report shows the worst damage happens once the third loss turns into a chase sequence.',
      rule_type: 'loss_streak_stop',
      scope: 'session',
      scope_value: null,
      severity: 'critical',
      enforcement: 'hard',
      provenance: 'engine_recommended',
      trigger: { threshold: 3, cooldownHours: 24 },
      source: 'Post-Loss Escalation',
    });
  }

  if (
    (analysis.timing_analysis?.late_night_stats?.count ?? 0) > 0
    && !hasRuleLike(suggestions, 'late_night_cutoff')
  ) {
    suggestions.push({
      title: 'No bets after 11:00 PM',
      description: 'No bets after 11:00 PM local time. Review lines in the morning instead.',
      rationale: 'Late-night bets are one of your repeat failure modes. The product should slow you down before that window opens.',
      rule_type: 'late_night_cutoff',
      scope: 'time_window',
      scope_value: '23:00-04:00',
      severity: 'guardrail',
      enforcement: 'hard',
      provenance: 'engine_recommended',
      trigger: { startHour: 23, endHour: 4, recurrenceWindowDays: 14 },
      source: 'Timing analysis',
    });
  }

  if (
    analysis.strategic_leaks.some((leak) => leak.category.toLowerCase().includes('parlay'))
    && !hasRuleLike(suggestions, 'ban_category', 'parlay')
  ) {
    suggestions.push({
      title: 'Pause parlays for 14 days',
      description: 'No parlays for the next 14 days. Straight bets only while you reset your process.',
      rationale: 'Your report already shows the category is leaking. The safest move is to remove easy relapse access for a short window.',
      rule_type: 'ban_category',
      scope: 'bet_type',
      scope_value: 'parlay',
      severity: 'guardrail',
      enforcement: 'hard',
      provenance: 'engine_recommended',
      trigger: { category: 'parlay', recurrenceWindowDays: 14 },
      source: 'Strategic leaks',
    });
  }

  if (!hasRuleLike(suggestions, 'stake_cap') && avgStake > 0) {
    const maxStake = Math.max(10, Math.round(avgStake * 1.25 / 5) * 5);
    suggestions.push({
      title: `Cap stake at $${maxStake}`,
      description: `No single bet can exceed $${maxStake} until your next report.`,
      rationale: 'Your control system should defend you from the outsized bet that usually follows a bad sequence.',
      rule_type: 'stake_cap',
      scope: 'global',
      scope_value: null,
      severity: 'guardrail',
      enforcement: 'hard',
      provenance: 'engine_recommended',
      trigger: { maxStake, maxStakeMultiplier: 1.25 },
      source: 'Sizing discipline',
    });
  }

  if (heatedSessionPercent >= 20 && !hasRuleLike(suggestions, 'post_heated_session_pause')) {
    suggestions.push({
      title: 'Automatic pause after a heated session',
      description: 'If a session is flagged as heated, no same-day betting after it ends.',
      rationale: 'Heated sessions are not isolated noise in your data. They repeat, and the next bet is usually part of the same spiral.',
      rule_type: 'post_heated_session_pause',
      scope: 'session',
      scope_value: null,
      severity: 'critical',
      enforcement: 'hard',
      provenance: 'engine_recommended',
      trigger: { cooldownHours: 24, recurrenceWindowDays: 14 },
      source: 'Session detection',
    });
  }

  if (analysis.emotion_score >= 55 && !hasRuleLike(suggestions, 'emotion_block')) {
    suggestions.push({
      title: 'Block angry or revenge-bet states',
      description: 'If you are angry, heated, or trying to win losses back, do not place the bet.',
      rationale: 'High emotion-score stretches should trigger a hard pause, not a softer pep talk.',
      rule_type: 'emotion_block',
      scope: 'emotion_state',
      scope_value: null,
      severity: 'critical',
      enforcement: 'hard',
      provenance: 'engine_recommended',
      trigger: { blockedEmotions: ['angry', 'tilted', 'trying_to_win_it_back'] },
      source: 'Emotion score',
    });
  }

  return suggestions.slice(0, 8);
}

function buildPlanSettings(analysis: AutopsyAnalysis, rules: ControlRuleSuggestion[]): ControlPlanSettings {
  const stakeCap = rules.find((rule) => rule.rule_type === 'stake_cap')?.trigger.maxStake ?? null;
  const lossStop = rules.find((rule) => rule.rule_type === 'loss_streak_stop')?.trigger.threshold ?? null;
  const lateNight = rules.find((rule) => rule.rule_type === 'late_night_cutoff')?.trigger.startHour ?? null;
  const sessionLimit = rules.find((rule) => rule.rule_type === 'session_limit')?.trigger.sessionLimit
    ?? ((analysis.session_detection?.heatedSessionCount ?? 0) > 0 ? 4 : null);
  const bannedBetCategories = rules
    .filter((rule) => rule.rule_type === 'ban_category')
    .map((rule) => rule.scope_value ?? rule.trigger.category ?? rule.title)
    .filter(Boolean);
  const waitMinutes = rules.find((rule) => rule.rule_type === 'cooldown_after_loss')?.trigger.waitMinutes
    ?? (analysis.biases_detected.some((bias) => bias.bias_name === 'Post-Loss Escalation') ? 30 : null);

  return {
    bettingHours: {
      startHour: null,
      endHour: lateNight,
      timezoneLabel: 'Local time',
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
      reason: 'Short pauses are the fastest way to interrupt the immediate revenge-bet impulse.',
    });
  }

  if ((analysis.session_detection?.heatedSessionCount ?? 0) > 0) {
    suggestions.push({
      trigger: 'Heated session',
      label: 'Next-day lockout after a heated session',
      durationLabel: '24 hours',
      durationHours: 24,
      reason: 'Your data shows same-day follow-ups after heated sessions tend to extend the damage, not repair it.',
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
// HARD DEPENDENCY: emotion_score and heatedSessionPercent are computed partly
// from the vig-mislabeled "luck" component and the timezone-broken late-night /
// heated-session signal (WS-NUMERIC / WS-TEMPORAL). When those engine fixes
// land, these cutoffs MUST be re-tuned in the same change — a user can cross or
// un-cross the recovery line from the math changing, not their behavior.
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

export function buildReportControlSystem(analysis: AutopsyAnalysis): ReportControlSystem {
  const rules = buildSuggestedRulesFromAnalysis(analysis);
  const hardRules = rules.filter((rule) => rule.enforcement === 'hard');
  const softRules = rules.filter((rule) => rule.enforcement === 'soft');
  const riskTier = classifyReportRiskTier(analysis);
  const recoveryModeRecommended = riskTier === 'recovery';
  const status = riskTier === 'recovery'
    ? 'recovery_mode'
    : riskTier === 'elevated'
    ? 'watch_mode'
    : 'support_mode';

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
      'Late-night betting windows',
      'Bets placed shortly after a loss',
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
      const hitsCategory =
        lowerBetType.includes(category)
        || lowerSport === category
        || (category === 'parlay' && lowerBetType === 'parlay')
        || (category === 'prop' && lowerBetType === 'prop');
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
      const waitMinutes = rule.trigger.waitMinutes ?? 30;
      const lastSettled = [...recentBets].sort(
        (a, b) => new Date(b.placed_at).getTime() - new Date(a.placed_at).getTime()
      )[0];
      if (lastSettled?.result !== 'loss') return null;
      const minutesSince = (new Date(request.placedAt).getTime() - new Date(lastSettled.placed_at).getTime()) / 60000;
      if (minutesSince >= 0 && minutesSince < waitMinutes) {
        return {
          ruleId: rule.id,
          ruleType: rule.rule_type,
          title: rule.title,
          ruleText: rule.description,
          enforcement: rule.enforcement,
          severity: rule.severity,
          reason: `Only ${Math.round(minutesSince)} minutes have passed since your last loss. Your cooldown requires ${waitMinutes}.`,
        };
      }
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
      const lastBet = [...recentBets].sort(
        (a, b) => new Date(b.placed_at).getTime() - new Date(a.placed_at).getTime()
      )[0];
      const waitMinutes = rule.trigger.waitMinutes ?? 30;
      if (!lastBet) return null;
      const minutesSince = (new Date(request.placedAt).getTime() - new Date(lastBet.placed_at).getTime()) / 60000;
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
