import { NextResponse } from 'next/server';
import { getAuthenticatedClient } from '@/lib/supabase-from-request';
import { createServiceRoleClient } from '@/lib/supabase-server';
import { logErrorServer } from '@/lib/log-error-server';

/**
 * Hard-delete the caller's account.
 *
 * Required by Apple App Store Guideline 5.1.1(v): apps that allow
 * sign-up must allow in-app account deletion. The previous handler in
 * `app/(dashboard)/settings/page.tsx` removed the `profiles` row from
 * the browser via the anon key, but the underlying `auth.users` row
 * persisted because anon-key clients can't call admin APIs.
 *
 * Cascade behavior is already wired in `supabase/schema.sql`:
 *   - `profiles.id` references `auth.users` ON DELETE CASCADE, so
 *     deleting the auth user cascades to profiles.
 *   - Most user data (`bets`, `autopsy_reports`, `progress_snapshots`,
 *     `bet_journal_entries`, `discipline_scores`, `uploads`) is FK'd
 *     to `profiles(id)` ON DELETE CASCADE — gone with the user.
 *   - `feedback`, `share_tokens`, `error_logs`,
 *     `stripe_idempotency_keys` use ON DELETE SET NULL — those rows
 *     stay, anonymized.
 *
 * No app-level cleanup is needed; calling
 * `auth.admin.deleteUser(user.id)` cascades through every table.
 */
export async function POST(request: Request) {
  try {
    const { user, error: authError } = await getAuthenticatedClient(request);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const service = createServiceRoleClient();
    const { error } = await service.auth.admin.deleteUser(user.id);
    if (error) {
      logErrorServer(error, { path: '/api/account/delete', userId: user.id });
      return NextResponse.json(
        { error: 'Could not delete account. Please contact support.' },
        { status: 500 }
      );
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Account delete error:', error);
    logErrorServer(error, { path: '/api/account/delete' });
    return NextResponse.json(
      { error: 'Could not delete account. Please contact support.' },
      { status: 500 }
    );
  }
}
