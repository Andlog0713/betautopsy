// localStorage-backed cache provider for SWR.
//
// Goal: dashboard navigations and reloads paint with cached data instantly,
// then SWR revalidates in the background. Without persistence, every cold
// load fires a fresh round-trip to Supabase before the user sees anything.
//
// Storage shape: a single JSON-serialized array of `[key, value]` tuples
// stored at `STORAGE_KEY`. Writes are debounced 500ms because SWR can flush
// many cache writes in a tight loop on first load. Read happens once at
// provider construction; we hydrate the in-memory Map from disk and let
// SWR mutate it normally afterwards.
//
// Capped at ~1 MB. When a write would exceed the cap, we drop the oldest
// half of the entries (Map preserves insertion order so this is O(N) without
// a real LRU).
//
// Phase 1 ships with localStorage everywhere. Capacitor builds work too —
// localStorage is available at `capacitor://localhost` (it's what the
// `@supabase/supabase-js` Capacitor branch uses for session persistence).
// A future PR may swap to Capacitor Preferences for native-feel persistence.

const STORAGE_KEY = 'ba-swr-cache';
const MAX_BYTES = 1_000_000; // 1 MB
const FLUSH_DEBOUNCE_MS = 500;

export type CacheEntry = [string, unknown];
export type CacheMap = Map<string, unknown>;

function readFromStorage(): CacheMap {
  if (typeof window === 'undefined') return new Map();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Map();
    const parsed = JSON.parse(raw) as CacheEntry[];
    if (!Array.isArray(parsed)) return new Map();
    return new Map(parsed);
  } catch {
    // Quota / parse / private-mode failure — start fresh.
    return new Map();
  }
}

function writeToStorage(map: CacheMap): void {
  if (typeof window === 'undefined') return;
  try {
    let entries = Array.from(map.entries());
    let serialized = JSON.stringify(entries);
    // If oversize, drop the oldest half and try again. One retry is enough —
    // halving twice would already be ~250 KB which is plenty for cached
    // user/profile/bets/reports.
    if (serialized.length > MAX_BYTES) {
      entries = entries.slice(Math.floor(entries.length / 2));
      serialized = JSON.stringify(entries);
    }
    window.localStorage.setItem(STORAGE_KEY, serialized);
  } catch {
    // Quota exceeded or storage disabled — silently drop. SWR's in-memory
    // cache continues to work; we just lose persistence for this session.
  }
}

let flushTimer: ReturnType<typeof setTimeout> | null = null;
function scheduleFlush(map: CacheMap): void {
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = setTimeout(() => {
    flushTimer = null;
    writeToStorage(map);
  }, FLUSH_DEBOUNCE_MS);
}

/**
 * SWR cache provider factory. Pass to `<SWRConfig provider={...}>`. SWR
 * calls this once with its default `Map<string, unknown>` and uses the
 * returned object as the live cache. We hydrate from localStorage on
 * construction and intercept `set`/`delete`/`clear` to debounce writes
 * back to disk.
 */
export function createPersistentCacheProvider(): () => CacheMap {
  return () => {
    if (typeof window === 'undefined') return new Map();

    const hydrated = readFromStorage();
    const map: CacheMap = hydrated;

    // Persist on tab close so any pending debounced write isn't lost.
    window.addEventListener('beforeunload', () => {
      if (flushTimer) {
        clearTimeout(flushTimer);
        flushTimer = null;
      }
      writeToStorage(map);
    });

    const originalSet = map.set.bind(map);
    map.set = (key: string, value: unknown) => {
      originalSet(key, value);
      scheduleFlush(map);
      return map;
    };
    const originalDelete = map.delete.bind(map);
    map.delete = (key: string) => {
      const result = originalDelete(key);
      scheduleFlush(map);
      return result;
    };
    const originalClear = map.clear.bind(map);
    map.clear = () => {
      originalClear();
      scheduleFlush(map);
    };

    return map;
  };
}
