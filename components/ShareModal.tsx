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

  // Lock body scroll on mount
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleEsc);
    return () => {
      document.body.style.overflow = '';
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

  async function handleCopyLink() {
    if (shareUrl) {
      await navigator.clipboard.writeText(shareUrl);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
      return;
    }

    if (!reportId) return;

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
        await navigator.clipboard.writeText(url);
        setLinkCopied(true);
        setTimeout(() => setLinkCopied(false), 2000);
      }
    } catch {
      console.error('Share link failed');
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-start justify-center overflow-y-auto"
      onClick={onClose}
    >
      {/* Close button - fixed top right */}
      <button
        onClick={onClose}
        className="fixed top-4 right-4 z-50 text-ink-500 hover:text-[#e7e6e1] transition-colors text-2xl"
      >
        ✕
      </button>

      <div
        className="flex flex-col items-center gap-4 py-8 px-4 w-full max-w-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Card preview — scaled down on mobile */}
        <div className="transform scale-[0.85] sm:scale-100 origin-top">
          <ShareCard ref={cardRef} data={data} />
        </div>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="btn-primary text-sm flex-1"
          >
            {downloading ? 'Rendering...' : 'Download Image'}
          </button>
          {reportId && (
            <button
              onClick={handleCopyLink}
              className="btn-secondary text-sm flex-1"
            >
              {linkCopied ? '✓ Link Copied' : 'Copy Link'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
