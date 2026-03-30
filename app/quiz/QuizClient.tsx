'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { QUIZ_QUESTIONS, calculateQuizResult, type QuizResult } from '@/lib/quiz-engine';
import QuizResultCard from '@/components/QuizResultCard';

const SEVERITY_COLORS: Record<string, string> = {
  low: 'bg-win/10 text-win border-win/20',
  medium: 'bg-amber-400/10 text-caution border-amber-400/20',
  high: 'bg-bleed-muted text-loss border-bleed/20',
};

const CALCULATING_MESSAGES = [
  'Analyzing your emotional patterns...',
  'Detecting cognitive biases...',
  'Calculating your Emotion Score...',
  'Generating your Bet DNA profile...',
];

const ARCH_PRODUCT_TEASER: Record<string, string> = {
  'The Natural': 'A full BetAutopsy would confirm your edges with real data — and catch the blind spots even disciplined bettors miss.',
  'Sharp Sleeper': 'A full BetAutopsy would pinpoint exactly where your edges are and show you how much your sizing inconsistency is costing.',
  'Heated Bettor': 'A full BetAutopsy would show you exactly which losses triggered your biggest chases — and put a dollar amount on what your emotions cost you.',
  'Parlay Dreamer': 'A full BetAutopsy would show your parlay ROI vs straight bet ROI side by side — most Parlay Dreamers are shocked by the gap.',
  'Chalk Grinder': 'A full BetAutopsy would show whether your favorites are actually beating the vig — or if you\'re paying a premium to feel safe.',
  'Volume Warrior': 'A full BetAutopsy would separate your high-conviction bets from your filler — and show you how much the filler is dragging your ROI.',
  'Sniper': 'A full BetAutopsy would validate your selectivity with data and reveal if there are profitable spots you\'re leaving on the table.',
  'Degen King': 'A full BetAutopsy would be a wake-up call — in the best way. See exactly where the damage is happening and what one or two changes would save you.',
  'The Grinder': 'A full BetAutopsy would reveal whether your consistency is translating to profit — or if you\'re grinding in the wrong direction.',
};

type Phase = 'intro' | 'questions' | 'calculating' | 'result_preview' | 'full_result';

