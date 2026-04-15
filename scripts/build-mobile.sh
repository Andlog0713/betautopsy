#!/bin/sh
# ─────────────────────────────────────────────────────────────────
# Mobile (Capacitor) build wrapper.
#
# Next.js 14 with `output: 'export'` refuses to build `app/api/**`
# route handlers:
#
#   - Static handlers would ship server code (Supabase service role,
#     Stripe secret, Anthropic key, etc.) into the native app.
#   - Dynamic handlers (e.g. `/api/admin/reports/[id]`) additionally
#     fail the build because they lack `generateStaticParams()`.
#
# The native app talks to the hosted web origin
# (https://www.betautopsy.com) over HTTPS for every API call, so
# `app/api/**` has no reason to exist in the mobile bundle. This
# script temporarily moves the directory aside for the duration of
# `next build`, then restores it.
#
# A trap on EXIT / INT / TERM guarantees `app/api` is restored
# even if the build fails, Ctrl+C's, or is killed. If the previous
# run was interrupted in an unusual way and left
# `app/_api_excluded_from_mobile` on disk, we refuse to run rather
# than risk clobbering it.
# ─────────────────────────────────────────────────────────────────

set -e

API_DIR="app/api"
EXCLUDED_DIR="app/_api_excluded_from_mobile"

if [ -d "$EXCLUDED_DIR" ]; then
  echo "error: $EXCLUDED_DIR already exists." >&2
  echo "       A previous mobile build was interrupted. Inspect it," >&2
  echo "       then \`mv $EXCLUDED_DIR $API_DIR\` to restore." >&2
  exit 1
fi

if [ ! -d "$API_DIR" ]; then
  echo "error: $API_DIR does not exist — refusing to run." >&2
  exit 1
fi

cleanup() {
  if [ -d "$EXCLUDED_DIR" ]; then
    mv "$EXCLUDED_DIR" "$API_DIR" || true
  fi
}
trap cleanup EXIT INT TERM

mv "$API_DIR" "$EXCLUDED_DIR"

NEXT_PUBLIC_BUILD_TARGET=mobile next build
