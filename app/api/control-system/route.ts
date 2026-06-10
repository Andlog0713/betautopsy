import { NextResponse } from 'next/server';
import { getAuthenticatedClient } from '@/lib/supabase-from-request';
import { logErrorServer } from '@/lib/log-error-server';
import {
  buildControlSystemSummary,
  buildSuggestedPlanFromAnalysis,
  buildSuggestedRulesFromAnalysis,
  deriveRecoveryModeState,
} from '@/lib/control-system';
import { SUPPORT_RESOURCES } from '@/lib/support-resources';
import type {
  AutopsyAnalysis,
  ControlPlan,
  ControlPlanSettings,
  ControlRule,
  ControlRuleEnforcement,
  ControlRuleProvenance,
  ControlRuleScope,
  ControlRuleSeverity,
  ControlRuleStatus,
  ControlRuleSuggestion,
  ControlRuleTrigger,
  ControlRuleType,
  Cooldown,
  CooldownStatus,
  CooldownTriggerType,
  RiskEvent,
  RiskEventSeverity,
  RiskEventType,
} from '@/types';

type RawJson = Record<string, unknown>;
type ErrorLike = { code?: string; message?: string };

function asObject(value: unknown): RawJson {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as RawJson : {};
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : [];
}

function isErrorLike(value: unknown): value is ErrorLike {
  return Boolean(value) && typeof value === 'object';
}

function isMissingControlSchemaError(error: unknown): boolean {
  if (!isErrorLike(error)) return false;
  const code = typeof error.code === 'string' ? error.code : '';
  const message = typeof error.message === 'string' ? error.message.toLowerCase() : '';

  return code === '42P01'
    || code === '42703'
    || code === 'PGRST205'
    || message.includes('does not exist')
    || message.includes('could not find the table')
    || message.includes('could not find the relation');
}

function missingControlSchemaResponse() {
  return NextResponse.json(
    { error: 'Control system storage is not ready yet. Run the latest Supabase migration and try again.' },
    { status: 503 },
  );
}

function normalizePlan(row: Record<string, unknown>): ControlPlan {
  const settings = asObject(row.settings) as unknown as ControlPlanSettings;
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    name: String(row.name ?? 'My Control Plan'),
    status: (row.status as ControlPlan['status']) ?? 'draft',
    source_report_id: row.source_report_id ? String(row.source_report_id) : null,
    settings,
    accountability_message: typeof row.accountability_message === 'string' ? row.accountability_message : null,
    why_this_matters: typeof row.why_this_matters === 'string' ? row.why_this_matters : null,
    decisions: asArray(row.decisions),
    activated_at: typeof row.activated_at === 'string' ? row.activated_at : null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

function normalizeRule(row: Record<string, unknown>): ControlRule {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    plan_id: row.plan_id ? String(row.plan_id) : null,
    source_report_id: row.source_report_id ? String(row.source_report_id) : null,
    title: String(row.title ?? ''),
    description: String(row.description ?? ''),
    rationale: String(row.rationale ?? ''),
    rule_type: row.rule_type as ControlRuleType,
    scope: row.scope as ControlRuleScope,
    scope_value: typeof row.scope_value === 'string' ? row.scope_value : null,
    severity: row.severity as ControlRuleSeverity,
    enforcement: row.enforcement as ControlRuleEnforcement,
    status: row.status as ControlRuleStatus,
    provenance: row.provenance as ControlRuleProvenance,
    trigger: asObject(row.trigger_json) as ControlRuleTrigger,
    start_at: String(row.start_at),
    end_at: typeof row.end_at === 'string' ? row.end_at : null,
    last_triggered_at: typeof row.last_triggered_at === 'string' ? row.last_triggered_at : null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

function normalizeCooldown(row: Record<string, unknown>): Cooldown {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    rule_id: typeof row.rule_id === 'string' ? row.rule_id : null,
    risk_event_id: typeof row.risk_event_id === 'string' ? row.risk_event_id : null,
    trigger_type: row.trigger_type as CooldownTriggerType,
    trigger_reason: String(row.trigger_reason ?? ''),
    user_explanation: String(row.user_explanation ?? ''),
    triggered_at: String(row.triggered_at),
    expires_at: String(row.expires_at),
    status: row.status as CooldownStatus,
    override_reason: typeof row.override_reason === 'string' ? row.override_reason : null,
    broken_at: typeof row.broken_at === 'string' ? row.broken_at : null,
    created_at: String(row.created_at),
  };
}

function normalizeRiskEvent(row: Record<string, unknown>): RiskEvent {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    source_report_id: typeof row.source_report_id === 'string' ? row.source_report_id : null,
    rule_id: typeof row.rule_id === 'string' ? row.rule_id : null,
    cooldown_id: typeof row.cooldown_id === 'string' ? row.cooldown_id : null,
    check_in_id: typeof row.check_in_id === 'string' ? row.check_in_id : null,
    event_type: row.event_type as RiskEventType,
    severity: row.severity as RiskEventSeverity,
    summary: String(row.summary ?? ''),
    detail: String(row.detail ?? ''),
    recurrence_count: Number(row.recurrence_count ?? 1),
    window_days: Number(row.window_days ?? 14),
    event_at: String(row.event_at),
    metadata: asObject(row.metadata),
  };
}

