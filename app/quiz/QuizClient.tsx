'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { QUIZ_QUESTIONS, calculateQuizResult, type QuizResult } from '@/lib/quiz-engine';
import QuizResultCard from '@/components/QuizResultCard';

const SEVERITY_COLORS: Record<string, string> = {
  low: 'bg-mint-500/10 text-mint-500 border-mint-500/20',
  medium: 'bg-amber-400/10 text-amber-400 border-amber-400/20',
  high: 'bg-red-400/10 text-red-400 border-red-400/20',
};

const CALCULATING_MESSAGES = [
  'Mapping your patterns...',
  'Identifying biases...',
  'Generating your Bet DNA...',
];

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

  // Calculating animation
  useEffect(() => {
    if (phase !== 'calculating') return;
    const timer = setInterval(() => setCalcMsg((i) => (i + 1) % CALCULATING_MESSAGES.length), 800);
    const done = setTimeout(() => {
      const r = calculateQuizResult(answers);
      setResult(r);
      setPhase('result_preview');
    }, 2400);
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
      // Silent fail — don't block results
    }
    setEmailSubmitting(false);
    setPhase('full_result');
  };

  const handleShare = () => {
    if (!result) return;
    const text = `My Bet DNA: ${result.archetype.name} ${result.archetype.emoji} | Emotion Score: ${result.emotion_estimate}/100 | Top bias: ${result.biases[0]?.name ?? 'None'} — What's yours?`;
    const url = 'https://betautopsy.com/quiz';
    window.open(`https://x.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank', 'noopener,noreferrer,width=600,height=400');
  };

  const progress = phase === 'questions' ? ((currentQ + 1) / QUIZ_QUESTIONS.length) * 100 : 0;

  // ── Intro ──
  if (phase === 'intro') {
    return (
      <main className="min-h-screen bg-ink-900 flex items-center justify-center px-4">
        <div className="max-w-lg text-center animate-fade-in">
          <span className="text-6xl block mb-6">🧬</span>
          <h1 className="font-extrabold text-4xl md:text-5xl tracking-tight mb-4">
            What&apos;s Your <span className="text-flame-500">Bet DNA</span>?
          </h1>
          <p className="text-ink-600 text-lg mb-8 leading-relaxed">
            Take this 2-minute quiz to discover your betting personality — the hidden
            patterns, biases, and tendencies that shape every bet you place.
          </p>
          <p className="text-ink-700 text-sm mb-8">
            No signup. No data needed. Just honest answers.
          </p>
          <button
            onClick={() => setPhase('questions')}
            className="btn-primary text-lg !px-10 !py-3.5 shadow-lg shadow-flame-500/20"
          >
            Start Quiz
          </button>
          <p className="text-ink-700 text-xs mt-6">12 questions · 2 minutes · 100% free</p>
          <Link href="/" className="text-ink-700 text-xs hover:text-ink-500 transition-colors mt-4 inline-block">
            ← Back to BetAutopsy
          </Link>
          <p className="text-ink-700 text-[10px] mt-8 max-w-sm mx-auto">
            21+. If you or someone you know has a gambling problem, call 1-800-GAMBLER.
          </p>
        </div>
      </main>
    );
  }

  // ── Questions ──
  if (phase === 'questions') {
    const question = QUIZ_QUESTIONS[currentQ];
    return (
      <main className="min-h-screen bg-ink-900 px-4 py-6">
        <div className="max-w-lg mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={handleBack}
              disabled={currentQ === 0}
              className="text-sm text-ink-600 hover:text-[#F0F0F0] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              ← Back
            </button>
            <span className="text-sm text-ink-600">{currentQ + 1} of {QUIZ_QUESTIONS.length}</span>
          </div>

          {/* Progress bar */}
          <div className="h-1.5 bg-ink-800 rounded-full overflow-hidden mb-10">
            <div
              className="h-full bg-flame-500 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Question */}
          <div key={question.id} className="animate-fade-in">
            <h2 className="font-bold text-xl md:text-2xl mb-2 leading-snug">{question.question}</h2>
            {question.subtext && (
              <p className="text-ink-600 text-sm mb-6">{question.subtext}</p>
            )}
            {!question.subtext && <div className="mb-6" />}

            {/* Options */}
            <div className="space-y-3">
              {question.options.map((opt) => {
                const isSelected = selectedValue === opt.value;
                const prevAnswer = answers[question.id];
                return (
                  <button
                    key={opt.value}
                    onClick={() => handleAnswer(opt.value)}
                    disabled={selectedValue !== null}
                    className={`w-full text-left p-4 rounded-xl border transition-all duration-200 ${
                      isSelected
                        ? 'border-flame-500 bg-flame-500/10 text-[#F0F0F0]'
                        : prevAnswer === opt.value
                        ? 'border-white/[0.15] bg-white/[0.03] text-[#F0F0F0]'
                        : 'border-white/[0.08] bg-ink-800/50 text-ink-500 hover:border-white/[0.15] hover:text-[#F0F0F0] hover:bg-ink-800'
                    }`}
                  >
                    <span className="text-sm md:text-base">{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <p className="text-ink-700 text-xs text-center mt-10">betautopsy.com</p>
        </div>
      </main>
    );
  }

  // ── Calculating ──
  if (phase === 'calculating') {
    return (
      <main className="min-h-screen bg-ink-900 flex items-center justify-center px-4">
        <div className="text-center animate-fade-in">
          <span className="text-6xl block mb-6 animate-pulse">🧬</span>
          <h2 className="font-bold text-xl mb-3">Analyzing your patterns...</h2>
          <p className="text-ink-600 text-sm">{CALCULATING_MESSAGES[calcMsg]}</p>
          <div className="w-48 h-1.5 bg-ink-800 rounded-full overflow-hidden mx-auto mt-6">
            <div className="h-full bg-flame-500 rounded-full animate-pulse" style={{ width: '60%' }} />
          </div>
        </div>
      </main>
    );
  }

  // ── Result Preview (before email gate) ──
  if (phase === 'result_preview' && result) {
    const emotionColor = result.emotion_estimate <= 30 ? 'text-mint-500' : result.emotion_estimate <= 55 ? 'text-amber-400' : result.emotion_estimate <= 75 ? 'text-orange-400' : 'text-red-400';
    const emotionBarColor = result.emotion_estimate <= 30 ? 'bg-mint-500' : result.emotion_estimate <= 55 ? 'bg-amber-400' : result.emotion_estimate <= 75 ? 'bg-orange-400' : 'bg-red-400';

    return (
      <main className="min-h-screen bg-ink-900 px-4 py-12">
        <div className="max-w-lg mx-auto animate-fade-in">
          {/* Archetype reveal */}
          <div className="text-center mb-8">
            <span className="text-5xl block mb-3">{result.archetype.emoji}</span>
            <p className="text-ink-600 text-xs uppercase tracking-widest mb-2">Your Bet DNA</p>
            <h1 className="font-extrabold text-4xl mb-3" style={{ color: result.archetype.color }}>
              {result.archetype.name}
            </h1>
            <p className="text-ink-500 text-sm leading-relaxed max-w-md mx-auto">
              {result.archetype.description}
            </p>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-2 gap-3 mb-8">
            <div className="card p-4 text-center">
              <p className="text-ink-600 text-xs mb-1">Emotion Score</p>
              <p className={`font-mono text-2xl font-bold ${emotionColor}`}>{result.emotion_estimate}/100</p>
              <div className="h-1.5 bg-ink-900 rounded-full overflow-hidden mt-2">
                <div className={`h-full rounded-full ${emotionBarColor}`} style={{ width: `${result.emotion_estimate}%` }} />
              </div>
            </div>
            <div className="card p-4">
              <p className="text-ink-600 text-xs mb-2">Top Biases</p>
              <div className="space-y-1.5">
                {result.biases.slice(0, 2).map((b) => (
                  <div key={b.name} className="flex items-center gap-2">
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${SEVERITY_COLORS[b.severity]}`}>
                      {b.severity.toUpperCase()}
                    </span>
                    <span className="text-sm text-[#F0F0F0]">{b.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Email gate */}
          <div className="card p-6 text-center space-y-4 border-flame-500/20 bg-flame-500/5">
            <p className="text-[#F0F0F0] font-medium">Your full breakdown is ready.</p>
            <p className="text-ink-600 text-sm">Enter your email to see detailed bias descriptions, strengths, and what to watch out for.</p>
            <div className="flex gap-2">
              <input
                type="email"
                placeholder="you@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleEmailSubmit()}
                className="flex-1 bg-ink-900 border border-white/[0.08] rounded-lg px-4 py-2.5 text-sm text-[#F0F0F0] placeholder-ink-700 focus:outline-none focus:border-flame-500/40"
              />
              <button
                onClick={handleEmailSubmit}
                disabled={emailSubmitting || !email.includes('@')}
                className="btn-primary text-sm !px-5 whitespace-nowrap disabled:opacity-50"
              >
                {emailSubmitting ? '...' : 'See Results'}
              </button>
            </div>
            <p className="text-ink-700 text-xs">No spam. Just your results.</p>
            <button
              onClick={() => setPhase('full_result')}
              className="text-xs text-ink-700 hover:text-ink-500 transition-colors"
            >
              Skip — just show me
            </button>
          </div>
        </div>
      </main>
    );
  }

  // ── Full Result ──
  if (phase === 'full_result' && result) {
    const emotionColor = result.emotion_estimate <= 30 ? 'text-mint-500' : result.emotion_estimate <= 55 ? 'text-amber-400' : result.emotion_estimate <= 75 ? 'text-orange-400' : 'text-red-400';
    const emotionBarColor = result.emotion_estimate <= 30 ? 'bg-mint-500' : result.emotion_estimate <= 55 ? 'bg-amber-400' : result.emotion_estimate <= 75 ? 'bg-orange-400' : 'bg-red-400';

    return (
      <main className="min-h-screen bg-ink-900 px-4 py-12 overflow-x-hidden">
        <div className="max-w-lg mx-auto space-y-6 animate-fade-in overflow-hidden">
          {/* Archetype card */}
          <div className="card p-5 sm:p-6 border-white/[0.1] text-center" style={{ borderColor: `${result.archetype.color}30` }}>
            <span className="text-5xl block mb-3">{result.archetype.emoji}</span>
            <p className="text-ink-600 text-xs uppercase tracking-widest mb-2">Your Bet DNA</p>
            <h1 className="font-extrabold text-3xl md:text-4xl mb-3" style={{ color: result.archetype.color }}>
              {result.archetype.name}
            </h1>
            <p className="text-ink-500 text-sm leading-relaxed">{result.archetype.description}</p>
          </div>

          {/* Emotion Score */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-ink-600">Estimated Emotion Score</span>
              <span className={`font-mono text-xl font-bold ${emotionColor}`}>{result.emotion_estimate}/100</span>
            </div>
            <div className="h-2.5 bg-ink-900 rounded-full overflow-hidden mb-2">
              <div className={`h-full rounded-full transition-all duration-1000 ${emotionBarColor}`} style={{ width: `${result.emotion_estimate}%` }} />
            </div>
            <p className="text-ink-700 text-xs">
              {result.emotion_estimate <= 30 ? 'Your emotions seem well under control. That\'s rare.' :
               result.emotion_estimate <= 55 ? 'Mostly disciplined, but emotions creep in sometimes.' :
               result.emotion_estimate <= 75 ? 'Emotions are a factor in your betting. This is costing you.' :
               'Emotions are driving the bus. This is priority #1 to fix.'}
            </p>
          </div>

          {/* Biases */}
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
                <p className="text-ink-500 text-sm">{bias.one_liner}</p>
              </div>
            ))}
          </div>

          {/* Strengths */}
          {result.strengths.length > 0 && (
            <div className="card border-mint-500/20 bg-mint-500/5 p-5">
              <h3 className="text-mint-500 text-xs font-medium uppercase tracking-wider mb-3">Your Strengths</h3>
              <ul className="space-y-2">
                {result.strengths.map((s) => (
                  <li key={s} className="text-sm text-[#F0F0F0] flex items-start gap-2">
                    <span className="text-mint-500 mt-0.5 shrink-0">+</span>
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Watch Outs */}
          {result.watch_outs.length > 0 && (
            <div className="card border-orange-400/20 bg-orange-400/5 p-5">
              <h3 className="text-orange-400 text-xs font-medium uppercase tracking-wider mb-3">Watch Out For</h3>
              <ul className="space-y-2">
                {result.watch_outs.map((w) => (
                  <li key={w} className="text-sm text-[#F0F0F0] flex items-start gap-2">
                    <span className="text-orange-400 mt-0.5 shrink-0">!</span>
                    {w}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Shareable card */}
          <div className="space-y-3 overflow-hidden">
            <h2 className="font-bold text-xl">Share Your Bet DNA</h2>
            <div className="overflow-hidden rounded-2xl">
              <QuizResultCard ref={resultCardRef} result={result} />
            </div>
            <div className="flex gap-2">
              <button onClick={handleShare} className="btn-secondary text-sm flex-1 flex items-center justify-center gap-1.5">
                <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                Share on X
              </button>
              <button
                onClick={async () => {
                  const { toPng } = await import('html-to-image');
                  if (!resultCardRef.current) return;
                  const dataUrl = await toPng(resultCardRef.current, { pixelRatio: 2 });
                  const link = document.createElement('a');
                  link.download = `bet-dna-${result.archetype.name.toLowerCase().replace(/\s+/g, '-')}.png`;
                  link.href = dataUrl;
                  link.click();
                }}
                className="btn-secondary text-sm flex-1"
              >
                Download PNG
              </button>
            </div>
          </div>

          {/* CTA */}
          <div className="card border-flame-500/20 bg-flame-500/5 p-6 text-center space-y-3">
            <p className="text-[#F0F0F0] font-medium text-lg">Want the real analysis?</p>
            <p className="text-ink-600 text-sm">
              This quiz estimates your patterns from self-reported behavior. Upload your actual bet history
              and BetAutopsy will find the biases you can&apos;t see from inside your own head.
            </p>
            <Link href="/signup" className="btn-primary inline-block text-lg !px-8 !py-3 shadow-lg shadow-flame-500/20">
              Get Your Free Autopsy
            </Link>
          </div>

          {/* Responsible gambling */}
          {result.emotion_estimate > 75 && (
            <div className="card border-amber-400/20 bg-amber-400/5 p-4">
              <p className="text-amber-400 text-sm">
                Your responses suggest emotions play a significant role in your betting.
                If gambling is causing stress or financial difficulty, help is available at{' '}
                <span className="text-[#F0F0F0]">1-800-GAMBLER</span>.
              </p>
            </div>
          )}

          <p className="text-ink-700 text-xs text-center">
            This quiz is for entertainment and self-reflection. For a data-driven analysis of your actual
            betting behavior, upload your history at betautopsy.com.
          </p>

          <div className="text-center">
            <Link href="/" className="text-ink-700 text-xs hover:text-ink-500 transition-colors">
              ← Back to BetAutopsy
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return null;
}
