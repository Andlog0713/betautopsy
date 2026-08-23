import { NextResponse } from 'next/server';
import { requireCronSecret } from '@/lib/cron-auth';
import {
  processPaidReportFulfillment,
  type ProcessPaidReportResult,
} from '@/lib/paid-report-fulfillment';
import { logErrorServer } from '@/lib/log-error-server';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const MAX_JOBS_PER_SWEEP = 1;

export async function GET(request: Request) {
  const unauthorized = requireCronSecret(
    request,
    '/api/report-fulfillment/recover',
  );
  if (unauthorized) return unauthorized;

  const results: ProcessPaidReportResult[] = [];

  try {
    while (
      results.length < MAX_JOBS_PER_SWEEP
    ) {
      const result = await processPaidReportFulfillment();
      if (result.status === 'idle') break;
      results.push(result);
    }

    return NextResponse.json(
      {
        swept: results.length,
        results,
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    await logErrorServer(error, {
      path: '/api/report-fulfillment/recover',
      metadata: { swept_before_error: results.length },
    });
    return NextResponse.json(
      { error: 'Paid report recovery failed', swept: results.length },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
