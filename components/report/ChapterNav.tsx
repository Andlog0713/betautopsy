'use client';

import { useState, useEffect } from 'react';

const CHAPTERS = [
  { id: 'chapter-summary', label: 'SUMMARY', shortLabel: 'Summary' },
  { id: 'chapter-findings', label: 'FINDINGS', shortLabel: 'Findings' },
  { id: 'chapter-data', label: 'YOUR DATA', shortLabel: 'Data' },
  { id: 'chapter-cost', label: 'WHAT IT COSTS', shortLabel: 'Cost' },
  { id: 'chapter-protocol', label: 'PROTOCOL', shortLabel: 'Plan' },
];

interface ChapterNavProps {
  tier?: 'free' | 'pro' | 'sharp';
  onSharpClick?: () => void;
}

export default function ChapterNav({ tier = 'free', onSharpClick }: ChapterNavProps) {
  const [activeChapter, setActiveChapter] = useState('chapter-summary');
  const isSharp = tier === 'sharp';

  useEffect(() => {
    const sections = CHAPTERS.map(c => document.getElementById(c.id)).filter(Boolean) as HTMLElement[];
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter(e => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) {
          setActiveChapter(visible[0].target.id);
        }
      },
      { rootMargin: '-80px 0px -60% 0px', threshold: 0 }
    );

    sections.forEach(s => observer.observe(s));
    return () => observer.disconnect();
  }, []);

  function scrollTo(id: string) {
    const el = document.getElementById(id);
    if (el) {
      const top = el.getBoundingClientRect().top + window.scrollY - 60;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  }

  return (
    <div className="sticky top-0 z-30 bg-base/95 border-b border-white/[0.04] -mx-1 px-1 mb-6">
      <nav className="flex items-center gap-0 overflow-x-auto scrollbar-hide py-2">
        {CHAPTERS.map((ch, i) => {
          const isActive = activeChapter === ch.id;
          return (
            <button
              key={ch.id}
              onClick={() => scrollTo(ch.id)}
              className={`relative flex items-center gap-2 px-3 py-1.5 font-mono text-[10px] tracking-[2px] whitespace-nowrap transition-colors ${
                isActive ? 'text-scalpel' : 'text-fg-dim hover:text-fg-muted'
              }`}
            >
              <span className={`font-mono text-[9px] ${isActive ? 'text-scalpel/60' : 'text-fg-dim/40'}`}>
                {String(i + 1).padStart(2, '0')}
              </span>
              <span className="hidden sm:inline">{ch.label}</span>
              <span className="sm:hidden">{ch.shortLabel}</span>
              {isActive && (
                <span className="absolute bottom-0 left-3 right-3 h-[1.5px] bg-scalpel" />
              )}
            </button>
          );
        })}
        {/* Sharp tab in nav */}
        <button
          onClick={() => {
            if (isSharp && onSharpClick) {
              onSharpClick();
            } else if (!isSharp) {
              window.location.href = '/pricing';
            }
          }}
          className={`relative flex items-center gap-2 px-3 py-1.5 font-mono text-[10px] tracking-[2px] whitespace-nowrap transition-colors ${
            isSharp ? 'text-cyan-400/60 hover:text-cyan-400' : 'text-fg-dim/30 hover:text-fg-dim/50'
          }`}
        >
          <span className="font-mono text-[9px] text-fg-dim/40">06</span>
          {!isSharp && <span className="text-[8px]">🔒</span>}
          <span className="hidden sm:inline">{isSharp ? 'SHARP' : 'SHARP'}</span>
          <span className="sm:hidden">{isSharp ? 'Sharp' : '🔒 Sharp'}</span>
        </button>
      </nav>
    </div>
  );
}
