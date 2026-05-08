'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createBrowserSupabaseClient } from '@/lib/supabase-browser';
import { useUser } from '@/hooks/useUser';
import { useUploads } from '@/hooks/useUploads';
import { FolderOpen } from 'lucide-react';
import type { Upload, Bet } from '@/types';

interface UploadWithStats extends Upload {
  record: string;
  netPnL: number;
  analyzed: boolean;
}

export default function UploadsPage() {
  const router = useRouter();
  const { profile } = useUser();
  const { uploads: rawUploads, mutate: mutateUploads } = useUploads();
  const tier = profile?.subscription_tier ?? 'free';

  // Computed-stats view of the cached uploads. Recomputed whenever the
  // hook returns fresh upload rows or the inline bets/reports projections
  // resolve below.
  const [uploads, setUploads] = useState<UploadWithStats[]>([]);
  const [legacyBets, setLegacyBets] = useState<Bet[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  // Per-upload stats need bets.upload_id/result/profit + reports.bet_count_analyzed/
  // created_at. Both are projection-only (small) and not generally cached
  // — leave as inline fetches that re-run when the underlying tables change
  // via mutate calls.
  const loadUploads = useCallback(async () => {
    const supabase = createBrowserSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [betsRes, reportsRes] = await Promise.all([
      supabase.from('bets').select('upload_id, result, profit').eq('user_id', user.id),
      supabase.from('autopsy_reports').select('bet_count_analyzed, created_at').eq('user_id', user.id),
    ]);

    const allBets = (betsRes.data ?? []) as { upload_id: string | null; result: string; profit: number }[];
    const reportsList = reportsRes.data ?? [];

    const uploadsList = rawUploads.map((u) => {
      const uBets = allBets.filter((b) => b.upload_id === u.id);
      const wins = uBets.filter((b) => b.result === 'win').length;
      const losses = uBets.filter((b) => b.result === 'loss').length;
      const pushes = uBets.filter((b) => b.result === 'push').length;
      const netPnL = uBets.reduce((s, b) => s + Number(b.profit), 0);
      const analyzed = reportsList.some((r: Record<string, unknown>) =>
        (r as { bet_count_analyzed: number }).bet_count_analyzed === uBets.length &&
        Math.abs(new Date((r as { created_at: string }).created_at).getTime() - new Date(u.created_at).getTime()) < 86400000 * 7
      );
      return { ...u, record: `${wins}W-${losses}L-${pushes}P`, netPnL, analyzed, bet_count: uBets.length || u.bet_count };
    });

    setUploads(uploadsList);

    const legacy = allBets.filter((b) => !b.upload_id);
    setLegacyBets(legacy as unknown as Bet[]);
    setLoading(false);
  }, [rawUploads]);

  useEffect(() => { loadUploads(); }, [loadUploads]);

  function toggleSelect(id: string) {
    setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  async function deleteUpload(uploadId: string, betCount: number) {
    if (!confirm(`Delete this upload and its ${betCount} bets? This cannot be undone.`)) return;
    const supabase = createBrowserSupabaseClient();
    await supabase.from('bets').delete().eq('upload_id', uploadId);
    await supabase.from('uploads').delete().eq('id', uploadId);
    setUploads((prev) => prev.filter((u) => u.id !== uploadId));
    setSelected((prev) => { const n = new Set(prev); n.delete(uploadId); return n; });
    mutateUploads();
  }

  async function deleteSelected() {
    if (selected.size === 0) return;
    const ids = Array.from(selected);
    const totalBets = uploads
      .filter((u) => selected.has(u.id))
      .reduce((sum, u) => sum + (u.bet_count ?? 0), 0);
    const msg =
      ids.length === 1
        ? `Delete this upload and its ${totalBets} bets? This cannot be undone.`
        : `Delete ${ids.length} uploads and their ${totalBets} bets? This cannot be undone.`;
    if (!confirm(msg)) return;
    const supabase = createBrowserSupabaseClient();
    // Delete bets first (FK), then uploads. Both `.in()` so it's a single
    // round-trip per table regardless of selection size.
    await supabase.from('bets').delete().in('upload_id', ids);
    await supabase.from('uploads').delete().in('id', ids);
    setUploads((prev) => prev.filter((u) => !selected.has(u.id)));
    setSelected(new Set());
    mutateUploads();
  }

  function selectAll() {
    setSelected(new Set(uploads.map((u) => u.id)));
  }

  async function saveName(uploadId: string) {
    const supabase = createBrowserSupabaseClient();
    await supabase.from('uploads').update({ display_name: editName }).eq('id', uploadId);
    setUploads((prev) => prev.map((u) => u.id === uploadId ? { ...u, display_name: editName } : u));
    setEditingId(null);
    mutateUploads();
  }

  function analyzeSelected() {
    const ids = Array.from(selected);
    if (ids.length === 1) {
      router.push(`/reports?upload_id=${ids[0]}`);
    } else {
      router.push(`/reports?upload_ids=${ids.join(',')}`);
    }
  }

  function compareSelected() {
    const ids = Array.from(selected);
    if (ids.length === 2) {
      router.push(`/uploads/compare?a=${ids[0]}&b=${ids[1]}`);
    }
  }

  const isPaid = tier === 'pro';
  const totalSelectedBets = uploads.filter((u) => selected.has(u.id)).reduce((s, u) => s + u.bet_count, 0);

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 w-32 bg-surface-1 rounded" />
        {[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-surface-1 rounded-sm" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-fg-bright">Upload History</h1>
          <p className="text-sm text-fg-muted mt-1">Your previous imports</p>
          <p className="text-xs text-fg-muted mt-0.5">{uploads.length} upload{uploads.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-3">
          {uploads.length > 0 && (
            <button
              type="button"
              onClick={selected.size === uploads.length ? () => setSelected(new Set()) : selectAll}
              className="text-xs text-fg-muted hover:text-fg transition-colors"
            >
              {selected.size === uploads.length ? 'Deselect All' : 'Select All'}
            </button>
          )}
          <Link href="/upload" className="btn-primary text-sm">Upload New CSV</Link>
        </div>
      </div>

      {/* Legacy bets notice */}
      {legacyBets.length > 0 && (
        <div className="card p-4 flex items-center justify-between">
          <div>
            <p className="text-sm text-fg-bright">Previous imports</p>
            <p className="text-xs text-fg-muted"><span className="font-mono">{legacyBets.length}</span> bets uploaded before upload tracking was enabled</p>
          </div>
          <Link href="/bets" className="text-xs text-scalpel hover:underline">View in Bet History</Link>
        </div>
      )}

      {uploads.length === 0 && legacyBets.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="mb-3"><FolderOpen size={32} className="text-fg-muted" /></div>
          <p className="text-fg-muted mb-4">No uploads yet.</p>
          <Link href="/upload" className="btn-primary">Upload Your First CSV</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {uploads.map((u) => {
            const name = u.display_name || u.filename || 'Upload';
            const isEditing = editingId === u.id;

            return (
              <div key={u.id} className={`card p-5 ${selected.has(u.id) ? 'border-scalpel/20 bg-scalpel-muted' : ''}`}>
                <div className="flex items-start gap-4">
                  <input
                    type="checkbox"
                    checked={selected.has(u.id)}
                    onChange={() => toggleSelect(u.id)}
                    className="mt-1 rounded border-border-subtle bg-surface-1 text-scalpel focus:ring-scalpel/40 cursor-pointer"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onBlur={() => saveName(u.id)}
                          onKeyDown={(e) => e.key === 'Enter' && saveName(u.id)}
                          className="input-field text-sm !py-1 !px-2 w-64"
                          autoFocus
                        />
                      ) : (
                        <>
                          <p className="font-medium truncate">{name}</p>
                          <button
                            onClick={() => { setEditingId(u.id); setEditName(name); }}
                            className="text-fg-dim hover:text-fg transition-colors shrink-0"
                            title="Rename"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                          </button>
                        </>
                      )}
                      <span className={`text-xs px-2 py-0.5 rounded-sm ${u.analyzed ? 'bg-win/10 text-win' : 'bg-surface-1 text-fg-muted'}`}>
                        {u.analyzed ? 'Analyzed' : 'Not analyzed'}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-fg-muted">
                      <span>{new Date(u.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      <span><span className="font-mono">{u.bet_count}</span> bets</span>
                      <span>{u.sportsbook ?? 'Multiple books'}</span>
                      <span className="font-mono">{u.record}</span>
                      <span className={`font-mono ${u.netPnL >= 0 ? 'text-win' : 'text-loss'}`}>
                        {u.netPnL >= 0 ? '+' : ''}${Math.round(u.netPnL).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Link href={`/uploads/${u.id}`} className="text-xs text-fg-muted hover:text-fg transition-colors">
                      View Bets
                    </Link>
                    <Link href={`/reports?upload_id=${u.id}`} className="text-xs text-scalpel hover:underline">
                      Analyze
                    </Link>
                    {/*
                     * Per-upload delete is available to every tier, not
                     * just Pro. Users who want to clean out a bad CSV
                     * import or remove their data shouldn't have to
                     * upgrade — and "right to delete" is also a privacy
                     * baseline (GDPR Art. 17 / CCPA).
                     */}
                    <button
                      onClick={() => deleteUpload(u.id, u.bet_count)}
                      className="text-xs text-fg-dim hover:text-loss transition-colors"
                      aria-label="Delete upload"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Multi-select action bar */}
      {selected.size > 0 && (
        <div className="card px-5 py-3 flex flex-wrap items-center gap-4">
          <span className="text-sm text-fg-bright">
            <span className="font-mono font-medium">{selected.size}</span> upload{selected.size !== 1 ? 's' : ''} selected (<span className="font-mono">{totalSelectedBets}</span> bets)
          </span>
          <button onClick={() => setSelected(new Set())} className="text-sm text-fg-muted hover:text-fg transition-colors">
            Deselect All
          </button>
          <button onClick={analyzeSelected} className="text-sm text-scalpel hover:underline">
            Analyze Selected
          </button>
          {selected.size === 2 && isPaid && (
            <button onClick={compareSelected} className="text-sm text-cyan-400 hover:underline">
              Compare
            </button>
          )}
          <button
            type="button"
            onClick={deleteSelected}
            className="text-sm text-loss hover:underline ml-auto"
          >
            Delete Selected
          </button>
        </div>
      )}
    </div>
  );
}
