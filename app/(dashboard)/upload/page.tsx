'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';
import OnboardingSteps from '@/components/OnboardingSteps';
import type { UploadResponse, Profile } from '@/types';

type UploadState = 'idle' | 'uploading' | 'success' | 'error';

export default function UploadPage() {
  const [state, setState] = useState<UploadState>('idle');
  const [dragOver, setDragOver] = useState(false);
  const [result, setResult] = useState<UploadResponse | null>(null);
  const [error, setError] = useState('');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [reportCount, setReportCount] = useState<number | null>(null);
  const [initialBetCount, setInitialBetCount] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function loadProfile() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const [profileRes, reportsRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('autopsy_reports').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      ]);
      if (profileRes.data) {
        setProfile(profileRes.data as Profile);
        setInitialBetCount((profileRes.data as Profile).bet_count);
      }
      setReportCount(reportsRes.count ?? 0);
    }
    loadProfile();
  }, []);

  const isOnboarding = reportCount === 0;

  const handleFile = useCallback(async (file: File) => {
    if (!file.name.endsWith('.csv')) {
      setError('Please upload a CSV file.');
      setState('error');
      return;
    }

    setState('uploading');
    setError('');
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Upload failed');
        setState('error');
        return;
      }

      setResult(data as UploadResponse);
      setState('success');
    } catch {
      setError('Upload failed. Please try again.');
      setState('error');
    }
  }, []);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  const tier = profile?.subscription_tier ?? 'free';

  const uploadSucceeded = state === 'success' && result && result.bets_imported > 0;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Onboarding step indicator */}
      {isOnboarding && initialBetCount === 0 && (
        <div className="space-y-3">
          <OnboardingSteps
            active={uploadSucceeded ? 2 : 1}
            completed={uploadSucceeded ? [1] : []}
          />
          <div className="text-center">
            <button
              onClick={() => {
                sessionStorage.setItem('onboarding_skip', '1');
                window.location.href = '/dashboard';
              }}
              className="text-xs text-ink-700 hover:text-ink-500 transition-colors"
            >
              Skip for now
            </button>
          </div>
        </div>
      )}

      <div>
        <h1 className="font-serif text-3xl mb-2">Upload Bets</h1>
        <p className="text-ink-600">
          Drop your CSV and let&apos;s see what&apos;s really going on.
        </p>
      </div>

      {/* Tier info */}
      {tier === 'free' && (
        <div className="card border-ink-700/30 bg-ink-800/40 p-4">
          <p className="text-ink-600 text-sm">
            <span className="font-medium text-[#e7e6e1]">Free tier:</span> Upload all your bets — you get 1 free autopsy report (covers your 50 most recent). Upgrade to Pro for unlimited reports across your full history.
          </p>
        </div>
      )}

      {/* How to get your data — prominent banner */}
      <Link
        href="/how-to-upload"
        className="block card border-flame-500/30 bg-flame-500/5 hover:bg-flame-500/10 p-4 transition-colors"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[#e7e6e1] font-medium text-sm">Don&apos;t have a CSV yet?</p>
            <p className="text-ink-600 text-sm mt-0.5">
              We&apos;ll show you how to export your bet history in under 3 minutes — works with every sportsbook.
            </p>
          </div>
          <span className="text-flame-500 text-lg shrink-0 ml-4">→</span>
        </div>
      </Link>

      {/* Template download */}
      <div className="text-sm">
        <a href="/api/template" className="text-flame-500 hover:underline">
          ↓ Download CSV template
        </a>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`card p-12 text-center cursor-pointer transition-all duration-200 ${
          dragOver
            ? 'border-flame-500 bg-flame-500/5'
            : 'hover:border-ink-700/60'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileSelect}
          className="hidden"
        />

        {state === 'uploading' ? (
          <div className="space-y-3">
            <div className="text-4xl animate-pulse">⏳</div>
            <p className="text-ink-600">Parsing and importing your bets...</p>
            <div className="w-48 h-1.5 bg-ink-700 rounded-full mx-auto overflow-hidden">
              <div className="h-full bg-flame-500 rounded-full animate-pulse w-2/3" />
            </div>
          </div>
        ) : state === 'success' && result ? (
          <div className="space-y-3">
            <div className="text-4xl">{result.bets_imported > 0 ? '✅' : 'ℹ️'}</div>
            {result.bets_imported > 0 ? (
              <p className="text-mint-500 font-medium text-lg">
                {result.bets_imported} bet{result.bets_imported !== 1 ? 's' : ''} imported
                {result.duplicates_skipped > 0 && (
                  <span className="text-ink-600 font-normal text-sm block mt-1">
                    {result.duplicates_skipped} duplicate{result.duplicates_skipped !== 1 ? 's' : ''} skipped
                  </span>
                )}
              </p>
            ) : (
              <p className="text-ink-600 font-medium text-lg">
                All {result.duplicates_skipped} bet{result.duplicates_skipped !== 1 ? 's were' : ' was'} already in your history — nothing new to import.
              </p>
            )}
            {result.warnings.length > 0 && (
              <div className="text-left max-w-md mx-auto mt-4">
                <p className="text-amber-400 text-sm font-medium mb-1">Warnings:</p>
                <ul className="text-amber-400/70 text-xs space-y-1">
                  {result.warnings.slice(0, 5).map((w, i) => (
                    <li key={i}>• {w}</li>
                  ))}
                  {result.warnings.length > 5 && (
                    <li>...and {result.warnings.length - 5} more</li>
                  )}
                </ul>
              </div>
            )}
            {result.bets_imported > 0 ? (
              <div className="space-y-3 mt-2">
                {isOnboarding ? (
                  <Link
                    href="/reports?run=true"
                    className="btn-primary inline-block text-lg !px-8 !py-3"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Run Your First Autopsy →
                  </Link>
                ) : (
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    {result.upload_id && (
                      <Link
                        href={`/reports?upload_id=${result.upload_id}`}
                        className="btn-primary text-sm"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Analyze This Upload
                      </Link>
                    )}
                    <Link
                      href="/reports?run=true"
                      className="btn-secondary text-sm"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Analyze All Bets
                    </Link>
                  </div>
                )}
                <div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setState('idle');
                      setResult(null);
                    }}
                    className="text-sm text-ink-600 hover:text-[#e7e6e1] transition-colors"
                  >
                    Upload more bets first
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setState('idle');
                  setResult(null);
                }}
                className="btn-secondary text-sm mt-2"
              >
                Upload Another
              </button>
            )}
          </div>
        ) : state === 'error' ? (
          <div className="space-y-3">
            <div className="text-4xl">❌</div>
            <p className="text-red-400">{error}</p>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setState('idle');
                setError('');
              }}
              className="btn-secondary text-sm mt-2"
            >
              Try Again
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="text-5xl">📤</div>
            <p className="text-[#e7e6e1] font-medium text-lg">
              Drag &amp; drop your CSV here
            </p>
            <p className="text-ink-600 text-sm">or click to browse files</p>
          </div>
        )}
      </div>

      {/* Format guide */}
      <div className="card p-6 space-y-4">
        <h2 className="font-serif text-xl">Supported Formats</h2>
        <p className="text-ink-600 text-sm">
          We auto-detect columns from most bet trackers including Pikkit, Juice
          Reel, BetStamp, and generic CSV exports.
        </p>
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-ink-600">Expected columns:</h3>
          <div className="flex flex-wrap gap-2">
            {['date', 'sport', 'bet_type', 'description', 'odds', 'stake', 'result', 'profit', 'sportsbook'].map(
              (col) => (
                <span key={col} className="font-mono text-xs bg-ink-900 border border-ink-700 rounded px-2 py-1">
                  {col}
                </span>
              )
            )}
          </div>
        </div>
        <div>
          <h3 className="text-sm font-medium text-ink-600 mb-2">Sample CSV:</h3>
          <pre className="font-mono text-xs text-ink-500 bg-ink-900 border border-ink-700 rounded-lg p-4 overflow-x-auto">
{`date,sport,bet_type,description,odds,stake,result,profit,sportsbook
2025-01-05,NFL,spread,Chiefs -3.5,-110,100,win,91,DraftKings
2025-01-06,NBA,prop,Jokic Over 25.5 pts,+100,50,loss,-50,BetMGM
2025-01-07,NBA,parlay,3-leg parlay,+550,25,loss,-25,FanDuel`}
          </pre>
        </div>
      </div>
    </div>
  );
}
