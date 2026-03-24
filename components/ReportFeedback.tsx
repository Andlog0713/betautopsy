'use client';

import { useState } from 'react';

export default function ReportFeedback({ reportId }: { reportId?: string }) {
  const [rating, setRating] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    setSubmitting(true);
    await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'report_reaction',
        rating,
        message: message || null,
        report_id: reportId,
        page: '/reports',
      }),
    });
    setSubmitting(false);
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="card p-5 text-center">
        <p className="text-ink-600 text-sm">Thanks — this helps us get sharper.</p>
      </div>
    );
  }

  const placeholders: Record<string, string> = {
    positive: 'Which part changed how you think about your bets? Did you act on anything?',
    neutral: 'What were you hoping to see that wasn\'t there?',
    negative: 'What felt off? Was something inaccurate, or just not useful for how you bet?',
  };

  return (
    <div className="card p-5 space-y-4">
      <p className="text-[#e7e6e1] text-sm font-medium">Was this autopsy useful?</p>

      <div className="flex gap-3">
        <button
          onClick={() => setRating('positive')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors ${
            rating === 'positive' ? 'bg-mint-500/15 text-mint-500 border border-mint-500/30' : 'bg-ink-800 text-ink-600 hover:text-mint-500'
          }`}
        >
          👍 Nailed it
        </button>
        <button
          onClick={() => setRating('neutral')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors ${
            rating === 'neutral' ? 'bg-amber-400/15 text-amber-400 border border-amber-400/30' : 'bg-ink-800 text-ink-600 hover:text-amber-400'
          }`}
        >
          😐 It was okay
        </button>
        <button
          onClick={() => setRating('negative')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors ${
            rating === 'negative' ? 'bg-red-400/15 text-red-400 border border-red-400/30' : 'bg-ink-800 text-ink-600 hover:text-red-400'
          }`}
        >
          👎 Missed it
        </button>
      </div>

      {rating && (
        <div className="space-y-3">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={placeholders[rating]}
            className="input-field w-full text-sm h-24 resize-none"
          />
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="btn-secondary text-sm"
          >
            {submitting ? 'Sending...' : 'Submit'}
          </button>
        </div>
      )}
    </div>
  );
}
