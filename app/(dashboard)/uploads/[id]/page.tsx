'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
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
        <div className="h-8 w-48 bg-ink-800 rounded" />
        {[...Array(5)].map((_, i) => <div key={i} className="h-14 bg-ink-800 rounded-lg" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/uploads" className="text-sm text-ink-600 hover:text-[#e7e6e1] transition-colors">
            ← Back to Uploads
          </Link>
          <h1 className="font-serif text-2xl mt-2">{name}</h1>
          <p className="text-ink-600 text-sm">
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
          <span className="text-sm text-[#e7e6e1]">
            <span className="font-mono">{selected.size}</span> bet{selected.size !== 1 ? 's' : ''} selected
          </span>
          <button onClick={() => setSelected(new Set())} className="text-sm text-ink-600 hover:text-[#e7e6e1] transition-colors">Deselect All</button>
          <button onClick={deleteSelected} disabled={deleting} className="text-sm text-red-400/70 hover:text-red-400 transition-colors">
            {deleting ? 'Deleting...' : 'Delete Selected'}
          </button>
        </div>
      )}

      {/* Bet table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink-700/30">
                <th className="px-4 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={() => allSelected ? setSelected(new Set()) : setSelected(new Set(bets.map((b) => b.id)))}
                    className="rounded border-ink-700 bg-ink-800 text-flame-500 focus:ring-flame-500/40 cursor-pointer"
                  />
                </th>
                <th className="text-left text-ink-600 font-medium px-4 py-3">Date</th>
                <th className="text-left text-ink-600 font-medium px-4 py-3">Description</th>
                <th className="text-left text-ink-600 font-medium px-4 py-3 hidden md:table-cell">Sport</th>
                <th className="text-left text-ink-600 font-medium px-4 py-3 hidden md:table-cell">Type</th>
                <th className="text-right text-ink-600 font-medium px-4 py-3">Odds</th>
                <th className="text-right text-ink-600 font-medium px-4 py-3">Stake</th>
                <th className="text-center text-ink-600 font-medium px-4 py-3">Result</th>
                <th className="text-right text-ink-600 font-medium px-4 py-3">P&amp;L</th>
                <th className="px-4 py-3 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {bets.map((bet) => (
                <tr key={bet.id} className={`border-b border-ink-700/15 hover:bg-ink-800/40 transition-colors ${selected.has(bet.id) ? 'bg-flame-500/5' : ''}`}>
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.has(bet.id)}
                      onChange={() => { const n = new Set(selected); n.has(bet.id) ? n.delete(bet.id) : n.add(bet.id); setSelected(n); }}
                      className="rounded border-ink-700 bg-ink-800 text-flame-500 focus:ring-flame-500/40 cursor-pointer"
                    />
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-ink-600">
                    {new Date(bet.placed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </td>
                  <td className="px-4 py-3 text-[#e7e6e1]">{bet.description}</td>
                  <td className="px-4 py-3 text-ink-600 hidden md:table-cell">{bet.sport}</td>
                  <td className="px-4 py-3 text-ink-600 hidden md:table-cell capitalize">{bet.bet_type}</td>
                  <td className="px-4 py-3 text-right font-mono text-xs">{bet.odds > 0 ? `+${bet.odds}` : bet.odds}</td>
                  <td className="px-4 py-3 text-right font-mono">${Number(bet.stake).toFixed(0)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      bet.result === 'win' ? 'bg-mint-500/10 text-mint-500'
                      : bet.result === 'loss' ? 'bg-red-400/10 text-red-400'
                      : 'bg-ink-700/50 text-ink-500'
                    }`}>{bet.result.toUpperCase()}</span>
                  </td>
                  <td className={`px-4 py-3 text-right font-mono font-medium ${Number(bet.profit) > 0 ? 'text-mint-500' : Number(bet.profit) < 0 ? 'text-red-400' : 'text-ink-600'}`}>
                    {Number(bet.profit) > 0 ? '+' : ''}${Number(bet.profit).toFixed(0)}
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => deleteBet(bet.id)} className="text-ink-700 hover:text-red-400 transition-colors text-xs" title="Delete">✕</button>
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