async function loadControlState(userId: string, supabase: NonNullable<Awaited<ReturnType<typeof getAuthenticatedClient>>['supabase']>) {
  const [
    profileRes,
    reportRes,
    plansRes,
    rulesRes,
    cooldownsRes,
    riskEventsRes,
    checkInsRes,
  ] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).single(),
    supabase
      .from('autopsy_reports')
      .select('id, report_json')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('control_plans')
      .select('*')
      .eq('user_id', userId)
      .in('status', ['active', 'draft'])
      .order('updated_at', { ascending: false })
      .limit(1),
    supabase
      .from('control_rules')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false }),
    supabase
      .from('cooldowns')
      .select('*')
      .eq('user_id', userId)
      .order('triggered_at', { ascending: false })
      .limit(20),
    supabase
      .from('risk_events')
      .select('*')
      .eq('user_id', userId)
      .order('event_at', { ascending: false })
      .limit(40),
    supabase
      .from('pre_bet_checkins')
      .select('bet_quality_score, recommendation, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(12),
  ]);

  if (profileRes.error) throw profileRes.error;
  if (plansRes.error && !isMissingControlSchemaError(plansRes.error)) throw plansRes.error;
  if (rulesRes.error && !isMissingControlSchemaError(rulesRes.error)) throw rulesRes.error;
  if (cooldownsRes.error && !isMissingControlSchemaError(cooldownsRes.error)) throw cooldownsRes.error;
  if (riskEventsRes.error && !isMissingControlSchemaError(riskEventsRes.error)) throw riskEventsRes.error;
  if (checkInsRes.error) throw checkInsRes.error;
  if (reportRes.error) throw reportRes.error;

  const profile = profileRes.data;
  const latestReport = reportRes.data
    ? {
        id: String(reportRes.data.id),
        analysis: reportRes.data.report_json as AutopsyAnalysis,
      }
    : null;
  const planRows = isMissingControlSchemaError(plansRes.error) ? [] : (plansRes.data ?? []);
  const ruleRows = isMissingControlSchemaError(rulesRes.error) ? [] : (rulesRes.data ?? []);
  const cooldownRows = isMissingControlSchemaError(cooldownsRes.error) ? [] : (cooldownsRes.data ?? []);
  const riskEventRows = isMissingControlSchemaError(riskEventsRes.error) ? [] : (riskEventsRes.data ?? []);

  const activePlan = planRows[0] ? normalizePlan(planRows[0] as Record<string, unknown>) : null;
  const rules = ruleRows.map((row) => normalizeRule(row as Record<string, unknown>));
  const cooldowns = cooldownRows.map((row) => normalizeCooldown(row as Record<string, unknown>));
  const riskEvents = riskEventRows.map((row) => normalizeRiskEvent(row as Record<string, unknown>));

  const recoveryMode = deriveRecoveryModeState({
    profile,
    analysis: latestReport?.analysis ?? null,
    riskEvents,
    cooldowns,
    recentCheckIns: (checkInsRes.data ?? []) as Array<{ bet_quality_score: number; recommendation: string; created_at: string }>,
  });

  const suggestedRules = latestReport ? buildSuggestedRulesFromAnalysis(latestReport.analysis) : [];
  const suggestedPlan = latestReport
    ? { ...buildSuggestedPlanFromAnalysis(latestReport.analysis, latestReport.id), user_id: userId }
    : null;
  const summary = buildControlSystemSummary({ rules, cooldowns, riskEvents, recoveryMode });

  return {
    activePlan,
    suggestedPlan,
    rules,
    suggestedRules,
    activeCooldown: cooldowns.find((cooldown) => cooldown.status === 'active' && new Date(cooldown.expires_at).getTime() > Date.now()) ?? null,
    cooldowns,
    riskEvents,
    recoveryMode,
    summary,
    supportResources: SUPPORT_RESOURCES,
  };
}

