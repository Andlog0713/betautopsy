'use client';

import type { ReactNode } from 'react';
import { SWRConfig } from 'swr';
import type { User } from '@supabase/supabase-js';
import { USER_KEY, type UserAndProfile } from '@/hooks/useUser';
import type { Profile } from '@/types';

interface Props {
  initialUser: User | null;
  initialProfile: Profile | null;
  children: ReactNode;
}

/**
 * Seeds the SWR cache with the server-fetched user + profile so the very
 * first render of any dashboard page already has data — no isLoading flash
 * on cold loads, no extra round-trip after the server already paid for it.
 *
 * Implemented via SWRConfig's `fallback` map (synchronous, available on
 * first render) rather than `mutate(USER_KEY, …, false)` on mount, which
 * would only land after the first effect tick — by which point useUser()
 * has already started its own fetch and returned isLoading=true.
 *
 * When initialUser is null (mobile builds skip the server fetch by design,
 * see app/(dashboard)/layout.tsx), this component is a no-op pass-through;
 * client-side AuthGuard handles auth from there.
 */
export default function AuthBootstrap({
  initialUser,
  initialProfile,
  children,
}: Props) {
  if (!initialUser) {
    return <>{children}</>;
  }
  const seeded: UserAndProfile = { user: initialUser, profile: initialProfile };
  return (
    <SWRConfig value={{ fallback: { [USER_KEY]: seeded } }}>
      {children}
    </SWRConfig>
  );
}
