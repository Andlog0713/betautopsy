'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { apiGet } from '@/lib/api-client';
import AutopsyReport from '@/components/AutopsyReport';
import type { AutopsyAnalysis } from '@/types';

interface ReportData {
  id: string;
  user_id: string;
  report_type: string;
  bet_count_analyzed: number;
  date_range_start: string | null;
  date_range_end: string | null;
  report_json: AutopsyAnalysis;
  model_used: string | null;
  tokens_used: number | null;
  cost_cents: number | null;
  created_at: string;
}

interface UserData {
  id: string;
  email: string;
  display_name: string;
  subscription_tier: string;
  bet_count: number;
  created_at: string;
}

export default function AdminReportDetailClient() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [report, setReport] = useState<ReportData | null>(null);
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      // Quick admin check
      const supabase = createClient();
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) { router.push('/login'); return; }
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', authUser.id)
        .single();
      if (!profile?.is_admin) { router.push('/dashboard'); return; }

      try {
        const res = await apiGet(`/api/admin/reports/${id}`);
        if (res.status === 403) { router.push('/dashboard'); return; }
        if (res.status === 404) { setError('Report not found'); setLoading(false); return; }
        if (!res.ok) { setError('Failed to load report'); setLoading(false); return; }

        const data = await res.json();
        setReport(data.report);
        setUser(data.user);
      } catch {
        setError('Failed to load report');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id, router]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="card h-12 animate-pulse bg-ink-800" />
        <div className="card h-96 animate-pulse bg-ink-800" />
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="card p-8 text-center">
        <p className="text-red-400 mb-4">{error || 'Report not found'}</p>
        <button
          onClick={() => router.push('/admin/reports')}
          className="text-scalpel hover:underline text-sm"
        >
          Back to reports
        </button>
      </div>
    );
  }

  const analysis = report.report_json;

  return (
    <div className="space-y-4">
      {/* Admin header bar */}
      <div className="card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/admin/reports')}
            className="text-ink-600 hover:text-fg-bright transition-colors text-sm"
          >
            &larr; All Reports
          </button>
          <span className="text-white/[0.1]">|</span>
          <div>
            <p className="text-fg-bright font-medium text-sm">
              {user?.display_name ?? 'Unknown User'}
            </p>
            <p className="text-ink-600 text-xs">{user?.email ?? report.user_id}</p>
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs text-ink-600">
          <span>
            {new Date(report.created_at).toLocaleDateString('en-US', {
              month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
            })}
          </span>
          <span>{report.bet_count_analyzed} bets</span>
          {report.tokens_used && (
            <span>{report.tokens_used.toLocaleString()} tokens</span>
          )}
          {report.cost_cents && (
            <span>${(report.cost_cents / 100).toFixed(2)}</span>
          )}
        </div>
      </div>

      <AutopsyReport
        analysis={analysis}
        reportId={report.id}
        tier={(user?.subscription_tier as 'free' | 'pro') ?? 'free'}
      />
    </div>
  );
}