function validateRulePayload(raw: unknown): { ok: true; value: Omit<ControlRule, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'last_triggered_at'> } | { ok: false; error: string } {
  if (!raw || typeof raw !== 'object') return { ok: false, error: 'rule payload must be an object' };
  const rule = raw as Record<string, unknown>;
  if (typeof rule.title !== 'string' || typeof rule.description !== 'string' || typeof rule.rationale !== 'string') {
    return { ok: false, error: 'rule needs title, description, and rationale' };
  }

  return {
    ok: true,
    value: {
      plan_id: typeof rule.plan_id === 'string' ? rule.plan_id : null,
      source_report_id: typeof rule.source_report_id === 'string' ? rule.source_report_id : null,
      title: rule.title,
      description: rule.description,
      rationale: rule.rationale,
      rule_type: (rule.rule_type as ControlRuleType) ?? 'custom',
      scope: (rule.scope as ControlRuleScope) ?? 'global',
      scope_value: typeof rule.scope_value === 'string' ? rule.scope_value : null,
      severity: (rule.severity as ControlRuleSeverity) ?? 'guardrail',
      enforcement: (rule.enforcement as ControlRuleEnforcement) ?? 'soft',
      status: (rule.status as ControlRuleStatus) ?? 'active',
      provenance: (rule.provenance as ControlRuleProvenance) ?? 'user_authored',
      trigger: asObject(rule.trigger) as ControlRuleTrigger,
      start_at: typeof rule.start_at === 'string' ? rule.start_at : new Date().toISOString(),
      end_at: typeof rule.end_at === 'string' ? rule.end_at : null,
    },
  };
}

