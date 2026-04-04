import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Trial system removed — this endpoint is kept as a no-op
// so any existing Vercel cron job doesn't 404.
export async function GET() {
  return NextResponse.json({ expired: 0, message: 'Trial system removed' });
}
