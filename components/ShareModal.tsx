'use client';

import { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { toast } from 'sonner';
import { createPortal } from 'react-dom';
import { toPng } from 'html-to-image';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import ShareCard, { type ShareCardData } from './ShareCard';
import ArchetypeShareCard from './ArchetypeShareCard';
import { apiPost, apiDelete } from '@/lib/api-client';
import { getArchetypeByName } from '@/lib/archetypes';
import {
  StorySlidePersonality, StorySlideBehavioral, StorySlideReceipt, StorySlideCTA,
  SLIDE_LABELS,
  type StorySlideProps,
} from './ShareCardStories';
import { generateRoastStats, deriveBehavioralInsight, getArchetypeRoast } from '@/lib/share-helpers';

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
  const archetypeCardRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const hasArchetypeCard = !!data.archetype?.name && !!getArchetypeByName(data.archetype.name);
  const slideRefs = [
    useRef<HTMLDivElement>(null),
    useRef<HTMLDivElement>(null),
    useRef<HTMLDivElement>(null),
    useRef<HTMLDivElement>(null),
  ];
  const [downloading, setDownloading] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [minting, setMinting] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [format, setFormat] = useState<'stories' | 'card'>('stories');
  const [activeSlide, setActiveSlide] = useState(0);
  const [mounted, setMounted] = useState(false);

  useFocusTrap(modalRef, mounted);

  const roastStats = useMemo(() => generateRoastStats(data.bets), [data.bets]);
  const insight = useMemo(() => deriveBehavioralInsight(data.bets, data.emotion_score), [data.bets, data.emotion_score]);
  const roastLine = useMemo(() => getArchetypeRoast(data.archetype?.name ?? 'The Grinder'), [data.archetype]);

  const slideProps: StorySlideProps = { data, insight, roastLine, roastStats };
  const SlideComponents = [StorySlidePersonality, StorySlideBehavioral, StorySlideReceipt, StorySlideCTA];

  useEffect(() => { setMounted(true); }, []);

  // Mints (or fetches the already-minted) share token ONLY when the user
  // takes an explicit share action (Copy link / Post on X) - not on modal
  // mount. Opening the modal to look at share options is not consent to
  // create a public link. Cached in `shareUrl` so a second click doesn't
  // re-mint; /api/share is idempotent per report_id regardless.
  const ensureShareUrl = useCallback(async (): Promise<string | null> => {
    if (shareUrl) return shareUrl;
    if (!reportId) return null;
    setMinting(true);
    try {
      const res = await apiPost('/api/share', { report_id: reportId });
      const result = await res.json();
      if (result.share_id) {
        const url = `${window.location.origin}/share/${result.share_id}`;
        setShareUrl(url);
        return url;
      }
      return null;
    } catch {
      return null;
    } finally {
      setMinting(false);
    }
  }, [reportId, shareUrl]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  useEffect(() => {
    const orig = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = orig; };
  }, []);

  const handleDownload = useCallback(async () => {
    setDownloading(true);
    try {
      if (format === 'card') {
        const targetRef = hasArchetypeCard ? archetypeCardRef : cardRef;
        if (!targetRef.current) return;
        const url = await toPng(targetRef.current, { pixelRatio: 1 });
        dl(url, `betautopsy-card-${Date.now()}.png`);
      } else {
        const ref = slideRefs[activeSlide];
        if (!ref.current) return;
        const url = await toPng(ref.current, { pixelRatio: 1 });
        dl(url, `betautopsy-${SLIDE_LABELS[activeSlide].toLowerCase()}-${Date.now()}.png`);
      }
    } catch (err) {
      console.error('Download failed:', err);
    }
    setDownloading(false);
  }, [format, activeSlide]);

  function dl(dataUrl: string, filename: string) {
    const a = document.createElement('a');
    a.download = filename;
    a.href = dataUrl;
    a.click();
  }

  async function handleCopyLink() {
    const url = (await ensureShareUrl()) || `${window.location.origin}/reports`;
    navigator.clipboard.writeText(url).then(() => {
      toast.success('Link copied');
    }).catch(() => {
      const input = document.createElement('input');
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      toast.success('Link copied');
    });
  }

  // Wires Privacy Policy §6's "you can delete shared reports at any time"
  // claim to an actual control - the DELETE /api/share endpoint has existed
  // since the share-token-consent migration, but nothing in the UI ever
  // called it. Only meaningful once a link exists in this session
  // (shareUrl set via Copy link / Post on X); revoking clears local state
  // so the button reverts to "Copy report link" for a fresh mint.
  async function handleRevokeLink() {
    if (!reportId || !shareUrl) return;
    setRevoking(true);
    try {
      const res = await apiDelete('/api/share', { report_id: reportId });
      if (res.ok) {
        setShareUrl(null);
        toast.success('Share link deleted');
      } else {
        toast.error('Could not delete share link');
      }
    } catch {
      toast.error('Could not delete share link');
    } finally {
      setRevoking(false);
    }
  }

  async function handleShareTwitter() {
    const url = (await ensureShareUrl()) || 'https://betautopsy.com/quiz';
    const archName = data.archetype?.name ?? data.grade;
    const text = `I'm "${archName}" — ${roastLine} | What's your betting personality?`;
    const twitterUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    window.open(twitterUrl, '_blank', 'noopener,noreferrer,width=600,height=400');
  }

  if (!mounted) return null;

  const modal = (
    <>
      <div
        role="dialog"
        aria-modal="true"
        className="fixed inset-0 z-[100] bg-black/85 overflow-y-auto"
        onClick={onClose}
      >
        <div
          className="min-h-full flex items-start justify-center p-4 sm:p-8"
          onClick={(e) => e.stopPropagation()}
        >
          <div ref={modalRef} className="w-full max-w-md bg-base border border-border-subtle rounded-sm p-5 my-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <span className="font-mono text-[10px] text-fg-dim tracking-[2px] uppercase">Share Report</span>
              <button onClick={onClose} className="text-fg-muted hover:text-fg p-1">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            {/* Section 1: Share full report */}
            <div className="bg-surface-1 rounded-sm p-4 mb-5">
              <p className="text-sm text-fg-bright font-medium mb-1">Share your full interactive report</p>
              <p className="text-xs text-fg-muted mb-3">Anyone with the link can view your complete autopsy report.</p>
              <div className="flex gap-2">
                <button
                  onClick={handleCopyLink}
                  disabled={minting}
                  className="flex-1 py-2 rounded-sm text-xs font-mono transition-colors bg-surface-2 border border-border-subtle text-fg hover:border-border-strong disabled:opacity-60"
                >
                  {minting ? 'Generating link...' : 'Copy report link'}
                </button>
                <button
                  onClick={handleShareTwitter}
                  className="py-2 px-4 rounded-sm text-xs font-mono bg-surface-2 border border-border-subtle text-fg hover:border-border-strong transition-colors flex items-center gap-1.5"
                >
                  <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                  Post on X
                </button>
              </div>
              {shareUrl && (
                <button
                  onClick={handleRevokeLink}
                  disabled={revoking}
                  className="w-full mt-2 py-2 rounded-sm text-xs font-mono transition-colors text-loss hover:bg-loss/10 disabled:opacity-60"
                >
                  {revoking ? 'Deleting...' : 'Delete shared link'}
                </button>
              )}
            </div>

            {/* Section 2: Download share card */}
            <div className="mb-3">
              <p className="text-xs text-fg-muted mb-3">Or download a share card image for social media:</p>

              <div className="flex gap-1 bg-surface-1 p-1 rounded-sm mb-3">
                <button
                  onClick={() => setFormat('stories')}
                  className={`flex-1 py-1.5 rounded-sm text-xs font-mono text-center transition-colors ${
                    format === 'stories' ? 'bg-surface-2 text-fg-bright' : 'text-fg-muted hover:text-fg'
                  }`}
                >
                  Stories
                </button>
                <button
                  onClick={() => setFormat('card')}
                  className={`flex-1 py-1.5 rounded-sm text-xs font-mono text-center transition-colors ${
                    format === 'card' ? 'bg-surface-2 text-fg-bright' : 'text-fg-muted hover:text-fg'
                  }`}
                >
                  Card
                </button>
              </div>

              {format === 'stories' && (
                <div className="grid grid-cols-4 gap-1 mb-3">
                  {SLIDE_LABELS.map((label, i) => (
                    <button
                      key={label}
                      onClick={() => setActiveSlide(i)}
                      className={`py-1.5 rounded-sm text-[10px] font-mono text-center transition-colors ${
                        activeSlide === i
                          ? 'bg-scalpel text-base'
                          : 'bg-surface-1 text-fg-muted hover:text-fg'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}

              <div className="bg-surface-1 rounded-sm overflow-hidden mb-3">
                {format === 'stories' ? (
                  <div style={{ aspectRatio: '9/16', overflow: 'hidden' }}>
                    <div style={{ width: 1080, height: 1920, transform: 'scale(var(--preview-scale))', transformOrigin: 'top left' }}>
                      <style>{`:root { --preview-scale: 0.25; } @media (min-width: 448px) { :root { --preview-scale: 0.3; } }`}</style>
                      {(() => { const C = SlideComponents[activeSlide]; return <C {...slideProps} ref={null} />; })()}
                    </div>
                  </div>
                ) : (
                  <div style={{ aspectRatio: '1/1', overflow: 'hidden' }}>
                    <div style={{ width: 1080, height: 1080, transform: 'scale(var(--card-preview-scale))', transformOrigin: 'top left' }}>
                      <style>{`:root { --card-preview-scale: 0.33; } @media (min-width: 448px) { :root { --card-preview-scale: 0.38; } }`}</style>
                      {hasArchetypeCard
                        ? <ArchetypeShareCard ref={null} data={data} />
                        : <ShareCard ref={null} data={data} insight={insight} roastLine={roastLine} roastStats={roastStats} />
                      }
                    </div>
                  </div>
                )}
              </div>

              <button onClick={handleDownload} disabled={downloading} className="btn-primary w-full">
                {downloading ? 'Rendering...' : format === 'stories' ? `Download ${SLIDE_LABELS[activeSlide]}` : 'Download Card'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Off-screen renders for toPng */}
      <div aria-hidden="true" style={{ position: 'fixed', top: 0, left: 0, width: 0, height: 0, overflow: 'hidden', zIndex: -1 }}>
        <div style={{ position: 'absolute', top: 0, left: 0 }}>
          {SlideComponents.map((Comp, i) => (
            <Comp key={i} ref={slideRefs[i]} {...slideProps} />
          ))}
          <ShareCard ref={cardRef} data={data} insight={insight} roastLine={roastLine} roastStats={roastStats} />
          {hasArchetypeCard && <ArchetypeShareCard ref={archetypeCardRef} data={data} />}
        </div>
      </div>
    </>
  );

  return createPortal(modal, document.body);
}
