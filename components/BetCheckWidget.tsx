'use client';

import { useState } from 'react';
import Link from 'next/link';

interface BetCheckResult {
  signal: 'green' | 'yellow' | 'red';
  analysis: string;
  recent_context: {
    last_5_results: string[];
    avg_stake: number;
    bets_today: number;
  };
}

const SIGNAL_STYLES = {
  green: {
    border: 'border-l-mint-500',
    dot: 'bg-mint-500',
    bg: 'bg-mint-500/5',
    label: 'GREEN',
    labelColor: 'text-mint-500',
  },
  yellow: {
    border: 'border-l-amber-400',
    dot: 'bg-amber-400',
    bg: 'bg-amber-400/5',
    label: 'YELLOW',
    labelColor: 'text-amber-400',
  },
  red: {
    border: 'border-l-red-400',
    dot: 'bg-red-400',
    bg: 'bg-red-400/5',
    label: 'RED',
    labelColor: 'text-red-400',
  },
};

export default function BetCheckWidget({
  tier,
  onLogBet,
}: {
  tier: string;
  onLogBet?: (values: { description: string; odds: string; stake: string; sport: string; bet_type: string }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    description: '',
    odds: '',
    stake: '',
    sport: 'NFL',
    bet_type: 'spread',
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BetCheckResult | null>(null);
  const [error, setError] = useState('');

  // Locked state for non-Sharp users
  if (tier !== 'sharp') {
    return (
      <div className="card p-5 relative overflow-hidden">
        <div className="flex items-start gap-3">
          <span className="text-2xl">🎯</span>
          <div>
            <h3 className="font-medium mb-1">Live Bet Check</h3>
            <p className="text-ink-600 text-sm mb-2">
              You&apos;re about to place a bet. Is it strategy — or is it the last
              three losses talking? Sharp users check every bet against their own
              history before placing it.
            </p>
            <Link href="/pricing" className="text-sm text-flame-500 hover:underline">
              Upgrade to Sharp — $29/mo →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleCheck() {
    if (!form.description || !form.stake) return;
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const res = await fetch('/api/bet-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: form.description,
          odds: form.odds,
          stake: parseFloat(form.stake),
          sport: form.sport,
          bet_type: form.bet_type,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Check failed');
        setLoading(false);
        return;
      }

      setResult(data as BetCheckResult);
    } catch {
      setError('Check failed. Please try again.');
    }

    setLoading(false);
  }

  function handleClear() {
    setForm({ description: '', odds: '', stake: '', sport: 'NFL', bet_type: 'spread' });
    setResult(null);
    setError('');
  }

  function handleLog() {
    if (onLogBet) {
      onLogBet(form);
    }
    handleClear();
  }

  return (
    <div className="card overflow-hidden">
      {/* Header — always visible */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-xl">🎯</span>
          <div className="text-left">
            <h3 className="font-medium">Live Bet Check</h3>
            <p className="text-ink-600 text-xs">Check a bet against your patterns before placing it</p>
          </div>
        </div>
        <span className="text-ink-600 text-sm">{open ? '▾' : '▸'}</span>
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-4 border-t border-white/[0.06] pt-4">
          {/* Input form */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="col-span-2 md:col-span-2">
              <label className="label">Description</label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => update('description', e.target.value)}
                className="input-field w-full text-sm"
                placeholder="Lakers -3.5, Jokic Over 25.5 pts..."
              />
            </div>
            <div>
              <label className="label">Odds</label>
              <input
                type="text"
                value={form.odds}
                onChange={(e) => update('odds', e.target.value)}
                className="input-field w-full text-sm font-mono"
                placeholder="-110"
              />
            </div>
            <div>
              <label className="label">Stake ($)</label>
              <input
                type="number"
                value={form.stake}
                onChange={(e) => update('stake', e.target.value)}
                className="input-field w-full text-sm font-mono"
                placeholder="100"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={handleCheck}
                disabled={loading || !form.description || !form.stake}
                className="btn-primary w-full text-sm !py-2.5"
              >
                {loading ? 'Checking...' : 'Check This Bet'}
              </button>
            </div>
          </div>

          {/* Sport / Type row */}
          <div className="grid grid-cols-2 gap-3 max-w-xs">
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
          </div>

          {/* Loading */}
          {loading && (
            <div className="flex items-center gap-3 text-ink-600 text-sm py-2">
              <span className="inline-block w-4 h-4 border-2 border-ink-600/30 border-t-ink-600 rounded-full animate-spin" />
              Checking against your history...
            </div>
          )}

          {/* Error */}
          {error && (
            <p className="text-red-400 text-sm">{error}</p>
          )}

          {/* Result */}
          {result && (
            <div className="space-y-3">
              {/* Signal card */}
              <div
                className={`rounded-lg border-l-4 ${SIGNAL_STYLES[result.signal].border} ${SIGNAL_STYLES[result.signal].bg} p-4`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${SIGNAL_STYLES[result.signal].dot}`} />
                  <span className={`text-xs font-bold tracking-wider ${SIGNAL_STYLES[result.signal].labelColor}`}>
                    {SIGNAL_STYLES[result.signal].label}
                  </span>
                </div>
                <p className="text-[#F0F0F0] text-sm leading-relaxed">{result.analysis}</p>

                {/* Extra warning for RED */}
                {result.signal === 'red' && (
                  <div className="mt-3 pt-3 border-t border-red-400/20">
                    <p className="text-red-400 text-xs font-medium">
                      ⚠ Consider stepping away. This bet matches patterns that have cost you money before.
                    </p>
                  </div>
                )}
              </div>

              {/* Context */}
              <div className="flex flex-wrap gap-4 text-xs text-ink-600">
                <span>Based on your last 50 bets</span>
                <span>Avg stake: <span className="font-mono text-ink-500">${result.recent_context.avg_stake}</span></span>
                <span>Today&apos;s bets: <span className="font-mono text-ink-500">{result.recent_context.bets_today}</span></span>
                <span>
                  Last 5:{' '}
                  {result.recent_context.last_5_results.map((r, i) => (
                    <span
                      key={i}
                      className={`font-mono font-medium ${
                        r === 'win' ? 'text-mint-500' : r === 'loss' ? 'text-red-400' : 'text-ink-500'
                      }`}
                    >
                      {r === 'win' ? 'W' : r === 'loss' ? 'L' : 'P'}
                      {i < result.recent_context.last_5_results.length - 1 ? ' ' : ''}
                    </span>
                  ))}
                </span>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <button onClick={handleLog} className="btn-secondary text-sm !py-2">
                  Log This Bet
                </button>
                <button onClick={handleClear} className="text-sm text-ink-600 hover:text-[#F0F0F0] transition-colors px-3 py-2">
                  Clear
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
