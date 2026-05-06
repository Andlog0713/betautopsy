'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase';
import type { Profile } from '@/types';

/**
 * App-wide auth + snapshot state, fetched once per page load and shared
 * via context. Exists to dedupe the otherwise-redundant `getUser()` /
 * profile / latest-snapshot queries that NavBar, AuthGuard, and every
 * SmartCTALink would each fire independently on landing pages.
 *
 * Status enum:
 *   - `loading`       — initial fetch in flight
 *   - `anon`          — no Supabase user
 *   - `no-snapshot`   — authed user with no autopsy_reports snapshot
 *   - `has-snapshot`  — authed user with at least one snapshot
 *
 * Snapshot lookup matches the existing `app/(dashboard)/pricing/page.tsx`
 * shape: `report_type = 'snapshot'`, ordered by `created_at desc`. We
 * intentionally do NOT filter on `is_paid = false` here — the SmartCTALink
 * routing only cares whether the user has *any* snapshot to show.
 */
export type AuthState =
  | { status: 'loading' }
  | { status: 'anon' }
  | { status: 'no-snapshot'; user: User; profile: Profile | null }
  | { status: 'has-snapshot'; user: User; profile: Profile | null; snapshotId: string };

const AuthContext = createContext<AuthState>({ status: 'loading' });

export function useAuthState(): AuthState {
  return useContext(AuthContext);
}

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (cancelled) return;

      if (!user) {
        setState({ status: 'anon' });
        return;
      }

      const [{ data: profileData }, { data: snapshotData }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase
          .from('autopsy_reports')
          .select('id')
          .eq('user_id', user.id)
          .eq('report_type', 'snapshot')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);
      if (cancelled) return;

      const profile = (profileData as Profile | null) ?? null;
      if (snapshotData?.id) {
        setState({ status: 'has-snapshot', user, profile, snapshotId: snapshotData.id });
      } else {
        setState({ status: 'no-snapshot', user, profile });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}
