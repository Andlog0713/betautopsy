'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, Clock3, RefreshCw, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { apiPost } from '@/lib/api-client';
import { useControlSystem } from '@/hooks/useControlSystem';
import { activeRecoveryLanguage } from '@/lib/control-system';
import type { ControlRuleSuggestion } from '@/types';

function toRulePayload(rule: ControlRuleSuggestion) {
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
    source_report_id: null,
  };
}

export default function ControlSystemPanel() {
  const { controlState: state, isLoading: loading, error, mutate } = useControlSystem();
  const [busyRule, setBusyRule] = useState<string | null>(null);
  const [busyCooldown, setBusyCooldown] = useState(false);

  async function adoptRule(rule: ControlRuleSuggestion) {
    setBusyRule(rule.title);
    try {
      const res = await apiPost('/api/control-system', {
        action: 'create_rule',
        rule: toRulePayload(rule),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to adopt rule');
      toast.success('Rule adopted');
      await mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to adopt rule');
    } finally {
      setBusyRule(null);
    }
  }

  async function startCooldown() {
    setBusyCooldown(true);
    try {
      const res = await apiPost('/api/control-system', {
        action: 'start_cooldown',
        trigger_type: 'user_choice',
        trigger_reason: 'Manual cooldown from dashboard',
        user_explanation: 'Starting a pause before placing anything else.',
        duration_hours: 24,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to start cooldown');
      toast.success('24-hour cooldown started');
      await mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to start cooldown');
    } finally {
      setBusyCooldown(false);
    }
  }

  if (loading) {
    return <div className="case-card h-56 animate-pulse" />;
  }

  if (!state || error) {
    return (
      <section className="border-t border-white/[0.04] pt-10 mb-12">
        <div className="case-card p-6 space-y-3">
          <p className="case-header">CONTROL SYSTEM // UNAVAILABLE</p>
          <p className="text-fg-muted text-sm">{error instanceof Error ? error.message : 'Unable to load control state.'}</p>
          <button onClick={() => void mutate()} className="btn-secondary inline-flex items-center gap-2 text-sm">
            <RefreshCw size={14} />
            Retry
          </button>
        </div>
      </section>
    );
  }

  const copy = activeRecoveryLanguage(state.recoveryMode);
  const suggestedRules = state.suggestedRules.filter(
    (rule) => !state.rules.some((existing) => existing.title.toLowerCase() === rule.title.toLowerCase()),
  );

  return (
    <section className="border-t border-white/[0.04] pt-10 mb-12">
      <div className={`card p-6 md:p-7 ${state.recoveryMode.active ? 'border-loss/30 bg-loss/[0.03]' : ''}`}>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <p className={`case-header mb-3 ${state.recoveryMode.active ? 'text-loss' : 'case-header-teal'}`}>
              {copy.dashboardEyebrow}
            </p>
            <h2 className="font-bold text-2xl text-fg-bright tracking-tight mb-2">
              {copy.dashboardHeadline}
            </h2>
            <p className="text-fg-muted text-sm leading-relaxed">
              {copy.dashboardBody}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => void startCooldown()}
              className="btn-secondary text-sm inline-flex items-center gap-2"
              disabled={busyCooldown}
            >
              <Clock3 size={14} />
              {busyCooldown ? 'Starting...' : 'Start 24h Cooldown'}
            </button>
            <Link href="/control" className="btn-primary text-sm inline-flex items-center gap-2">
              <ShieldCheck size={14} />
              Open Control Center
            </Link>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3 mt-6">
          <div className="card-tier-1 p-4">
            <p className="case-header mb-2">LIVE RULES</p>
            <p className="text-2xl data-number text-fg-bright leading-none">{state.summary.activeRuleCount}</p>
            <p className="text-xs text-fg-dim mt-2">
              {state.summary.hardRuleCount} hard. {state.summary.softRuleCount} soft.
            </p>
          </div>
          <div className="card-tier-1 p-4">
            <p className="case-header mb-2">COOLDOWN</p>
            <p className="text-2xl data-number text-fg-bright leading-none">
              {state.summary.activeCooldownHoursRemaining != null
                ? `${state.summary.activeCooldownHoursRemaining}h`
                : '—'}
            </p>
            <p className="text-xs text-fg-dim mt-2">
              {state.activeCooldown?.trigger_reason ?? 'No active cooldown'}
            </p>
          </div>
          <div className="card-tier-1 p-4">
            <p className="case-header mb-2">RECENT RISK</p>
            <p className="text-2xl data-number text-fg-bright leading-none">{state.summary.recentHighRiskEvents}</p>
            <p className="text-xs text-fg-dim mt-2">
              {state.summary.repeatPatternMessage ?? 'No repeat-risk escalation logged yet.'}
            </p>
          </div>
        </div>

        {state.recoveryMode.active && (
          <div className="mt-5 pl-4 border-l-2 border-l-loss/70 space-y-2">
            <div className="flex items-center gap-2 text-loss text-sm font-medium">
              <AlertTriangle size={14} />
              Recovery triggers
            </div>
            {state.recoveryMode.triggers.map((trigger) => (
              <p key={trigger} className="text-sm text-fg-muted">
                {trigger}
              </p>
            ))}
          </div>
        )}

        {(state.recoveryMode.active || state.activeCooldown) && (
          <div className="mt-6 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <p className="case-header">SUPPORT OPTIONS</p>
              <Link href="/support" className="text-sm text-scalpel link-underline font-mono">
                Open Support Page
              </Link>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {state.supportResources.slice(0, 4).map((resource) => (
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
        )}

        {suggestedRules.length > 0 && (
          <div className="mt-6">
            <p className="case-header mb-3">ADOPT THESE FIRST</p>
            <div className="space-y-2.5">
              {suggestedRules.slice(0, 3).map((rule) => (
                <div key={rule.title} className="card-tier-2 p-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <p className="text-fg-bright font-medium">{rule.description}</p>
                    <p className="text-fg-muted text-sm mt-1">{rule.rationale}</p>
                    <p className="text-fg-dim text-xs font-mono mt-2 uppercase tracking-[1.5px]">
                      {rule.enforcement} friction · {rule.source}
                    </p>
                  </div>
                  <button
                    onClick={() => void adoptRule(rule)}
                    disabled={busyRule === rule.title}
                    className="btn-secondary text-sm shrink-0"
                  >
                    {busyRule === rule.title ? 'Adopting...' : 'Adopt Rule'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