export default function QuizClient() {
  const [phase, setPhase] = useState<Phase>('intro');
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [selectedValue, setSelectedValue] = useState<string | null>(null);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [email, setEmail] = useState('');
  const [emailSubmitting, setEmailSubmitting] = useState(false);
  const [calcMsg, setCalcMsg] = useState(0);
  const resultCardRef = useRef<HTMLDivElement>(null);

  // Calculating animation — 3 seconds, rotate every 700ms
  useEffect(() => {
    if (phase !== 'calculating') return;
    const timer = setInterval(() => setCalcMsg((i) => (i + 1) % CALCULATING_MESSAGES.length), 700);
    const done = setTimeout(() => {
      const r = calculateQuizResult(answers);
      setResult(r);
      setPhase('result_preview');
    }, 3000);
    return () => { clearInterval(timer); clearTimeout(done); };
  }, [phase, answers]);

  const handleAnswer = useCallback((value: string) => {
    setSelectedValue(value);
    const question = QUIZ_QUESTIONS[currentQ];
    const newAnswers = { ...answers, [question.id]: value };
    setAnswers(newAnswers);

    setTimeout(() => {
      setSelectedValue(null);
      if (currentQ < QUIZ_QUESTIONS.length - 1) {
        setCurrentQ(currentQ + 1);
      } else {
        setPhase('calculating');
      }
    }, 300);
  }, [currentQ, answers]);

  const handleBack = useCallback(() => {
    if (currentQ > 0) {
      setCurrentQ(currentQ - 1);
      setSelectedValue(null);
    }
  }, [currentQ]);

  const handleEmailSubmit = async () => {
    if (!email.includes('@')) return;
    setEmailSubmitting(true);
    try {
      await fetch('/api/quiz-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          archetype: result?.archetype.name,
          emotion_estimate: result?.emotion_estimate,
        }),
      });
    } catch {
      // Silent fail
    }
    setEmailSubmitting(false);
    setPhase('full_result');
  };

  const handleShare = () => {
    if (!result) return;
    const text = `My Bet DNA: ${result.archetype.name} ${result.archetype.emoji}\n\nEmotion Score: ${result.emotion_estimate}/100\nTop bias: ${result.biases[0]?.name ?? 'None'}\n\nWhat's yours? 👇`;
    const url = 'https://betautopsy.com/quiz';
    window.open(`https://x.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank', 'noopener,noreferrer,width=600,height=400');
  };

  const handleDownloadCard = async () => {
    if (!resultCardRef.current || !result) return;
    try {
      const { toPng } = await import('html-to-image');
      const dataUrl = await toPng(resultCardRef.current, { pixelRatio: 2 });
      const link = document.createElement('a');
      link.download = `bet-dna-${result.archetype.name.toLowerCase().replace(/\s+/g, '-')}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Download failed:', err);
    }
  };

  const handleRetake = () => {
    setPhase('intro');
    setCurrentQ(0);
    setAnswers({});
    setResult(null);
    setEmail('');
    setSelectedValue(null);
  };

  const progress = phase === 'questions' ? ((currentQ + 1) / QUIZ_QUESTIONS.length) * 100 : 0;

  const gamblingFooter = (
    <p className="text-fg-dim text-xs text-center mt-12">
      For entertainment and educational purposes only. Not gambling advice. 21+.
      If you or someone you know has a gambling problem, call 1-800-GAMBLER.
    </p>
  );

  // ── Intro ──
  if (phase === 'intro') {
    return (
      <main className="min-h-screen bg-base flex items-center justify-center px-4">
        <div className="max-w-lg text-center animate-fade-in">
          <span className="text-6xl block mb-6">🧬</span>
          <h1 className="font-extrabold text-4xl md:text-5xl tracking-tight mb-4">
            What&apos;s Your <span className="text-scalpel">Bet DNA</span>?
          </h1>
          <p className="text-fg-muted text-lg mb-8 leading-relaxed">
            Take this 2-minute quiz to discover your betting personality — the hidden
            patterns, biases, and tendencies that shape every bet you place.
          </p>
          <p className="text-fg-dim text-sm mb-8">
            No signup. No data needed. Just honest answers.
          </p>
          <button
            onClick={() => setPhase('questions')}
            className="btn-primary text-lg !px-10 !py-3.5 shadow-lg shadow-scalpel/20"
          >
            Start Quiz
          </button>
          <p className="text-fg-dim text-xs mt-6">13 questions · 2 minutes · 100% free</p>
          <Link href="/" className="text-fg-dim text-xs hover:text-fg-muted transition-colors mt-4 inline-block">
            ← Back to BetAutopsy
          </Link>
          {gamblingFooter}
        </div>
      </main>
    );
  }

  // ── Questions ──
  if (phase === 'questions') {
    const question = QUIZ_QUESTIONS[currentQ];
    return (
      <main className="min-h-screen bg-base px-4 py-6">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={handleBack}
              disabled={currentQ === 0}
              className="text-sm text-fg-muted hover:text-fg-bright transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              ← Back
            </button>
            <span className="text-sm text-fg-muted">{currentQ + 1} of {QUIZ_QUESTIONS.length}</span>
          </div>
          <div className="h-1.5 bg-surface rounded-full overflow-hidden mb-10">
            <div
              className="h-full bg-scalpel rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div key={question.id} className="animate-fade-in">
            <h2 className="font-bold text-xl md:text-2xl mb-2 leading-snug">{question.question}</h2>
            {question.subtext && <p className="text-fg-muted text-sm mb-6">{question.subtext}</p>}
            {!question.subtext && <div className="mb-6" />}
            <div className="space-y-3">
              {question.options.map((opt) => {
                const isSelected = selectedValue === opt.value;
                const prevAnswer = answers[question.id];
                return (
                  <button
                    key={opt.value}
                    onClick={() => handleAnswer(opt.value)}
                    disabled={selectedValue !== null}
                    className={`w-full text-left p-4 rounded-sm border transition-all duration-200 ${
                      isSelected
                        ? 'border-scalpel bg-scalpel-muted text-fg-bright'
                        : prevAnswer === opt.value
                        ? 'border-white/[0.08] bg-white/[0.03] text-fg-bright'
                        : 'border-white/[0.04] bg-surface/50 text-fg-muted hover:border-white/[0.08] hover:text-fg-bright hover:bg-surface'
                    }`}
                  >
                    <span className="text-sm md:text-base">{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <p className="text-fg-dim text-xs text-center mt-10">betautopsy.com</p>
        </div>
      </main>
    );
  }

  // ── Calculating ──
  if (phase === 'calculating') {
    return (
      <main className="min-h-screen bg-base flex items-center justify-center px-4">
        <div className="text-center animate-fade-in">
          <span className="text-6xl block mb-6 animate-pulse">🧬</span>
          <h2 className="font-bold text-xl mb-3">Analyzing your patterns...</h2>
          <p className="text-fg-muted text-sm">{CALCULATING_MESSAGES[calcMsg]}</p>
          <div className="w-48 h-1.5 bg-surface rounded-full overflow-hidden mx-auto mt-6">
            <div className="h-full bg-scalpel rounded-full animate-pulse" style={{ width: '60%' }} />
          </div>
        </div>
      </main>
    );
  }

  // ── Result Preview (holds back emotion score + biases to drive email capture) ──
  if (phase === 'result_preview' && result) {
    return (
      <main className="min-h-screen bg-base px-4 py-12">
        <div className="max-w-lg mx-auto animate-fade-in">
          {/* Archetype reveal only */}
          <div className="text-center mb-8">
            <span className="text-6xl block mb-4 animate-bounce">{result.archetype.emoji}</span>
            <p className="text-fg-muted text-xs uppercase tracking-widest mb-2">Your Bet DNA</p>
            <h1 className="font-extrabold text-4xl mb-3" style={{ color: result.archetype.color }}>
              {result.archetype.name}
            </h1>
            <p className="text-fg-muted text-sm leading-relaxed max-w-md mx-auto">
              {result.archetype.description}
            </p>
            <p className="text-fg-dim text-xs mt-4">
              Your full breakdown includes your Emotion Score, detected biases, strengths, and what to watch out for.
            </p>
          </div>

          {/* Email gate */}
          <div className="card p-6 text-center space-y-4 border-scalpel/20 bg-scalpel-muted">
            <p className="text-fg-bright font-medium">Your Emotion Score and biases are ready.</p>
            <p className="text-fg-muted text-sm">
              Enter your email to see your full behavioral breakdown — how emotional your betting is,
              which cognitive biases are affecting you, and what to watch out for.
            </p>
            <div className="flex gap-2">
              <input
                type="email"
                placeholder="you@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleEmailSubmit()}
                className="flex-1 bg-base border border-white/[0.04] rounded-sm px-4 py-2.5 text-sm text-fg-bright placeholder-fg-dim focus:outline-none focus:border-scalpel/40"
              />
              <button
                onClick={handleEmailSubmit}
                disabled={emailSubmitting || !email.includes('@')}
                className="btn-primary text-sm !px-5 whitespace-nowrap disabled:opacity-50"
              >
                {emailSubmitting ? '...' : 'See My Results'}
              </button>
            </div>
            <p className="text-fg-dim text-xs">No spam. Just your results.</p>
            <button
              onClick={() => setPhase('full_result')}
              className="text-xs text-fg-dim hover:text-fg-muted transition-colors"
            >
              Skip — just show me
            </button>
          </div>

          {gamblingFooter}
        </div>
      </main>
    );
  }

  // ── Full Result ──
  if (phase === 'full_result' && result) {
    const eColor = result.emotion_estimate <= 30 ? 'text-win' : result.emotion_estimate <= 55 ? 'text-caution' : result.emotion_estimate <= 75 ? 'text-orange-400' : 'text-loss';
    const eBarColor = result.emotion_estimate <= 30 ? 'bg-win' : result.emotion_estimate <= 55 ? 'bg-amber-400' : result.emotion_estimate <= 75 ? 'bg-orange-400' : 'bg-loss';

    return (
      <main className="min-h-screen bg-base px-4 py-12 overflow-x-hidden">
        <div className="max-w-lg mx-auto space-y-6 animate-fade-in overflow-hidden">

          {/* 1. Archetype */}
          <div className="card p-5 sm:p-6 border-white/[0.06] text-center" style={{ borderColor: `${result.archetype.color}30` }}>
            <span className="text-5xl block mb-3">{result.archetype.emoji}</span>
            <p className="text-fg-muted text-xs uppercase tracking-widest mb-2">Your Bet DNA</p>
            <h1 className="font-extrabold text-3xl md:text-4xl mb-3" style={{ color: result.archetype.color }}>
              {result.archetype.name}
            </h1>
            <p className="text-fg-muted text-sm leading-relaxed">{result.archetype.description}</p>
            <p className="text-fg-muted text-xs mt-3 italic">
              {ARCH_PRODUCT_TEASER[result.archetype.name] ?? 'A full BetAutopsy would show you exactly how your real betting data compares to this quiz estimate.'}
            </p>
          </div>

          {/* 2. Emotion Score */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-fg-muted">Estimated Emotion Score</span>
              <span className={`font-mono text-xl font-bold ${eColor}`}>{result.emotion_estimate}/100</span>
            </div>
            <div className="h-2.5 bg-base rounded-full overflow-hidden mb-2">
              <div className={`h-full rounded-full transition-all duration-1000 ${eBarColor}`} style={{ width: `${result.emotion_estimate}%` }} />
            </div>
            <p className="text-fg-dim text-xs">
              {result.emotion_estimate <= 30 ? 'Your emotions seem well under control. That\'s rare.' :
               result.emotion_estimate <= 55 ? 'Mostly disciplined, but emotions creep in sometimes.' :
               result.emotion_estimate <= 75 ? 'Emotions are a factor in your betting. This is costing you.' :
               'Emotions are driving the bus. This is priority #1 to fix.'}
            </p>
          </div>

          {/* 3. Biases */}
          <div className="space-y-3">
            <h2 className="font-bold text-xl">Your Biases</h2>
            {result.biases.map((bias) => (
              <div key={bias.name} className="card p-4">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-medium">{bias.name}</h3>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${SEVERITY_COLORS[bias.severity]}`}>
                    {bias.severity.toUpperCase()}
                  </span>
                </div>
                <p className="text-fg-muted text-sm">{bias.one_liner}</p>
              </div>
            ))}
          </div>

          {/* 4. "Is this accurate?" conversion card */}
          <div className="card p-6 border-scalpel/20 bg-scalpel-muted text-center space-y-3">
            <p className="text-fg-bright font-bold text-lg">Think this is accurate?</p>
            <p className="text-fg-muted text-sm max-w-sm mx-auto">
              This quiz estimates your patterns from self-reported answers. Your actual bet history tells the
              real story — upload it and see how your real data compares.
            </p>
            <p className="text-fg-dim text-xs">
              Most bettors are surprised by the gap between what they think and what the data shows.
            </p>
            <Link href="/signup" className="btn-primary inline-block !px-8 !py-3">
              Get Your Real Autopsy — Free
            </Link>
            <p className="text-fg-dim text-xs">No credit card. Upload takes 2 minutes.</p>
          </div>

          {/* 5. Strengths */}
          {result.strengths.length > 0 && (
            <div className="card border-win/20 bg-win/5 p-5">
              <h3 className="text-win text-xs font-medium uppercase tracking-wider mb-3">Your Strengths</h3>
              <ul className="space-y-2">
                {result.strengths.map((s) => (
                  <li key={s} className="text-sm text-fg-bright flex items-start gap-2">
                    <span className="text-win mt-0.5 shrink-0">+</span>
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 6. Watch Outs — with product teaser on each */}
          {result.watch_outs.length > 0 && (
            <div className="card border-orange-400/20 bg-orange-400/5 p-5">
              <h3 className="text-orange-400 text-xs font-medium uppercase tracking-wider mb-3">Watch Out For</h3>
              <ul className="space-y-3">
                {result.watch_outs.map((w) => (
                  <li key={w}>
                    <div className="text-sm text-fg-bright flex items-start gap-2">
                      <span className="text-orange-400 mt-0.5 shrink-0">!</span>
                      {w}
                    </div>
                    <p className="text-fg-dim text-[10px] ml-5 mt-1 italic">A full autopsy would show you exactly how much this costs you.</p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 7. Share card + buttons */}
          <div className="space-y-3 overflow-hidden">
            <h2 className="font-bold text-xl">Share Your Bet DNA</h2>
            <div className="overflow-hidden rounded-sm">
              <QuizResultCard ref={resultCardRef} result={result} />
            </div>
            <div className="flex gap-2">
              <button onClick={handleShare} className="btn-secondary text-sm flex-1 flex items-center justify-center gap-1.5">
                <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                Share on X
              </button>
              <button onClick={handleDownloadCard} className="btn-secondary text-sm flex-1 flex items-center justify-center gap-1.5">
                Download Card
              </button>
            </div>
          </div>

          {/* 8. Retake */}
          <div className="text-center">
            <button onClick={handleRetake} className="text-sm text-fg-dim hover:text-fg-muted transition-colors">
              ↻ Retake Quiz
            </button>
          </div>

          {/* 9. Bottom CTA */}
          <div className="space-y-4 pt-4">
            <div className="card p-6 text-center space-y-3">
              <p className="text-fg-bright font-medium">Ready to see the real numbers?</p>
              <p className="text-fg-muted text-sm">
                Your quiz says you&apos;re a {result.archetype.name}. Your actual bet history might tell a different story.
              </p>
              <Link href="/signup" className="btn-primary inline-block !px-8 !py-3">
                Upload Your Bets — It&apos;s Free
              </Link>
            </div>
            <p className="text-fg-dim text-xs text-center">
              Already have an account? <Link href="/login" className="text-scalpel hover:underline">Sign in</Link>
            </p>
          </div>

          {/* Responsible gambling */}
          {result.emotion_estimate > 75 && (
            <div className="card border-amber-400/20 bg-amber-400/5 p-4">
              <p className="text-caution text-sm">
                Your responses suggest emotions play a significant role in your betting.
                If gambling is causing stress or financial difficulty, help is available at{' '}
                <span className="text-fg-bright">1-800-GAMBLER</span>.
              </p>
            </div>
          )}

          {gamblingFooter}

          <div className="text-center">
            <Link href="/" className="text-fg-dim text-xs hover:text-fg-muted transition-colors">
              ← Back to BetAutopsy
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return null;
}
