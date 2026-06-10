'use client';

import useSWR, { type KeyedMutator } from 'swr';
import { apiGet } from '@/lib/api-client';
import { useUser } from '@/hooks/useUser';
import type { ControlSystemState } from '@/types';

export const CONTROL_SYSTEM_KEY = '/api/control-system';

type ControlSystemKey = readonly [typeof CONTROL_SYSTEM_KEY, string];

async function fetchControlSystem([url]: ControlSystemKey): Promise<ControlSystemState> {
  const res = await apiGet(url);
  const json = await res.json();
  if (!res.ok) {
    throw new Error((json as { error?: string }).error ?? 'Failed to load control system');
  }
  return json as ControlSystemState;
}

export interface UseControlSystemResult {
  controlState: ControlSystemState | null;
  isLoading: boolean;
  error: unknown;
  mutate: KeyedMutator<ControlSystemState>;
}

export function useControlSystem(): UseControlSystemResult {
  const { user, isLoading: userLoading } = useUser();
  const key: ControlSystemKey | null = user ? [CONTROL_SYSTEM_KEY, user.id] : null;
  const { data, error, isLoading, mutate } = useSWR<ControlSystemState>(
    key,
    fetchControlSystem,
    {
      dedupingInterval: 15_000,
      revalidateOnFocus: false,
    },
  );

  return {
    controlState: data ?? null,
    isLoading: userLoading || isLoading,
    error,
    mutate,
  };
}
