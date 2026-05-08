'use client';

import useSWR, { type KeyedMutator } from 'swr';
import { createBrowserSupabaseClient } from '@/lib/supabase-browser';
import { useUser } from '@/hooks/useUser';
import type { AutopsyReport } from '@/types';

// Lightweight summary row — drops the heavy `report_json` + `report_markdown`
// columns so the list query stays small. The full row is fetched on demand
// via `useReport(id)` when a user opens a specific report.
export type AutopsyReportSummary = Omit<
  AutopsyReport,
  'report_json' | 'report_markdown'
>;

export type ReportsKey = readonly ['reports', string];
export type ReportKey = readonly ['report', string];

async function fetchReports([, userId]: ReportsKey): Promise<AutopsyReportSummary[]> {
  const supabase = createBrowserSupabaseClient();
  const { data, error } = await supabase
    .from('autopsy_reports')
    .select(
      'id, user_id, report_type, bet_count_analyzed, date_range_start, date_range_end, model_used, tokens_used, cost_cents, is_paid, stripe_payment_intent_id, upgraded_from_snapshot_id, created_at'
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as AutopsyReportSummary[];
}

async function fetchReport([, reportId]: ReportKey): Promise<AutopsyReport | null> {
  const supabase = createBrowserSupabaseClient();
  const { data, error } = await supabase
    .from('autopsy_reports')
    .select('*')
    .eq('id', reportId)
    .single();
  if (error) {
    if ((error as { code?: string }).code === 'PGRST116') return null; // no rows
    throw error;
  }
  return (data as AutopsyReport) ?? null;
}

export interface UseReportsResult {
  reports: AutopsyReportSummary[];
  isLoading: boolean;
  error: unknown;
  mutate: KeyedMutator<AutopsyReportSummary[]>;
}

export function useReports(): UseReportsResult {
  const { user } = useUser();
  const key: ReportsKey | null = user ? (['reports', user.id] as const) : null;
  const { data, error, isLoading, mutate } = useSWR<AutopsyReportSummary[]>(
    key,
    fetchReports,
    {
      dedupingInterval: 30_000,
      revalidateOnFocus: false,
    }
  );
  return {
    reports: data ?? [],
    isLoading: isLoading || !user,
    error,
    mutate,
  };
}

export interface UseReportResult {
  report: AutopsyReport | null;
  isLoading: boolean;
  error: unknown;
  mutate: KeyedMutator<AutopsyReport | null>;
}

export function useReport(reportId: string | null): UseReportResult {
  const key: ReportKey | null = reportId ? (['report', reportId] as const) : null;
  const { data, error, isLoading, mutate } = useSWR<AutopsyReport | null>(
    key,
    fetchReport,
    {
      dedupingInterval: 60_000,
      revalidateOnFocus: false,
    }
  );
  return {
    report: data ?? null,
    isLoading,
    error,
    mutate,
  };
}
