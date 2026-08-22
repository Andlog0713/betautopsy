'use client';

import { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { SWRConfig, type Cache } from 'swr';
import { createPersistentCacheProvider } from '@/lib/swr-persistent-cache';

const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

/**
 * SWR config wrapper. Mounted inside the dashboard layout so cached
 * user/profile/bets/reports survive navigation between dashboard pages
 * and reloads. Cache hydrates from localStorage on first mount, then
 * SWR revalidates in the background per each hook's deduping interval.
 */
export default function SWRProvider({ children }: { children: React.ReactNode }) {
  // SSR and the first client render both use an empty cache. Reading
  // localStorage during the first client render would let cached SWR data
  // produce different HTML from the server and trigger React hydration
  // recovery. Remount once after hydration with the persistent provider.
  const [storageReady, setStorageReady] = useState(false);
  useIsomorphicLayoutEffect(() => setStorageReady(true), []);

  const provider = useMemo(() => {
    if (!storageReady) {
      return (() => new Map()) as unknown as (cache: Readonly<Cache>) => Cache;
    }
    const factory = createPersistentCacheProvider();
    return (() => factory()) as unknown as (cache: Readonly<Cache>) => Cache;
  }, [storageReady]);

  return (
    <SWRConfig
      key={storageReady ? 'persistent-cache' : 'hydration-cache'}
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
