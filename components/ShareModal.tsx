'use client';

import { useRef, useState, useEffect, useMemo } from 'react';
import { toPng } from 'html-to-image';
import ShareCard, { type ShareCardData } from './ShareCard';
import {
  StorySlidePersonality, StorySlideBehavioral, StorySlideComparison, StorySlideCTA,
  SLIDE_LABELS,
  type StorySlideProps,
} from './ShareCardStories';
import { generateRoastStats, deriveBehavioralInsight, derivePatternComparison, getArchetypeRoast } from '@/lib/share-helpers';

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
  const slideRefs = [
    useRef<HTMLDivElement>(null),
    useRef<HTMLDivElement>(null),
    useRef<HTMLDivElement>(null),
    useRef<HTMLDivElement>(null),
  ];
  const [linkCopied, setLinkCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [format, setFormat] = useState<'stories' | 'card'>('stories');
  const [activeSlide, setActiveSlide] = useState(0);

  // Derived data
  const roastStats = useMemo(() => generateRoastStats(data.bets), [data.bets]);
  const insight = useMemo(() => deriveBehavioralInsight(data.bets, data.emotion_score), [data.bets, data.emotion_score]);
  const comparison = useMemo(() => derivePatternComparison(data.bets), [data.bets]);
  const roastLine = useMemo(() => getArchetypeRoast(data.archetype?.name ?? 'The Grinder'), [data.archetype]);

  const slideProps: StorySlideProps = { data, insight, comparison, roastLine };

  // Lock body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  async function handleDownload() {
    setDownloading(true);
    try {
      if (format === 'card') {
        if (!cardRef.current) return;
        const dataUrl = await toPng(cardRef.current, { pixelRatio: 1 });
        downloadFile(dataUrl, `betautopsy-card-${Date.now()}.png`);
      } else {
        const ref = slideRefs[activeSlide];
        if (!ref.current) return;
        const dataUrl = await toPng(ref.current, { pixelRatio: 1 });
        downloadFile(dataUrl, `betautopsy-${SLIDE_LABELS[activeSlide].toLowerCase()}-${Date.now()}.png`);
      }
    } catch (err) {
      console.error('Download failed:', err);
    }
    setDownloading(false);
  }

  function downloadFile(dataUrl: string, filename: string) {
    const link = document.createElement('a');
    link.download = filename;
    link.href = dataUrl;
    link.click();
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
    const archName = data.archetype?.name ?? data.grade;
    const text = `I'm "${archName}" — ${roastLine} | What's your betting personality?`;
    const twitterUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url || 'https://betautopsy.com/quiz')}`;
    window.open(twitterUrl, '_blank', 'noopener,noreferrer,width=600,height=400');
  }

  const SlideComponents = [StorySlidePersonality, StorySlideBehavioral, StorySlideComparison, StorySlideCTA];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Share report"
      className="fixed inset-0 z-50 bg-black/85 flex flex-col items-center"
      style={{ overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}
      onClick={onClose}
    >
      {/* Close button */}
      <button
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        aria-label="Close share modal"
        className="fixed top-4 right-4 z-[60] text-fg-muted hover:text-fg transition-colors"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>

      <div
        className="w-full max-w-lg px-4 py-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Format toggle */}
        <div className="flex gap-1 bg-surface p-1 rounded-sm mb-4 w-fit mx-auto">
          <button
            onClick={() => setFormat('stories')}
            className={`px-4 py-1.5 rounded-sm text-xs font-mono transition-colors ${
              format === 'stories' ? 'bg-surface-raised text-fg-bright' : 'text-fg-muted hover:text-fg'
            }`}
          >
            Stories
          </button>
          <button
            onClick={() => setFormat('card')}
            className={`px-4 py-1.5 rounded-sm text-xs font-mono transition-colors ${
              format === 'card' ? 'bg-surface-raised text-fg-bright' : 'text-fg-muted hover:text-fg'
            }`}
          >
            Card
          </button>
        </div>

        {/* Slide picker thumbnails (stories only) */}
        {format === 'stories' && (
          <div className="flex gap-2 justify-center mb-4">
            {SLIDE_LABELS.map((label, i) => (
              <button
                key={label}
                onClick={() => setActiveSlide(i)}
                className={`px-3 py-1.5 rounded-sm text-xs font-mono transition-colors ${
                  activeSlide === i
                    ? 'bg-scalpel text-base'
                    : 'bg-surface border border-white/[0.06] text-fg-muted hover:text-fg'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {/* Preview — scaled to fit */}
        <div className="flex justify-center mb-5">
          {format === 'stories' ? (
            <div style={{
              width: '100%',
              maxWidth: 270,
              aspectRatio: '9/16',
              overflow: 'hidden',
              borderRadius: 4,
            }}>
              <div style={{
                width: 1080,
                height: 1920,
                transform: 'scale(0.25)',
                transformOrigin: 'top left',
              }}>
                {(() => {
                  const Comp = SlideComponents[activeSlide];
                  return <Comp {...slideProps} ref={null} />;
                })()}
              </div>
            </div>
          ) : (
            <div style={{
              width: '100%',
              maxWidth: 400,
              aspectRatio: '1/1',
              overflow: 'hidden',
              borderRadius: 4,
            }}>
              <div style={{
                width: 1080,
                height: 1080,
                transform: 'scale(0.37)',
                transformOrigin: 'top left',
              }}>
                <ShareCard ref={null} data={data} insight={insight} comparison={comparison} roastLine={roastLine} />
              </div>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="space-y-2">
          {/* Download image */}
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="btn-primary w-full text-sm"
          >
            {downloading ? 'Rendering...' : format === 'stories' ? `Download ${SLIDE_LABELS[activeSlide]} Slide` : 'Download Card Image'}
          </button>

          {/* Share report actions */}
          <div className="flex gap-2">
            <button
              onClick={handleCopyLink}
              className="btn-secondary flex-1 text-sm"
            >
              {linkCopied ? 'Copied' : 'Copy Report Link'}
            </button>
            <button
              onClick={handleShareTwitter}
              className="btn-secondary flex-1 text-sm flex items-center justify-center gap-1.5"
            >
              <svg aria-hidden="true" width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              Share on X
            </button>
          </div>
          <p className="text-fg-dim text-[10px] font-mono text-center mt-1">
            Report link and X share link to your full interactive report
          </p>
        </div>
      </div>

      {/* Off-screen renders for toPng capture */}
      <div style={{ position: 'absolute', left: -9999, top: 0, opacity: 0, pointerEvents: 'none' }}>
        {SlideComponents.map((Comp, i) => (
          <Comp key={i} ref={slideRefs[i]} {...slideProps} />
        ))}
        <ShareCard ref={cardRef} data={data} insight={insight} comparison={comparison} roastLine={roastLine} />
      </div>
    </div>
  );
}
