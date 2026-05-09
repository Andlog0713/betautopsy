// iOS-PR-2 Phase 3.2: dashboard tab body migrated to
// `components/tabs/DashboardTab.tsx`. This file stays as a 1-line
// re-export so the existing `/dashboard` Next route keeps working
// on web — the AppShell mounts DashboardTab directly on native via
// the temporary `/shell-preview` route (Phase 5 will switch to
// app/page.tsx + build-target gate).
export { default } from '@/components/tabs/DashboardTab';
