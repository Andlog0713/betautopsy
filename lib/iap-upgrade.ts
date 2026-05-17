import { logErrorServer } from './log-error-server';

export interface ProcessUpgradeArgs {
  snapshotId: string;
  userId: string;
  transactionId: string;
}

// Re-run the autopsy engine on the snapshot's bet cohort and insert a
// child full-report row. Commit 3 implements the body; this Commit 2
// stub keeps the waitUntil call site stable.
//
// Idempotency contract: the iap_transactions row for transactionId is
// already inserted by the route handler BEFORE waitUntil fires. If the
// background work fails, that row is the durable handle for re-driving
// the upgrade manually (or via a future recovery job).
export async function processUpgrade(args: ProcessUpgradeArgs): Promise<void> {
  try {
    console.log('[iap-upgrade] stub processUpgrade invoked', args);
  } catch (err) {
    await logErrorServer(err, {
      path: 'lib/iap-upgrade.processUpgrade',
      userId: args.userId,
      metadata: { snapshotId: args.snapshotId, transactionId: args.transactionId },
    });
  }
}
