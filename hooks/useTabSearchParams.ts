'use client';

import { useSearchParams } from 'next/navigation';
import { useContext, useMemo } from 'react';
import { isMobileApp } from '@/lib/platform';
import { ShellTabContext, useTabStore, type TabId } from '@/lib/tab-store';

// Drop-in replacement for `useSearchParams` from `next/navigation`,
// callable from tab body code. Returns a `URLSearchParams` (writable;
// next/navigation returns a `ReadonlyURLSearchParams`, but tab body
// reads only `.get()` / `.has()` / `.entries()` so the variance
// doesn't hurt — and getting a writable instance lets consumers
// build new params off it if needed).
//
// Branching pattern (mirrors `useShellNav` and the same React-hook-
// rules guarantees): both `useSearchParams()` and `useTabStore()`
// are called every render regardless of platform. Only the returned
// `URLSearchParams` value is selected from the right source after
// the hooks run, keeping the hook count and order stable across
// renders.
//
// Tab id (`tabId` prop) defaults to whatever `ShellTabContext`
// provides. AppShell's tab-rendering loop wraps each section in
// `<ShellTabContext.Provider value={tabId}>` (Phase 3.2 onward), so
// tab body code can call `useTabSearchParams()` with no arguments.
// On web no Provider is mounted (the context default is null), and
// the hook falls back to `useSearchParams` regardless of context —
// so a tab body migrated to call `useTabSearchParams()` works on
// both web and native.
//
// Caller can also supply an explicit tab id via the `tabId` arg
// when reading another tab's pending params (rare).

export function useTabSearchParams(tabId?: TabId): URLSearchParams {
  const native = isMobileApp();
  const webParams = useSearchParams();
  const ctxTab = useContext(ShellTabContext);
  const targetTab = tabId ?? ctxTab;

  // Always subscribe to the store slice — selector returns the same
  // reference if pendingParams[tab] hasn't changed, so React only
  // re-renders when the relevant params dict actually mutates. If
  // `targetTab` is null (no context, no arg) the selector returns
  // an empty dict.
  const nativeParamsDict = useTabStore((s) =>
    targetTab ? s.pendingParams[targetTab] : EMPTY_DICT,
  );

  return useMemo(() => {
    if (!native) {
      // ReadonlyURLSearchParams has the same iteration shape as
      // URLSearchParams; cloning preserves write semantics for
      // consumers that derive new params.
      return new URLSearchParams(webParams?.toString() ?? '');
    }
    const out = new URLSearchParams();
    for (const [k, v] of Object.entries(nativeParamsDict)) {
      out.set(k, v);
    }
    return out;
  }, [native, webParams, nativeParamsDict]);
}

// Module-scope shared empty object so the store selector returns
// the same reference across renders when targetTab is null —
// otherwise zustand's referential-equality short-circuit would
// trigger an unnecessary re-render every time.
const EMPTY_DICT: Record<string, string> = Object.freeze({});
