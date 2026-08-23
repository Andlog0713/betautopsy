-- Durable paid-report fulfillment.
--
-- Payment receipt and report generation are separate steps. A verified
-- provider event queues one service-owned job. Workers claim jobs with a
-- lease, and a database uniqueness constraint guarantees one child report
-- per snapshot even if two workers race.

ALTER TABLE public.autopsy_reports
  ADD COLUMN IF NOT EXISTS analyzed_upload_ids uuid[],
  ADD COLUMN IF NOT EXISTS analyzed_bet_ids uuid[],
  ADD COLUMN IF NOT EXISTS analyzed_bets_snapshot jsonb,
  ADD COLUMN IF NOT EXISTS analyzed_sportsbook text;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.autopsy_reports
    WHERE upgraded_from_snapshot_id IS NOT NULL
    GROUP BY upgraded_from_snapshot_id
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION
      'Cannot enforce one full report per snapshot: duplicate upgraded_from_snapshot_id rows exist';
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_autopsy_reports_one_upgrade_per_snapshot
  ON public.autopsy_reports (upgraded_from_snapshot_id)
  WHERE upgraded_from_snapshot_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.report_fulfillments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_report_id uuid NOT NULL UNIQUE
    REFERENCES public.autopsy_reports(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider text CHECK (provider IN ('stripe', 'revenuecat')),
  provider_event_id text,
  payment_reference text,
  checkout_session_id text,
  status text NOT NULL DEFAULT 'unpaid'
    CHECK (status IN (
      'unpaid',
      'paid_queued',
      'generating',
      'completed',
      'retryable_failure'
    )),
  attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  lease_expires_at timestamptz,
  next_attempt_at timestamptz,
  last_error text,
  completed_report_id uuid UNIQUE
    REFERENCES public.autopsy_reports(id) ON DELETE SET NULL,
  paid_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_report_fulfillments_provider_event
  ON public.report_fulfillments (provider, provider_event_id)
  WHERE provider IS NOT NULL AND provider_event_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_report_fulfillments_payment_reference
  ON public.report_fulfillments (provider, payment_reference)
  WHERE provider IS NOT NULL AND payment_reference IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_report_fulfillments_due
  ON public.report_fulfillments (status, next_attempt_at, created_at)
  WHERE status IN ('paid_queued', 'retryable_failure', 'generating');

ALTER TABLE public.report_fulfillments ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON TABLE public.report_fulfillments TO authenticated;

-- Report rows are created only by authenticated API handlers using the
-- service role. Allowing direct client inserts lets a caller forge is_paid
-- and report_type fields, which must never be treated as payment evidence.
DROP POLICY IF EXISTS "Users can insert own reports" ON public.autopsy_reports;
REVOKE INSERT ON TABLE public.autopsy_reports FROM anon, authenticated;

DROP POLICY IF EXISTS "Users read own report fulfillments"
  ON public.report_fulfillments;
CREATE POLICY "Users read own report fulfillments"
  ON public.report_fulfillments
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Every snapshot gets an explicit unpaid state without requiring application
-- code to perform a second insert. This trigger is SECURITY DEFINER because
-- authenticated users have no direct write policy on the service-owned queue.
CREATE OR REPLACE FUNCTION public.ensure_snapshot_fulfillment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.report_type = 'snapshot' THEN
    INSERT INTO public.report_fulfillments (
      snapshot_report_id,
      user_id,
      status
    ) VALUES (
      NEW.id,
      NEW.user_id,
      'unpaid'
    )
    ON CONFLICT (snapshot_report_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_snapshot_fulfillment() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ensure_snapshot_fulfillment() FROM anon;
REVOKE ALL ON FUNCTION public.ensure_snapshot_fulfillment() FROM authenticated;

DROP TRIGGER IF EXISTS autopsy_reports_ensure_fulfillment
  ON public.autopsy_reports;
CREATE TRIGGER autopsy_reports_ensure_fulfillment
  AFTER INSERT ON public.autopsy_reports
  FOR EACH ROW
  WHEN (NEW.report_type = 'snapshot')
  EXECUTE FUNCTION public.ensure_snapshot_fulfillment();

-- Backfill explicit states for existing snapshots. A legacy paid snapshot
-- without a child is intentionally not scheduled automatically. It remains a
-- retryable failure with no next_attempt_at until the recovery command is run
-- with an explicit execute flag.
UPDATE public.autopsy_reports AS snapshot
SET is_paid = true
WHERE snapshot.report_type = 'snapshot'
  AND NOT snapshot.is_paid
  AND EXISTS (
    SELECT 1
    FROM public.iap_transactions AS purchase
    WHERE purchase.report_id = snapshot.id
  );

INSERT INTO public.report_fulfillments (
  snapshot_report_id,
  user_id,
  provider,
  provider_event_id,
  payment_reference,
  status,
  completed_report_id,
  paid_at,
  completed_at,
  next_attempt_at,
  last_error
)
SELECT
  snapshot.id,
  snapshot.user_id,
  CASE
    WHEN snapshot.stripe_payment_intent_id IS NOT NULL THEN 'stripe'
    WHEN iap.transaction_id IS NOT NULL THEN 'revenuecat'
    ELSE NULL
  END,
  CASE
    WHEN snapshot.stripe_payment_intent_id IS NULL THEN iap.transaction_id
    ELSE NULL
  END,
  COALESCE(snapshot.stripe_payment_intent_id, iap.transaction_id),
  CASE
    WHEN child.id IS NOT NULL THEN 'completed'
    WHEN snapshot.is_paid THEN 'retryable_failure'
    ELSE 'unpaid'
  END,
  child.id,
  CASE
    WHEN snapshot.is_paid OR child.id IS NOT NULL
      THEN COALESCE(iap.processed_at, snapshot.created_at)
    ELSE NULL
  END,
  CASE WHEN child.id IS NOT NULL THEN child.created_at ELSE NULL END,
  NULL,
  CASE
    WHEN snapshot.is_paid AND child.id IS NULL
      THEN 'Legacy paid snapshot requires explicit recovery review'
    ELSE NULL
  END
FROM public.autopsy_reports AS snapshot
LEFT JOIN public.autopsy_reports AS child
  ON child.upgraded_from_snapshot_id = snapshot.id
LEFT JOIN LATERAL (
  SELECT purchase.transaction_id, purchase.processed_at
  FROM public.iap_transactions AS purchase
  WHERE purchase.report_id = snapshot.id
  ORDER BY purchase.processed_at, purchase.transaction_id
  LIMIT 1
) AS iap ON true
WHERE snapshot.report_type = 'snapshot'
ON CONFLICT (snapshot_report_id) DO NOTHING;

-- Atomically accept a verified provider event and queue its snapshot. Stripe
-- event receipt is recorded in stripe_events in the same transaction. A
-- duplicate event repairs or returns the existing fulfillment instead of
-- assuming that an earlier worker completed.
CREATE OR REPLACE FUNCTION public.queue_report_fulfillment(
  p_snapshot_report_id uuid,
  p_user_id uuid,
  p_provider text,
  p_provider_event_id text,
  p_payment_reference text,
  p_checkout_session_id text DEFAULT NULL
)
RETURNS TABLE (
  fulfillment_id uuid,
  fulfillment_status text,
  should_start boolean,
  payment_conflict boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_snapshot public.autopsy_reports%ROWTYPE;
  v_fulfillment public.report_fulfillments%ROWTYPE;
  v_child_id uuid;
BEGIN
  IF p_provider IS NULL OR p_provider NOT IN ('stripe', 'revenuecat') THEN
    RAISE EXCEPTION 'Unsupported fulfillment provider';
  END IF;

  IF p_provider_event_id IS NULL OR btrim(p_provider_event_id) = '' THEN
    RAISE EXCEPTION 'Provider event id is required';
  END IF;

  IF p_payment_reference IS NULL OR btrim(p_payment_reference) = '' THEN
    RAISE EXCEPTION 'Payment reference is required';
  END IF;

  SELECT *
  INTO v_snapshot
  FROM public.autopsy_reports
  WHERE id = p_snapshot_report_id
    AND user_id = p_user_id
    AND report_type = 'snapshot'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Paid snapshot not found or ownership mismatch';
  END IF;

  IF p_provider = 'stripe' THEN
    INSERT INTO public.stripe_events (id)
    VALUES (p_provider_event_id)
    ON CONFLICT (id) DO NOTHING;
  END IF;

  SELECT id
  INTO v_child_id
  FROM public.autopsy_reports
  WHERE upgraded_from_snapshot_id = p_snapshot_report_id
  LIMIT 1;

  SELECT *
  INTO v_fulfillment
  FROM public.report_fulfillments
  WHERE snapshot_report_id = p_snapshot_report_id
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.report_fulfillments (
      snapshot_report_id,
      user_id,
      status
    ) VALUES (
      p_snapshot_report_id,
      p_user_id,
      'unpaid'
    )
    RETURNING * INTO v_fulfillment;
  END IF;

  IF v_fulfillment.user_id <> p_user_id THEN
    RAISE EXCEPTION 'Fulfillment ownership mismatch';
  END IF;

  IF v_fulfillment.provider IS NOT NULL
    AND (
      v_fulfillment.provider <> p_provider
      OR v_fulfillment.payment_reference IS DISTINCT FROM p_payment_reference
    ) THEN
    RETURN QUERY SELECT
      v_fulfillment.id,
      v_fulfillment.status,
      false,
      true;
    RETURN;
  END IF;

  IF v_child_id IS NOT NULL THEN
    UPDATE public.report_fulfillments
    SET
      provider = COALESCE(provider, p_provider),
      provider_event_id = COALESCE(provider_event_id, p_provider_event_id),
      payment_reference = COALESCE(payment_reference, p_payment_reference),
      checkout_session_id = COALESCE(checkout_session_id, p_checkout_session_id),
      status = 'completed',
      completed_report_id = v_child_id,
      paid_at = COALESCE(paid_at, now()),
      completed_at = COALESCE(completed_at, now()),
      lease_expires_at = NULL,
      next_attempt_at = NULL,
      last_error = NULL,
      updated_at = now()
    WHERE id = v_fulfillment.id
    RETURNING * INTO v_fulfillment;

    UPDATE public.autopsy_reports
    SET
      is_paid = true,
      stripe_payment_intent_id = CASE
        WHEN p_provider = 'stripe' THEN p_payment_reference
        ELSE stripe_payment_intent_id
      END
    WHERE id = p_snapshot_report_id;

    RETURN QUERY SELECT
      v_fulfillment.id,
      v_fulfillment.status,
      false,
      false;
    RETURN;
  END IF;

  IF COALESCE(jsonb_array_length(
    CASE
      WHEN jsonb_typeof(v_snapshot.analyzed_bets_snapshot) = 'array'
        THEN v_snapshot.analyzed_bets_snapshot
      ELSE '[]'::jsonb
    END
  ), 0) = 0
    AND COALESCE(cardinality(v_snapshot.analyzed_bet_ids), 0) = 0
    AND COALESCE(cardinality(v_snapshot.analyzed_upload_ids), 0) = 0 THEN
    UPDATE public.report_fulfillments
    SET
      provider = p_provider,
      provider_event_id = p_provider_event_id,
      payment_reference = p_payment_reference,
      checkout_session_id = COALESCE(p_checkout_session_id, checkout_session_id),
      status = 'retryable_failure',
      paid_at = COALESCE(paid_at, now()),
      lease_expires_at = NULL,
      next_attempt_at = NULL,
      last_error = 'scope_unrecoverable: no immutable bet cohort or upload lock',
      updated_at = now()
    WHERE id = v_fulfillment.id
    RETURNING * INTO v_fulfillment;

    UPDATE public.autopsy_reports
    SET
      is_paid = true,
      stripe_payment_intent_id = CASE
        WHEN p_provider = 'stripe' THEN p_payment_reference
        ELSE stripe_payment_intent_id
      END
    WHERE id = p_snapshot_report_id;

    RETURN QUERY SELECT
      v_fulfillment.id,
      v_fulfillment.status,
      false,
      false;
    RETURN;
  END IF;

  UPDATE public.report_fulfillments
  SET
    provider = p_provider,
    provider_event_id = p_provider_event_id,
    payment_reference = p_payment_reference,
    checkout_session_id = COALESCE(p_checkout_session_id, checkout_session_id),
    status = CASE
      WHEN status = 'generating' AND lease_expires_at > now()
        THEN 'generating'
      ELSE 'paid_queued'
    END,
    paid_at = COALESCE(paid_at, now()),
    lease_expires_at = CASE
      WHEN status = 'generating' AND lease_expires_at > now()
        THEN lease_expires_at
      ELSE NULL
    END,
    next_attempt_at = CASE
      WHEN status = 'generating' AND lease_expires_at > now()
        THEN next_attempt_at
      ELSE now()
    END,
    last_error = CASE
      WHEN status = 'generating' AND lease_expires_at > now()
        THEN last_error
      ELSE NULL
    END,
    updated_at = now()
  WHERE id = v_fulfillment.id
  RETURNING * INTO v_fulfillment;

  UPDATE public.autopsy_reports
  SET
    is_paid = true,
    stripe_payment_intent_id = CASE
      WHEN p_provider = 'stripe' THEN p_payment_reference
      ELSE stripe_payment_intent_id
    END
  WHERE id = p_snapshot_report_id;

  RETURN QUERY SELECT
    v_fulfillment.id,
    v_fulfillment.status,
    v_fulfillment.status = 'paid_queued',
    false;
END;
$$;

-- Claim one due job, or one exact job when p_snapshot_report_id is supplied.
-- FOR UPDATE SKIP LOCKED and the status update form an atomic worker lease.
CREATE OR REPLACE FUNCTION public.claim_report_fulfillment(
  p_snapshot_report_id uuid DEFAULT NULL
)
RETURNS TABLE (
  fulfillment_id uuid,
  snapshot_report_id uuid,
  user_id uuid,
  provider text,
  provider_event_id text,
  payment_reference text,
  attempt_count integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  WITH candidate AS (
    SELECT f.id
    FROM public.report_fulfillments AS f
    WHERE (p_snapshot_report_id IS NULL OR f.snapshot_report_id = p_snapshot_report_id)
      AND f.paid_at IS NOT NULL
      AND (
        (
          f.status = 'paid_queued'
          AND (f.next_attempt_at IS NULL OR f.next_attempt_at <= now())
        )
        OR (
          f.status = 'retryable_failure'
          AND f.next_attempt_at IS NOT NULL
          AND f.next_attempt_at <= now()
        )
        OR (
          f.status = 'generating'
          AND (f.lease_expires_at IS NULL OR f.lease_expires_at <= now())
        )
      )
    ORDER BY COALESCE(f.next_attempt_at, f.created_at), f.created_at
    FOR UPDATE SKIP LOCKED
    LIMIT 1
  )
  UPDATE public.report_fulfillments AS f
  SET
    status = 'generating',
    attempt_count = f.attempt_count + 1,
    lease_expires_at = now() + interval '7 minutes',
    next_attempt_at = NULL,
    updated_at = now()
  FROM candidate
  WHERE f.id = candidate.id
  RETURNING
    f.id,
    f.snapshot_report_id,
    f.user_id,
    f.provider,
    f.provider_event_id,
    f.payment_reference,
    f.attempt_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_report_fulfillment(
  p_fulfillment_id uuid,
  p_completed_report_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_snapshot_id uuid;
  v_user_id uuid;
BEGIN
  SELECT snapshot_report_id, user_id
  INTO v_snapshot_id, v_user_id
  FROM public.report_fulfillments
  WHERE id = p_fulfillment_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Fulfillment not found';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.autopsy_reports
    WHERE id = p_completed_report_id
      AND user_id = v_user_id
      AND report_type = 'full'
      AND upgraded_from_snapshot_id = v_snapshot_id
  ) THEN
    RAISE EXCEPTION 'Completed report does not match fulfillment';
  END IF;

  UPDATE public.report_fulfillments
  SET
    status = 'completed',
    completed_report_id = p_completed_report_id,
    completed_at = COALESCE(completed_at, now()),
    lease_expires_at = NULL,
    next_attempt_at = NULL,
    last_error = NULL,
    updated_at = now()
  WHERE id = p_fulfillment_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.fail_report_fulfillment(
  p_fulfillment_id uuid,
  p_error text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.report_fulfillments
  SET
    status = 'retryable_failure',
    lease_expires_at = NULL,
    next_attempt_at = now() + CASE
      WHEN attempt_count <= 1 THEN interval '1 minute'
      WHEN attempt_count = 2 THEN interval '5 minutes'
      WHEN attempt_count = 3 THEN interval '15 minutes'
      ELSE interval '1 hour'
    END,
    last_error = left(COALESCE(p_error, 'Unknown fulfillment error'), 1000),
    updated_at = now()
  WHERE id = p_fulfillment_id
    AND status = 'generating';
END;
$$;

CREATE OR REPLACE FUNCTION public.requeue_report_fulfillment(
  p_snapshot_report_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_updated integer;
BEGIN
  UPDATE public.report_fulfillments
  SET
    status = 'paid_queued',
    lease_expires_at = NULL,
    next_attempt_at = now(),
    last_error = NULL,
    updated_at = now()
  WHERE snapshot_report_id = p_snapshot_report_id
    AND paid_at IS NOT NULL
    AND status IN ('retryable_failure', 'paid_queued')
    AND EXISTS (
      SELECT 1
      FROM public.autopsy_reports AS snapshot
      WHERE snapshot.id = p_snapshot_report_id
        AND (
          COALESCE(jsonb_array_length(
            CASE
              WHEN jsonb_typeof(snapshot.analyzed_bets_snapshot) = 'array'
                THEN snapshot.analyzed_bets_snapshot
              ELSE '[]'::jsonb
            END
          ), 0) > 0
          OR
          COALESCE(cardinality(snapshot.analyzed_bet_ids), 0) > 0
          OR COALESCE(cardinality(snapshot.analyzed_upload_ids), 0) > 0
        )
    );

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated = 1;
END;
$$;

REVOKE ALL ON FUNCTION public.queue_report_fulfillment(uuid, uuid, text, text, text, text)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_report_fulfillment(uuid)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.complete_report_fulfillment(uuid, uuid)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fail_report_fulfillment(uuid, text)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.requeue_report_fulfillment(uuid)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.queue_report_fulfillment(uuid, uuid, text, text, text, text)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_report_fulfillment(uuid)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_report_fulfillment(uuid, uuid)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.fail_report_fulfillment(uuid, text)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.requeue_report_fulfillment(uuid)
  TO service_role;
