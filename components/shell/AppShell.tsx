'use client';

import { LazyMotion, domAnimation } from 'framer-motion';
import { useTabStore, TAB_IDS, type TabId } from '@/lib/tab-store';
import TabBar from '@/components/shell/TabBar';

// Phase 2 placeholder copy. Phase 3 swaps each placeholder for the
// real tab body imported from `@/components/tabs/<Tab>Tab.tsx`.
const PLACEHOLDER: Record<TabId, string> = {
  dashboard: 'DASHBOARD TAB // PHASE 3 MIGRATES THE REAL CONTENT HERE',
  reports: 'REPORTS TAB // PHASE 3 MIGRATES THE REAL CONTENT HERE',
  upload: 'UPLOAD TAB // PHASE 3 MIGRATES THE REAL CONTENT HERE',
  bets: 'BETS TAB // PHASE 3 MIGRATES THE REAL CONTENT HERE',
  settings: 'SETTINGS TAB // PHASE 3 MIGRATES THE REAL CONTENT HERE',
};

// Top-level shell. All 5 tabs render as siblings; only the active
// tab has `display: flex`, the rest are `display: none`. This is the
// "everything stays mounted" property — tab switches don't unmount
// scroll position, in-flight network state, or any Phase 3 lazy-init
// state (the `wasEverActive` map in the store). React keeps the
// subtree alive across `display: none`, so SWR caches survive too.
//
// `<LazyMotion features={domAnimation}>` is the bundle-trimmed motion
// feature loader: only `domAnimation` is loaded, dropping `gestures`,
// `drag`, etc. Children must use `m.*` instead of `motion.*` to opt
// in to the smaller runtime — TabBar already does.
export default function AppShell() {
  const active = useTabStore((s) => s.active);

  return (
    <LazyMotion features={domAnimation}>
      <div className="h-screen flex flex-col bg-base">
        <main className="flex-1 relative overflow-hidden">
          {TAB_IDS.map((id) => (
            <section
              key={id}
              role="tabpanel"
              aria-hidden={active !== id}
              className={`absolute inset-0 flex-col ${
                active === id ? 'flex' : 'hidden'
              }`}
              style={{ paddingTop: 'var(--safe-area-top)' }}
            >
              <div className="flex-1 overflow-y-auto flex items-center justify-center p-8">
                <p className="font-mono text-xs text-fg-dim text-center tracking-wider leading-relaxed">
                  {PLACEHOLDER[id]}
                </p>
              </div>
            </section>
          ))}
        </main>
        <TabBar />
      </div>
    </LazyMotion>
  );
}
