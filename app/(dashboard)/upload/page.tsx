'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';
import { trackUpload } from '@/lib/tiktok-events';
import OnboardingSteps from '@/components/OnboardingSteps';
import OnboardingBanner from '@/components/OnboardingBanner';
import PasteParser from '@/components/PasteParser';
import type { UploadResponse, Profile } from '@/types';

type UploadState = 'idle' | 'uploading' | 'success' | 'error';
type ActiveTab = 'paste' | 'csv';

export default function UploadPage() {
  const [state, setState] = useState<UploadState>('idle');
  const [dragOver, setDragOver] = useState(false);
  const [result, setResult] = useState<UploadResponse | null>(null);
  const [error, setError] = useState('');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [reportCount, setReportCount] = useState<number | null>(null);
  const [initialBetCount, setInitialBetCount] = useState<number | null>(null);
  const [lastBetDate, setLastBetDate] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('paste');
  const [showDataSection, setShowDataSection] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function loadProfile() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const [profileRes, reportsRes, lastBetRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('autopsy_reports').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('bets').select('placed_at').eq('user_id', user.id).order('placed_at', { ascending: false }).limit(1),
      ]);
      if (profileRes.data) {
        setProfile(profileRes.data as Profile);
        const bc = (profileRes.data as Profile).bet_count;
        setInitialBetCount(bc);
        // Default tab: paste if has bets, csv if no bets
        setActiveTab(bc > 0 ? 'paste' : 'csv');
      }
      setReportCount(reportsRes.count ?? 0);
      if (lastBetRes.data && lastBetRes.data.length > 0) {
        setLastBetDate(lastBetRes.data[0].placed_at);
      }
    }
    loadProfile();
  }, []);

  const isOnboarding = reportCount === 0;
  const betCount = initialBetCount ?? 0;

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
      trackUpload();
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

  // Days since last bet upload
  const daysSinceLastBet = lastBetDate
    ? Math.floor((Date.now() - new Date(lastBetDate).getTime()) / (1000 * 60 * 60 * 24))
    : null;

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
              className="text-xs text-fg-dim hover:text-fg-muted transition-colors"
            >
              Skip for now
            </button>
          </div>
        </div>
      )}

      {/* ── New user: OnboardingBanner prominently at top ── */}
      {betCount === 0 && reportCount !== null && (
        <OnboardingBanner betCount={betCount} reportCount={reportCount} />
      )}

      {/* ── Returning user with bets but no reports: ready banner ── */}
      {betCount > 0 && reportCount !== null && reportCount === 0 && (
        <OnboardingBanner betCount={betCount} reportCount={reportCount} />
      )}

      {/* Header */}
      {betCount === 0 ? (
        <div>
          <h1 className="font-bold text-3xl mb-2 text-fg-bright">Upload Bets</h1>
          <p className="text-fg-muted">
            Drop your CSV and we&apos;ll find the behavioral patterns hiding in your betting history.
          </p>
        </div>
      ) : (
        <div>
          <h1 className="font-bold text-3xl mb-2 text-fg-bright">Add More Bets</h1>
          <p className="text-fg-muted">
            {daysSinceLastBet !== null
              ? `Last uploaded: ${daysSinceLastBet === 0 ? 'today' : `${daysSinceLastBet} day${daysSinceLastBet !== 1 ? 's' : ''} ago`}. `
              : ''}
            Paste from your sportsbook or upload a CSV.
          </p>
        </div>
      )}

      {/* Tier info */}
      {tier === 'free' && (
        <div className="card p-4">
          <p className="text-fg-muted text-sm">
            <span className="font-medium text-fg-bright">Free tier:</span> Upload all your bets — you get 1 free autopsy report (covers your 50 most recent). Upgrade to Pro for unlimited reports across your full history.
          </p>
        </div>
      )}

      {/* ── First-upload celebration ── */}
      {initialBetCount === 0 && uploadSucceeded && (
        <div className="case-card p-8 text-center space-y-4 border-scalpel/20">
          <div className="text-5xl">{'\uD83D\uDD2C'}</div>
          <h2 className="text-fg-bright font-bold text-2xl">Your betting history is loaded.</h2>
          <p className="text-fg-muted text-sm max-w-md mx-auto">
            This is where it gets interesting. Your free autopsy will reveal the cognitive biases
            and behavioral patterns hiding in your data.
          </p>
          <Link href="/reports?run=true" className="btn-primary inline-block text-lg !px-8 !py-3 font-mono">
            Run Your First Autopsy {'\u2192'}
          </Link>
        </div>
      )}

      {/* ── New user: collapsible data section ── */}
      {betCount === 0 && (
        <button
          onClick={() => setShowDataSection((prev) => !prev)}
          className="text-fg-muted hover:text-fg-bright text-sm transition-colors flex items-center gap-2"
        >
          Already have your data?
          <span className="text-xs">{showDataSection ? '\u25B4' : '\u25BE'}</span>
        </button>
      )}

      {/* ── Tab bar ── */}
      {(betCount > 0 || showDataSection) && (
        <div className="flex gap-0 border-b border-white/[0.06]">
          <button
            onClick={() => setActiveTab('paste')}
            className={`px-5 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === 'paste'
                ? 'border-scalpel text-fg-bright'
                : 'border-transparent text-fg-muted hover:text-fg'
            }`}
          >
            Paste from Sportsbook
          </button>
          <button
            onClick={() => setActiveTab('csv')}
            className={`px-5 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === 'csv'
                ? 'border-scalpel text-fg-bright'
                : 'border-transparent text-fg-muted hover:text-fg'
            }`}
          >
            CSV Upload
          </button>
        </div>
      )}

      {/* ── Paste tab ── */}
      {(betCount > 0 || showDataSection) && activeTab === 'paste' && <PasteParser />}

      {/* ── CSV tab ── */}
      {(betCount > 0 || showDataSection) && activeTab === 'csv' && (
        <div className="space-y-6">
          {/* How to get your data — prominent banner */}
          <Link
            href="/how-to-upload"
            className="block card border-scalpel/20 bg-scalpel-muted hover:bg-scalpel-muted p-4 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-fg-bright font-medium text-sm">Don&apos;t have a CSV yet?</p>
                <p className="text-fg-muted text-sm mt-0.5">
                  We&apos;ll show you how to get your bet history into BetAutopsy — step by step for every method.
                </p>
              </div>
              <span className="text-scalpel text-lg shrink-0 ml-4">{'\u2192'}</span>
            </div>
          </Link>

          {/* Template download */}
          <div className="text-sm">
            <a href="/api/template" className="text-scalpel hover:underline">
              {'\u2193'} Download CSV template
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
                ? 'border-scalpel bg-scalpel-muted'
                : 'hover:border-white/[0.08]'
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
                <div className="text-4xl animate-pulse">{'\u23F3'}</div>
                <p className="text-fg-muted">Parsing and importing your bets...</p>
                <div className="w-48 h-1.5 bg-surface rounded-full mx-auto overflow-hidden">
                  <div className="h-full bg-scalpel rounded-full animate-pulse w-2/3" />
                </div>
              </div>
            ) : state === 'success' && result ? (
              <div className="space-y-3">
                <div className="text-4xl">{result.bets_imported > 0 ? '\u2705' : '\u2139\uFE0F'}</div>
                {result.bets_imported > 0 ? (
                  <p className="text-win font-medium text-lg">
                    {result.bets_imported} bet{result.bets_imported !== 1 ? 's' : ''} imported
                    {result.duplicates_skipped > 0 && (
                      <span className="text-fg-muted font-normal text-sm block mt-1">
                        {result.duplicates_skipped} duplicate{result.duplicates_skipped !== 1 ? 's' : ''} skipped
                      </span>
                    )}
                  </p>
                ) : (
                  <p className="text-fg-muted font-medium text-lg">
                    All {result.duplicates_skipped} bet{result.duplicates_skipped !== 1 ? 's were' : ' was'} already in your history — nothing new to import.
                  </p>
                )}
                {result.warnings.length > 0 && (
                  <div className="text-left max-w-md mx-auto mt-4">
                    <p className="text-caution text-sm font-medium mb-1">Warnings:</p>
                    <ul className="text-caution/70 text-xs space-y-1">
                      {result.warnings.slice(0, 5).map((w, i) => (
                        <li key={i}>{'\u2022'} {w}</li>
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
                        Run Your First Autopsy {'\u2192'}
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
                        className="text-sm text-fg-muted hover:text-fg transition-colors"
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
                <div className="text-4xl">{'\u274C'}</div>
                <p className="text-loss">{error}</p>
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
                <div className="text-5xl">{'\uD83D\uDCE4'}</div>
                <p className="text-fg-bright font-medium text-lg">
                  Drag &amp; drop your CSV here
                </p>
                <p className="text-fg-muted text-sm">or click to browse files</p>
              </div>
            )}
          </div>

          {/* Format guide */}
          <div className="card p-6 space-y-4">
            <h2 className="font-bold text-xl text-fg-bright">Supported Formats</h2>
            <p className="text-fg-muted text-sm">
              We auto-detect columns from Pikkit (including DFS/pick&apos;em and prediction market data)
              and generic CSV exports.
            </p>
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-fg-muted">Expected columns:</h3>
              <div className="flex flex-wrap gap-2">
                {['date', 'sport', 'bet_type', 'description', 'odds', 'stake', 'result', 'profit', 'sportsbook'].map(
                  (col) => (
                    <span key={col} className="font-mono text-xs bg-base border border-white/[0.04] rounded px-2 py-1">
                      {col}
                    </span>
                  )
                )}
              </div>
            </div>
            <div>
              <h3 className="text-sm font-medium text-fg-muted mb-2">Sample CSV:</h3>
              <pre className="font-mono text-xs text-fg-muted bg-base border border-white/[0.04] rounded-sm p-4 overflow-x-auto">
{`date,sport,bet_type,description,odds,stake,result,profit,sportsbook
2025-01-05,NFL,spread,Chiefs -3.5,-110,100,win,91,DraftKings
2025-01-06,NBA,prop,Jokic Over 25.5 pts,+100,50,loss,-50,BetMGM
2025-01-07,NBA,parlay,3-leg parlay,+550,25,loss,-25,FanDuel`}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Bottom links */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 text-sm">
        <a href="/api/template" className="text-scalpel hover:underline">
          {'\u2193'} Download CSV template
        </a>
        <Link href="/bets" className="text-fg-muted hover:text-fg transition-colors">
          Or enter bets manually
        </Link>
      </div>
    </div>
  );
}
