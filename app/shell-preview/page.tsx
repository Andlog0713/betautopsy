import type { Metadata } from 'next';
import ShellPreviewClient from './ShellPreviewClient';

// Temporary preview route for iOS-PR-2 Phase 2-4 spot checks. Mounts
// AppShell directly so Andrew can verify the shell on physical iPhone
// before Phase 5 flips `app/page.tsx` to the real build-target gate.
//
// Deletion: removed in Phase 5 once `/` renders <AppShell /> on
// native and the preview route is redundant. Both this file and
// `ShellPreviewClient.tsx` go.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: 'Shell preview',
};

export default function ShellPreviewPage() {
  return <ShellPreviewClient />;
}
