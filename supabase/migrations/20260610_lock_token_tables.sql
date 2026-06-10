-- Lock down token tables (security audit 2026-06-09, finding H1 + M2).
--
-- share_tokens.data embeds the full paid report_json and the SELECT policy
-- was `using (true)`: anyone holding the public anon key could dump every
-- shared report via PostgREST. email_unsubscribe_tokens had the same blanket
-- SELECT, exposing token-id -> user_id for every user (mass-unsubscribe +
-- enumeration).
--
-- Public lookups now go exclusively through service-role server code:
--   app/share/[id]/page.tsx, app/og/[id]/route.tsx, app/api/unsubscribe.
-- Deploy that code BEFORE applying this migration, or live share pages
-- break for the gap.
--
-- Idempotent: DROP POLICY IF EXISTS / pg_policies guard on CREATE.

drop policy if exists "Anyone can view share tokens" on share_tokens;
drop policy if exists "Anyone can view unsubscribe tokens" on email_unsubscribe_tokens;

-- /api/share still reads share_tokens with the user-scoped client to dedupe
-- existing tokens for a report (app/api/share/route.ts:92-96). Owners (and
-- only owners) keep SELECT on their own rows.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'share_tokens'
      and policyname = 'Users can view own share tokens'
  ) then
    create policy "Users can view own share tokens" on share_tokens
      for select to authenticated using (auth.uid() = user_id);
  end if;
end $$;
