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
  tier?: 'free' | 'pro';
  onSharpClick?: () => void;
  readOnly?: boolean;
}

export default function ChapterNav({ tier = 'free', onSharpClick, readOnly = false }: ChapterNavProps) {
  const [activeChapter, setActiveChapter] = useState('chapter-summary');
  const isPro = tier === 'pro';

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
    <div className="sticky top-0 z-30 bg-base/80 backdrop-blur-xl border-b border-border-subtle -mx-1 px-1 mb-4">
      <nav className="flex items-center gap-0 overflow-x-auto scrollbar-hide py-2">
        {CHAPTERS.map((ch, i) => {
          const isActive = activeChapter === ch.id;
          return (
            <button
              key={ch.id}
              onClick={() => scrollTo(ch.id)}
              className={`relative flex items-center gap-2 px-3 py-1.5 text-xs sm:text-sm font-medium whitespace-nowrap transition-colors ${
                isActive ? 'text-fg-bright' : 'text-fg-dim hover:text-fg-muted'
              }`}
            >
              <span className={`font-mono text-[9px] ${isActive ? 'text-scalpel/60' : 'text-fg-dim/50'}`}>
                {String(i + 1).padStart(2, '0')}
              </span>
              <span className="hidden sm:inline">{ch.label}</span>
              <span className="sm:hidden">{ch.shortLabel}</span>
              {isActive && (
                <span className="absolute bottom-0 left-3 right-3 h-[2px] bg-scalpel rounded-full" />
              )}
            </button>
          );
        })}
        {isPro && (
          <button
            onClick={() => {
              if (onSharpClick) {
                onSharpClick();
              }
            }}
            className="relative flex items-center gap-2 px-3 py-1.5 text-xs sm:text-sm font-medium whitespace-nowrap transition-colors text-cyan-400/60 hover:text-cyan-400"
          >
            <span className="font-mono text-[9px] text-fg-dim/40">06</span>
            <span className="hidden sm:inline">TOOLS</span>
            <span className="sm:hidden">Tools</span>
          </button>
        )}
      </nav>
    </div>
  );
}
