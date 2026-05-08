'use client';

import type { ReactNode } from 'react';

/**
 * Pass-through after the server-side seed was ripped out.
 *
 * The original PR 2 phase 2 design fetched user + profile in the dashboard
 * layout (server side) and seeded SWR's `fallback` here so the very first
 * render of any dashboard page already had data. That bought "no isLoading
 * flash" but cost a Vercel function execution + Supabase round-trip on
 * every Cmd+R — flipping the entire dashboard from ○ Static back to
 * ƒ Dynamic and adding several seconds of server-render latency before
 * any HTML reached the client.
 *
 * Now the SWR layer hydrates synchronously from localStorage
 * (lib/swr-persistent-cache.ts → readFromStorage). On second-visit reload,
 * useUser() / useBets() / useReports() return cached data on first render
 * with no network round-trip, AuthGuard sees the cached user immediately,
 * and the page paints. Background revalidation runs but never blocks UI.
 *
 * Component kept (rather than inlined into the layout) so future revisions
 * of the boot sequence have a clear seam: client-side seeding from
 * Capacitor Preferences, one-time auth-state-change subscriptions, etc.
 */
export default function AuthBootstrap({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
