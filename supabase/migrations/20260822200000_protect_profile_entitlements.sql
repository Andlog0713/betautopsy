-- Keep payment, entitlement, and administrator identity server-owned.
--
-- The existing profile UPDATE policy intentionally lets a user maintain
-- fields such as display_name, bankroll, and email_digest_enabled. Without a
-- column guard, however, that same policy also permits a direct PostgREST
-- update of subscription_tier or is_admin. Server requests use the
-- service_role database role and remain able to process verified provider
-- events. Dashboard SQL roles remain available for Andrew-owned operations.

CREATE OR REPLACE FUNCTION public.protect_profile_service_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF current_user NOT IN ('service_role', 'postgres', 'supabase_admin')
    AND (
      NEW.email IS DISTINCT FROM OLD.email
      OR NEW.stripe_customer_id IS DISTINCT FROM OLD.stripe_customer_id
      OR NEW.subscription_tier IS DISTINCT FROM OLD.subscription_tier
      OR NEW.subscription_status IS DISTINCT FROM OLD.subscription_status
      OR NEW.trial_ends_at IS DISTINCT FROM OLD.trial_ends_at
      OR NEW.is_admin IS DISTINCT FROM OLD.is_admin
      OR NEW.reports_used_this_period IS DISTINCT FROM OLD.reports_used_this_period
      OR NEW.current_period_start IS DISTINCT FROM OLD.current_period_start
      OR NEW.created_at IS DISTINCT FROM OLD.created_at
    ) THEN
    RAISE EXCEPTION 'Service-owned profile fields cannot be changed by this role'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.protect_profile_service_fields()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS profiles_protect_service_fields
  ON public.profiles;
CREATE TRIGGER profiles_protect_service_fields
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_service_fields();
