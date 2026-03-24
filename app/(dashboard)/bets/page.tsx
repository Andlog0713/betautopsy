'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import BetCheckWidget from '@/components/BetCheckWidget';
import { usePrivacy } from '@/components/PrivacyContext';
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

  // Selection state
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkConfirm, setBulkConfirm] = useState(false);
  const [deleteSuccess, setDeleteSuccess] = useState('');

  const allFilteredSelected = filtered.length > 0 && filtered.every((b) => selected.has(b.id));

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
        filtered.forEach((b) => next.delete(b.id));
        return next;
      });
    } else {
      setSelected((prev) => {
        const next = new Set(prev);
        filtered.forEach((b) => next.add(b.id));
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
      {/* Live Bet Check widget */}
      <BetCheckWidget tier={tier} onLogBet={handleLogBet} />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl mb-1">Bet History</h1>
          <p className="text-ink-600 text-sm">{bets.length} total bets</p>
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
        <div className="card border-mint-500/30 bg-mint-500/5 p-3 text-center">
          <p className="text-mint-500 text-sm">{deleteSuccess}</p>
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
                className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-colors ${
                  sportFilter === sport
                    ? 'bg-flame-500/10 text-flame-500'
                    : 'text-ink-600 hover:text-[#e7e6e1] hover:bg-ink-800'
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
                className={`px-3 py-1.5 rounded-lg text-xs whitespace-nowrap transition-colors ${
                  typeFilter === bt
                    ? 'bg-flame-500/10 text-flame-500'
                    : 'text-ink-700 hover:text-ink-500 hover:bg-ink-800'
                }`}
              >
                {bt === 'all' ? 'All Types' : bt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Bulk action bar (inline, above table) */}
      {selected.size > 0 && (
        bulkConfirm ? (
          <div className="card border-red-400/30 bg-red-400/5 px-5 py-3 flex flex-wrap items-center gap-4">
            <p className="text-sm text-[#e7e6e1]">
              Delete {selected.size} bet{selected.size !== 1 ? 's' : ''}? This cannot be undone.
            </p>
            <button
              onClick={handleBulkDelete}
              disabled={bulkDeleting}
              className="text-sm font-medium text-red-400 bg-red-400/10 hover:bg-red-400/20 px-4 py-1.5 rounded-lg transition-colors"
            >
              {bulkDeleting ? 'Deleting...' : 'Delete'}
            </button>
            <button
              onClick={() => setBulkConfirm(false)}
              className="text-sm text-ink-600 hover:text-[#e7e6e1] transition-colors"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="card px-5 py-3 flex flex-wrap items-center gap-4">
            <span className="text-sm text-[#e7e6e1]">
              <span className="font-mono font-medium">{selected.size}</span> bet{selected.size !== 1 ? 's' : ''} selected
            </span>
            <button
              onClick={() => setSelected(new Set())}
              className="text-sm text-ink-600 hover:text-[#e7e6e1] transition-colors"
            >
              Deselect All
            </button>
            <button
              onClick={() => setBulkConfirm(true)}
              className="text-sm text-red-400/70 hover:text-red-400 transition-colors"
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
            <div key={i} className="h-14 bg-ink-800 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : bets.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="text-4xl mb-3">🎯</div>
          <p className="text-ink-600">No bets yet. Upload a CSV or add bets manually.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink-700/30">
                  <th className="px-4 py-3 w-10">
                    <input
                      type="checkbox"
                      checked={allFilteredSelected}
                      onChange={toggleSelectAll}
                      className="rounded border-ink-700 bg-ink-800 text-flame-500 focus:ring-flame-500/40 cursor-pointer"
                    />
                  </th>
                  <SortTh col="placed_at" label="Date" align="left" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
                  <th className="text-left text-ink-600 font-medium px-4 py-3">Description</th>
                  <SortTh col="sport" label="Sport" align="left" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} className="hidden md:table-cell" />
                  <SortTh col="bet_type" label="Type" align="left" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} className="hidden md:table-cell" />
                  <SortTh col="odds" label="Odds" align="right" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
                  <SortTh col="stake" label="Stake" align="right" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
                  <SortTh col="result" label="Result" align="center" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
                  <SortTh col="profit" label="P&L" align="right" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
                  <th className="px-4 py-3 w-10">
                    {(tier === 'pro' || tier === 'sharp') && (
                      <ClearAllBets betCount={bets.length} onCleared={loadBets} />
                    )}
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((bet) => (
                  <tr
                    key={bet.id}
                    className={`border-b border-ink-700/15 hover:bg-ink-800/40 transition-colors ${
                      selected.has(bet.id) ? 'bg-flame-500/5' : ''
                    }`}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selected.has(bet.id)}
                        onChange={() => toggleSelect(bet.id)}
                        className="rounded border-ink-700 bg-ink-800 text-flame-500 focus:ring-flame-500/40 cursor-pointer"
                      />
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-ink-600">
                      {new Date(bet.placed_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[#e7e6e1]">{bet.description}</span>
                      {bet.is_bonus_bet && (
                        <span className="ml-2 text-xs bg-amber-500/10 text-amber-400 px-1.5 py-0.5 rounded">
                          Bonus
                        </span>
                      )}
                      {bet.parlay_legs && bet.parlay_legs > 1 && (
                        <span className="ml-2 text-xs bg-ink-700/50 text-ink-500 px-1.5 py-0.5 rounded">
                          {bet.parlay_legs}L
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-ink-600 hidden md:table-cell">{bet.sport}</td>
                    <td className="px-4 py-3 text-ink-600 hidden md:table-cell capitalize">{bet.bet_type}</td>
                    <td className="px-4 py-3 text-right font-mono text-xs">
                      {mask(bet.odds > 0 ? `+${bet.odds}` : `${bet.odds}`)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono">{mask(`$${Number(bet.stake).toFixed(0)}`)}</td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          bet.result === 'win'
                            ? 'bg-mint-500/10 text-mint-500'
                            : bet.result === 'loss'
                            ? 'bg-red-400/10 text-red-400'
                            : 'bg-ink-700/50 text-ink-500'
                        }`}
                      >
                        {bet.result.toUpperCase()}
                      </span>
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-mono font-medium ${
                        Number(bet.profit) > 0
                          ? 'text-mint-500'
                          : Number(bet.profit) < 0
                          ? 'text-red-400'
                          : 'text-ink-600'
                      }`}
                    >
                      {mask(`${Number(bet.profit) > 0 ? '+' : ''}$${Number(bet.profit).toFixed(0)}`)}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleDelete(bet.id)}
                        className="text-ink-700 hover:text-red-400 transition-colors text-xs"
                        title="Delete bet"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
          className="text-[10px] text-ink-700 hover:text-red-400/70 transition-colors whitespace-nowrap"
          title="Clear all bets"
        >
          Clear all
        </button>
      ) : (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/80 backdrop-blur-sm" onClick={() => { setShowConfirm(false); setConfirmText(''); }}>
          <div className="card border-red-400/20 bg-ink-800 p-6 max-w-md space-y-4 mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-serif text-lg">Clear All Bets</h3>
            <p className="text-sm text-[#e7e6e1]">
              This will permanently delete all <span className="font-mono font-medium">{betCount}</span> of
              your bets and cannot be undone. Your autopsy reports will be kept but
              may reference bets that no longer exist.
            </p>
            <div>
              <label className="label">
                Type <span className="font-mono text-red-400">DELETE</span> to confirm
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
                className="text-sm font-medium text-red-400 bg-red-400/10 hover:bg-red-400/20 px-4 py-2 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {deleting ? 'Deleting...' : 'Delete All Bets'}
              </button>
              <button
                onClick={() => { setShowConfirm(false); setConfirmText(''); }}
                className="text-sm text-ink-600 hover:text-[#e7e6e1] px-4 py-2 transition-colors"
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
      <h3 className="font-serif text-lg">Add Bet</h3>
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
              className="rounded border-ink-700 bg-ink-900 text-flame-500 focus:ring-flame-500/40"
            />
            <span className="text-sm text-ink-600">Bonus Bet</span>
          </label>
        </div>
      </div>

      {/* Calculated profit preview */}
      {form.odds && form.stake && form.result !== 'pending' && (
        <p className="text-sm text-ink-600">
          Calculated P&L:{' '}
          <span
            className={`font-mono font-medium ${
              profit > 0 ? 'text-mint-500' : profit < 0 ? 'text-red-400' : 'text-ink-600'
            }`}
          >
            {profit > 0 ? '+' : ''}${profit.toFixed(2)}
          </span>
        </p>
      )}

      {error && <p className="text-red-400 text-sm">{error}</p>}

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
      className={`text-${align} font-medium px-4 py-3 cursor-pointer select-none transition-colors ${
        active ? 'text-[#e7e6e1]' : 'text-ink-600 hover:text-ink-500'
      } ${className ?? ''}`}
      onClick={() => onSort(col)}
    >
      {label}
      {arrow && <span className="text-flame-500 text-xs ml-0.5">{arrow}</span>}
    </th>
  );
}
