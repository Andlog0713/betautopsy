'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import type { ParsedBet } from '@/types';

type PasteState = 'input' | 'parsing' | 'preview' | 'success';

const SPORTSBOOKS = [
  'Auto-detect',
  'DraftKings',
  'FanDuel',
  'BetMGM',
  'Caesars',
  'ESPN Bet',
  'Fanatics',
  'bet365',
  'BetRivers',
  'Other',
] as const;

interface ParseResponse {
  bets: ParsedBet[];
  parse_notes: string[];
  raw_text_length: number;
}

interface UploadResult {
  bets_imported: number;
  duplicates_skipped: number;
  upload_id: string;
  errors: string[];
}

export default function PasteParser() {
  const [state, setState] = useState<PasteState>('input');
  const [text, setText] = useState('');
  const [sportsbook, setSportsbook] = useState('Auto-detect');
  const [parsedBets, setParsedBets] = useState<ParsedBet[]>([]);
  const [parseNotes, setParseNotes] = useState<string[]>([]);
  const [checked, setChecked] = useState<boolean[]>([]);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState('');

  const charCount = text.length;

  const handleParse = useCallback(async () => {
    if (!text.trim()) return;
    setState('parsing');
    setError('');

    try {
      const body: { text: string; sportsbook_hint?: string } = { text };
      if (sportsbook !== 'Auto-detect') {
        body.sportsbook_hint = sportsbook;
      }

      const res = await fetch('/api/parse-paste', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data: ParseResponse = await res.json();

      if (!res.ok) {
        setError((data as unknown as { error: string }).error || 'Parse failed');
        setState('input');
        return;
      }

      if (!data.bets || data.bets.length === 0) {
        setParseNotes(data.parse_notes || ['No bets found in the pasted text.']);
        setParsedBets([]);
        setChecked([]);
        setState('preview');
        return;
      }

      setParsedBets(data.bets);
      setParseNotes(data.parse_notes || []);
      setChecked(new Array(data.bets.length).fill(true));
      setState('preview');
    } catch {
      setError('Failed to parse. Please try again.');
      setState('input');
    }
  }, [text, sportsbook]);

  const handleImport = useCallback(async () => {
    const selectedBets = parsedBets.filter((_, i) => checked[i]);
    if (selectedBets.length === 0) return;

    try {
      const res = await fetch('/api/upload-parsed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bets: selectedBets }),
      });

      const data: UploadResult = await res.json();

      if (!res.ok) {
        setError((data as unknown as { error: string }).error || 'Import failed');
        return;
      }

      setUploadResult(data);
      setState('success');
    } catch {
      setError('Import failed. Please try again.');
    }
  }, [parsedBets, checked]);

  const selectedCount = checked.filter(Boolean).length;

  const toggleAll = () => {
    const allChecked = checked.every(Boolean);
    setChecked(new Array(checked.length).fill(!allChecked));
  };

  const toggleOne = (i: number) => {
    setChecked((prev) => {
      const next = [...prev];
      next[i] = !next[i];
      return next;
    });
  };

  const resetToInput = () => {
    setState('input');
    setText('');
    setParsedBets([]);
    setParseNotes([]);
    setChecked([]);
    setUploadResult(null);
    setError('');
  };

  const formatOdds = (odds: number) => (odds > 0 ? `+${odds}` : `${odds}`);

  const resultColor = (result: string) => {
    if (result === 'win') return 'text-win';
    if (result === 'loss') return 'text-loss';
    return 'text-fg-muted';
  };

  // ── State 4: Success ──
  if (state === 'success' && uploadResult) {
    return (
      <div className="card p-8 text-center space-y-4 animate-fade-in">
        <p className="text-lg font-medium text-fg-bright">
          {'\u2705'} {uploadResult.bets_imported} bet{uploadResult.bets_imported !== 1 ? 's' : ''} imported
          {uploadResult.duplicates_skipped > 0 && (
            <span className="text-fg-muted font-normal text-sm block mt-1">
              {uploadResult.duplicates_skipped} duplicate{uploadResult.duplicates_skipped !== 1 ? 's' : ''} skipped
            </span>
          )}
        </p>
        {uploadResult.errors.length > 0 && (
          <div className="text-left max-w-md mx-auto">
            <p className="text-caution text-sm font-medium mb-1">Warnings:</p>
            <ul className="text-caution/70 text-xs space-y-1">
              {uploadResult.errors.slice(0, 5).map((e, i) => (
                <li key={i}>{'\u2022'} {e}</li>
              ))}
            </ul>
          </div>
        )}
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Link href="/reports?run=true" className="btn-primary">
            Run Autopsy {'\u2192'}
          </Link>
          <button onClick={resetToInput} className="btn-secondary">
            Paste More Bets
          </button>
        </div>
      </div>
    );
  }

  // ── State 3: Preview ──
  if (state === 'preview') {
    const noBets = parsedBets.length === 0;

    return (
      <div className="space-y-4 animate-fade-in">
        {/* Parse notes */}
        {parseNotes.map((note, i) => (
          <div key={i} className="bg-scalpel-muted text-scalpel p-3 text-sm rounded-sm">
            {note}
          </div>
        ))}

        {noBets ? (
          <div className="card p-8 text-center space-y-4">
            <p className="text-fg-muted">No bets were found in the pasted text.</p>
            <button onClick={resetToInput} className="btn-secondary">
              Try Again
            </button>
          </div>
        ) : (
          <>
            {error && (
              <div className="bg-bleed-muted text-loss p-3 text-sm rounded-sm">{error}</div>
            )}

            {/* Table */}
            <div className="card overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    <th className="p-3 text-left w-10">
                      <input
                        type="checkbox"
                        checked={checked.every(Boolean)}
                        onChange={toggleAll}
                        className="accent-scalpel"
                      />
                    </th>
                    <th className="case-header p-3 text-left">Date</th>
                    <th className="case-header p-3 text-left">Sport</th>
                    <th className="case-header p-3 text-left">Type</th>
                    <th className="case-header p-3 text-left">Description</th>
                    <th className="case-header p-3 text-right">Odds</th>
                    <th className="case-header p-3 text-right">Stake</th>
                    <th className="case-header p-3 text-center">Result</th>
                    <th className="case-header p-3 text-right">Profit</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedBets.map((bet, i) => (
                    <tr
                      key={i}
                      className={`border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors ${
                        !checked[i] ? 'opacity-40' : ''
                      }`}
                    >
                      <td className="p-3">
                        <input
                          type="checkbox"
                          checked={checked[i]}
                          onChange={() => toggleOne(i)}
                          className="accent-scalpel"
                        />
                      </td>
                      <td className="p-3 font-mono text-xs text-fg-muted whitespace-nowrap">
                        {bet.placed_at?.slice(0, 10) ?? '—'}
                      </td>
                      <td className="p-3 text-fg-muted">{bet.sport}</td>
                      <td className="p-3 text-fg-muted">{bet.bet_type}</td>
                      <td className="p-3 text-fg-bright max-w-[250px] truncate">{bet.description}</td>
                      <td className="p-3 font-mono text-right text-fg-muted">{formatOdds(bet.odds)}</td>
                      <td className="p-3 font-mono text-right text-fg-muted">${bet.stake.toFixed(2)}</td>
                      <td className={`p-3 text-center font-medium uppercase text-xs ${resultColor(bet.result)}`}>
                        {bet.result}
                      </td>
                      <td className={`p-3 font-mono text-right ${bet.profit >= 0 ? 'text-win' : 'text-loss'}`}>
                        {bet.profit >= 0 ? '+' : ''}{bet.profit.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between">
              <button onClick={resetToInput} className="btn-secondary text-sm">
                Re-paste
              </button>
              <button
                onClick={handleImport}
                disabled={selectedCount === 0}
                className="btn-primary"
              >
                Import {selectedCount} bet{selectedCount !== 1 ? 's' : ''}
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  // ── State 1 & 2: Input / Parsing ──
  return (
    <div className="space-y-4 animate-fade-in">
      {error && (
        <div className="bg-bleed-muted text-loss p-3 text-sm rounded-sm">{error}</div>
      )}

      {/* Textarea */}
      <div className="relative">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          readOnly={state === 'parsing'}
          placeholder="Go to your sportsbook → My Bets → Settled, select the page, copy it, and paste here. Works with DraftKings, FanDuel, BetMGM, and every other major sportsbook."
          className={`w-full min-h-[250px] bg-base border border-white/[0.06] rounded-sm p-4 font-mono text-sm text-fg placeholder:text-fg-dim focus:outline-none focus:ring-1 focus:ring-scalpel/30 focus:border-scalpel/30 resize-y transition-all ${
            state === 'parsing' ? 'opacity-50' : ''
          }`}
        />
        <span
          className={`absolute bottom-3 right-3 text-xs ${
            charCount > 80000 ? 'text-caution' : 'text-fg-muted'
          }`}
        >
          {charCount.toLocaleString()} chars
        </span>
      </div>

      {/* Sportsbook select + button */}
      <div className="flex flex-col sm:flex-row gap-3">
        <select
          value={sportsbook}
          onChange={(e) => setSportsbook(e.target.value)}
          disabled={state === 'parsing'}
          className="input-field sm:w-48"
        >
          {SPORTSBOOKS.map((sb) => (
            <option key={sb} value={sb}>{sb}</option>
          ))}
        </select>

        {state === 'parsing' ? (
          <button disabled className="btn-primary flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-base animate-pulse" />
            Extracting your bets...
          </button>
        ) : (
          <button
            onClick={handleParse}
            disabled={!text.trim()}
            className="btn-primary"
          >
            Parse Bets
          </button>
        )}
      </div>

      {/* Tip */}
      <p className="text-fg-dim text-xs">
        Sportsbooks usually show 20-50 bets per page. Paste multiple pages — we skip duplicates.
      </p>
    </div>
  );
}
