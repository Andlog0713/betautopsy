-- Finishes the security sweep started in close_rpc_idor.sql. Andrew: "don't
-- leave two known-open SECURITY DEFINER functions anon-executable because
-- they were out of scope on a list I wrote before I knew they existed."
-- Found via get_advisors while verifying the prior migration.
--
-- handle_new_user(): trigger function (RETURNS trigger, references NEW.*),
-- bound to auth.users via the on_auth_user_created trigger. Verified live -
-- PostgREST excludes trigger-returning functions from its RPC surface
-- entirely (anon-key probe: 404 PGRST202, "Could not find the function...
-- in the schema cache"), so this specific advisor WARN is a false positive
-- for the /rpc/ vector specifically. Revoking anyway: there is no
-- legitimate reason ANY role needs direct EXECUTE on a trigger-only
-- function, and REVOKE does not affect the trigger's own ability to fire
-- (trigger invocation is not gated by the EXECUTE ACL the way RPC calls
-- are - it runs as part of the table's trigger definition).
--
-- increment_login_count(): already scopes itself correctly via
-- `where id = auth.uid()` internally - not a cross-user IDOR (an anon
-- call is a harmless no-op, verified live: 204, auth.uid() null matches
-- zero rows). Real risk closed here is an authenticated-but-adversarial
-- caller invoking it directly (outside the app's own login-flow call
-- sites) to self-inflate their own login_count. `authenticated` keeps its
-- grant - both real call sites (app/(auth)/login/page.tsx via a browser
-- client, app/auth/callback/route.ts via a cookie-session SSR client) run
-- as `authenticated`, never service_role, so revoking that would break
-- login. Only anon and the PUBLIC default grant are revoked.

revoke execute on function public.handle_new_user() from anon, authenticated, public;

revoke execute on function public.increment_login_count() from anon, public;
grant execute on function public.increment_login_count() to authenticated;
