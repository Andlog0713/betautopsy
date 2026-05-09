'use client';

import { LazyMotion, domAnimation } from 'framer-motion';
import { ShellTabContext, useTabStore, TAB_IDS, type TabId } from '@/lib/tab-store';
import { useScrollMemory } from '@/hooks/useScrollMemory';
import TabBar from '@/components/shell/TabBar';
import DashboardTab from '@/components/tabs/DashboardTab';
import SWRProvider from '@/components/SWRProvider';
import AuthBootstrap from '@/components/AuthBootstrap';
import { PrivacyProvider } from '@/components/PrivacyContext';

// Phase 3.2 placeholder copy for the 4 tabs not yet migrated.
// Phase 3.3-3.6 swap each placeholder for the real tab body
// imported from `@/components/tabs/<Tab>Tab.tsx`.
const PLACEHOLDER: Record<Exclude<TabId, 'dashboard'>, string> = {
  reports: 'REPORTS TAB // PHASE 3.4 MIGRATES THE REAL CONTENT HERE',
  upload: 'UPLOAD TAB // PHASE 3.5 MIGRATES THE REAL CONTENT HERE',
  bets: 'BETS TAB // PHASE 3.3 MIGRATES THE REAL CONTENT HERE',
  settings: 'SETTINGS TAB // PHASE 3.6 MIGRATES THE REAL CONTENT HERE',
};

// Per-tab scroll container + ShellTabContext provider. Lifted out
// so each tab gets its own `useScrollMemory(tabId)` ref + max-w
// chrome wrapper without the parent map having to know each tab's
// rendering. Phase 3.2 introduces this; subsequent tab migrations
// just swap the children.
function PerTabContainer({
  tabId,
  children,
}: {
  tabId: TabId;
  children: React.ReactNode;
}) {
  const scrollRef = useScrollMemory<HTMLDivElement>(tabId);
  return (
    <ShellTabContext.Provider value={tabId}>
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-6 md:py-10">
          {children}
        </div>
      </div>
    </ShellTabContext.Provider>
  );
}

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
//
// Provider wrap (Phase 3.2): SWRProvider → AuthBootstrap →
// PrivacyProvider. Same order as `app/(dashboard)/layout.tsx` (web)
// minus AuthGuard, which is logged as a Phase 5 prereq —
// production AppShell mount in app/page.tsx will need the wrap so
// unauthenticated users hit /login before seeing the tab bar. For
// /shell-preview verification, Andrew tests as a logged-in user.
export default function AppShell() {
  const active = useTabStore((s) => s.active);

  return (
    <SWRProvider>
      <AuthBootstrap>
        <PrivacyProvider>
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
                    <PerTabContainer tabId={id}>
                      {id === 'dashboard' ? (
                        <DashboardTab />
                      ) : (
                        <p className="font-mono text-xs text-fg-dim text-center tracking-wider leading-relaxed py-32">
                          {PLACEHOLDER[id]}
                        </p>
                      )}
                    </PerTabContainer>
                  </section>
                ))}
              </main>
              <TabBar />
            </div>
          </LazyMotion>
        </PrivacyProvider>
      </AuthBootstrap>
    </SWRProvider>
  );
}
