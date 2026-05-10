'use client';

import useSWR, { type KeyedMutator } from 'swr';
import { createBrowserSupabaseClient } from '@/lib/supabase-browser';
import { useUser } from '@/hooks/useUser';
import type { AutopsyReport } from '@/types';

// Note: PR 2 originally planned a lightweight summary list (no report_json /
// report_markdown), with `useReport(id)` fetching the heavy row on click.
// Reverted: the /reports list rows render bias chips, grade, record, and
// profit directly off `analysis = report.report_json` — dropping that column
// from the list query breaks the UI. Hard rule "Do NOT modify any UI/styling
// /copy" wins over the perf concern. Future cleanup: denormalize summary
// fields onto the autopsy_reports row at insert time and revisit the
// projection. Until then, useReports returns full AutopsyReport rows; the
// total payload is bounded by the user's report count (typically 1–10).
export type ReportsKey = readonly ['reports', string];
export type ReportKey = readonly ['report', string];

async function fetchReports([, userId]: ReportsKey): Promise<AutopsyReport[]> {
  const supabase = createBrowserSupabaseClient();
  const { data, error } = await supabase
    .from('autopsy_reports')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as AutopsyReport[];
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
  reports: AutopsyReport[];
  isLoading: boolean;
  error: unknown;
  mutate: KeyedMutator<AutopsyReport[]>;
}

export function useReports(): UseReportsResult {
  const { user } = useUser();
  const key: ReportsKey | null = user ? (['reports', user.id] as const) : null;
  const { data, error, isLoading, mutate } = useSWR<AutopsyReport[]>(
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

// Thin projection used by /dashboard. Drops `report_json` (per-bet
// analysis blob — scales linearly with bet count, can hit MBs on
// high-volume accounts) and `report_markdown` (free-form prose, also
// large). The dashboard only reads `length` + `[0].created_at`, so
// shipping the full row is pure waste — was the dominant cold-load
// cost on a $100k-bets account (~10s of the original 12s figure).
//
// Separate SWR key from useReports so the two caches don't collide.
// The full /reports list page still uses useReports().
export interface ReportSummary {
  id: string;
  created_at: string;
  report_type: 'snapshot' | 'full' | string;
}

export type ReportsSummaryKey = readonly ['reports-summary', string];

async function fetchReportsSummary([
  ,
  userId,
]: ReportsSummaryKey): Promise<ReportSummary[]> {
  const supabase = createBrowserSupabaseClient();
  const { data, error } = await supabase
    .from('autopsy_reports')
    .select('id, created_at, report_type')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as ReportSummary[];
}

export interface UseReportsSummaryResult {
  reports: ReportSummary[];
  isLoading: boolean;
  error: unknown;
  mutate: KeyedMutator<ReportSummary[]>;
}

export function useReportsSummary(): UseReportsSummaryResult {
  const { user } = useUser();
  const key: ReportsSummaryKey | null = user
    ? (['reports-summary', user.id] as const)
    : null;
  const { data, error, isLoading, mutate } = useSWR<ReportSummary[]>(
    key,
    fetchReportsSummary,
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
