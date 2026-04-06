'use client';

import { useState } from 'react';

export default function FeedbackButton() {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState('general');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!message.trim()) return;
    setSubmitting(true);
    await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type,
        message,
        page: window.location.pathname,
      }),
    });
    setSubmitting(false);
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setOpen(false);
      setMessage('');
      setType('general');
    }, 2000);
  }

  return (
    <>
      {/* Tab button */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed right-0 top-1/2 -translate-y-1/2 z-40 bg-surface-1 border border-border-subtle border-r-0 rounded-l-sm px-2 py-3 text-fg-muted hover:text-fg hover:bg-surface-1/80 transition-colors"
        style={{ writingMode: 'vertical-rl' }}
      >
        <span className="text-xs tracking-wider">Feedback</span>
      </button>

      {/* Panel */}
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="fixed right-0 top-1/2 -translate-y-1/2 z-50 w-80 bg-surface-1 border border-border-subtle rounded-l-lg p-5 space-y-4 animate-fade-in">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-sm">Send Feedback</h3>
              <button onClick={() => setOpen(false)} aria-label="Close feedback" className="text-fg-muted hover:text-fg text-sm">✕</button>
            </div>

            {submitted ? (
              <p className="text-win text-sm">Thanks for the feedback!</p>
            ) : (
              <>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="input-field w-full text-sm"
                >
                  <option value="general">General feedback</option>
                  <option value="bug">Bug report</option>
                  <option value="feature_request">Feature request</option>
                </select>

                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="What's on your mind?"
                  className="input-field w-full text-sm h-24 resize-none"
                />

                <button
                  onClick={handleSubmit}
                  disabled={submitting || !message.trim()}
                  className="btn-primary text-sm w-full"
                >
                  {submitting ? 'Sending...' : 'Submit'}
                </button>
              </>
            )}
          </div>
        </>
      )}
    </>
  );
}
