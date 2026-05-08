'use client';

import useSWR, { type KeyedMutator } from 'swr';
import { createBrowserSupabaseClient } from '@/lib/supabase-browser';
import { useUser } from '@/hooks/useUser';
import type { Upload } from '@/types';

export type UploadsKey = readonly ['uploads', string];

async function fetchUploads([, userId]: UploadsKey): Promise<Upload[]> {
  const supabase = createBrowserSupabaseClient();
  const { data, error } = await supabase
    .from('uploads')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Upload[];
}

export interface UseUploadsResult {
  uploads: Upload[];
  isLoading: boolean;
  error: unknown;
  mutate: KeyedMutator<Upload[]>;
}

export function useUploads(): UseUploadsResult {
  const { user } = useUser();
  const key: UploadsKey | null = user ? (['uploads', user.id] as const) : null;
  const { data, error, isLoading, mutate } = useSWR<Upload[]>(key, fetchUploads, {
    dedupingInterval: 30_000,
    revalidateOnFocus: false,
  });
  return {
    uploads: data ?? [],
    isLoading: isLoading || !user,
    error,
    mutate,
  };
}
