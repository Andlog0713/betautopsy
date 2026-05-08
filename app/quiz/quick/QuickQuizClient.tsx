'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { QUIZ_QUESTIONS, QUESTION_ACCENTS, calculateQuizResult, getSliderInterpretation, type QuizResult } from '@/lib/quiz-engine';
import { apiPost } from '@/lib/api-client';
import { trackQuizComplete as trackQuizCompleteMeta } from '@/lib/meta-events';

// 5 questions that cover all scoring dimensions with minimal overlap
const QUICK_QUESTION_IDS = ['q3', 'q1', 'q5', 'q6', 'q14'];
const QUICK_QUESTIONS = QUIZ_QUESTIONS.filter((q) => QUICK_QUESTION_IDS.includes(q.id));

// Subset of accents for 5 questions
const QUICK_ACCENTS = [
  QUESTION_ACCENTS[0],
  QUESTION_ACCENTS[3],
  QUESTION_ACCENTS[6],
  QUESTION_ACCENTS[9],
  QUESTION_ACCENTS[12],
];

type Phase = 'intro' | 'questions' | 'revealing' | 'result';

export default function QuickQuizClient() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('intro');
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [selectedValue, setSelectedValue] = useState<string | null>(null);
  const [sliderValue, setSliderValue] = useState<string | null>(null);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [email, setEmail] = useState('');
  const [emailSubmitting, setEmailSubmitting] = useState(false);
  const [emailSubmitted, setEmailSubmitted] = useState(false);
  const [emailError, setEmailError] = useState('');

  const handleEmailSubmit = useCallback(async () => {
    if (emailSubmitting) return;
    const trimmed = email.trim();
    if (!trimmed) {
      setEmailError('Enter your email to continue.');
      return;
    }
    if (!trimmed.includes('@') || !trimmed.includes('.')) {
      setEmailError('That doesn\u2019t look like a valid email.');
      return;
    }
    setEmailError('');
    setEmailSubmitting(true);
    try {
      await apiPost('/api/quiz-lead', {
        email,
        archetype: result?.archetype.name,
        emotion_estimate: result?.emotion_estimate,
      });
    } catch { /* silent: don't block conversion on lead save */ }
    setEmailSubmitted(true);
    // Brief "sent" moment, then bridge straight to upload (via signup, since
    // /upload is auth-gated). Email is prefilled on the signup form.
    setTimeout(() => {
      router.push(`/signup?email=${encodeURIComponent(email)}&next=${encodeURIComponent('/upload')}`);
    }, 1200);
  }, [email, emailSubmitting, result, router]);

  const accent = QUICK_ACCENTS[Math.min(currentQ, QUICK_ACCENTS.length - 1)];
  const progress = phase === 'questions' ? ((currentQ + 1) / QUICK_QUESTIONS.length) * 100 : 0;

  const handleAnswer = useCallback((value: string) => {
    setSelectedValue(value);
    const question = QUICK_QUESTIONS[currentQ];
    const newAnswers = { ...answers, [question.id]: value };
    setAnswers(newAnswers);

    setTimeout(() => {
      setSelectedValue(null);
      setSliderValue(null);
      if (currentQ < QUICK_QUESTIONS.length - 1) {
        setCurrentQ(currentQ + 1);
      } else {
        // Calculate result and go to reveal
        const r = calculateQuizResult(newAnswers);
        setResult(r);
        trackQuizCompleteMeta(r.archetype.name);
        setPhase('revealing');
        setTimeout(() => setPhase('result'), 2000);
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

  // ── INTRO ──
  if (phase === 'intro') {
    return (
      <main className="min-h-screen bg-base flex items-center justify-center px-4">
        <div className="max-w-lg text-center animate-fade-in">
          <h1 className="font-extrabold text-4xl md:text-5xl tracking-tight mb-4">
            Quick <span className="text-scalpel">Bet DNA</span>
          </h1>
          <p className="text-fg-muted text-lg mb-2 leading-relaxed">
            5 questions. 60 seconds. Your betting personality.
          </p>
          <p className="text-fg-dim text-sm mb-8">No signup. No email. Just answers.</p>
          <button
            onClick={() => setPhase('questions')}
            className="btn-primary text-lg !px-10 !py-3.5"
          >
            Let&apos;s Go →
          </button>
          <div className="mt-6 space-y-2">
            <Link href="/quiz" className="text-fg-muted text-xs hover:text-fg transition-colors block">
              Want the full 13-question version? →
            </Link>
            <Link href="/" className="text-fg-muted text-xs hover:text-fg transition-colors block">
              ← Back to BetAutopsy
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // ── QUESTIONS ──
  if (phase === 'questions') {
    const question = QUICK_QUESTIONS[currentQ];
    const isSlider = question.style === 'slider';
    const isBold = question.style === 'bold';
    const isScenario = question.style === 'scenario';

    return (
      <main className="min-h-screen bg-base px-4 py-6" style={{ background: `radial-gradient(circle at 50% 30%, ${accent}08 0%, transparent 60%), #111318` }}>
        <div className="max-w-lg mx-auto">
          {/* Progress */}
          <div className="flex items-center justify-between mb-2">
            <button onClick={handleBack} disabled={currentQ === 0} className="text-sm text-fg-muted hover:text-fg-bright transition-colors disabled:opacity-30 disabled:cursor-not-allowed">← Back</button>
            <span className="text-sm text-fg-muted font-mono">{currentQ + 1} of {QUICK_QUESTIONS.length}</span>
          </div>
          <div className="h-1.5 bg-surface-2 rounded-full overflow-hidden mb-10">
            <div
              className="h-full rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%`, backgroundColor: accent, boxShadow: `0 0 8px ${accent}40` }}
            />
          </div>

          {/* Question */}
          <div key={currentQ} className="quiz-enter">
            <h2 className={`font-bold leading-snug mb-2 ${isBold ? 'text-2xl md:text-[32px] text-center' : 'text-xl md:text-2xl'}`}>
              {question.question}
            </h2>
            {question.subtext && <p className={`text-fg-muted text-sm mb-6 ${isBold ? 'text-center' : ''}`}>{question.subtext}</p>}
            {!question.subtext && <div className="mb-6" />}

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
                          : 'border-border bg-surface-2 text-fg-muted hover:border-border-strong'
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
              <div className="space-y-3">
                {question.options.map((opt) => {
                  const isSelected = selectedValue === opt.value;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => handleAnswer(opt.value)}
                      disabled={selectedValue !== null}
                      className={`w-full text-left p-4 rounded-sm border transition-all duration-200 ${
                        isSelected
                          ? 'scale-[1.02] border-scalpel/50 bg-scalpel-muted'
                          : 'border-border bg-surface-2 hover:border-border-strong hover:bg-surface-3'
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

  // ── REVEALING ──
  if (phase === 'revealing' && result) {
    return (
      <main className="min-h-screen bg-base flex items-center justify-center px-4">
        <div className="text-center animate-fade-in">
          <p className="text-fg-muted text-xl reveal-pulse">Analyzing your answers...</p>
        </div>
      </main>
    );
  }

  // ── RESULT ──
  if (phase === 'result' && result) {
    const eColor = result.emotion_estimate <= 30 ? 'text-win' : result.emotion_estimate <= 55 ? 'text-caution' : 'text-loss';

    return (
      <main className="min-h-screen bg-base px-4 py-12">
        <div className="max-w-lg mx-auto space-y-6 animate-fade-in">
          {/* Archetype */}
          <div className="case-card p-6 text-center" style={{ borderColor: `${result.archetype.color}20` }}>
            <p className="font-mono text-[10px] text-fg-dim tracking-widest mb-2">YOUR BET DNA</p>
            <h1 className="font-extrabold text-3xl md:text-4xl tracking-tight mb-3" style={{ color: result.archetype.color }}>
              {result.archetype.name}
            </h1>
            <p className="text-fg-muted text-sm leading-relaxed">{result.archetype.description}</p>
          </div>

          {/* Scores */}
          <div className="grid grid-cols-2 gap-3">
            <div className="case-card p-4">
              <span className="font-mono text-[9px] text-fg-dim tracking-wider block mb-1">EMOTION</span>
              <span className={`font-mono text-2xl font-bold ${eColor}`}>{result.emotion_estimate}</span>
              <span className="text-fg-dim text-xs font-mono">/100</span>
            </div>
            <div className="case-card p-4">
              <span className="font-mono text-[9px] text-fg-dim tracking-wider block mb-1">DISCIPLINE</span>
              <span className={`font-mono text-2xl font-bold ${result.discipline_estimate >= 60 ? 'text-win' : result.discipline_estimate >= 40 ? 'text-caution' : 'text-loss'}`}>{result.discipline_estimate}</span>
              <span className="text-fg-dim text-xs font-mono">/100</span>
            </div>
          </div>

          {/* Top bias */}
          {result.biases[0] && (
            <div className={`finding-card ${result.biases[0].severity === 'high' ? 'border-l-bleed' : 'border-l-caution'}`}>
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-medium text-fg-bright">{result.biases[0].name}</h3>
                <span className={`font-mono text-[9px] tracking-wider uppercase px-2 py-0.5 rounded-sm font-bold ${
                  result.biases[0].severity === 'high' ? 'bg-bleed text-base' : result.biases[0].severity === 'medium' ? 'bg-caution text-base' : 'bg-scalpel text-base'
                }`}>{result.biases[0].severity}</span>
              </div>
              <p className="text-fg-muted text-sm">{result.biases[0].one_liner}</p>
            </div>
          )}

          {/* Email capture → upload bridge */}
          <div className="case-card p-6 text-center space-y-4 border-scalpel/20">
            <div className="space-y-2">
              <p className="font-mono text-[10px] text-fg-dim tracking-widest">
                NEXT STEP
              </p>
              <p className="text-fg-bright font-bold text-lg">
                Now run the real autopsy.
              </p>
              <p className="text-fg-muted text-sm">
                The quiz was a sketch. Your bets are the evidence. Every pattern priced in dollars.
              </p>
            </div>

            {emailSubmitted ? (
              <div className="py-2 animate-fade-in">
                <p className="font-mono text-xs text-scalpel tracking-wider">
                  SENT → OPENING UPLOAD…
                </p>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleEmailSubmit();
                }}
                noValidate
                className="space-y-3"
              >
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (emailError) setEmailError('');
                  }}
                  placeholder="you@example.com"
                  autoComplete="email"
                  inputMode="email"
                  className={`input-field w-full text-center ${emailError ? 'border-bleed' : ''}`}
                  disabled={emailSubmitting}
                  aria-invalid={emailError ? true : undefined}
                  aria-describedby={emailError ? 'quiz-email-error' : undefined}
                />
                {emailError && (
                  <p
                    id="quiz-email-error"
                    className="text-bleed text-xs font-mono text-center animate-fade-in"
                  >
                    {emailError}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={emailSubmitting}
                  className="btn-primary w-full font-mono text-sm !py-3 disabled:opacity-50"
                >
                  {emailSubmitting ? 'Opening…' : 'Run My Autopsy →'}
                </button>
                <p className="text-fg-dim text-[10px] font-mono tracking-wider">
                  NO SPAM · UNSUBSCRIBE ANYTIME
                </p>
              </form>
            )}
          </div>

          {/* Share */}
          <div className="text-center space-y-3">
            <button
              onClick={() => {
                const text = `My Bet DNA: ${result.archetype.name}\nEmotion: ${result.emotion_estimate}/100\n\nWhat's yours?`;
                const url = 'https://betautopsy.com/quiz/quick';
                const tweetHref = `https://x.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
                if (navigator.share) {
                  navigator.share({ text, url }).catch((err: unknown) => {
                    // User dismissed the native share sheet. Not an error.
                    if (err instanceof Error && err.name === 'AbortError') return;
                    // Any other failure: fall back to the tweet intent.
                    window.open(tweetHref, '_blank', 'width=600,height=500');
                  });
                } else {
                  window.open(tweetHref, '_blank', 'width=600,height=500');
                }
              }}
              className="btn-secondary text-sm font-mono"
            >
              Challenge a Friend
            </button>
          </div>

          <p className="text-fg-muted text-xs text-center mt-8">
            For entertainment and educational purposes only. Not gambling advice. 18+.
            If you or someone you know has a gambling problem, call 1-800-GAMBLER.
          </p>
          <div className="text-center">
            <Link href="/" className="text-fg-muted text-xs hover:text-fg transition-colors">← Back to BetAutopsy</Link>
          </div>
        </div>
      </main>
    );
  }

  return null;
}
