'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { QUIZ_QUESTIONS, QUESTION_ACCENTS, calculateQuizResult, generateQuizRoasts, getSliderInterpretation, type QuizResult } from '@/lib/quiz-engine';
import QuizResultCard from '@/components/QuizResultCard';

function gradeColor(g: string): string {
  if (g === 'A') return '#00C853';
  if (g === 'B') return '#2dd4bf';
  if (g === 'C') return '#fbbf24';
  if (g === 'D') return '#f97316';
  return '#ef4444';
}

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

type Phase = 'intro' | 'questions' | 'reveal' | 'result_preview' | 'full_result';

export default function QuizClient() {
  const [phase, setPhase] = useState<Phase>('intro');
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [selectedValue, setSelectedValue] = useState<string | null>(null);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [email, setEmail] = useState('');
  const [emailSubmitting, setEmailSubmitting] = useState(false);
  const [revealSlide, setRevealSlide] = useState(0);
  const [sliderValue, setSliderValue] = useState<string | null>(null);
  const resultCardRef = useRef<HTMLDivElement>(null);

  const accent = QUESTION_ACCENTS[Math.min(currentQ, QUESTION_ACCENTS.length - 1)];
  const progress = phase === 'questions' ? (5 + ((currentQ + 1) / QUIZ_QUESTIONS.length) * 95) : 0;

  // ── Reveal sequence ──
  useEffect(() => {
    if (phase !== 'reveal') return;
    // Calculate result on slide 0
    if (revealSlide === 0) {
      const r = calculateQuizResult(answers);
      setResult(r);
    }
    const durations = [1500, 1500, 2000, 2500];
    const timer = setTimeout(() => {
      if (revealSlide < 3) {
        setRevealSlide(revealSlide + 1);
      } else {
        setPhase('result_preview');
      }
    }, durations[revealSlide]);
    return () => clearTimeout(timer);
  }, [phase, revealSlide, answers]);

  const handleAnswer = useCallback((value: string) => {
    setSelectedValue(value);
    const question = QUIZ_QUESTIONS[currentQ];
    const newAnswers = { ...answers, [question.id]: value };
    setAnswers(newAnswers);

    setTimeout(() => {
      setSelectedValue(null);
      setSliderValue(null);
      if (currentQ < QUIZ_QUESTIONS.length - 1) {
        setCurrentQ(currentQ + 1);
      } else {
        setRevealSlide(0);
        setPhase('reveal');
      }
    }, question.style === 'slider' ? 500 : 300);
  }, [currentQ, answers]);

  const handleBack = useCallback(() => {
    if (currentQ > 0) {
      setCurrentQ(currentQ - 1);
      setSelectedValue(null);
      setSliderValue(null);
    }
  }, [currentQ]);

  const handleEmailSubmit = async () => {
    if (!email.includes('@')) return;
    setEmailSubmitting(true);
    try {
      await fetch('/api/quiz-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, archetype: result?.archetype.name, emotion_estimate: result?.emotion_estimate }),
      });
    } catch { /* silent */ }
    setEmailSubmitting(false);
    setPhase('full_result');
  };

  const roasts = result ? generateQuizRoasts(answers) : [];

  const handleShare = () => {
    if (!result) return;
    let text = `My Bet DNA: ${result.archetype.name} ${result.archetype.emoji}\nEmotion Score: ${result.emotion_estimate}/100\n`;
    if (roasts.length > 0) text += `\n${roasts[0].emoji} ${roasts[0].text}\n`;
    text += '\nWhat\'s yours? 👇';
    const url = 'https://betautopsy.com/quiz';
    window.open(`https://x.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank', 'width=600,height=500');
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
    setSliderValue(null);
  };

  const handleChallenge = () => {
    if (!result) return;
    const text = `I got ${result.archetype.name} on the Bet DNA quiz. Bet yours is worse 💀`;
    const url = 'https://betautopsy.com/quiz';
    if (navigator.share) {
      navigator.share({ text, url });
    } else {
      window.open(`sms:?body=${encodeURIComponent(text + ' ' + url)}`);
    }
  };

  const gamblingFooter = (
    <p className="text-fg-muted text-xs text-center mt-12">
      For entertainment and educational purposes only. Not gambling advice. 21+.
      If you or someone you know has a gambling problem, call 1-800-GAMBLER.
    </p>
  );

  // ══════════════════════════════
  // INTRO
  // ══════════════════════════════
  if (phase === 'intro') {
    return (
      <main className="min-h-screen bg-base flex items-center justify-center px-4">
        <div className="max-w-lg text-center animate-fade-in">
          <span className="text-6xl block mb-6">🧬</span>
          <h1 className="font-extrabold text-4xl md:text-5xl tracking-tight mb-4">
            What&apos;s Your <span className="text-scalpel">Bet DNA</span>?
          </h1>
          <p className="text-fg-muted text-lg mb-8 leading-relaxed">
            Take this quiz to discover your betting personality — the hidden
            patterns, biases, and tendencies that shape every bet you place.
          </p>
          <button
            onClick={() => setPhase('questions')}
            className="btn-primary text-lg !px-10 !py-3.5"
          >
            Find Out →
          </button>
          <p className="text-fg-muted text-xs mt-6">2 minutes · 100% free</p>
          <Link href="/" className="text-fg-muted text-xs hover:text-fg transition-colors mt-4 inline-block">
            ← Back to BetAutopsy
          </Link>
          {gamblingFooter}
        </div>
      </main>
    );
  }

  // ══════════════════════════════
  // QUESTIONS
  // ══════════════════════════════
  if (phase === 'questions') {
    const question = QUIZ_QUESTIONS[currentQ];
    const isBold = question.style === 'bold';
    const isSlider = question.style === 'slider';
    const isScenario = question.style === 'scenario';

    return (
      <main className="min-h-screen bg-base px-4 py-6" style={{ background: `radial-gradient(circle at 50% 30%, ${accent}08 0%, transparent 60%), #111318` }}>
        <div className="max-w-lg mx-auto">
          {/* Progress bar */}
          <div className="flex items-center justify-between mb-2">
            <button onClick={handleBack} disabled={currentQ === 0} className="text-sm text-fg-muted hover:text-fg-bright transition-colors disabled:opacity-30 disabled:cursor-not-allowed">← Back</button>
            <span className="text-sm text-fg-muted font-mono">{currentQ + 1} of {QUIZ_QUESTIONS.length}</span>
          </div>
          <div className="h-1.5 bg-surface-raised rounded-full overflow-hidden mb-10">
            <div
              className="h-full rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%`, backgroundColor: accent, boxShadow: `0 0 8px ${accent}40` }}
            />
          </div>

          {/* Question */}
          <div key={currentQ} className="quiz-enter">
            {/* Bet slip visual for scenario questions */}
            {isScenario && question.id === 'q15' && (
              <div className="bg-[#1a2332] border border-[#2a3a4a] p-4 rounded-sm mb-6 font-mono text-sm">
                <div className="text-[#8b9db5] text-xs mb-2">3-LEG PARLAY</div>
                <div className="space-y-2">
                  <div className="flex justify-between"><span className="text-[#c8d6e5]">Chiefs -3.5</span><span className="text-[#00C853]">-110</span></div>
                  <div className="flex justify-between"><span className="text-[#c8d6e5]">Jokic Over 25.5 pts</span><span className="text-[#00C853]">-115</span></div>
                  <div className="flex justify-between"><span className="text-[#c8d6e5]">Bills ML</span><span className="text-[#00C853]">+140</span></div>
                </div>
                <div className="border-t border-[#2a3a4a] mt-3 pt-2 flex justify-between">
                  <span className="text-[#8b9db5]">$25 to win</span>
                  <span className="text-[#00C853] font-bold">$162.50</span>
                </div>
              </div>
            )}

            <h2 className={`font-bold leading-snug mb-2 ${isBold ? 'text-2xl md:text-[32px] text-center' : 'text-xl md:text-2xl'}`}>
              {question.question}
            </h2>
            {question.subtext && !isBold && <p className="text-fg-muted text-sm mb-6">{question.subtext}</p>}
            {question.subtext && isBold && <p className="text-fg-muted text-sm mb-6 text-center">{question.subtext}</p>}
            {!question.subtext && <div className="mb-6" />}

            {/* Slider question */}
            {isSlider ? (
              <div className="space-y-6">
                {sliderValue && (
                  <p className="text-fg-muted text-sm text-center italic animate-fade-in">{getSliderInterpretation(sliderValue)}</p>
                )}
                <div className="flex gap-2">
                  {question.options.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => {
                        setSliderValue(opt.value);
                        setTimeout(() => handleAnswer(opt.value), 500);
                      }}
                      disabled={selectedValue !== null}
                      className={`flex-1 py-4 rounded-sm border font-mono text-sm transition-all ${
                        sliderValue === opt.value || selectedValue === opt.value
                          ? 'border-scalpel/40 bg-scalpel-muted text-scalpel font-bold scale-105'
                          : 'border-white/[0.10] bg-surface-raised text-fg-muted hover:border-white/[0.15]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <div className="flex justify-between text-fg-muted font-mono text-xs">
                  <span>FORGET IT</span>
                  <span>RUINS MY DAY</span>
                </div>
              </div>
            ) : (
              /* Regular options */
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
                          ? 'scale-[1.02] border-scalpel/50 bg-scalpel-muted'
                          : prevAnswer === opt.value
                          ? 'border-white/[0.08] bg-white/[0.03]'
                          : 'border-white/[0.10] bg-surface-raised hover:border-white/[0.15] hover:bg-surface-elevated'
                      }`}
                    >
                      <span className="text-sm md:text-base" style={{ color: isSelected ? accent : '#F0F2F5' }}>{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <p className="text-fg-muted text-xs text-center mt-10 font-mono">betautopsy.com</p>
        </div>
      </main>
    );
  }

  // ══════════════════════════════
  // REVEAL SEQUENCE
  // ══════════════════════════════
  if (phase === 'reveal' && result) {
    const emotionWord = result.emotion_estimate <= 25 ? 'LOW' : result.emotion_estimate <= 50 ? 'MODERATE' : result.emotion_estimate <= 75 ? 'HIGH' : 'CRITICAL';
    const emotionColor = result.emotion_estimate <= 25 ? '#00C9A7' : result.emotion_estimate <= 50 ? '#fbbf24' : result.emotion_estimate <= 75 ? '#f97316' : '#f87171';
    const biasCount = result.biases.length;

    return (
      <main className="min-h-screen bg-base flex items-center justify-center px-4" onClick={() => revealSlide < 3 && setRevealSlide(revealSlide + 1)}>
        {/* Slide 0: Intro */}
        {revealSlide === 0 && (
          <div className="text-center animate-fade-in">
            <p className="text-fg-muted text-xl reveal-pulse">Let&apos;s see what your answers say about you...</p>
          </div>
        )}

        {/* Slide 1: Emotion color flood */}
        {revealSlide === 1 && (
          <div className="text-center animate-fade-in" style={{ color: emotionColor }}>
            <p className="text-fg-muted text-lg mb-4">Your emotional betting level is...</p>
            <p className="text-4xl md:text-5xl font-bold" style={{ color: emotionColor }}>{emotionWord}</p>
          </div>
        )}

        {/* Slide 2: Bias count */}
        {revealSlide === 2 && (
          <div className="text-center animate-fade-in">
            <p className="text-fg-muted text-base mb-2">We detected</p>
            <p className="text-6xl md:text-7xl font-bold text-fg-bright reveal-bounce">{biasCount}</p>
            <p className="text-fg-muted text-base mt-2">behavioral bias{biasCount !== 1 ? 'es' : ''}</p>
          </div>
        )}

        {/* Slide 3: Archetype reveal */}
        {revealSlide === 3 && (
          <div className="text-center">
            <div className="text-7xl md:text-8xl reveal-bounce mb-4">{result.archetype.emoji}</div>
            <h1 className="font-extrabold text-4xl md:text-5xl mb-3 animate-fade-in-d2" style={{ color: result.archetype.color }}>
              {result.archetype.name}
            </h1>
            <p className="text-fg-muted text-sm max-w-sm mx-auto animate-fade-in-d3">{result.archetype.description}</p>
          </div>
        )}
      </main>
    );
  }

  // ══════════════════════════════
  // RESULT PREVIEW (share card first, then email gate)
  // ══════════════════════════════
  if (phase === 'result_preview' && result) {
    return (
      <main className="min-h-screen bg-base px-4 py-12 overflow-x-hidden">
        <div className="max-w-lg mx-auto space-y-6 animate-fade-in overflow-hidden">
          {/* Share card — rendered off-screen for download, preview shown as image */}
          <div style={{ position: 'absolute', left: -9999, top: 0 }}>
            <QuizResultCard ref={resultCardRef} result={result} roasts={roasts} />
          </div>
          {/* Visual preview */}
          <div className="case-card p-6 text-center" style={{ borderColor: `${result.archetype.color}20` }}>
            <span className="text-5xl block mb-3">{result.archetype.emoji}</span>
            <p className="font-mono text-[10px] text-fg-dim tracking-widest mb-2">YOUR BET DNA</p>
            <h2 className="font-extrabold text-3xl mb-2" style={{ color: result.archetype.color }}>{result.archetype.name}</h2>
            <p className="text-fg-muted text-sm mb-4">{result.archetype.description}</p>
            <div className={`inline-block border-2 px-4 py-1 -rotate-3 mb-4`} style={{ borderColor: `${gradeColor(result.grade)}30` }}>
              <span className="font-mono text-4xl font-bold" style={{ color: gradeColor(result.grade) }}>{result.grade}</span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-left mt-2">
              <div className="bg-surface-raised p-3 rounded-sm">
                <span className="font-mono text-[9px] text-fg-dim tracking-wider">EMOTION</span>
                <span className={`font-mono text-xl font-bold block ${result.emotion_estimate <= 30 ? 'text-win' : result.emotion_estimate <= 55 ? 'text-caution' : 'text-loss'}`}>{result.emotion_estimate}</span>
              </div>
              <div className="bg-surface-raised p-3 rounded-sm">
                <span className="font-mono text-[9px] text-fg-dim tracking-wider">DISCIPLINE</span>
                <span className={`font-mono text-xl font-bold block ${result.discipline_estimate >= 70 ? 'text-win' : result.discipline_estimate >= 40 ? 'text-caution' : 'text-loss'}`}>{result.discipline_estimate}</span>
              </div>
            </div>
            <p className="text-fg-muted text-xs mt-4 font-mono">Download the card to share on Stories</p>
          </div>

          {/* Share buttons */}
          <div className="flex gap-2">
            <button onClick={handleDownloadCard} className="btn-primary text-sm flex-1 flex items-center justify-center gap-1.5 font-mono">
              Download for Stories
            </button>
            <button onClick={handleShare} className="btn-secondary text-sm flex-1 flex items-center justify-center gap-1.5">
              <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              Share on X
            </button>
          </div>

          {/* Email gate */}
          <div className="case-card p-6 text-center space-y-4 border-scalpel/20">
            <p className="text-fg-bright font-bold text-lg">Your full Bet DNA breakdown is ready.</p>
            <p className="text-fg-muted text-sm max-w-sm mx-auto">
              Your Emotion Score, detected biases, strengths, and what to watch out for — where should we send them?
            </p>
            <div className="flex gap-2">
              <input
                type="email"
                placeholder="you@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleEmailSubmit()}
                className="input-field flex-1 text-sm"
              />
              <button
                onClick={handleEmailSubmit}
                disabled={emailSubmitting || !email.includes('@')}
                className="btn-primary text-sm !px-5 whitespace-nowrap disabled:opacity-50"
              >
                {emailSubmitting ? '...' : 'Send My Results'}
              </button>
            </div>
            <p className="text-fg-muted text-xs font-mono">No spam. Just your results.</p>
            <button onClick={() => setPhase('full_result')} className="text-xs text-fg-muted hover:text-fg transition-colors">
              Skip — show me now
            </button>
          </div>

          {gamblingFooter}
        </div>
      </main>
    );
  }

  // ══════════════════════════════
  // FULL RESULT
  // ══════════════════════════════
  if (phase === 'full_result' && result) {
    const eColor = result.emotion_estimate <= 30 ? 'text-win' : result.emotion_estimate <= 55 ? 'text-caution' : result.emotion_estimate <= 75 ? 'text-orange-400' : 'text-loss';
    const eBarColor = result.emotion_estimate <= 30 ? 'bg-win' : result.emotion_estimate <= 55 ? 'bg-caution' : result.emotion_estimate <= 75 ? 'bg-orange-400' : 'bg-loss';

    return (
      <main className="min-h-screen bg-base px-4 py-12 overflow-x-hidden">
        <div className="max-w-lg mx-auto space-y-6 animate-fade-in overflow-hidden">

          {/* 1. Archetype */}
          <div className="case-card p-6 text-center" style={{ borderColor: `${result.archetype.color}20` }}>
            <span className="text-5xl block mb-3">{result.archetype.emoji}</span>
            <p className="text-fg-muted text-xs uppercase tracking-widest mb-2 font-mono">Your Bet DNA</p>
            <h1 className="font-extrabold text-3xl md:text-4xl mb-3" style={{ color: result.archetype.color }}>
              {result.archetype.name}
            </h1>
            <p className="text-fg-muted text-sm leading-relaxed">{result.archetype.description}</p>
            <p className="text-fg-muted text-xs mt-3 italic">
              {ARCH_PRODUCT_TEASER[result.archetype.name] ?? 'A full BetAutopsy would show you exactly how your real betting data compares to this quiz estimate.'}
            </p>
          </div>

          {/* 2. Emotion Score */}
          <div className="case-card p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-[9px] text-fg-dim tracking-[1.5px]">EMOTION SCORE</span>
              <span className={`font-mono text-2xl font-bold ${eColor}`}>{result.emotion_estimate}/100</span>
            </div>
            <div className="h-1 bg-surface-raised relative mb-2">
              <div className={`h-full transition-all duration-1000 ${eBarColor}`} style={{ width: `${result.emotion_estimate}%` }} />
              <div className="absolute -top-1 w-0.5 h-3 bg-fg-bright" style={{ left: `${result.emotion_estimate}%` }} />
            </div>
            <p className="text-fg-muted text-xs">
              {result.emotion_estimate <= 30 ? 'Your emotions seem well under control. That\'s rare.' :
               result.emotion_estimate <= 55 ? 'Mostly disciplined, but emotions creep in sometimes.' :
               result.emotion_estimate <= 75 ? 'Emotions are a factor in your betting. This is costing you.' :
               'Emotions are driving the bus. This is priority #1 to fix.'}
            </p>
          </div>

          {/* 3. "Is this accurate?" conversion card */}
          <div className="finding-card border-l-scalpel p-5 text-center space-y-2">
            <p className="text-fg-bright font-bold">Think this is right?</p>
            <p className="text-fg-muted text-sm max-w-sm mx-auto">
              This quiz estimated your patterns from {QUIZ_QUESTIONS.length} answers. Your actual bet history would reveal the exact dollar cost of each bias.
            </p>
            <Link href="/signup" className="btn-primary inline-block !px-6 !py-2.5 text-sm font-mono">
              Get Your Real Autopsy — Free
            </Link>
            <p className="text-fg-muted text-xs font-mono">No credit card. Upload takes 2 minutes.</p>
          </div>

          {/* 4. Biases */}
          <div className="space-y-3">
            <span className="case-header block">YOUR BIASES</span>
            {result.biases.map((bias) => (
              <div key={bias.name} className={`finding-card ${bias.severity === 'high' ? 'border-l-bleed' : bias.severity === 'medium' ? 'border-l-caution' : 'border-l-scalpel'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-medium text-fg-bright">{bias.name}</h3>
                  <span className={`font-mono text-[9px] tracking-wider uppercase px-2 py-0.5 rounded-sm font-bold ${
                    bias.severity === 'high' ? 'bg-bleed text-base' : bias.severity === 'medium' ? 'bg-caution text-base' : 'bg-scalpel text-base'
                  }`}>{bias.severity}</span>
                </div>
                <p className="text-fg-muted text-sm">{bias.one_liner}</p>
              </div>
            ))}
          </div>

          {/* 5. Strengths */}
          {result.strengths.length > 0 && (
            <div className="finding-card border-l-win p-5">
              <span className="case-header block mb-3 text-win">STRENGTHS</span>
              <ul className="space-y-2">
                {result.strengths.map((s) => (
                  <li key={s} className="text-sm text-fg-bright flex items-start gap-2">
                    <span className="text-win mt-0.5 shrink-0 font-mono">+</span>{s}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 6. Watch Outs */}
          {result.watch_outs.length > 0 && (
            <div className="finding-card border-l-caution p-5">
              <span className="case-header block mb-3 text-caution">WATCH OUT FOR</span>
              <ul className="space-y-3">
                {result.watch_outs.map((w) => (
                  <li key={w}>
                    <div className="text-sm text-fg-bright flex items-start gap-2">
                      <span className="text-caution mt-0.5 shrink-0">!</span>{w}
                    </div>
                    <p className="text-fg-muted text-xs ml-5 mt-1 italic">A full autopsy would show you the dollar cost of this.</p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 7. Challenge a friend */}
          <div className="case-card p-5 text-center space-y-3">
            <p className="text-fg-bright font-medium">Think your friends are worse?</p>
            <button onClick={handleChallenge} className="btn-secondary text-sm font-mono">
              Challenge a Friend
            </button>
          </div>

          {/* 8. Share + buttons (again at bottom) */}
          <div className="space-y-3">
            <span className="case-header block">SHARE YOUR BET DNA</span>
            <div className="flex gap-2">
              <button onClick={handleDownloadCard} className="btn-primary text-sm flex-1 font-mono">Download for Stories</button>
              <button onClick={handleShare} className="btn-secondary text-sm flex-1">Share on X</button>
              <button onClick={handleChallenge} className="btn-secondary text-sm flex-1">Challenge</button>
            </div>
          </div>

          {/* 9. Bottom CTA */}
          <div className="case-card p-6 text-center space-y-3">
            <p className="text-fg-bright font-medium">Your quiz says you&apos;re <span style={{ color: result.archetype.color }}>{result.archetype.name}</span>.</p>
            <p className="text-fg-muted text-sm">Your actual bet history might tell a different story.</p>
            <Link href="/signup" className="btn-primary inline-block !px-8 !py-3 font-mono">
              Upload Your Bets — It&apos;s Free
            </Link>
            <p className="text-fg-muted text-xs">
              Already have an account? <Link href="/login" className="text-scalpel hover:underline">Sign in</Link>
            </p>
          </div>

          {/* 10. Retake */}
          <div className="text-center">
            <button onClick={handleRetake} className="text-sm text-fg-muted hover:text-fg transition-colors font-mono">
              ↻ Retake Quiz
            </button>
          </div>

          {/* Responsible gambling */}
          {result.emotion_estimate > 75 && (
            <div className="finding-card border-l-caution p-4">
              <p className="text-caution text-sm">
                Your responses suggest emotions play a significant role in your betting.
                If gambling is causing stress or financial difficulty, help is available at{' '}
                <span className="text-fg-bright">1-800-GAMBLER</span>.
              </p>
            </div>
          )}

          {gamblingFooter}

          <div className="text-center">
            <Link href="/" className="text-fg-muted text-xs hover:text-fg transition-colors">← Back to BetAutopsy</Link>
          </div>
        </div>
      </main>
    );
  }

  return null;
}
