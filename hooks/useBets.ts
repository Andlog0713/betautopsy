'use client';

import useSWR, { type KeyedMutator } from 'swr';
import { createBrowserSupabaseClient } from '@/lib/supabase-browser';
import { useUser } from '@/hooks/useUser';
import type { Bet } from '@/types';

export interface UseBetsOptions {
  limit?: number;
  since?: string; // ISO timestamp
}

export type BetsKey = readonly ['bets', string, number | undefined, string | undefined];

async function fetchBets([, userId, limit, since]: BetsKey): Promise<Bet[]> {
  const supabase = createBrowserSupabaseClient();
  let query = supabase
    .from('bets')
    .select('*')
    .eq('user_id', userId)
    .order('placed_at', { ascending: false });
  if (since) query = query.gt('placed_at', since);
  if (typeof limit === 'number') query = query.limit(limit);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Bet[];
}

export interface UseBetsResult {
  bets: Bet[];
  isLoading: boolean;
  error: unknown;
  mutate: KeyedMutator<Bet[]>;
}

export function useBets(options: UseBetsOptions = {}): UseBetsResult {
  const { user } = useUser();
  const key: BetsKey | null = user
    ? (['bets', user.id, options.limit, options.since] as const)
    : null;
  const { data, error, isLoading, mutate } = useSWR<Bet[]>(key, fetchBets, {
    dedupingInterval: 30_000,
    revalidateOnFocus: false,
  });
  return {
    bets: data ?? [],
    isLoading: isLoading || !user,
    error,
    mutate,
  };
}
