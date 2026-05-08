'use client';

import useSWR, { type KeyedMutator } from 'swr';
import type { User } from '@supabase/supabase-js';
import { createBrowserSupabaseClient } from '@/lib/supabase-browser';
import type { Profile } from '@/types';

export const USER_KEY = 'user-and-profile';

export interface UserAndProfile {
  user: User | null;
  profile: Profile | null;
}

async function fetchUserAndProfile(): Promise<UserAndProfile> {
  const supabase = createBrowserSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { user: null, profile: null };

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  return { user, profile: (profile as Profile | null) ?? null };
}

export interface UseUserResult {
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  error: unknown;
  mutate: KeyedMutator<UserAndProfile>;
}

export function useUser(): UseUserResult {
  const { data, error, isLoading, mutate } = useSWR<UserAndProfile>(
    USER_KEY,
    fetchUserAndProfile,
    {
      dedupingInterval: 60_000,
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
    }
  );

  return {
    user: data?.user ?? null,
    profile: data?.profile ?? null,
    isLoading,
    error,
    mutate,
  };
}
