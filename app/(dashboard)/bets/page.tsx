'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';
import { Lock, Target } from 'lucide-react';
import { usePrivacy, EyeToggle } from '@/components/PrivacyContext';
import { formatBetDescription } from '@/lib/format-parlay';
import { PRICING_ENABLED, getEffectiveTier } from '@/lib/feature-flags';
import type { Bet, Profile } from '@/types';

export default function BetsPage() {
  const searchParams = useSearchParams();
  const [bets, setBets] = useState<Bet[]>([]);
  const [loading, setLoading] = useState(true);
  const [sportFilter, setSportFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [tier, setTier] = useState('free');
  const [prefill, setPrefill] = useState<Record<string, string> | null>(null);

  // Apply query params on mount
  useEffect(() => {
    const sp = searchParams.get('sport');
    const bt = searchParams.get('bet_type');
    if (sp) setSportFilter(sp);
    if (bt) setTypeFilter(bt);
  }, [searchParams]);

  const loadBets = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [betsRes, profileRes] = await Promise.all([
      supabase
        .from('bets')
        .select('*')
        .eq('user_id', user.id)
        .order('placed_at', { ascending: false }),
      supabase
        .from('profiles')
        .select('subscription_tier')
        .eq('id', user.id)
        .single(),
    ]);

    if (betsRes.data) setBets(betsRes.data as Bet[]);
    if (profileRes.data) setTier((profileRes.data as Profile).subscription_tier);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadBets();
  }, [loadBets]);

  function handleLogBet(values: { description: string; odds: string; stake: string; sport: string; bet_type: string }) {
    setPrefill(values);
    setShowForm(true);
  }

  const { mask } = usePrivacy();
  const sports = ['all', ...Array.from(new Set(bets.map((b) => b.sport)))];
  const betTypes = ['all', ...Array.from(new Set(bets.map((b) => b.bet_type)))];

  // Sort state
  const [sortCol, setSortCol] = useState<string>('placed_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  function handleSort(col: string) {
    if (sortCol === col) {
      setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortCol(col);
      setSortDir('desc');
    }
  }

  const RESULT_ORDER: Record<string, number> = { win: 3, push: 2, pending: 1, void: 0, loss: -1 };

  const filtered = (() => {
    let base = sportFilter === 'all' ? bets : bets.filter((b) => b.sport === sportFilter);
    if (typeFilter !== 'all') base = base.filter((b) => b.bet_type === typeFilter);
    const sorted = [...base].sort((a, b) => {
      let cmp = 0;
      switch (sortCol) {
        case 'placed_at':
          cmp = new Date(a.placed_at).getTime() - new Date(b.placed_at).getTime();
          break;
        case 'sport':
          cmp = a.sport.localeCompare(b.sport);
          break;
        case 'bet_type':
          cmp = a.bet_type.localeCompare(b.bet_type);
          break;
        case 'odds':
          cmp = a.odds - b.odds;
          break;
        case 'stake':
          cmp = Number(a.stake) - Number(b.stake);
          break;
        case 'result':
          cmp = (RESULT_ORDER[a.result] ?? 0) - (RESULT_ORDER[b.result] ?? 0);
          break;
        case 'profit':
          cmp = Number(a.profit) - Number(b.profit);
          break;
        default:
          cmp = 0;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return sorted;
  })();

  // Pagination
  const PAGE_SIZE = 50;
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Reset to page 1 when filters change
  useEffect(() => { setPage(1); }, [sportFilter, typeFilter]);

  // Selection state
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkConfirm, setBulkConfirm] = useState(false);
  const [deleteSuccess, setDeleteSuccess] = useState('');

  const allFilteredSelected = paginated.length > 0 && paginated.every((b) => selected.has(b.id));

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (allFilteredSelected) {
      setSelected((prev) => {
        const next = new Set(prev);
        paginated.forEach((b) => next.delete(b.id));
        return next;
      });
    } else {
      setSelected((prev) => {
        const next = new Set(prev);
        paginated.forEach((b) => next.add(b.id));
        return next;
      });
    }
  }

  async function handleDelete(betId: string) {
    if (!confirm('Delete this bet?')) return;
    const supabase = createClient();
    await supabase.from('bets').delete().eq('id', betId);
    setBets((prev) => prev.filter((b) => b.id !== betId));
    setSelected((prev) => { const next = new Set(prev); next.delete(betId); return next; });
  }

  async function handleBulkDelete() {
    setBulkDeleting(true);
    const supabase = createClient();
    const ids = Array.from(selected);

    // Delete in batches of 100
    for (let i = 0; i < ids.length; i += 100) {
      const batch = ids.slice(i, i + 100);
      await supabase.from('bets').delete().in('id', batch);
    }

    const count = ids.length;
    setBets((prev) => prev.filter((b) => !selected.has(b.id)));
    setSelected(new Set());
    setBulkConfirm(false);
    setBulkDeleting(false);
    setDeleteSuccess(`${count} bet${count !== 1 ? 's' : ''} deleted`);
    setTimeout(() => setDeleteSuccess(''), 3000);

    // Update bet count
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { count: remaining } = await supabase
        .from('bets')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id);
      await supabase.from('profiles').update({ bet_count: remaining ?? 0 }).eq('id', user.id);
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {searchParams.get('from') === 'report' && (
        <Link href="/reports" className="text-sm text-fg-muted hover:text-fg transition-colors">
          ← Back to Report
        </Link>
      )}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative">
          <div className="absolute -top-1 right-0"><EyeToggle /></div>
          <div className="mb-8">
            <h1 className="text-2xl font-semibold tracking-tight text-fg-bright">Bet History</h1>
            <p className="text-sm text-fg-muted mt-1">All your recorded bets</p>
            <p className="text-xs text-fg-muted mt-0.5">{bets.length} total bets</p>
          </div>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); if (showForm) setPrefill(null); }}
          className="btn-secondary text-sm"
        >
          {showForm ? '✕ Close Form' : '+ Add Bet Manually'}
        </button>
      </div>

      {/* Manual entry form */}
      {showForm && <BetEntryForm prefill={prefill} onSuccess={() => { setShowForm(false); setPrefill(null); loadBets(); }} />}

      {/* Delete success message */}
      {deleteSuccess && (
        <div className="card border-win/20 bg-win/10 p-3 text-center">
          <p className="text-win text-sm">{deleteSuccess}</p>
        </div>
      )}

      {/* Filter tabs */}
      {bets.length > 0 && (
        <div className="space-y-2">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {sports.map((sport) => (
              <button
                key={sport}
                onClick={() => setSportFilter(sport)}
                className={`px-3 py-1.5 rounded-sm text-sm whitespace-nowrap transition-colors ${
                  sportFilter === sport
                    ? 'bg-scalpel-muted text-scalpel'
                    : 'text-fg-muted hover:text-fg hover:bg-white/[0.03]'
                }`}
              >
                {sport === 'all' ? 'All Sports' : sport}
              </button>
            ))}
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {betTypes.map((bt) => (
              <button
                key={bt}
                onClick={() => setTypeFilter(bt)}
                className={`px-3 py-1.5 rounded-sm text-xs whitespace-nowrap transition-colors ${
                  typeFilter === bt
                    ? 'bg-scalpel-muted text-scalpel'
                    : 'text-fg-dim hover:text-fg hover:bg-white/[0.03]'
                }`}
              >
                {bt === 'all' ? 'All Types' : bt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Free tier upsell — filtered analysis */}
      {PRICING_ENABLED && tier === 'free' && bets.length > 0 && (
        <div className="card p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lock size={18} className="text-fg-muted" />
            <div>
              <p className="text-sm text-fg-bright">Want to analyze just your wins? Or filter by sport?</p>
              <p className="text-xs text-fg-muted">Pro users get unlimited filtered reports.</p>
            </div>
          </div>
          <a href="/pricing" className="text-sm text-scalpel hover:underline shrink-0">Upgrade →</a>
        </div>
      )}

      {/* Bulk action bar (inline, above table) */}
      {selected.size > 0 && (
        bulkConfirm ? (
          <div className="card border-bleed/20 bg-bleed-muted px-5 py-3 flex flex-wrap items-center gap-4">
            <p className="text-sm text-fg-bright">
              Delete {selected.size} bet{selected.size !== 1 ? 's' : ''}? This cannot be undone.
            </p>
            <button
              onClick={handleBulkDelete}
              disabled={bulkDeleting}
              className="text-sm font-medium text-loss bg-bleed-muted hover:bg-bleed-muted px-4 py-1.5 rounded-sm transition-colors"
            >
              {bulkDeleting ? 'Deleting...' : 'Delete'}
            </button>
            <button
              onClick={() => setBulkConfirm(false)}
              className="text-sm text-fg-muted hover:text-fg transition-colors"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="card px-5 py-3 flex flex-wrap items-center gap-4">
            <span className="text-sm text-fg-bright">
              <span className="font-mono font-medium">{selected.size}</span> bet{selected.size !== 1 ? 's' : ''} selected
            </span>
            <button
              onClick={() => setSelected(new Set())}
              className="text-sm text-fg-muted hover:text-fg transition-colors"
            >
              Deselect All
            </button>
            <button
              onClick={() => setBulkConfirm(true)}
              className="text-sm text-loss/70 hover:text-loss transition-colors"
            >
              Delete Selected
            </button>
          </div>
        )
      )}

      {/* Bets table */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-14 bg-surface-1 rounded-sm animate-pulse" />
          ))}
        </div>
      ) : bets.length === 0 ? (
        <div className="card p-12 text-center space-y-4">
          <div className="mb-1"><Target size={32} className="text-fg-muted" /></div>
          <p className="text-fg-muted">No bets yet. Upload a CSV or add bets manually above.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/upload" className="btn-primary text-sm">Upload CSV</Link>
          </div>
        </div>
      ) : (
        <div className="card-tier-1 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-subtle bg-surface-2">
                  <th className="px-4 py-3 w-10">
                    <input
                      type="checkbox"
                      checked={allFilteredSelected}
                      onChange={toggleSelectAll}
                      aria-label="Select all bets on this page"
                      className="rounded border-border-subtle bg-surface-1 text-scalpel focus:ring-scalpel/40 cursor-pointer"
                    />
                  </th>
                  <SortTh col="placed_at" label="Date" align="left" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
                  <th className="text-left text-xs text-fg-dim uppercase tracking-wider font-medium px-4 py-3">Description</th>
                  <SortTh col="sport" label="Sport" align="left" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} className="hidden md:table-cell" />
                  <SortTh col="bet_type" label="Type" align="left" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} className="hidden md:table-cell" />
                  <SortTh col="odds" label="Odds" align="right" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
                  <SortTh col="stake" label="Stake" align="right" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
                  <SortTh col="result" label="Result" align="center" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
                  <SortTh col="profit" label="P&L" align="right" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
                  <th className="px-4 py-3 w-10">
                    {(getEffectiveTier(tier) === 'pro') && (
                      <ClearAllBets betCount={bets.length} onCleared={loadBets} />
                    )}
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((bet) => (
                  <tr
                    key={bet.id}
                    className={`border-b border-border-subtle hover:bg-surface-2/50 transition-colors ${
                      selected.has(bet.id) ? 'bg-scalpel-muted' : ''
                    }`}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selected.has(bet.id)}
                        onChange={() => toggleSelect(bet.id)}
                        aria-label={`Select bet: ${bet.description}`}
                        className="rounded border-border-subtle bg-surface-1 text-scalpel focus:ring-scalpel/40 cursor-pointer"
                      />
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-fg-muted">
                      {new Date(bet.placed_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                    <td className="px-4 py-3">
                      {(() => {
                        const fmt = formatBetDescription(bet);
                        if (!fmt.isParlay) return <span className="text-fg-bright">{fmt.label}</span>;
                        return (
                          <div>
                            <span className="text-xs font-medium text-fg-muted bg-base rounded px-1.5 py-0.5 mr-1.5">{fmt.label}</span>
                            <div className="mt-1 space-y-0.5">
                              {fmt.legs.map((leg, li) => (
                                <div key={li} className="text-fg-bright text-xs">{leg}</div>
                              ))}
                            </div>
                          </div>
                        );
                      })()}
                      {bet.is_bonus_bet && (
                        <span className="ml-2 text-xs bg-amber-500/10 text-caution px-1.5 py-0.5 rounded">
                          Bonus
                        </span>
                      )}
                      {bet.parlay_legs && bet.parlay_legs > 1 && (
                        <span className="ml-2 text-xs bg-surface-1 text-fg-muted px-1.5 py-0.5 rounded">
                          {bet.parlay_legs}L
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-fg-muted hidden md:table-cell">{bet.sport}</td>
                    <td className="px-4 py-3 text-fg-muted hidden md:table-cell capitalize">{bet.bet_type}</td>
                    <td className="px-4 py-3 text-right font-mono text-xs">
                      {mask(bet.odds > 0 ? `+${bet.odds}` : `${bet.odds}`)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono">{mask(`$${Number(bet.stake).toFixed(0)}`)}</td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          bet.result === 'win'
                            ? 'bg-win/10 text-win'
                            : bet.result === 'loss'
                            ? 'bg-loss/10 text-loss'
                            : bet.result === 'push'
                            ? 'bg-caution/10 text-caution'
                            : 'bg-surface-2 text-fg-muted'
                        }`}
                      >
                        {bet.result.toUpperCase()}
                      </span>
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-mono font-medium ${
                        Number(bet.profit) > 0
                          ? 'text-win'
                          : Number(bet.profit) < 0
                          ? 'text-loss'
                          : 'text-fg-muted'
                      }`}
                    >
                      {mask(`${Number(bet.profit) > 0 ? '+' : ''}$${Number(bet.profit).toFixed(0)}`)}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleDelete(bet.id)}
                        className="text-fg-dim hover:text-loss transition-colors text-xs"
                        aria-label={`Delete bet: ${bet.description}`}
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border-subtle">
              <p className="text-xs text-fg-muted">
                Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1 text-sm rounded-sm transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-fg-muted hover:text-fg hover:bg-white/[0.03]"
                >
                  Prev
                </button>
                <span className="text-xs text-fg-muted font-mono">{page}/{totalPages}</span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1 text-sm rounded-sm transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-fg-muted hover:text-fg hover:bg-white/[0.03]"
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

// ── Clear All Bets ──

function ClearAllBets({ betCount, onCleared }: { betCount: number; onCleared: () => void }) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from('bets').delete().eq('user_id', user.id);
    await supabase.from('profiles').update({ bet_count: 0 }).eq('id', user.id);

    setDeleting(false);
    setShowConfirm(false);
    setConfirmText('');
    onCleared();
  }

  return (
    <>
      {!showConfirm ? (
        <button
          onClick={(e) => { e.stopPropagation(); setShowConfirm(true); }}
          className="text-[10px] text-fg-dim hover:text-loss/70 transition-colors whitespace-nowrap"
          title="Clear all bets"
        >
          Clear all
        </button>
      ) : (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-base/80" onClick={() => { setShowConfirm(false); setConfirmText(''); }}>
          <div role="alertdialog" aria-modal="true" aria-label="Confirm delete all bets" className="card border-red-400/20 bg-surface-1 p-6 max-w-md space-y-4 mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-lg text-fg-bright">Clear All Bets</h3>
            <p className="text-sm text-fg-bright">
              This will permanently delete all <span className="font-mono font-medium">{betCount}</span> of
              your bets and cannot be undone. Your autopsy reports will be kept but
              may reference bets that no longer exist.
            </p>
            <div>
              <label className="label">
                Type <span className="font-mono text-loss">DELETE</span> to confirm
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                className="input-field w-full text-sm"
                placeholder="DELETE"
                autoFocus
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleDelete}
                disabled={confirmText !== 'DELETE' || deleting}
                className="btn-danger text-sm !px-4 !py-2"
              >
                {deleting ? 'Deleting...' : 'Delete All Bets'}
              </button>
              <button
                onClick={() => { setShowConfirm(false); setConfirmText(''); }}
                className="btn-ghost text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── Manual Bet Entry Form ──

function BetEntryForm({ prefill, onSuccess }: { prefill?: Record<string, string> | null; onSuccess: () => void }) {
  const [form, setForm] = useState({
    placed_at: new Date().toISOString().split('T')[0],
    sport: prefill?.sport || 'NFL',
    bet_type: prefill?.bet_type || 'spread',
    description: prefill?.description || '',
    odds: prefill?.odds || '',
    stake: prefill?.stake || '',
    result: 'pending' as 'win' | 'loss' | 'push' | 'void' | 'pending',
    sportsbook: '',
    is_bonus_bet: false,
    parlay_legs: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  function update(field: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function calculateProfit(): number {
    const odds = parseInt(form.odds);
    const stake = parseFloat(form.stake);
    if (isNaN(odds) || isNaN(stake)) return 0;
    if (form.result === 'win') {
      return odds > 0 ? stake * (odds / 100) : stake * (100 / Math.abs(odds));
    }
    if (form.result === 'loss') return -stake;
    return 0; // push, void, pending
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const profit = calculateProfit();
    const odds = parseInt(form.odds);
    const stake = parseFloat(form.stake);
    const payout = form.result === 'win' ? stake + profit : form.result === 'push' ? stake : 0;

    const { error: insertError } = await supabase.from('bets').insert({
      user_id: user.id,
      placed_at: new Date(form.placed_at).toISOString(),
      sport: form.sport,
      bet_type: form.bet_type,
      description: form.description,
      odds,
      stake,
      result: form.result,
      payout,
      profit,
      sportsbook: form.sportsbook || null,
      is_bonus_bet: form.is_bonus_bet,
      parlay_legs: form.parlay_legs ? parseInt(form.parlay_legs) : null,
    });

    if (insertError) {
      setError(insertError.message);
      setSubmitting(false);
      return;
    }

    // Update bet count
    const { data: currentProfile } = await supabase
      .from('profiles')
      .select('bet_count')
      .eq('id', user.id)
      .single();
    if (currentProfile) {
      await supabase
        .from('profiles')
        .update({ bet_count: (currentProfile.bet_count ?? 0) + 1 })
        .eq('id', user.id);
    }

    setSubmitting(false);
    onSuccess();
  }

  const profit = calculateProfit();

  return (
    <form onSubmit={handleSubmit} className="card p-6 space-y-4">
      <h3 className="font-semibold text-lg text-fg-bright">Add Bet</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <label className="label">Date</label>
          <input
            type="date"
            value={form.placed_at}
            onChange={(e) => update('placed_at', e.target.value)}
            className="input-field w-full text-sm"
            required
          />
        </div>
        <div>
          <label className="label">Sport</label>
          <select
            value={form.sport}
            onChange={(e) => update('sport', e.target.value)}
            className="input-field w-full text-sm"
          >
            {['NFL', 'NBA', 'MLB', 'NHL', 'NCAAF', 'NCAAB', 'Soccer', 'Tennis', 'MMA', 'Other'].map(
              (s) => <option key={s} value={s}>{s}</option>
            )}
          </select>
        </div>
        <div>
          <label className="label">Bet Type</label>
          <select
            value={form.bet_type}
            onChange={(e) => update('bet_type', e.target.value)}
            className="input-field w-full text-sm"
          >
            {['spread', 'moneyline', 'total', 'prop', 'parlay', 'futures', 'live', 'other'].map(
              (t) => <option key={t} value={t}>{t}</option>
            )}
          </select>
        </div>
        <div>
          <label className="label">Sportsbook</label>
          <input
            type="text"
            value={form.sportsbook}
            onChange={(e) => update('sportsbook', e.target.value)}
            className="input-field w-full text-sm"
            placeholder="DraftKings"
          />
        </div>
      </div>

      <div>
        <label className="label">Description</label>
        <input
          type="text"
          value={form.description}
          onChange={(e) => update('description', e.target.value)}
          className="input-field w-full"
          placeholder="Chiefs -3.5, Jokic Over 25.5 pts, etc."
          required
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div>
          <label className="label">Odds (American)</label>
          <input
            type="number"
            value={form.odds}
            onChange={(e) => update('odds', e.target.value)}
            className="input-field w-full font-mono"
            placeholder="-110"
            required
          />
        </div>
        <div>
          <label className="label">Stake ($)</label>
          <input
            type="number"
            step="0.01"
            value={form.stake}
            onChange={(e) => update('stake', e.target.value)}
            className="input-field w-full font-mono"
            placeholder="100"
            required
          />
        </div>
        <div>
          <label className="label">Result</label>
          <select
            value={form.result}
            onChange={(e) => update('result', e.target.value)}
            className="input-field w-full text-sm"
          >
            {['win', 'loss', 'push', 'void', 'pending'].map(
              (r) => <option key={r} value={r}>{r}</option>
            )}
          </select>
        </div>
        <div>
          <label className="label">Parlay Legs</label>
          <input
            type="number"
            min="2"
            value={form.parlay_legs}
            onChange={(e) => update('parlay_legs', e.target.value)}
            className="input-field w-full font-mono"
            placeholder="—"
          />
        </div>
        <div className="flex items-end pb-1">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_bonus_bet}
              onChange={(e) => update('is_bonus_bet', e.target.checked)}
              className="rounded border-border-subtle bg-base text-scalpel focus:ring-scalpel/40"
            />
            <span className="text-sm text-fg-muted">Bonus Bet</span>
          </label>
        </div>
      </div>

      {/* Calculated profit preview */}
      {form.odds && form.stake && form.result !== 'pending' && (
        <p className="text-sm text-fg-muted">
          Calculated P&L:{' '}
          <span
            className={`font-mono font-medium ${
              profit > 0 ? 'text-win' : profit < 0 ? 'text-loss' : 'text-fg-muted'
            }`}
          >
            {profit > 0 ? '+' : ''}${profit.toFixed(2)}
          </span>
        </p>
      )}

      {error && <p className="text-loss text-sm">{error}</p>}

      <button type="submit" disabled={submitting} className="btn-primary">
        {submitting ? 'Adding...' : 'Add Bet'}
      </button>
    </form>
  );
}

// ── Sortable Table Header ──

function SortTh({
  col,
  label,
  align,
  sortCol,
  sortDir,
  onSort,
  className,
}: {
  col: string;
  label: string;
  align: 'left' | 'right' | 'center';
  sortCol: string;
  sortDir: 'asc' | 'desc';
  onSort: (col: string) => void;
  className?: string;
}) {
  const active = sortCol === col;
  const arrow = active ? (sortDir === 'asc' ? ' ▲' : ' ▼') : '';

  return (
    <th
      className={`text-${align} text-xs uppercase tracking-wider font-medium px-4 py-3 cursor-pointer select-none transition-colors ${
        active ? 'text-fg-bright' : 'text-fg-dim hover:text-fg'
      } ${className ?? ''}`}
      onClick={() => onSort(col)}
    >
      {label}
      {arrow && <span className="text-scalpel text-xs ml-0.5">{arrow}</span>}
    </th>
  );
}
