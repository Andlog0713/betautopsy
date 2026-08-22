'use client';

import useSWR, { type KeyedMutator } from 'swr';
import { useUser } from '@/hooks/useUser';
import { apiGet } from '@/lib/api-client';
import type { AutopsyReport, AutopsyReportListItem } from '@/types';

export type ReportsKey = readonly ['reports', string];
export type ReportKey = readonly ['report', string];

async function fetchReports(): Promise<AutopsyReportListItem[]> {
  const response = await apiGet('/api/reports');
  if (!response.ok) throw new Error('Failed to load reports');
  const payload = await response.json() as { reports?: AutopsyReportListItem[] };
  return payload.reports ?? [];
}

async function fetchReport([, reportId]: ReportKey): Promise<AutopsyReport | null> {
  const response = await apiGet(`/api/reports/${encodeURIComponent(reportId)}`);
  if (response.status === 404) return null;
  if (!response.ok) throw new Error('Failed to load report');
  const payload = await response.json() as { report?: AutopsyReport };
  return payload.report ?? null;
}

export interface UseReportsResult {
  reports: AutopsyReportListItem[];
  isLoading: boolean;
  error: unknown;
  mutate: KeyedMutator<AutopsyReportListItem[]>;
}

export function useReports(): UseReportsResult {
  const { user } = useUser();
  const key: ReportsKey | null = user ? (['reports', user.id] as const) : null;
  const { data, error, isLoading, mutate } = useSWR<AutopsyReportListItem[]>(
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

// The dashboard and upload pages only need identity and creation time. They
// share the authenticated summary API contract instead of querying Supabase
// directly, then discard the card fields they do not consume.
export interface ReportSummary {
  id: string;
  created_at: string;
  report_type: 'snapshot' | 'full' | string;
}

export type ReportsSummaryKey = readonly ['reports-summary', string];

async function fetchReportsSummary(): Promise<ReportSummary[]> {
  const reports = await fetchReports();
  return reports.map(({ id, created_at, report_type }) => ({ id, created_at, report_type }));
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
