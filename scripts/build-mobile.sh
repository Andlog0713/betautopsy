#!/bin/sh
# ─────────────────────────────────────────────────────────────────
# Mobile (Capacitor) build wrapper.
#
# Next.js 14 with `output: 'export'` refuses to build route
# handlers and runtime-only pages. For mobile, we temporarily
# move every server-only path aside, run `next build`, then
# restore them all.
#
# What gets excluded and why:
#
#   app/api/
#     All REST endpoints (analyze, checkout, webhook, admin, etc.).
#     Static export would either ship server secrets into the
#     native bundle or fail the build on dynamic segments missing
#     `generateStaticParams()`. The native app calls these over
#     HTTPS against the hosted web origin.
#
#   app/og/
#     `next/og` `ImageResponse` edge-runtime handlers. These have
#     no static-export equivalent. Social-unfurl OG images are
#     handled by the hosted web origin.
#
#   app/blog/feed.xml/
#     RSS feed route handler. Lives on the hosted web origin.
#
#   app/auth/
#     Supabase OAuth callback — reads `cookies()` and writes
#     session cookies on the response, both of which require a
#     request runtime. Native auth flows use Capacitor-level deep
#     links instead.
#
# Each excluded path is moved to `app/_<basename>_excluded_from_mobile`
# (shallow, reversible). A trap on EXIT / INT / TERM guarantees
# every path is restored even if the build fails, Ctrl+C's, or is
# killed. If a previous run was interrupted in an unusual way and
# left any `_*_excluded_from_mobile` directory behind, the script
# refuses to run rather than risk clobbering it.
# ─────────────────────────────────────────────────────────────────

set -e

# Space-separated list of paths (relative to repo root) to move
# aside during the mobile build.
PATHS_TO_EXCLUDE="app/api app/og app/blog/feed.xml app/auth"

exclude_name_for() {
  # Map `app/api`            → `app/_api_excluded_from_mobile`
  # Map `app/og`             → `app/_og_excluded_from_mobile`
  # Map `app/blog/feed.xml`  → `app/blog/_feed.xml_excluded_from_mobile`
  # Map `app/auth`           → `app/_auth_excluded_from_mobile`
  dir=$(dirname "$1")
  base=$(basename "$1")
  printf '%s/_%s_excluded_from_mobile' "$dir" "$base"
}

# Preflight: bail if any excluded-name already exists on disk, and
# bail if any source path we expect is missing.
for path in $PATHS_TO_EXCLUDE; do
  excluded=$(exclude_name_for "$path")
  if [ -e "$excluded" ]; then
    echo "error: $excluded already exists." >&2
    echo "       A previous mobile build was interrupted. Inspect it," >&2
    echo "       then \`mv $excluded $path\` to restore." >&2
    exit 1
  fi
  if [ ! -d "$path" ]; then
    echo "error: $path does not exist — refusing to run." >&2
    exit 1
  fi
done

# Restore every path, regardless of how the script exits. Each
# move is guarded so failure on one restore doesn't skip the rest.
cleanup() {
  for path in $PATHS_TO_EXCLUDE; do
    excluded=$(exclude_name_for "$path")
    if [ -d "$excluded" ]; then
      mv "$excluded" "$path" || true
    fi
  done
}
trap cleanup EXIT INT TERM

# Move everything aside, then build.
for path in $PATHS_TO_EXCLUDE; do
  excluded=$(exclude_name_for "$path")
  mv "$path" "$excluded"
done

NEXT_PUBLIC_BUILD_TARGET=mobile next build
