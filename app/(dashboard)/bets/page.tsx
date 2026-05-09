// iOS-PR-2 Phase 3.3: bets tab body migrated to
// `components/tabs/BetsTab.tsx`. This file stays as a 1-line
// re-export so the existing `/bets` Next route keeps working
// on web — the AppShell mounts BetsTab directly on native via
// the temporary `/shell-preview` route (Phase 5 will switch to
// app/page.tsx + build-target gate).
export { default } from '@/components/tabs/BetsTab';
