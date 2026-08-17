-- Share token consent fix (2026-08-16 recon: P0-3).
--
-- share_tokens rows were minted automatically on every report view
-- (components/AutopsyReport.tsx, a useEffect with no user action gate) and
-- again on every ShareModal mount, not on an explicit share action. Confirmed
-- against the live table: all 14 remaining rows (plus the 2 already deleted
-- during recon) show created_at within ~1-2 seconds of report generation,
-- across many different users and dates (March through August 2026) - this
-- is systemic, not a one-off. The web app code that produced these rows was
-- fixed in the same deploy as this migration (report-view and modal-mount
-- auto-fire both removed; minting now happens only on an explicit Copy
-- Link / Post on X click).
--
-- That code fix does not retroactively un-share the 14 rows already in the
-- table - none of them were created by a user choosing to share. Revoking
-- them here, in the same migration, rather than adding revoked/expires_at
-- and leaving the existing rows live: a table of non-consensual public URLs
-- with an unused revoked column doesn't fix anything. If any of these 14
-- were in fact deliberately shared by a real user, they can re-share through
-- the new explicit flow - app/api/share/route.ts un-revokes on next mint
-- for the same report_id rather than leaving them permanently dead.
--
-- expires_at is added for future use (no TTL policy decided yet) - schema
-- readiness only, not enforced by this migration.
--
-- Idempotent: IF NOT EXISTS guards on both columns.

alter table public.share_tokens
  add column if not exists expires_at timestamptz,
  add column if not exists revoked boolean not null default false;

-- One-time data fix: revoke every row that predates the consent fix. New
-- inserts default to revoked = false via the column default above.
update public.share_tokens set revoked = true where revoked = false;
