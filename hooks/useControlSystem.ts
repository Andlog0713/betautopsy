'use client';

import useSWR, { type KeyedMutator } from 'swr';
import { apiGet } from '@/lib/api-client';
import type { ControlSystemState } from '@/types';

export const CONTROL_SYSTEM_KEY = '/api/control-system';

async function fetchControlSystem(url: string): Promise<ControlSystemState> {
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
  const { data, error, isLoading, mutate } = useSWR<ControlSystemState>(
    CONTROL_SYSTEM_KEY,
    fetchControlSystem,
    {
      dedupingInterval: 15_000,
      revalidateOnFocus: false,
    },
  );

  return {
    controlState: data ?? null,
    isLoading,
    error,
    mutate,
  };
}
