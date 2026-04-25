'use client';

import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { apiPost } from '@/lib/api-client';

type Rating = 'positive' | 'neutral' | 'negative';

const PLACEHOLDERS: Record<Rating, string> = {
  positive: 'Which part changed how you think about your bets? Did you act on anything?',
  neutral: "What were you hoping to see that wasn't there?",
  negative: 'What felt off? Was something inaccurate, or just not useful for how you bet?',
};

const AUTO_DISMISS_MS = 30_000;
const SLIDE_MS = 300;

export default function ReportFeedbackNudge({
  reportId,
  onClose,
}: {
  reportId: string;
  onClose: (reason: 'submitted' | 'dismissed') => void;
}) {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [rating, setRating] = useState<Rating | null>(null);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const autoDismissRef = useRef<number | undefined>(undefined);

  // Trigger slide-up on mount
  useEffect(() => {
    setMounted(true);
    const t = window.setTimeout(() => setVisible(true), 20);
    return () => window.clearTimeout(t);
  }, []);

  // Auto-dismiss after 30s of no interaction
  useEffect(() => {
    if (submitted || rating) return; // user engaged — cancel auto-dismiss
    autoDismissRef.current = window.setTimeout(() => {
      handleClose('dismissed');
    }, AUTO_DISMISS_MS);
    return () => {
      if (autoDismissRef.current !== undefined) {
        window.clearTimeout(autoDismissRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submitted, rating]);

  function handleClose(reason: 'submitted' | 'dismissed') {
    setVisible(false);
    window.setTimeout(() => {
      onClose(reason);
    }, SLIDE_MS);
  }

  async function handleSubmit() {
    if (!rating) return;
    setSubmitting(true);
    try {
      await apiPost('/api/feedback', {
        type: 'report_reaction',
        rating,
        message: message || null,
        report_id: reportId,
        page: '/reports',
      });
    } catch {
      // Swallow — we still dismiss so we don't spam the user.
    }
    setSubmitting(false);
    setSubmitted(true);
    window.setTimeout(() => handleClose('submitted'), 900);
  }

  if (!mounted) return null;

  return (
    <div
      role="dialog"
      aria-label="Rate this autopsy"
      className="fixed inset-x-0 bottom-0 z-40 flex justify-center pointer-events-none pb-[env(safe-area-inset-bottom)]"
    >
      <div
        style={{
          transform: visible ? 'translateY(0)' : 'translateY(110%)',
          transition: `transform ${SLIDE_MS}ms ease-out`,
          backgroundColor: '#0D1117',
        }}
        className="pointer-events-auto mx-4 mb-4 w-full max-w-md border border-scalpel rounded p-3 sm:p-4"
      >
        {submitted ? (
          <p className="text-fg-muted text-sm text-center py-2 font-sans">
            Thanks, this helps us get sharper.
          </p>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <p className="text-fg-bright text-sm font-medium font-sans">
                Was this autopsy useful?
              </p>
              <button
                onClick={() => handleClose('dismissed')}
                aria-label="Dismiss"
                className="ml-auto text-fg-dim hover:text-fg transition-colors w-11 h-11 -m-2 flex items-center justify-center rounded-sm"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex items-center justify-around gap-2">
              {(['positive', 'neutral', 'negative'] as Rating[]).map((r) => {
                const label = r === 'positive' ? '+' : r === 'neutral' ? '~' : '-';
                const active = rating === r;
                const activeClass =
                  r === 'positive'
                    ? 'bg-win/15 text-win border-win/30'
                    : r === 'neutral'
                      ? 'bg-caution/15 text-caution border-caution/30'
                      : 'bg-loss/15 text-loss border-loss/30';
                return (
                  <button
                    key={r}
                    onClick={() => setRating(r)}
                    aria-label={`Rate ${r}`}
                    className={`flex-1 min-h-[44px] rounded-sm border transition-colors flex items-center justify-center text-[24px] leading-none font-mono ${
                      active
                        ? activeClass
                        : 'bg-surface-1 border-border-subtle hover:border-border-strong'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            {rating && (
              <div className="space-y-2">
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={PLACEHOLDERS[rating]}
                  className="input-field w-full h-20 resize-none font-sans"
                />
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="btn-secondary text-sm w-full min-h-[44px]"
                >
                  {submitting ? 'Sending...' : 'Submit'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
