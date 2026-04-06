'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';

interface ParsedBet {
  placed_at: string;
  sport: string;
  bet_type: string;
  description: string;
  odds: number;
  stake: number;
  result: string;
  profit: number;
  sportsbook: string | null;
  parlay_legs: number | null;
}

type Phase = 'input' | 'parsing' | 'preview' | 'importing' | 'success';

export default function ScreenshotParser() {
  const [phase, setPhase] = useState<Phase>('input');
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [parsedBets, setParsedBets] = useState<ParsedBet[]>([]);
  const [parseNotes, setParseNotes] = useState<string[]>([]);
  const [selectedBets, setSelectedBets] = useState<Set<number>>(new Set());
  const [error, setError] = useState('');
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFiles(newFiles: FileList | null) {
    if (!newFiles) return;
    const imageFiles = Array.from(newFiles).filter(f => f.type.startsWith('image/'));
    if (imageFiles.length === 0) { setError('Please select image files (PNG, JPG, etc.)'); return; }
    if (files.length + imageFiles.length > 10) { setError('Maximum 10 screenshots. Remove some or upload in batches.'); return; }
    setError('');
    const updated = [...files, ...imageFiles];
    setFiles(updated);
    // Generate previews
    imageFiles.forEach(f => {
      const reader = new FileReader();
      reader.onload = (e) => setPreviews(prev => [...prev, e.target?.result as string]);
      reader.readAsDataURL(f);
    });
  }

  function removeFile(index: number) {
    setFiles(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
  }

  async function handleParse() {
    if (files.length === 0) return;
    setPhase('parsing');
    setError('');
    try {
      const formData = new FormData();
      files.forEach(f => formData.append('files', f));
      const res = await fetch('/api/parse-screenshot', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to parse screenshots'); setPhase('input'); return; }
      if (!data.bets || data.bets.length === 0) {
        setError(data.parse_notes?.join(' ') || 'No bets found in the screenshots.');
        setParseNotes(data.parse_notes || []);
        setPhase('input');
        return;
      }
      setParsedBets(data.bets);
      setParseNotes(data.parse_notes || []);
      setSelectedBets(new Set(data.bets.map((_: ParsedBet, i: number) => i)));
      setPhase('preview');
    } catch {
      setError('Failed to process screenshots. Try again.');
      setPhase('input');
    }
  }

  async function handleImport() {
    const betsToImport = parsedBets.filter((_, i) => selectedBets.has(i));
    if (betsToImport.length === 0) return;
    setPhase('importing');
    try {
      const res = await fetch('/api/upload-parsed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bets: betsToImport }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Import failed'); setPhase('preview'); return; }
      setImportResult({ imported: data.bets_imported, skipped: data.duplicates_skipped });
      setPhase('success');
    } catch {
      setError('Import failed. Try again.');
      setPhase('preview');
    }
  }

  function reset() {
    setPhase('input');
    setFiles([]);
    setPreviews([]);
    setParsedBets([]);
    setParseNotes([]);
    setSelectedBets(new Set());
    setError('');
    setImportResult(null);
  }

  // ── Input phase ──
  if (phase === 'input') {
    return (
      <div className="space-y-4">
        <p className="text-fg-muted text-xs">
          Works with <span className="text-fg-bright">DraftKings, FanDuel, BetMGM, Caesars, theScore Bet, Fanatics, bet365, BetRivers</span>. Screenshot your settled bets page. We extract every bet.
        </p>

        {/* Drop zone */}
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); }}
          onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
          className="card p-8 text-center cursor-pointer hover:border-border transition-colors"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => handleFiles(e.target.files)}
            className="hidden"
          />
          <div className="text-4xl mb-2">📸</div>
          <p className="text-fg-bright font-medium">Drop screenshots here or click to browse</p>
          <p className="text-fg-muted text-xs mt-1">PNG, JPG, or WEBP, up to 10 at once</p>
        </div>

        {/* Preview thumbnails */}
        {previews.length > 0 && (
          <div className="space-y-3">
            <p className="text-fg-muted text-xs">{files.length} screenshot{files.length !== 1 ? 's' : ''} selected</p>
            <div className="flex gap-2 flex-wrap">
              {previews.map((src, i) => (
                <div key={i} className="relative group">
                  <img src={src} alt={`Screenshot ${i + 1}`} className="w-20 h-20 object-cover rounded-sm border border-border-subtle" />
                  <button
                    onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-loss text-base rounded-full text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            <button onClick={handleParse} className="btn-primary text-sm font-mono">
              Extract Bets from {files.length} Screenshot{files.length !== 1 ? 's' : ''}
            </button>
          </div>
        )}

        {error && (
          <div className="space-y-2">
            <p className="text-loss text-sm">{error}</p>
            <a href="mailto:support@betautopsy.com?subject=Screenshot%20parser%20issue" className="text-scalpel text-xs hover:underline">
              Didn&apos;t work? Email us and we&apos;ll help →
            </a>
          </div>
        )}

        <p className="text-fg-muted text-xs">
          Tip: Screenshot your sportsbook&apos;s Settled/History page. Each screenshot can contain many bets. We extract them all and skip duplicates.
        </p>
      </div>
    );
  }

  // ── Parsing phase ──
  if (phase === 'parsing') {
    return (
      <div className="text-center py-12 space-y-4">
        <div className="text-4xl animate-pulse">🔍</div>
        <p className="text-fg-bright font-medium">Reading {files.length} screenshot{files.length !== 1 ? 's' : ''}...</p>
        <p className="text-fg-muted text-sm">Extracting bet data with AI. This takes a few seconds.</p>
      </div>
    );
  }

  // ── Preview phase ──
  if (phase === 'preview') {
    const selectedCount = selectedBets.size;
    return (
      <div className="space-y-4">
        {parseNotes.length > 0 && (
          <div className="space-y-1.5">
            {parseNotes.map((note, i) => (
              <div key={i} className="bg-scalpel-muted text-scalpel p-3 rounded-sm text-sm">ℹ️ {note}</div>
            ))}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-subtle">
                <th className="p-2 w-8">
                  <input
                    type="checkbox"
                    checked={selectedCount === parsedBets.length}
                    onChange={(e) => setSelectedBets(e.target.checked ? new Set(parsedBets.map((_, i) => i)) : new Set())}
                    className="accent-scalpel"
                  />
                </th>
                <th className="text-left text-fg-muted font-medium p-2">Date</th>
                <th className="text-left text-fg-muted font-medium p-2">Sport</th>
                <th className="text-left text-fg-muted font-medium p-2">Description</th>
                <th className="text-right text-fg-muted font-medium p-2">Odds</th>
                <th className="text-right text-fg-muted font-medium p-2">Stake</th>
                <th className="text-right text-fg-muted font-medium p-2">Result</th>
                <th className="text-right text-fg-muted font-medium p-2">Profit</th>
              </tr>
            </thead>
            <tbody>
              {parsedBets.map((bet, i) => (
                <tr key={i} className="border-b border-border-subtle">
                  <td className="p-2">
                    <input
                      type="checkbox"
                      checked={selectedBets.has(i)}
                      onChange={(e) => {
                        const next = new Set(selectedBets);
                        e.target.checked ? next.add(i) : next.delete(i);
                        setSelectedBets(next);
                      }}
                      className="accent-scalpel"
                    />
                  </td>
                  <td className="p-2 font-mono text-xs text-fg-muted">{bet.placed_at}</td>
                  <td className="p-2 text-fg-muted">{bet.sport}</td>
                  <td className="p-2 text-fg-bright max-w-[200px] truncate" title={bet.description}>{bet.description}</td>
                  <td className="p-2 text-right font-mono text-fg-muted">{bet.odds > 0 ? `+${bet.odds}` : bet.odds}</td>
                  <td className="p-2 text-right font-mono text-fg-muted">${bet.stake}</td>
                  <td className={`p-2 text-right font-mono ${bet.result === 'win' ? 'text-win' : bet.result === 'loss' ? 'text-loss' : 'text-fg-muted'}`}>{bet.result}</td>
                  <td className={`p-2 text-right font-mono ${bet.profit >= 0 ? 'text-win' : 'text-loss'}`}>{bet.profit >= 0 ? '+' : ''}${bet.profit.toFixed(0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {error && <p className="text-loss text-sm">{error}</p>}

        <div className="flex gap-3">
          <button onClick={handleImport} disabled={selectedCount === 0} className="btn-primary text-sm font-mono disabled:opacity-50">
            Import {selectedCount} Bet{selectedCount !== 1 ? 's' : ''}
          </button>
          <button onClick={reset} className="btn-secondary text-sm">Re-upload</button>
        </div>
        <p className="text-fg-muted text-xs">Uncheck any bets that look wrong.</p>
      </div>
    );
  }

  // ── Importing phase ──
  if (phase === 'importing') {
    return (
      <div className="text-center py-12 space-y-4">
        <div className="text-4xl animate-pulse">⏳</div>
        <p className="text-fg-bright font-medium">Importing bets...</p>
      </div>
    );
  }

  // ── Success phase ──
  if (phase === 'success' && importResult) {
    return (
      <div className="text-center py-8 space-y-4">
        <div className="text-4xl">✅</div>
        <p className="text-fg-bright font-medium text-lg">
          {importResult.imported} bet{importResult.imported !== 1 ? 's' : ''} imported
          {importResult.skipped > 0 && (
            <span className="text-fg-muted font-normal text-sm block mt-1">
              {importResult.skipped} duplicate{importResult.skipped !== 1 ? 's' : ''} skipped
            </span>
          )}
        </p>
        <div className="flex gap-3 justify-center">
          <Link href="/reports?run=true" className="btn-primary text-sm font-mono">Run Autopsy →</Link>
          <button onClick={reset} className="btn-secondary text-sm">Upload More Screenshots</button>
        </div>
      </div>
    );
  }

  return null;
}
