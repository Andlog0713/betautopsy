'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, Clock3, PauseCircle, PlayCircle } from 'lucide-react';
import { toast } from 'sonner';
import { apiPost } from '@/lib/api-client';
import { useControlSystem } from '@/hooks/useControlSystem';
import type {
  ControlPlanSettings,
  ControlRule,
  ControlRuleEnforcement,
  ControlRuleSuggestion,
} from '@/types';

interface PlanFormState {
  maximumUnitSize: string;
  sessionLimit: string;
  lossStreakStop: string;
  lateNightCutoffHour: string;
  postLossWaitingPeriodMinutes: string;
  bannedBetCategories: string;
  accountabilityMessage: string;
  whyThisMatters: string;
}

function parseNumber(value: string): number | null {
  if (!value.trim()) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function toPlanForm(plan: { settings: ControlPlanSettings; accountability_message: string | null; why_this_matters: string | null } | null): PlanFormState {
  return {
    maximumUnitSize: plan?.settings.maximumUnitSize != null ? String(plan.settings.maximumUnitSize) : '',
    sessionLimit: plan?.settings.sessionLimit != null ? String(plan.settings.sessionLimit) : '',
    lossStreakStop: plan?.settings.lossStreakStop != null ? String(plan.settings.lossStreakStop) : '',
    lateNightCutoffHour: plan?.settings.lateNightCutoffHour != null ? String(plan.settings.lateNightCutoffHour) : '',
    postLossWaitingPeriodMinutes: plan?.settings.postLossWaitingPeriodMinutes != null ? String(plan.settings.postLossWaitingPeriodMinutes) : '',
    bannedBetCategories: (plan?.settings.bannedBetCategories ?? []).join(', '),
    accountabilityMessage: plan?.accountability_message ?? '',
    whyThisMatters: plan?.why_this_matters ?? '',
  };
}

function suggestionToPayload(rule: ControlRuleSuggestion) {
  return {
    title: rule.title,
    description: rule.description,
    rationale: rule.rationale,
    rule_type: rule.rule_type,
    scope: rule.scope,
    scope_value: rule.scope_value,
    severity: rule.severity,
    enforcement: rule.enforcement,
    provenance: rule.provenance,
    trigger: rule.trigger,
  };
}

export default function ControlPageClient() {
  const { controlState: data, isLoading: loading, error, mutate } = useControlSystem();
  const [planForm, setPlanForm] = useState<PlanFormState>(toPlanForm(null));
  const [savingPlan, setSavingPlan] = useState(false);
  const [manualRecoveryReason, setManualRecoveryReason] = useState('');
  const [customRule, setCustomRule] = useState({
    title: '',
    description: '',
    rationale: '',
    enforcement: 'soft' as ControlRuleEnforcement,
  });
  const [busyRuleId, setBusyRuleId] = useState<string | null>(null);
  const [busySuggestion, setBusySuggestion] = useState<string | null>(null);
  const [busyCooldown, setBusyCooldown] = useState(false);

  useEffect(() => {
    if (!data) return;
    setPlanForm(toPlanForm(data.activePlan ?? data.suggestedPlan));
    setManualRecoveryReason(data.recoveryMode.manual ? data.recoveryMode.summary : '');
  }, [data]);

  const unadoptedSuggestions = useMemo(() => {
    if (!data) return [];
    return data.suggestedRules.filter(
      (suggestion) => !data.rules.some((rule) => rule.title.toLowerCase() === suggestion.title.toLowerCase()),
    );
  }, [data]);

  async function savePlan() {
    if (!data) return;
    setSavingPlan(true);
    try {
      const settings: ControlPlanSettings = {
        bettingHours: {
          startHour: null,
          endHour: parseNumber(planForm.lateNightCutoffHour),
          timezoneLabel: 'Local time',
        },
        maximumUnitSize: parseNumber(planForm.maximumUnitSize),
        bannedBetCategories: planForm.bannedBetCategories
          .split(',')
          .map((value) => value.trim())
          .filter(Boolean),
        sessionLimit: parseNumber(planForm.sessionLimit),
        lossStreakStop: parseNumber(planForm.lossStreakStop),
        lateNightCutoffHour: parseNumber(planForm.lateNightCutoffHour),
        postLossWaitingPeriodMinutes: parseNumber(planForm.postLossWaitingPeriodMinutes),
        reflectionQuestion: data.activePlan?.settings.reflectionQuestion ?? data.suggestedPlan?.settings.reflectionQuestion ?? 'Would I still place this if my last bet had won?',
      };

      const res = await apiPost('/api/control-system', {
        action: 'save_plan',
        plan_id: data.activePlan?.id,
        name: 'My Control Plan',
        status: 'active',
        source_report_id: data.activePlan?.source_report_id ?? data.suggestedPlan?.source_report_id ?? null,
        settings,
        accountability_message: planForm.accountabilityMessage || null,
        why_this_matters: planForm.whyThisMatters || null,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to save plan');
      toast.success('Control plan saved');
      await mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save plan');
    } finally {
      setSavingPlan(false);
    }
  }

  async function adoptSuggestion(rule: ControlRuleSuggestion) {
    setBusySuggestion(rule.title);
    try {
      const res = await apiPost('/api/control-system', {
        action: 'create_rule',
        rule: suggestionToPayload(rule),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to adopt rule');
      toast.success('Rule adopted');
      await mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to adopt rule');
    } finally {
      setBusySuggestion(null);
    }
  }

  async function toggleRule(rule: ControlRule) {
    setBusyRuleId(rule.id);
    try {
      const res = await apiPost('/api/control-system', {
        action: 'toggle_rule',
        rule_id: rule.id,
        status: rule.status === 'active' ? 'paused' : 'active',
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to update rule');
      toast.success(rule.status === 'active' ? 'Rule paused' : 'Rule reactivated');
      await mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update rule');
    } finally {
      setBusyRuleId(null);
    }
  }

  async function createCustomRule() {
    if (!customRule.title.trim() || !customRule.description.trim() || !customRule.rationale.trim()) {
      toast.error('Add a title, rule text, and rationale');
      return;
    }
    setBusyRuleId('custom');
    try {
      const res = await apiPost('/api/control-system', {
        action: 'create_rule',
        rule: {
          title: customRule.title,
          description: customRule.description,
          rationale: customRule.rationale,
          rule_type: 'custom',
          scope: 'global',
          severity: customRule.enforcement === 'hard' ? 'critical' : 'guardrail',
          enforcement: customRule.enforcement,
          provenance: 'user_authored',
          trigger: {},
        },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to create rule');
      toast.success('Custom rule created');
      setCustomRule({ title: '', description: '', rationale: '', enforcement: 'soft' });
      await mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create rule');
    } finally {
      setBusyRuleId(null);
    }
  }

  async function startCooldown(hours: number) {
    setBusyCooldown(true);
    try {
      const res = await apiPost('/api/control-system', {
        action: 'start_cooldown',
        trigger_type: 'user_choice',
        trigger_reason: 'Manual cooldown from Control Center',
        user_explanation: 'Pausing to protect the plan before placing more bets.',
        duration_hours: hours,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to start cooldown');
      toast.success(`${hours}-hour cooldown started`);
      await mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to start cooldown');
    } finally {
      setBusyCooldown(false);
    }
  }

  async function toggleRecoveryMode() {
    const enabling = !data?.recoveryMode.manual;
    try {
      const res = await apiPost('/api/control-system', {
        action: 'set_recovery_mode',
        enabled: enabling,
        reason: enabling ? manualRecoveryReason || 'Manual recovery mode enabled from Control Center.' : null,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to update recovery mode');
      toast.success(enabling ? 'Recovery Mode enabled' : 'Recovery Mode disabled');
      await mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update recovery mode');
    }
  }

  if (loading) {
    return <div className="space-y-4"><div className="case-card h-40 animate-pulse" /><div className="case-card h-80 animate-pulse" /></div>;
  }

  if (!data || error) {
    return (
      <div className="case-card p-8 space-y-4">
        <p className="case-header">CONTROL CENTER // LOAD FAILURE</p>
        <p className="text-fg-muted text-sm">{error instanceof Error ? error.message : 'Unable to load the control system.'}</p>
        <button onClick={() => void mutate()} className="btn-primary text-sm">Retry</button>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <section className={`card p-6 md:p-7 ${data.recoveryMode.active ? 'border-loss/30 bg-loss/[0.03]' : ''}`}>
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <p className={`case-header mb-3 ${data.recoveryMode.active ? 'text-loss' : 'case-header-teal'}`}>
              {data.recoveryMode.active ? 'RECOVERY MODE' : 'CONTROL CENTER'}
            </p>
            <h1 className="font-bold text-3xl text-fg-bright tracking-tight mb-3">
              {data.recoveryMode.active ? 'The product is in protection mode.' : 'Turn report findings into live operating rules.'}
            </h1>
            <p className="text-fg-muted text-sm leading-relaxed">
              {data.summary.topMessage}
            </p>
          </div>
          <div className="flex flex-col gap-3 min-w-[260px]">
            <textarea
              value={manualRecoveryReason}
              onChange={(event) => setManualRecoveryReason(event.target.value)}
              placeholder="Optional note to your future self"
              className="bg-surface-1 border border-border-subtle rounded-sm px-3 py-2 text-sm text-fg min-h-[90px]"
            />
            <button onClick={() => void toggleRecoveryMode()} className="btn-secondary text-sm">
              {data.recoveryMode.manual ? 'Exit Manual Recovery Mode' : 'Enter Manual Recovery Mode'}
            </button>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => void startCooldown(24)} className="btn-primary text-sm" disabled={busyCooldown}>
                {busyCooldown ? 'Starting...' : '24h Cooldown'}
              </button>
              <button onClick={() => void startCooldown(72)} className="btn-secondary text-sm" disabled={busyCooldown}>
                72h Cooldown
              </button>
            </div>
          </div>
        </div>

        {data.recoveryMode.triggers.length > 0 && (
          <div className="mt-6 pl-4 border-l-2 border-l-loss/70 space-y-2">
            {data.recoveryMode.triggers.map((trigger) => (
              <p key={trigger} className="text-sm text-fg-muted flex items-start gap-2">
                <AlertTriangle size={14} className="text-loss shrink-0 mt-0.5" />
                {trigger}
              </p>
            ))}
          </div>
        )}

        <div className="mt-6 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <p className="case-header">SUPPORT OPTIONS</p>
            <Link href="/support" className="text-sm text-scalpel link-underline font-mono">
              Open Support Page
            </Link>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {data.supportResources.map((resource) => (
              <div key={resource.label} className="card-tier-2 p-4">
                <p className="text-fg-bright text-sm font-medium">{resource.label}</p>
                <p className="text-fg-muted text-sm mt-2">{resource.value}</p>
                {resource.href && (
                  <a
                    href={resource.href}
                    target={resource.href.startsWith('http') ? '_blank' : undefined}
                    rel={resource.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                    className="inline-block text-sm text-scalpel link-underline mt-3"
                  >
                    Open
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="card p-6 md:p-7">
        <div className="flex items-center justify-between gap-4 mb-5">
          <div>
            <p className="case-header mb-2">MY PLAN</p>
            <h2 className="font-bold text-2xl text-fg-bright">Live control plan</h2>
          </div>
          <button onClick={() => void savePlan()} className="btn-primary text-sm" disabled={savingPlan}>
            {savingPlan ? 'Saving...' : 'Save Plan'}
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className="case-header">Max Unit Size</span>
            <input
              value={planForm.maximumUnitSize}
              onChange={(event) => setPlanForm((prev) => ({ ...prev, maximumUnitSize: event.target.value }))}
              className="w-full bg-surface-1 border border-border-subtle rounded-sm px-3 py-2 text-sm text-fg"
              placeholder="125"
            />
          </label>
          <label className="space-y-2">
            <span className="case-header">Session Limit</span>
            <input
              value={planForm.sessionLimit}
              onChange={(event) => setPlanForm((prev) => ({ ...prev, sessionLimit: event.target.value }))}
              className="w-full bg-surface-1 border border-border-subtle rounded-sm px-3 py-2 text-sm text-fg"
              placeholder="4"
            />
          </label>
          <label className="space-y-2">
            <span className="case-header">Loss-Streak Stop</span>
            <input
              value={planForm.lossStreakStop}
              onChange={(event) => setPlanForm((prev) => ({ ...prev, lossStreakStop: event.target.value }))}
              className="w-full bg-surface-1 border border-border-subtle rounded-sm px-3 py-2 text-sm text-fg"
              placeholder="3"
            />
          </label>
          <label className="space-y-2">
            <span className="case-header">Late-Night Cutoff Hour</span>
            <input
              value={planForm.lateNightCutoffHour}
              onChange={(event) => setPlanForm((prev) => ({ ...prev, lateNightCutoffHour: event.target.value }))}
              className="w-full bg-surface-1 border border-border-subtle rounded-sm px-3 py-2 text-sm text-fg"
              placeholder="23"
            />
          </label>
          <label className="space-y-2">
            <span className="case-header">Post-Loss Wait (Minutes)</span>
            <input
              value={planForm.postLossWaitingPeriodMinutes}
              onChange={(event) => setPlanForm((prev) => ({ ...prev, postLossWaitingPeriodMinutes: event.target.value }))}
              className="w-full bg-surface-1 border border-border-subtle rounded-sm px-3 py-2 text-sm text-fg"
              placeholder="30"
            />
          </label>
          <label className="space-y-2 md:col-span-2">
            <span className="case-header">Banned Bet Categories</span>
            <input
              value={planForm.bannedBetCategories}
              onChange={(event) => setPlanForm((prev) => ({ ...prev, bannedBetCategories: event.target.value }))}
              className="w-full bg-surface-1 border border-border-subtle rounded-sm px-3 py-2 text-sm text-fg"
              placeholder="parlay, nba props, dfs 5+ picks"
            />
          </label>
          <label className="space-y-2 md:col-span-2">
            <span className="case-header">Accountability Message</span>
            <textarea
              value={planForm.accountabilityMessage}
              onChange={(event) => setPlanForm((prev) => ({ ...prev, accountabilityMessage: event.target.value }))}
              className="w-full bg-surface-1 border border-border-subtle rounded-sm px-3 py-2 text-sm text-fg min-h-[88px]"
            />
          </label>
          <label className="space-y-2 md:col-span-2">
            <span className="case-header">Why This Matters</span>
            <textarea
              value={planForm.whyThisMatters}
              onChange={(event) => setPlanForm((prev) => ({ ...prev, whyThisMatters: event.target.value }))}
              className="w-full bg-surface-1 border border-border-subtle rounded-sm px-3 py-2 text-sm text-fg min-h-[88px]"
            />
          </label>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="card p-6 md:p-7">
          <div className="flex items-center justify-between gap-4 mb-5">
            <div>
              <p className="case-header mb-2">ACTIVE RULES</p>
              <h2 className="font-bold text-2xl text-fg-bright">Guardrails currently live</h2>
            </div>
            <span className="text-sm text-fg-dim">{data.rules.filter((rule) => rule.status === 'active').length} active</span>
          </div>
          <div className="space-y-3">
            {data.rules.length === 0 && (
              <p className="text-fg-muted text-sm">No live rules yet. Adopt the suggested ones below or write your own.</p>
            )}
            {data.rules.map((rule) => (
              <div key={rule.id} className="card-tier-2 p-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-fg-bright font-medium">{rule.description}</p>
                  <p className="text-fg-muted text-sm mt-1">{rule.rationale}</p>
                  <p className="text-fg-dim text-xs font-mono mt-2 uppercase tracking-[1.5px]">
                    {rule.enforcement} · {rule.provenance.replace(/_/g, ' ')} · {rule.status}
                  </p>
                </div>
                <button
                  onClick={() => void toggleRule(rule)}
                  disabled={busyRuleId === rule.id}
                  className="btn-secondary text-sm shrink-0 inline-flex items-center gap-2"
                >
                  {rule.status === 'active' ? <PauseCircle size={14} /> : <PlayCircle size={14} />}
                  {busyRuleId === rule.id ? 'Saving...' : rule.status === 'active' ? 'Pause' : 'Reactivate'}
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-6 md:p-7">
          <p className="case-header mb-2">SUGGESTED RULES</p>
          <h2 className="font-bold text-2xl text-fg-bright mb-5">Generated from your last report</h2>
          <div className="space-y-3">
            {unadoptedSuggestions.length === 0 && (
              <p className="text-fg-muted text-sm">Everything suggested by the report is already active or there is no recent report to pull from.</p>
            )}
            {unadoptedSuggestions.map((rule) => (
              <div key={rule.title} className="card-tier-2 p-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-fg-bright font-medium">{rule.description}</p>
                  <p className="text-fg-muted text-sm mt-1">{rule.rationale}</p>
                  <p className="text-fg-dim text-xs font-mono mt-2 uppercase tracking-[1.5px]">
                    {rule.enforcement} · {rule.source}
                  </p>
                </div>
                <button
                  onClick={() => void adoptSuggestion(rule)}
                  disabled={busySuggestion === rule.title}
                  className="btn-secondary text-sm shrink-0"
                >
                  {busySuggestion === rule.title ? 'Adopting...' : 'Adopt'}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="card p-6 md:p-7">
          <p className="case-header mb-2">WRITE A RULE</p>
          <h2 className="font-bold text-2xl text-fg-bright mb-5">Custom guardrail</h2>
          <div className="space-y-4">
            <input
              value={customRule.title}
              onChange={(event) => setCustomRule((prev) => ({ ...prev, title: event.target.value }))}
              className="w-full bg-surface-1 border border-border-subtle rounded-sm px-3 py-2 text-sm text-fg"
              placeholder="Short label"
            />
            <textarea
              value={customRule.description}
              onChange={(event) => setCustomRule((prev) => ({ ...prev, description: event.target.value }))}
              className="w-full bg-surface-1 border border-border-subtle rounded-sm px-3 py-2 text-sm text-fg min-h-[90px]"
              placeholder="Concrete rule text. Example: No bets within 45 minutes of a loss."
            />
            <textarea
              value={customRule.rationale}
              onChange={(event) => setCustomRule((prev) => ({ ...prev, rationale: event.target.value }))}
              className="w-full bg-surface-1 border border-border-subtle rounded-sm px-3 py-2 text-sm text-fg min-h-[80px]"
              placeholder="Why this rule exists"
            />
            <select
              value={customRule.enforcement}
              onChange={(event) => setCustomRule((prev) => ({ ...prev, enforcement: event.target.value as ControlRuleEnforcement }))}
              className="w-full bg-surface-1 border border-border-subtle rounded-sm px-3 py-2 text-sm text-fg"
            >
              <option value="soft">Soft friction</option>
              <option value="hard">Hard friction</option>
            </select>
            <button onClick={() => void createCustomRule()} className="btn-primary text-sm" disabled={busyRuleId === 'custom'}>
              {busyRuleId === 'custom' ? 'Creating...' : 'Create Rule'}
            </button>
          </div>
        </div>

        <div className="card p-6 md:p-7">
          <p className="case-header mb-2">COOLDOWNS</p>
          <h2 className="font-bold text-2xl text-fg-bright mb-5">Active pauses and recent breaks</h2>
          <div className="space-y-3">
            {data.activeCooldown ? (
              <div className="card-tier-2 p-4 border-l-2 border-l-loss/70">
                <div className="flex items-center gap-2 text-loss text-sm font-medium mb-2">
                  <Clock3 size={14} />
                  Active until {new Date(data.activeCooldown.expires_at).toLocaleString()}
                </div>
                <p className="text-fg-bright">{data.activeCooldown.trigger_reason}</p>
                <p className="text-fg-muted text-sm mt-1">{data.activeCooldown.user_explanation}</p>
              </div>
            ) : (
              <p className="text-fg-muted text-sm">No active cooldown right now.</p>
            )}
            {data.cooldowns.slice(0, 5).map((cooldown) => (
              <div key={cooldown.id} className="border-b border-border-subtle pb-3">
                <p className="text-sm text-fg-bright">{cooldown.trigger_reason}</p>
                <p className="text-xs text-fg-dim mt-1">
                  {cooldown.status.toUpperCase()} · started {new Date(cooldown.triggered_at).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="card p-6 md:p-7">
        <p className="case-header mb-2">RISK HISTORY</p>
        <h2 className="font-bold text-2xl text-fg-bright mb-5">Repeat-risk timeline</h2>
        <div className="space-y-3">
          {data.riskEvents.length === 0 && (
            <p className="text-fg-muted text-sm">No risk events logged yet. Once the control system catches repeat patterns, they will show up here with recurrence counts.</p>
          )}
          {data.riskEvents.map((event) => (
            <div key={event.id} className="card-tier-2 p-4">
              <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-fg-bright font-medium">{event.summary}</p>
                  <p className="text-fg-muted text-sm mt-1">{event.detail}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className={`text-xs font-mono uppercase tracking-[1.5px] ${
                    event.severity === 'critical' ? 'text-loss' : event.severity === 'high' ? 'text-caution' : 'text-fg-dim'
                  }`}>
                    {event.severity}
                  </p>
                  <p className="text-xs text-fg-dim mt-1">
                    {event.recurrence_count}x in {event.window_days}d
                  </p>
                </div>
              </div>
              <p className="text-xs text-fg-dim mt-3">
                {new Date(event.event_at).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
