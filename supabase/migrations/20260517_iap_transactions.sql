-- Idempotency + audit ledger for RevenueCat IAP purchases. One row per
-- processed RC transaction. Webhook inserts BEFORE kicking off the engine
-- re-run (waitUntil), so the row is a durable work-queue entry: if the
-- background upgrade fails, we can re-drive from this row.
--
-- transaction_id is the RC-supplied identifier (App Store original
-- transaction ID for consumables). UNIQUE enforces idempotency — a
-- duplicate webhook delivery short-circuits before any engine work.
--
-- report_id points to the SNAPSHOT row being upgraded (not the new full
-- row). ON DELETE SET NULL mirrors notifications_sent.report_id so an
-- admin purge of a stale snapshot doesn't break the ledger.

CREATE TABLE IF NOT EXISTS public.iap_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  transaction_id text NOT NULL UNIQUE,
  product_id text NOT NULL,
  report_id uuid REFERENCES public.autopsy_reports(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  processed_at timestamptz NOT NULL DEFAULT now(),
  raw_event jsonb NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_iap_transactions_user_id
  ON public.iap_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_iap_transactions_report_id
  ON public.iap_transactions(report_id);

ALTER TABLE public.iap_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own iap transactions" ON public.iap_transactions;
CREATE POLICY "Users read own iap transactions"
  ON public.iap_transactions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- No INSERT/UPDATE/DELETE policy for authenticated. Webhook writes via
-- service_role and bypasses RLS — clients have no business mutating the
-- payment ledger.
