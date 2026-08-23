import type { SupabaseClient } from '@supabase/supabase-js';
import { generateFullReportFromSnapshot } from './iap-upgrade';
import { logErrorServer } from './log-error-server';
import { createServiceRoleClient } from './supabase-server';

export type PaidReportProvider = 'stripe' | 'revenuecat';

export interface QueuePaidReportArgs {
  snapshotId: string;
  userId: string;
  provider: PaidReportProvider;
  providerEventId: string;
  paymentReference: string;
  checkoutSessionId?: string | null;
}

export interface QueuePaidReportResult {
  fulfillmentId: string;
  status: string;
  shouldStart: boolean;
  paymentConflict: boolean;
}

interface FulfillmentClaim {
  fulfillment_id: string;
  snapshot_report_id: string;
  user_id: string;
  provider: PaidReportProvider;
  provider_event_id: string;
  payment_reference: string;
  attempt_count: number;
}

export type ProcessPaidReportResult =
  | { status: 'idle' }
  | {
      status: 'completed';
      snapshotId: string;
      reportId: string;
      attemptCount: number;
    }
  | {
      status: 'retryable_failure';
      snapshotId: string;
      attemptCount: number;
      retryPersisted: boolean;
    };

function firstRow<T>(data: unknown): T | null {
  if (Array.isArray(data)) return (data[0] as T | undefined) ?? null;
  return data && typeof data === 'object' ? data as T : null;
}

function fulfillmentErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.replace(/[\r\n]+/g, ' ').slice(0, 1000);
}

export async function queuePaidReportFulfillment(
  args: QueuePaidReportArgs,
  supabase: SupabaseClient = createServiceRoleClient(),
): Promise<QueuePaidReportResult> {
  const { data, error } = await supabase.rpc('queue_report_fulfillment', {
    p_snapshot_report_id: args.snapshotId,
    p_user_id: args.userId,
    p_provider: args.provider,
    p_provider_event_id: args.providerEventId,
    p_payment_reference: args.paymentReference,
    p_checkout_session_id: args.checkoutSessionId ?? null,
  });

  if (error) throw new Error(`Failed to queue paid report: ${error.message}`);

  const row = firstRow<{
    fulfillment_id: string;
    fulfillment_status: string;
    should_start: boolean;
    payment_conflict: boolean;
  }>(data);

  if (!row) throw new Error('Paid report queue returned no fulfillment');

  return {
    fulfillmentId: row.fulfillment_id,
    status: row.fulfillment_status,
    shouldStart: row.should_start,
    paymentConflict: row.payment_conflict,
  };
}

export async function processPaidReportFulfillment(
  args: { snapshotId?: string } = {},
): Promise<ProcessPaidReportResult> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase.rpc('claim_report_fulfillment', {
    p_snapshot_report_id: args.snapshotId ?? null,
  });

  if (error) throw new Error(`Failed to claim paid report: ${error.message}`);

  const claim = firstRow<FulfillmentClaim>(data);
  if (!claim) return { status: 'idle' };

  try {
    const reportId = await generateFullReportFromSnapshot({
      snapshotId: claim.snapshot_report_id,
      userId: claim.user_id,
      transactionId: claim.payment_reference,
    });

    const { error: completeError } = await supabase.rpc(
      'complete_report_fulfillment',
      {
        p_fulfillment_id: claim.fulfillment_id,
        p_completed_report_id: reportId,
      },
    );

    if (completeError) {
      throw new Error(`Failed to complete paid report: ${completeError.message}`);
    }

    return {
      status: 'completed',
      snapshotId: claim.snapshot_report_id,
      reportId,
      attemptCount: claim.attempt_count,
    };
  } catch (error) {
    const { error: failError } = await supabase.rpc('fail_report_fulfillment', {
      p_fulfillment_id: claim.fulfillment_id,
      p_error: fulfillmentErrorMessage(error),
    });

    await logErrorServer(error, {
      path: 'lib/paid-report-fulfillment.process',
      userId: claim.user_id,
      metadata: {
        fulfillment_id: claim.fulfillment_id,
        snapshot_report_id: claim.snapshot_report_id,
        provider: claim.provider,
        provider_event_id: claim.provider_event_id,
        attempt_count: claim.attempt_count,
        retry_persisted: !failError,
        retry_error: failError?.message ?? null,
      },
    });

    return {
      status: 'retryable_failure',
      snapshotId: claim.snapshot_report_id,
      attemptCount: claim.attempt_count,
      retryPersisted: !failError,
    };
  }
}
