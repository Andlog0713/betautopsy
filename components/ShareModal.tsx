'use client';

import { useRef, useState, useEffect } from 'react';
import { toPng } from 'html-to-image';
import ShareCard, { type ShareCardData } from './ShareCard';

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
  const [linkCopied, setLinkCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);

  useEffect(() => {
    const orig = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleEsc);
    return () => {
      document.body.style.overflow = orig;
      window.removeEventListener('keydown', handleEsc);
    };
  }, [onClose]);

  async function handleDownload() {
    if (!cardRef.current) return;
    setDownloading(true);
    try {
      const dataUrl = await toPng(cardRef.current, { pixelRatio: 2 });
      const link = document.createElement('a');
      link.download = `betautopsy-${data.grade.toLowerCase()}-${Date.now()}.png`;
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
    if (url) {
      await navigator.clipboard.writeText(url);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    }
  }

  async function handleShareTwitter() {
    const url = await getShareUrl();
    const text = `My BetAutopsy: Grade ${data.grade}${data.archetype ? ` | ${data.archetype.name}` : ''} | Emotion Score: ${data.emotion_score}/100 | ROI: ${data.roi_percent >= 0 ? '+' : ''}${data.roi_percent.toFixed(1)}%`;
    const twitterUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(text)}${url ? `&url=${encodeURIComponent(url)}` : ''}`;
    window.open(twitterUrl, '_blank', 'width=600,height=400');
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm overflow-y-auto"
      onClick={onClose}
    >
      {/* Close button */}
      <button
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        className="fixed top-4 right-4 z-[60] text-ink-500 hover:text-[#e7e6e1] transition-colors text-2xl"
      >
        ✕
      </button>

      <div className="min-h-full flex flex-col items-center justify-start py-6 px-4">
        <div
          className="flex flex-col items-center gap-5 w-full max-w-lg"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Card — scaled on mobile to fit screen */}
          <div className="transform scale-[0.75] sm:scale-[0.85] md:scale-100 origin-top shrink-0">
            <ShareCard ref={cardRef} data={data} />
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-3 justify-center w-full pb-6">
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="btn-primary text-sm"
            >
              {downloading ? 'Rendering...' : 'Download Image'}
            </button>
            {reportId && (
              <button
                onClick={handleCopyLink}
                className="btn-secondary text-sm"
              >
                {linkCopied ? '✓ Copied' : 'Copy Link'}
              </button>
            )}
            <button
              onClick={handleShareTwitter}
              className="btn-secondary text-sm flex items-center gap-1.5"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              Share on X
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
