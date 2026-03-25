'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';

interface AdminReport {
  id: string;
  created_at: string;
  report_type: string;
  bet_count_analyzed: number;
  date_range_start: string | null;
  date_range_end: string | null;
  model_used: string | null;
  tokens_used: number | null;
  cost_cents: number | null;
  overall_grade: string;
  total_profit: number;
  roi_percent: number;
  emotion_score: number | null;
  tilt_score: number | null; // backward compat
  user: {
    id: string;
    email: string;
    display_name: string;
    tier: string;
    bet_count: number;
    joined: string;
  } | null;
}

function gradeColor(grade: string): string {
  const g = grade.toUpperCase();
  if (g.startsWith('A')) return 'text-mint-500';
  if (g.startsWith('B')) return 'text-mint-500/70';
  if (g.startsWith('C')) return 'text-amber-400';
  if (g.startsWith('D')) return 'text-orange-400';
  return 'text-red-400';
}

const tierBadge: Record<string, string> = {
  free: 'bg-ink-700/30 text-ink-500 border border-white/[0.06]',
  pro: 'bg-flame-500/10 text-flame-500 border border-flame-500/20',
  sharp: 'bg-mint-500/10 text-mint-500 border border-mint-500/20',
};

export default function AdminReportsPage() {
  const router = useRouter();
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const limit = 20;

  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: limit.toString() });
      if (search) params.set('search', search);

      const res = await fetch(`/api/admin/reports?${params}`);
      if (res.status === 403) {
        router.push('/dashboard');
        return;
      }
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to load reports');
        return;
      }
      const data = await res.json();
      setReports(data.reports);
      setTotal(data.total);
    } catch {
      setError('Failed to load reports');
    } finally {
      setLoading(false);
    }
  }, [page, search, router]);

  useEffect(() => {
    // Quick admin check client-side (API enforces it server-side too)
    async function checkAdmin() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single();
      if (!profile?.is_admin) { router.push('/dashboard'); return; }
      fetchReports();
    }
    checkAdmin();
  }, [fetchReports, router]);

  const totalPages = Math.ceil(total / limit);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">All User Reports</h1>
          <p className="text-ink-600 text-sm mt-1">
            {total} total report{total !== 1 ? 's' : ''} across all users
          </p>
        </div>
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="text"
            placeholder="Search by email or name..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="bg-ink-900 border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-[#F0F0F0] placeholder-ink-700 focus:outline-none focus:border-flame-500/40 w-64"
          />
          <button
            type="submit"
            className="bg-flame-500/10 text-flame-500 hover:bg-flame-500/20 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
          >
            Search
          </button>
        </form>
      </div>

      {error && (
        <div className="card p-4 border-red-400/30 bg-red-400/5 text-red-400 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="card h-20 animate-pulse bg-ink-800" />
          ))}
        </div>
      ) : reports.length === 0 ? (
        <div className="card p-8 text-center text-ink-600">
          {search ? 'No reports found matching your search.' : 'No reports yet.'}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="text-left text-ink-600 font-medium px-4 py-3">User</th>
                  <th className="text-left text-ink-600 font-medium px-4 py-3">Tier</th>
                  <th className="text-center text-ink-600 font-medium px-4 py-3">Grade</th>
                  <th className="text-right text-ink-600 font-medium px-4 py-3">Bets</th>
                  <th className="text-right text-ink-600 font-medium px-4 py-3">P&L</th>
                  <th className="text-right text-ink-600 font-medium px-4 py-3">ROI</th>
                  <th className="text-right text-ink-600 font-medium px-4 py-3 hidden md:table-cell">Emotion</th>
                  <th className="text-right text-ink-600 font-medium px-4 py-3 hidden lg:table-cell">Tokens</th>
                  <th className="text-right text-ink-600 font-medium px-4 py-3 hidden lg:table-cell">Cost</th>
                  <th className="text-left text-ink-600 font-medium px-4 py-3">Date</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((r) => (
                  <tr key={r.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-[#F0F0F0] truncate max-w-[200px]">
                          {r.user?.display_name ?? 'Unknown'}
                        </p>
                        <p className="text-ink-600 text-xs truncate max-w-[200px]">
                          {r.user?.email ?? r.id}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded capitalize ${tierBadge[r.user?.tier ?? 'free']}`}>
                        {r.user?.tier ?? 'free'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`font-bold text-lg ${gradeColor(r.overall_grade)}`}>
                        {r.overall_grade}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-ink-500">
                      {r.bet_count_analyzed}
                    </td>
                    <td className={`px-4 py-3 text-right font-mono font-medium ${
                      Number(r.total_profit) >= 0 ? 'text-mint-500' : 'text-red-400'
                    }`}>
                      {Number(r.total_profit) >= 0 ? '+' : ''}${Number(r.total_profit).toFixed(0)}
                    </td>
                    <td className={`px-4 py-3 text-right font-mono ${
                      Number(r.roi_percent) >= 0 ? 'text-mint-500' : 'text-red-400'
                    }`}>
                      {Number(r.roi_percent).toFixed(1)}%
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-ink-500 hidden md:table-cell">
                      {(r.emotion_score ?? r.tilt_score) !== null ? `${r.emotion_score ?? r.tilt_score}/100` : '—'}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-ink-600 hidden lg:table-cell">
                      {r.tokens_used ? r.tokens_used.toLocaleString() : '—'}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-ink-600 hidden lg:table-cell">
                      {r.cost_cents ? `$${(r.cost_cents / 100).toFixed(2)}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-ink-500 text-xs whitespace-nowrap">
                      {new Date(r.created_at).toLocaleDateString('en-US', {
                        month: 'short', day: 'numeric', year: 'numeric',
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-white/[0.06]">
              <p className="text-ink-600 text-xs">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="text-xs px-3 py-1.5 rounded-lg bg-ink-800 text-ink-500 hover:text-[#F0F0F0] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="text-xs px-3 py-1.5 rounded-lg bg-ink-800 text-ink-500 hover:text-[#F0F0F0] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
