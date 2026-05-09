// iOS-PR-2 Phase 3.4a: reports tab body migrated to
// `components/tabs/ReportsTab.tsx`. This file stays as a 1-line
// re-export so the existing `/reports` Next route keeps working
// on web — the AppShell mounts ReportsTab directly on native via
// the temporary `/shell-preview` route (Phase 5 will switch to
// app/page.tsx + build-target gate). Phase 3.4b will refactor the
// 6 useSearchParams reads inside ReportsTab to useTabSearchParams.
export { default } from '@/components/tabs/ReportsTab';
