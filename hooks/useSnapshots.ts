'use client';

import useSWR, { type KeyedMutator } from 'swr';
import { createBrowserSupabaseClient } from '@/lib/supabase-browser';
import { useUser } from '@/hooks/useUser';
import type { ProgressSnapshot } from '@/types';

export interface UseSnapshotsOptions {
  // Sort direction. Dashboard wants ascending (chart left→right);
  // /reports wants descending limit(2) for "previous snapshot" comparison.
  // Default is ascending so /dashboard is the zero-config consumer.
  ascending?: boolean;
  limit?: number;
}

export type SnapshotsKey = readonly [
  'snapshots',
  string,
  boolean,
  number | undefined
];

async function fetchSnapshots([
  ,
  userId,
  ascending,
  limit,
]: SnapshotsKey): Promise<ProgressSnapshot[]> {
  const supabase = createBrowserSupabaseClient();
  let query = supabase
    .from('progress_snapshots')
    .select('*')
    .eq('user_id', userId)
    .order('snapshot_date', { ascending });
  if (typeof limit === 'number') query = query.limit(limit);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as ProgressSnapshot[];
}

export interface UseSnapshotsResult {
  snapshots: ProgressSnapshot[];
  isLoading: boolean;
  error: unknown;
  mutate: KeyedMutator<ProgressSnapshot[]>;
}

export function useSnapshots(options: UseSnapshotsOptions = {}): UseSnapshotsResult {
  const ascending = options.ascending ?? true;
  const { user } = useUser();
  const key: SnapshotsKey | null = user
    ? (['snapshots', user.id, ascending, options.limit] as const)
    : null;
  const { data, error, isLoading, mutate } = useSWR<ProgressSnapshot[]>(
    key,
    fetchSnapshots,
    {
      dedupingInterval: 30_000,
      revalidateOnFocus: false,
    }
  );
  return {
    snapshots: data ?? [],
    isLoading: isLoading || !user,
    error,
    mutate,
  };
}
