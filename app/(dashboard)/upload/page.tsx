'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';
import { trackUpload } from '@/lib/tiktok-events';
import OnboardingSteps from '@/components/OnboardingSteps';
import PasteParser from '@/components/PasteParser';
import ScreenshotParser from '@/components/ScreenshotParser';
import type { UploadResponse, Profile } from '@/types';
import { userQualifiesForPromo } from '@/types';
import { Camera, FlaskConical, DollarSign, Loader2, CheckCircle2, XCircle, Upload as UploadIcon, Smartphone, ClipboardList, FileText } from 'lucide-react';

type UploadState = 'idle' | 'uploading' | 'success' | 'error';
type ActiveMethod = 'pikkit' | 'screenshot' | 'paste' | 'csv';

export default function UploadPage() {
  const [state, setState] = useState<UploadState>('idle');
  const [dragOver, setDragOver] = useState(false);
  const [result, setResult] = useState<UploadResponse | null>(null);
  const [error, setError] = useState('');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [reportCount, setReportCount] = useState<number | null>(null);
  const [initialBetCount, setInitialBetCount] = useState<number | null>(null);
  const [activeMethod, setActiveMethod] = useState<ActiveMethod>('pikkit');
  const [showPikkitSteps, setShowPikkitSteps] = useState(false);
  const [bankrollInput, setBankrollInput] = useState('');
  const [bankrollSaving, setBankrollSaving] = useState(false);
  const [bankrollSaved, setBankrollSaved] = useState(false);
  const [promoEligible, setPromoEligible] = useState(false);
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
        const p = profileRes.data as Profile;
        setProfile(p);
        const bc = p.bet_count;
        setInitialBetCount(bc);
        setActiveMethod(bc > 0 ? 'screenshot' : 'pikkit');
        // Check promo eligibility
        if (p.subscription_tier === 'free' && userQualifiesForPromo(p.created_at)) {
          const { count: fullCount } = await supabase
            .from('autopsy_reports')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('report_type', 'full');
          if ((fullCount ?? 0) === 0) setPromoEligible(true);
        }
      }
      setReportCount(reportsRes.count ?? 0);
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
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Upload failed'); setState('error'); return; }
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

  const methods = [
    { id: 'pikkit' as const, icon: <Smartphone size={24} className="text-fg-muted" />, label: 'Pikkit', desc: betCount === 0 ? 'Import full history' : 'Sync sportsbooks', badge: betCount === 0 ? 'RECOMMENDED' : undefined },
    { id: 'screenshot' as const, icon: <Camera size={24} className="text-fg-muted" />, label: 'Screenshot', desc: 'From mobile app', badge: 'BEST FOR UPDATES' },
    { id: 'paste' as const, icon: <ClipboardList size={24} className="text-fg-muted" />, label: 'Paste', desc: 'From desktop browser' },
    { id: 'csv' as const, icon: <FileText size={24} className="text-fg-muted" />, label: 'CSV', desc: 'Upload a file' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Onboarding steps */}
      {isOnboarding && initialBetCount === 0 && !uploadSucceeded && (
        <div className="space-y-3">
          <OnboardingSteps active={1} completed={[]} />
          <div className="text-center">
            <button onClick={() => { localStorage.setItem('onboarding_skip', '1'); window.location.href = '/dashboard'; }} className="text-xs text-fg-muted hover:text-fg transition-colors">
              Skip for now
            </button>
          </div>
        </div>
      )}

      {/* First-upload celebration + bankroll prompt */}
      {initialBetCount === 0 && uploadSucceeded && (
        <div className="case-card p-8 text-center space-y-5 border-scalpel/20">
          <div><FlaskConical size={40} className="text-fg-muted" /></div>
          <h2 className="text-fg-bright font-bold text-2xl">Your betting history is loaded.</h2>
          {tier === 'pro' ? (
            <p className="text-fg-muted text-sm max-w-md mx-auto">
              Your full autopsy report will analyze every bet for cognitive biases, strategic leaks, and behavioral patterns.
            </p>
          ) : promoEligible ? (
            <>
              <div className="bg-scalpel-muted border border-scalpel/20 rounded-sm px-4 py-2 inline-block">
                <p className="text-scalpel text-sm font-medium">Your first full report is free.</p>
              </div>
              <p className="text-fg-muted text-sm max-w-md mx-auto">
                Complete 5-chapter analysis with all biases, dollar costs, strategic leaks, and a personalized action plan.
              </p>
            </>
          ) : (
            <p className="text-fg-muted text-sm max-w-md mx-auto">
              Your free snapshot will show your grade, archetype, and top bias. Want the full 5-chapter breakdown with dollar costs and an action plan? Full reports start at $9.99.
            </p>
          )}

          {/* Bankroll prompt — only if not already set */}
          {!profile?.bankroll && !bankrollSaved && (
            <div className="bg-surface-1 border border-border-subtle rounded-sm p-5 max-w-sm mx-auto text-left space-y-3">
              <p className="text-fg-bright text-sm font-medium">Set your bankroll for a more accurate grade</p>
              <p className="text-fg-muted text-xs">
                How much money do you have set aside for betting? This is the total amount you&apos;d be comfortable having in action, whether it&apos;s sitting in your sportsbook accounts, ready to deposit, or both. A rough estimate is fine.
              </p>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted text-sm">$</span>
                  <input
                    type="number"
                    placeholder="e.g. 500"
                    value={bankrollInput}
                    onChange={(e) => setBankrollInput(e.target.value)}
                    className="w-full bg-base border border-border rounded-sm px-3 py-2 pl-7 text-sm font-mono text-fg-bright placeholder:text-fg-dim focus:outline-none focus:border-scalpel/40"
                  />
                </div>
                <button
                  onClick={async () => {
                    const val = parseFloat(bankrollInput);
                    if (!val || val <= 0) return;
                    setBankrollSaving(true);
                    const supabase = createClient();
                    const { data: { user } } = await supabase.auth.getUser();
                    if (user) {
                      await supabase.from('profiles').update({ bankroll: val }).eq('id', user.id);
                    }
                    setBankrollSaving(false);
                    setBankrollSaved(true);
                  }}
                  disabled={bankrollSaving || !bankrollInput}
                  className="btn-secondary text-sm !px-4 !py-2 shrink-0"
                >
                  {bankrollSaving ? 'Saving...' : 'Set'}
                </button>
              </div>
            </div>
          )}
          {bankrollSaved && (
            <p className="text-win text-sm">Bankroll set. Your report will use this for grading.</p>
          )}

          <Link href="/reports?run=true" className="btn-primary inline-block text-lg !px-8 !py-3 font-mono">
            {tier === 'pro' ? 'Run Your Autopsy →' : promoEligible ? 'Run Your Free Full Report →' : 'Run Your Free Snapshot →'}
          </Link>
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-fg-bright">Upload Bets</h1>
        <p className="text-sm text-fg-muted mt-1">Import your betting history</p>
      </div>

      {/* Tier info */}
      {tier === 'free' && !uploadSucceeded && (
        <div className="card p-3">
          <p className="text-fg-muted text-xs">
            <span className="font-medium text-fg-bright">Free tier:</span> Upload all your bets. Get unlimited free snapshot reports analyzing your full history.
          </p>
        </div>
      )}

      {/* ═══ Three method cards ═══ */}
      {!uploadSucceeded && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {methods.map(m => (
              <button
                key={m.id}
                onClick={() => setActiveMethod(m.id)}
                className={`relative p-4 rounded-sm border text-center transition-all ${
                  activeMethod === m.id
                    ? 'border-scalpel/40 bg-scalpel-muted'
                    : 'border-border-subtle bg-surface-1 hover:border-border'
                }`}
              >
                {m.badge && (
                  <span className="absolute -top-2 left-1/2 -translate-x-1/2 font-mono text-[8px] text-scalpel bg-base border border-scalpel/30 px-1.5 py-0.5 rounded-sm tracking-wider">
                    {m.badge}
                  </span>
                )}
                <div className="mb-1">{m.icon}</div>
                <div className="text-sm font-medium text-fg-bright">{m.label}</div>
                <div className="text-xs text-fg-muted mt-0.5">{m.desc}</div>
              </button>
            ))}
          </div>

          {/* ═══ Method content ═══ */}

          {/* Pikkit method */}
          {activeMethod === 'pikkit' && (
            <div className="space-y-4">
              <div className="bg-surface-1 border border-border-subtle rounded-md p-5">
                <p className="text-fg-muted text-sm mb-3">
                  <a href="https://links.pikkit.com/invite/surf40498" target="_blank" rel="noopener noreferrer" className="text-scalpel hover:underline">Pikkit</a> is a third-party bet tracking app that connects to your sportsbook accounts and pulls your full betting history automatically. We recommend it because it&apos;s the easiest way to export your data as a CSV.
                </p>
                <p className="text-fg-muted text-xs mb-4">
                  This is a <strong className="text-fg-bright">one-time import</strong>. You only need Pikkit to get your history out. After that, keep it updated with screenshots or paste. Their free 7-day Pro trial is enough to export everything.
                </p>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
                  <a href="https://links.pikkit.com/invite/surf40498" target="_blank" rel="noopener noreferrer" className="btn-primary text-sm">
                    Get Pikkit (Free 7-Day Trial)
                  </a>
                  <span className="text-fg-muted text-xs flex items-center gap-1"><DollarSign size={14} className="text-fg-muted inline shrink-0" /> Get $3–$100 cash from Pikkit when you sign up and sync 10+ bets</span>
                </div>

                <button onClick={() => setShowPikkitSteps(!showPikkitSteps)} className="text-fg-muted text-xs hover:text-fg transition-colors flex items-center gap-1">
                  {showPikkitSteps ? 'Hide instructions' : 'See step-by-step instructions'} <span className="text-[10px]">{showPikkitSteps ? '▴' : '▾'}</span>
                </button>

                {showPikkitSteps && (
                  <div className="bg-surface-2 rounded-sm p-4 mt-3 space-y-2">
                    <ol className="text-fg-muted text-sm space-y-1.5 list-none">
                      <li className="flex gap-2"><span className="font-mono text-scalpel shrink-0">01</span> Download Pikkit and create an account</li>
                      <li className="flex gap-2"><span className="font-mono text-scalpel shrink-0">02</span> Connect your sportsbooks: DraftKings, FanDuel, BetMGM, etc.</li>
                      <li className="flex gap-2"><span className="font-mono text-scalpel shrink-0">03</span> Start the free 7-day Pro trial (required to export)</li>
                      <li className="flex gap-2"><span className="font-mono text-scalpel shrink-0">04</span> Wait for Pikkit to sync your bets (a few minutes)</li>
                      <li className="flex gap-2"><span className="font-mono text-scalpel shrink-0">05</span> Go to Pro → Settings → Data Exports → Download CSV</li>
                      <li className="flex gap-2"><span className="font-mono text-scalpel shrink-0">06</span> Upload that CSV using the CSV method card above</li>
                    </ol>
                  </div>
                )}
              </div>

              {/* Also show the CSV drop zone since Pikkit exports CSV */}
              <p className="text-fg-muted text-xs">Once you have the CSV from Pikkit, drop it here:</p>
              {renderDropZone()}
            </div>
          )}

          {/* Screenshot method */}
          {activeMethod === 'screenshot' && <ScreenshotParser />}

          {/* Paste method */}
          {activeMethod === 'paste' && <PasteParser />}

          {/* CSV method */}
          {activeMethod === 'csv' && (
            <div className="space-y-4">
              {renderDropZone()}
              <div className="card p-5 space-y-3">
                <h3 className="text-fg-bright text-sm font-medium">Supported Formats</h3>
                <p className="text-fg-muted text-xs">We auto-detect columns from Pikkit, DraftKings, FanDuel, and generic CSV exports.</p>
                <div className="flex flex-wrap gap-1.5">
                  {['date', 'sport', 'bet_type', 'description', 'odds', 'stake', 'result', 'profit'].map(col => (
                    <span key={col} className="font-mono text-[10px] bg-base border border-border-subtle rounded-sm px-1.5 py-0.5">{col}</span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Bottom links */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 text-sm">
        <a href="/api/template" className="text-scalpel hover:underline text-xs">↓ Download CSV template</a>
        <Link href="/bets" className="text-fg-muted hover:text-fg transition-colors text-xs">Or enter bets manually</Link>
        <Link href="/how-to-upload" className="text-fg-muted hover:text-fg transition-colors text-xs">Detailed upload guide</Link>
      </div>
    </div>
  );

  function renderDropZone() {
    return (
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`card p-10 text-center cursor-pointer transition-all duration-200 ${
          dragOver ? 'border-scalpel bg-scalpel-muted' : 'hover:border-border'
        }`}
      >
        <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileSelect} className="hidden" />
        {state === 'uploading' ? (
          <div className="space-y-3">
            <div className="animate-pulse"><Loader2 size={24} className="text-fg-muted animate-spin" /></div>
            <p className="text-fg-muted text-sm">Parsing and importing your bets...</p>
          </div>
        ) : state === 'success' && result ? (
          <div className="space-y-3">
            <div>{result.bets_imported > 0 ? <CheckCircle2 size={24} className="text-win" /> : <CheckCircle2 size={24} className="text-fg-muted" />}</div>
            {result.bets_imported > 0 ? (
              <p className="text-win font-medium">{result.bets_imported} bet{result.bets_imported !== 1 ? 's' : ''} imported
                {result.duplicates_skipped > 0 && <span className="text-fg-muted font-normal text-sm block mt-1">{result.duplicates_skipped} duplicate{result.duplicates_skipped !== 1 ? 's' : ''} skipped</span>}
              </p>
            ) : (
              <p className="text-fg-muted">All bets were already in your history.</p>
            )}
            <div className="flex flex-col sm:flex-row gap-2 justify-center mt-2">
              <Link href="/reports?run=true" className="btn-primary text-sm" onClick={(e) => e.stopPropagation()}>Run Autopsy</Link>
              <button onClick={(e) => { e.stopPropagation(); setState('idle'); setResult(null); }} className="btn-secondary text-sm">Upload More</button>
            </div>
          </div>
        ) : state === 'error' ? (
          <div className="space-y-3">
            <div><XCircle size={24} className="text-loss" /></div>
            <p className="text-loss text-sm">{error}</p>
            <button onClick={(e) => { e.stopPropagation(); setState('idle'); setError(''); }} className="btn-secondary text-sm mt-2">Try Again</button>
          </div>
        ) : (
          <div className="space-y-2">
            <div><UploadIcon size={32} className="text-fg-muted" /></div>
            <p className="text-fg-bright font-medium">Drag & drop your CSV here</p>
            <p className="text-fg-muted text-sm">or click to browse files</p>
          </div>
        )}
      </div>
    );
  }
}
