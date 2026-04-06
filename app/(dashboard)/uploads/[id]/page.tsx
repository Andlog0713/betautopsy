'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { formatBetDescription } from '@/lib/format-parlay';
import { createClient } from '@/lib/supabase';
import type { Bet, Upload } from '@/types';

export default function UploadDetailPage() {
  const params = useParams();
  const uploadId = params.id as string;
  const [upload, setUpload] = useState<Upload | null>(null);
  const [bets, setBets] = useState<Bet[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);

  const loadData = useCallback(async () => {
    const supabase = createClient();
    const [uploadRes, betsRes] = await Promise.all([
      supabase.from('uploads').select('*').eq('id', uploadId).single(),
      supabase.from('bets').select('*').eq('upload_id', uploadId).order('placed_at', { ascending: false }),
    ]);
    if (uploadRes.data) setUpload(uploadRes.data as Upload);
    if (betsRes.data) setBets(betsRes.data as Bet[]);
    setLoading(false);
  }, [uploadId]);

  useEffect(() => { loadData(); }, [loadData]);

  async function deleteBet(betId: string) {
    if (!confirm('Delete this bet?')) return;
    const supabase = createClient();
    await supabase.from('bets').delete().eq('id', betId);
    setBets((prev) => prev.filter((b) => b.id !== betId));
    setSelected((prev) => { const n = new Set(prev); n.delete(betId); return n; });
  }

  async function deleteSelected() {
    if (!confirm(`Delete ${selected.size} bets? This cannot be undone.`)) return;
    setDeleting(true);
    const supabase = createClient();
    const ids = Array.from(selected);
    for (let i = 0; i < ids.length; i += 100) {
      await supabase.from('bets').delete().in('id', ids.slice(i, i + 100));
    }
    setBets((prev) => prev.filter((b) => !selected.has(b.id)));
    setSelected(new Set());
    setDeleting(false);
  }

  const allSelected = bets.length > 0 && bets.every((b) => selected.has(b.id));
  const name = upload?.display_name || upload?.filename || 'Upload';

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 w-48 bg-surface-1 rounded" />
        {[...Array(5)].map((_, i) => <div key={i} className="h-14 bg-surface-1 rounded-sm" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/uploads" className="text-sm text-fg-muted hover:text-fg transition-colors">
            ← Back to Uploads
          </Link>
          <h1 className="font-bold text-2xl mt-2">{name}</h1>
          <p className="text-fg-muted text-sm">
            {bets.length} bets · {upload?.sportsbook ?? 'Multiple books'} · {upload ? new Date(upload.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
          </p>
        </div>
        <Link href={`/reports?upload_id=${uploadId}`} className="btn-primary text-sm">
          Analyze This Upload
        </Link>
      </div>

      {/* Bulk actions */}
      {selected.size > 0 && (
        <div className="card px-5 py-3 flex flex-wrap items-center gap-4">
          <span className="text-sm text-fg-bright">
            <span className="font-mono">{selected.size}</span> bet{selected.size !== 1 ? 's' : ''} selected
          </span>
          <button onClick={() => setSelected(new Set())} className="text-sm text-fg-muted hover:text-fg transition-colors">Deselect All</button>
          <button onClick={deleteSelected} disabled={deleting} className="text-sm text-loss/70 hover:text-loss transition-colors">
            {deleting ? 'Deleting...' : 'Delete Selected'}
          </button>
        </div>
      )}

      {/* Bet table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-subtle">
                <th className="px-4 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={() => allSelected ? setSelected(new Set()) : setSelected(new Set(bets.map((b) => b.id)))}
                    className="rounded border-border-subtle bg-surface-1 text-scalpel focus:ring-scalpel/40 cursor-pointer"
                  />
                </th>
                <th className="text-left text-fg-muted font-medium px-4 py-3">Date</th>
                <th className="text-left text-fg-muted font-medium px-4 py-3">Description</th>
                <th className="text-left text-fg-muted font-medium px-4 py-3 hidden md:table-cell">Sport</th>
                <th className="text-left text-fg-muted font-medium px-4 py-3 hidden md:table-cell">Type</th>
                <th className="text-right text-fg-muted font-medium px-4 py-3">Odds</th>
                <th className="text-right text-fg-muted font-medium px-4 py-3">Stake</th>
                <th className="text-center text-fg-muted font-medium px-4 py-3">Result</th>
                <th className="text-right text-fg-muted font-medium px-4 py-3">P&amp;L</th>
                <th className="px-4 py-3 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {bets.map((bet) => (
                <tr key={bet.id} className={`border-b border-border-subtle hover:bg-white/[0.02] transition-colors ${selected.has(bet.id) ? 'bg-scalpel-muted' : ''}`}>
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.has(bet.id)}
                      onChange={() => { const n = new Set(selected); n.has(bet.id) ? n.delete(bet.id) : n.add(bet.id); setSelected(n); }}
                      className="rounded border-border-subtle bg-surface-1 text-scalpel focus:ring-scalpel/40 cursor-pointer"
                    />
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-fg-muted">
                    {new Date(bet.placed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </td>
                  <td className="px-4 py-3 text-fg-bright">
                    {(() => {
                      const fmt = formatBetDescription(bet);
                      if (!fmt.isParlay) return fmt.label;
                      return (
                        <div>
                          <span className="text-xs font-medium text-fg-muted bg-base rounded px-1.5 py-0.5 mr-1">{fmt.label}</span>
                          <div className="mt-1 space-y-0.5">
                            {fmt.legs.map((leg, li) => <div key={li} className="text-xs">{leg}</div>)}
                          </div>
                        </div>
                      );
                    })()}
                  </td>
                  <td className="px-4 py-3 text-fg-muted hidden md:table-cell">{bet.sport}</td>
                  <td className="px-4 py-3 text-fg-muted hidden md:table-cell capitalize">{bet.bet_type}</td>
                  <td className="px-4 py-3 text-right font-mono text-xs">{bet.odds > 0 ? `+${bet.odds}` : bet.odds}</td>
                  <td className="px-4 py-3 text-right font-mono">${Number(bet.stake).toFixed(0)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-sm ${
                      bet.result === 'win' ? 'bg-win/10 text-win'
                      : bet.result === 'loss' ? 'bg-bleed-muted text-loss'
                      : 'bg-surface-1 text-fg-muted'
                    }`}>{bet.result.toUpperCase()}</span>
                  </td>
                  <td className={`px-4 py-3 text-right font-mono font-medium ${Number(bet.profit) > 0 ? 'text-win' : Number(bet.profit) < 0 ? 'text-loss' : 'text-fg-muted'}`}>
                    {Number(bet.profit) > 0 ? '+' : ''}${Number(bet.profit).toFixed(0)}
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => deleteBet(bet.id)} className="text-fg-dim hover:text-loss transition-colors text-xs" aria-label="Delete bet">✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
