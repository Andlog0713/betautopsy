import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';

/**
 * Verify a Vercel cron request carries the right `Authorization: Bearer
 * <CRON_SECRET>` header.
 *
 * Returns null on success. Returns a 401 NextResponse on failure AND alerts
 * Sentry — without this, a missing/rotated CRON_SECRET silently 401s every
 * cron run, the jobs stop executing, and nobody finds out for days.
 */
export function requireCronSecret(request: Request, route: string): NextResponse | null {
  const expected = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');

  if (!expected) {
    Sentry.captureMessage(`Cron route ${route} called but CRON_SECRET env var is unset`, {
      level: 'error',
      tags: { route, cron_misconfigured: 'missing_secret' },
    });
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  if (authHeader !== `Bearer ${expected}`) {
    Sentry.captureMessage(`Cron route ${route} rejected unauthorized request`, {
      level: 'warning',
      tags: { route, cron_unauthorized: 'true' },
    });
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return null;
}
