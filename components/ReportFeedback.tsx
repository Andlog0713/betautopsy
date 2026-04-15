'use client';

import { useState } from 'react';
import { apiPost } from '@/lib/api-client';

export default function ReportFeedback({ reportId }: { reportId?: string }) {
  const [rating, setRating] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    setSubmitting(true);
    await apiPost('/api/feedback', {
      type: 'report_reaction',
      rating,
      message: message || null,
      report_id: reportId,
      page: '/reports',
    });
    setSubmitting(false);
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="card p-5 text-center">
        <p className="text-fg-muted text-sm">Thanks, this helps us get sharper.</p>
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
      <p className="text-fg-bright text-sm font-medium">Was this autopsy useful?</p>

      <div className="flex gap-3">
        <button
          onClick={() => setRating('positive')}
          className={`flex items-center gap-2 px-4 py-2 rounded-sm text-sm transition-colors ${
            rating === 'positive' ? 'bg-win/15 text-win border border-win/30' : 'bg-surface-1 text-fg-muted hover:text-win'
          }`}
        >
          Nailed it
        </button>
        <button
          onClick={() => setRating('neutral')}
          className={`flex items-center gap-2 px-4 py-2 rounded-sm text-sm transition-colors ${
            rating === 'neutral' ? 'bg-caution/15 text-caution border border-caution/30' : 'bg-surface-1 text-fg-muted hover:text-caution'
          }`}
        >
          It was okay
        </button>
        <button
          onClick={() => setRating('negative')}
          className={`flex items-center gap-2 px-4 py-2 rounded-sm text-sm transition-colors ${
            rating === 'negative' ? 'bg-loss/15 text-loss border border-loss/30' : 'bg-surface-1 text-fg-muted hover:text-loss'
          }`}
        >
          Missed it
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
