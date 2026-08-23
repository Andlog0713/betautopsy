import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const migration = readFileSync(
  resolve(root, 'supabase/migrations/20260822200000_protect_profile_entitlements.sql'),
  'utf8',
);
const checkoutRoute = readFileSync(resolve(root, 'app/api/checkout/route.ts'), 'utf8');
const analyzeRoute = readFileSync(resolve(root, 'app/api/analyze/route.ts'), 'utf8');

describe('profile entitlement ownership', () => {
  it('blocks client roles from changing payment, entitlement, and admin fields', () => {
    expect(migration).toContain("current_user NOT IN ('service_role', 'postgres', 'supabase_admin')");
    for (const field of [
      'email',
      'stripe_customer_id',
      'subscription_tier',
      'subscription_status',
      'trial_ends_at',
      'is_admin',
      'reports_used_this_period',
      'current_period_start',
      'created_at',
    ]) {
      expect(migration).toContain(`NEW.${field} IS DISTINCT FROM OLD.${field}`);
    }
    expect(migration).toContain('BEFORE UPDATE ON public.profiles');
  });

  it('keeps legitimate entitlement writes on service-role clients', () => {
    const checkoutPersist = checkoutRoute.match(
      /if \(created\) \{([\s\S]*?)\n    \}/,
    )?.[1] ?? '';
    expect(checkoutPersist).toContain('const serviceRole = createServiceRoleClient();');
    expect(checkoutPersist).toMatch(/await serviceRole[\s\S]*?stripe_customer_id/);
    expect(checkoutPersist).not.toContain('await supabase');

    const usagePersist = analyzeRoute.match(
      /beforePersist: tier === 'pro'([\s\S]*?)\n                : undefined/,
    )?.[1] ?? '';
    expect(usagePersist).toMatch(/await persistenceClient[\s\S]*?reports_used_this_period/);
    expect(usagePersist).not.toContain('await supabase');
  });
});
