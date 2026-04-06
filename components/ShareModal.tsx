'use client';

import { useRef, useState, useEffect, useMemo } from 'react';
import { toPng } from 'html-to-image';
import ShareCard, { type ShareCardData } from './ShareCard';
import ShareCardStories from './ShareCardStories';
import { generateRoastStats } from '@/lib/share-helpers';

export default function ShareModal({
  data,
  reportId,
  onClose,
}: {
  data: ShareCardData;
  reportId?: string;
  onClose: () => void;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const storiesRef = useRef<HTMLDivElement>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [format, setFormat] = useState<'stories' | 'card'>('stories');

  const roastStats = useMemo(() => generateRoastStats(data.bets), [data.bets]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleEsc);
    return () => {
      window.removeEventListener('keydown', handleEsc);
    };
  }, [onClose]);

  async function handleDownload() {
    const ref = format === 'stories' ? storiesRef : cardRef;
    if (!ref.current) return;
    setDownloading(true);
    try {
      const dataUrl = await toPng(ref.current, { pixelRatio: format === 'stories' ? 1 : 2 });
      const link = document.createElement('a');
      link.download = `betautopsy-${data.grade.toLowerCase()}-${format}-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Download failed:', err);
    }
    setDownloading(false);
  }

  async function getShareUrl(): Promise<string | null> {
    if (shareUrl) return shareUrl;
    if (!reportId) return null;
    try {
      const res = await fetch('/api/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ report_id: reportId }),
      });
      const result = await res.json();
      if (result.share_id) {
        const url = `${window.location.origin}/share/${result.share_id}`;
        setShareUrl(url);
        return url;
      }
    } catch {
      console.error('Share link failed');
    }
    return null;
  }

  async function handleCopyLink() {
    const url = await getShareUrl();
    await navigator.clipboard.writeText(url || 'https://betautopsy.com');
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  }

  async function handleShareTwitter() {
    const url = await getShareUrl();
    let text = `My Bet DNA: ${data.archetype?.name ?? data.grade}`;
    // Add a roast stat to the tweet if available
    if (roastStats.length > 0) {
      text += ` | ${roastStats[0].text}`;
    } else {
      text += ` | Emotion Score: ${data.emotion_score}/100 | ROI: ${data.roi_percent >= 0 ? '+' : ''}${data.roi_percent.toFixed(1)}%`;
    }
    text += ` | What's yours?`;
    const twitterUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url || 'https://betautopsy.com/quiz')}`;
    window.open(twitterUrl, '_blank', 'noopener,noreferrer,width=600,height=400');
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Share report"
      className="fixed inset-0 z-50 bg-black/80"
      style={{ overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}
      onClick={onClose}
    >
      {/* Close button */}
      <button
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        aria-label="Close share modal"
        className="fixed top-4 right-4 z-[60] text-fg-muted hover:text-fg transition-colors text-2xl"
      >
        ✕
      </button>

      <div
        className="flex flex-col items-center gap-5 px-4 py-6 pb-12"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Format toggle */}
        <div className="flex gap-1 bg-base p-1 rounded-sm">
          <button
            onClick={() => setFormat('stories')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              format === 'stories'
                ? 'bg-surface text-fg-bright shadow-sm'
                : 'text-fg-muted hover:text-fg-muted'
            }`}
          >
            Stories
          </button>
          <button
            onClick={() => setFormat('card')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              format === 'card'
                ? 'bg-surface text-fg-bright shadow-sm'
                : 'text-fg-muted hover:text-fg-muted'
            }`}
          >
            Card
          </button>
        </div>

        {/* Card — scaled to fit screen */}
        <div style={{
          transform: format === 'stories' ? 'scale(var(--stories-scale, 0.3))' : 'scale(var(--card-scale, 1))',
          transformOrigin: 'top center',
          height: format === 'stories' ? `calc(1920px * var(--stories-scale, 0.3))` : 'auto',
        }}>
          <style>{`
            :root {
              --card-scale: 0.7;
              --stories-scale: 0.25;
            }
            @media (min-width: 480px) {
              :root {
                --card-scale: 0.85;
                --stories-scale: 0.32;
              }
            }
            @media (min-width: 640px) {
              :root {
                --card-scale: 1;
                --stories-scale: 0.38;
              }
            }
          `}</style>
          {format === 'stories' ? (
            <ShareCardStories ref={storiesRef} data={data} roastStats={roastStats} />
          ) : (
            <ShareCard ref={cardRef} data={data} roastStats={roastStats} />
          )}
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-3 justify-center w-full max-w-sm">
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="btn-primary text-sm"
          >
            {downloading ? 'Rendering...' : format === 'stories' ? 'Download for Stories' : 'Download Image'}
          </button>
          <button
            onClick={handleCopyLink}
            className="btn-secondary text-sm"
          >
            {linkCopied ? '✓ Copied' : 'Copy Report Link'}
          </button>
          <button
            onClick={handleShareTwitter}
            className="btn-secondary text-sm flex items-center gap-1.5"
          >
            <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
            Share on X
          </button>
        </div>
      </div>
    </div>
  );
}
