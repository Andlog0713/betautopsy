import type { ScreenComponent } from '@/lib/tab-store';

// Tracks which lazy screens have already been requested so repeat
// calls (rapid finger drags across multiple rows, prefetchScreens
// firing right after a row's onTouchStart already did) don't
// re-trigger the dynamic import. The browser's module cache would
// dedupe at the network layer, but skipping the `import()` call
// itself avoids the microtask churn.
const requested = new Set<ScreenComponent>();

// Warm a single pushable screen's chunk. Resolves once the dynamic
// import settles; callers can `void prefetchScreen(...)` if they
// don't care to await. Failures are swallowed — a prefetch that
// errors should not crash the row that triggered it; the real
// import in PageStack will surface the same failure with a proper
// error boundary.
export async function prefetchScreen(component: ScreenComponent): Promise<void> {
  if (requested.has(component)) return;
  requested.add(component);

  try {
    switch (component) {
      case 'UploadDetail':
        await import('@/app/(dashboard)/uploads/[id]/UploadDetailClient');
        return;
      case 'AdminReportDetail':
        await import('@/app/(dashboard)/admin/reports/[id]/AdminReportDetailClient');
        return;
    }
  } catch {
    // Drop the membership so a later real navigation (which surfaces
    // errors via PageStack's boundary) gets a fresh attempt rather
    // than a permanently-poisoned cache entry.
    requested.delete(component);
  }
}

// Warm every pushable screen at once. Phase 4's AppShell calls this
// 1.5s after mount so the JS for detail screens is in cache before
// the user taps. Cheap on iPhone — these chunks are <50KB each
// post-tree-shake.
export async function prefetchScreens(): Promise<void> {
  await Promise.all([
    prefetchScreen('UploadDetail'),
    prefetchScreen('AdminReportDetail'),
  ]);
}
