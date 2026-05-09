'use client';

import dynamic from 'next/dynamic';

// Loads the AppShell with `ssr: false` so the static export doesn't
// try to pre-render its zustand state. Static HTML for /shell-preview
// will be empty; Capacitor's WKWebView paints the splash background
// (#0D1117) for the ~1 frame between hydration and the first AppShell
// render, which matches the rest of the iOS launch handoff.
const AppShell = dynamic(() => import('@/components/shell/AppShell'), {
  ssr: false,
});

export default function ShellPreviewClient() {
  return <AppShell />;
}
