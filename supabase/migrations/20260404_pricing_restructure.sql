-- ============================================
-- Pricing Restructure Migration
-- Removes Sharp tier, adds report purchase support
-- ============================================

-- 1. Migrate sharp users to pro (before changing constraint)
UPDATE profiles SET subscription_tier = 'pro' WHERE subscription_tier = 'sharp';

-- 2. Update profiles check constraint to remove 'sharp'
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_subscription_tier_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_subscription_tier_check
  CHECK (subscription_tier IN ('free', 'pro'));

-- 3. Add report tracking columns to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS reports_used_this_period integer DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS current_period_start timestamptz;

-- 4. New users default to 'free' (not 'pro' with trial)
ALTER TABLE profiles ALTER COLUMN subscription_tier SET DEFAULT 'free';
ALTER TABLE profiles ALTER COLUMN subscription_status SET DEFAULT 'active';
ALTER TABLE profiles ALTER COLUMN trial_ends_at DROP DEFAULT;

-- 5. Update autopsy_reports to support snapshot type
ALTER TABLE autopsy_reports DROP CONSTRAINT IF EXISTS autopsy_reports_report_type_check;
ALTER TABLE autopsy_reports ADD CONSTRAINT autopsy_reports_report_type_check
  CHECK (report_type IN ('snapshot', 'full', 'weekly', 'quick'));

-- 6. Add payment tracking columns to autopsy_reports
ALTER TABLE autopsy_reports ADD COLUMN IF NOT EXISTS is_paid boolean DEFAULT false;
ALTER TABLE autopsy_reports ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text;
ALTER TABLE autopsy_reports ADD COLUMN IF NOT EXISTS upgraded_from_snapshot_id uuid REFERENCES autopsy_reports(id);

-- 7. Mark all existing full reports as paid (generated under old model)
UPDATE autopsy_reports SET is_paid = true WHERE report_type = 'full';

-- 8. Convert existing trial users to free tier
UPDATE profiles
SET subscription_tier = 'free', subscription_status = 'active'
WHERE subscription_status = 'trial';
