'use client';

import Link from 'next/link';
import type { MouseEvent, ReactNode } from 'react';
import { isMobileApp } from '@/lib/platform';
import { useShellNav } from '@/hooks/useShellNav';
import type { TabId } from '@/lib/tab-store';

interface TabLinkProps {
  to: TabId;
  params?: Record<string, string>;
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  prefetch?: boolean | null;
  'aria-label'?: string;
  title?: string;
}

// Cross-tab navigation primitive used inside the AppShell. Always
// renders a single `<a>` (via Next's `<Link>`), so SSR + native
// produce the same DOM tree — no React #418 hydration mismatch
// risk. Web users get standard hover/touch prefetch + native
// browser semantics (Cmd/Ctrl/Shift+click open in new tab,
// background tab, etc.). On native, click is intercepted:
// preventDefault + useShellNav.navigate, so the AppShell never
// unmounts.
//
// Modifier-key fall-through: per Andrew's Phase 3.2 spec, only
// `e.preventDefault()` when `isMobileApp() && !metaKey && !ctrlKey
// && !shiftKey`. Preserves "open in background" gestures on
// Capacitor + iPad keyboards (rare but supported).
//
// `to: TabId` is the union-typed destination — out-of-shell
// destinations like `/pricing`, `/login`, `/api/export` are
// rejected at the type level. Those keep their existing
// `<a href="...">` / `<Link href="...">` patterns at the call
// site (cross-shell-nav UX regression filed under iOS-PR-2 Risks
// for PR-6 conversion to a sheet/PageStack push).
export default function TabLink({
  to,
  params,
  children,
  className,
  onClick,
  prefetch,
  ...rest
}: TabLinkProps) {
  const { navigate } = useShellNav();

  // Build href so Next's Link prefetches the right route on web.
  // Path is `/${tab}` (TabId === path segment for all 5 tabs);
  // params serialize to a `?key=value&...` query string.
  const path = `/${to}`;
  const search =
    params && Object.keys(params).length > 0
      ? `?${new URLSearchParams(params).toString()}`
      : '';
  const href = `${path}${search}`;

  return (
    <Link
      href={href}
      className={className}
      prefetch={prefetch}
      aria-label={rest['aria-label']}
      title={rest.title}
      onClick={(e: MouseEvent<HTMLAnchorElement>) => {
        if (
          isMobileApp() &&
          !e.metaKey &&
          !e.ctrlKey &&
          !e.shiftKey
        ) {
          e.preventDefault();
          navigate(to, params);
        }
        onClick?.();
      }}
    >
      {children}
    </Link>
  );
}
