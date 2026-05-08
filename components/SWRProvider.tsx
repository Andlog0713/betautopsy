'use client';

import { useMemo } from 'react';
import { SWRConfig, type Cache } from 'swr';
import { createPersistentCacheProvider } from '@/lib/swr-persistent-cache';

/**
 * SWR config wrapper. Mounted inside the dashboard layout so cached
 * user/profile/bets/reports survive navigation between dashboard pages
 * and reloads. Cache hydrates from localStorage on first mount, then
 * SWR revalidates in the background per each hook's deduping interval.
 */
export default function SWRProvider({ children }: { children: React.ReactNode }) {
  // Memoize the provider factory so React strict-mode double-invokes of
  // the layout don't construct two competing caches.
  const provider = useMemo(() => {
    const factory = createPersistentCacheProvider();
    return (() => factory()) as unknown as (cache: Readonly<Cache>) => Cache;
  }, []);

  return (
    <SWRConfig
      value={{
        provider,
        revalidateOnFocus: false,
        errorRetryCount: 2,
        errorRetryInterval: 3000,
      }}
    >
      {children}
    </SWRConfig>
  );
}