export async function GET(request: Request) {
  const { supabase, user, error: authError } = await getAuthenticatedClient(request);
  if (authError || !user || !supabase) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const state = await loadControlState(user.id, supabase);
    return NextResponse.json(state);
  } catch (error) {
    await logErrorServer(error, { path: '/api/control-system', userId: user.id, metadata: { method: 'GET' } });
    return NextResponse.json({ error: 'Failed to load control system' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const { supabase, user, error: authError } = await getAuthenticatedClient(request);
  if (authError || !user || !supabase) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: RawJson;
  try {
    body = asObject(await request.json());
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const action = typeof body.action === 'string' ? body.action : '';

  try {
    if (action === 'save_plan') {
      const settings = asObject(body.settings) as unknown as ControlPlanSettings;
      const status = (body.status as ControlPlan['status']) ?? 'active';
      if (status === 'active') {
        await supabase
          .from('control_plans')
          .update({ status: 'archived' })
          .eq('user_id', user.id)
          .eq('status', 'active');
      }

      const payload = {
        user_id: user.id,
        name: typeof body.name === 'string' ? body.name : 'My Control Plan',
        status,
        source_report_id: typeof body.source_report_id === 'string' ? body.source_report_id : null,
        settings,
        accountability_message: typeof body.accountability_message === 'string' ? body.accountability_message : null,
        why_this_matters: typeof body.why_this_matters === 'string' ? body.why_this_matters : null,
        decisions: Array.isArray(body.decisions) ? body.decisions : [],
        activated_at: status === 'active' ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = typeof body.plan_id === 'string'
        ? await supabase.from('control_plans').update(payload).eq('id', body.plan_id).select('*').single()
        : await supabase.from('control_plans').insert(payload).select('*').single();

      if (isMissingControlSchemaError(error)) {
        return missingControlSchemaResponse();
      }
      if (error || !data) throw error ?? new Error('No plan row returned');
      return NextResponse.json({ plan: normalizePlan(data as Record<string, unknown>) });
    }

    if (action === 'create_rule') {
      const validated = validateRulePayload(body.rule);
      if (!validated.ok) {
        return NextResponse.json({ error: validated.error }, { status: 400 });
      }
      const rule = validated.value;
      const payload = {
        user_id: user.id,
        plan_id: rule.plan_id,
        source_report_id: rule.source_report_id,
        title: rule.title,
        description: rule.description,
        rationale: rule.rationale,
        rule_type: rule.rule_type,
        scope: rule.scope,
        scope_value: rule.scope_value,
        severity: rule.severity,
        enforcement: rule.enforcement,
        status: rule.status,
        provenance: rule.provenance,
        trigger_json: rule.trigger,
        start_at: rule.start_at,
        end_at: rule.end_at,
        updated_at: new Date().toISOString(),
      };
      const { data, error } = await supabase.from('control_rules').insert(payload).select('*').single();
      if (isMissingControlSchemaError(error)) {
        return missingControlSchemaResponse();
      }
      if (error || !data) throw error ?? new Error('No rule row returned');
      return NextResponse.json({ rule: normalizeRule(data as Record<string, unknown>) });
    }

    if (action === 'toggle_rule') {
      if (typeof body.rule_id !== 'string' || typeof body.status !== 'string') {
        return NextResponse.json({ error: 'rule_id and status are required' }, { status: 400 });
      }
      const { data, error } = await supabase
        .from('control_rules')
        .update({ status: body.status, updated_at: new Date().toISOString() })
        .eq('id', body.rule_id)
        .select('*')
        .single();
      if (isMissingControlSchemaError(error)) {
        return missingControlSchemaResponse();
      }
      if (error || !data) throw error ?? new Error('No rule row returned');
      return NextResponse.json({ rule: normalizeRule(data as Record<string, unknown>) });
    }

    if (action === 'start_cooldown') {
      const durationHours = typeof body.duration_hours === 'number' ? body.duration_hours : 24;
      const now = Date.now();
      const payload = {
        user_id: user.id,
        rule_id: typeof body.rule_id === 'string' ? body.rule_id : null,
        risk_event_id: typeof body.risk_event_id === 'string' ? body.risk_event_id : null,
        trigger_type: (body.trigger_type as CooldownTriggerType) ?? 'user_choice',
        trigger_reason: typeof body.trigger_reason === 'string' ? body.trigger_reason : 'Manual cooldown started.',
        user_explanation: typeof body.user_explanation === 'string'
          ? body.user_explanation
          : 'You chose to pause before betting again.',
        triggered_at: new Date(now).toISOString(),
        expires_at: new Date(now + durationHours * 60 * 60 * 1000).toISOString(),
        status: 'active',
      };
      const { data, error } = await supabase.from('cooldowns').insert(payload).select('*').single();
      if (isMissingControlSchemaError(error)) {
        return missingControlSchemaResponse();
      }
      if (error || !data) throw error ?? new Error('No cooldown row returned');
      return NextResponse.json({ cooldown: normalizeCooldown(data as Record<string, unknown>) });
    }

    if (action === 'set_recovery_mode') {
      if (typeof body.enabled !== 'boolean') {
        return NextResponse.json({ error: 'enabled must be a boolean' }, { status: 400 });
      }
      const { error } = await supabase
        .from('profiles')
        .update({
          manual_recovery_mode: body.enabled,
          recovery_mode_reason: body.enabled && typeof body.reason === 'string' ? body.reason : null,
          recovery_mode_started_at: body.enabled ? new Date().toISOString() : null,
        })
        .eq('id', user.id);
      if (isMissingControlSchemaError(error)) {
        return missingControlSchemaResponse();
      }
      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    await logErrorServer(error, {
      path: '/api/control-system',
      userId: user.id,
      metadata: { method: 'POST', action },
    });
    return NextResponse.json({ error: 'Failed to update control system' }, { status: 500 });
  }
}
