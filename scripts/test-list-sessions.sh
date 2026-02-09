#!/usr/bin/env bash
set -euo pipefail

if [ -f .env.local ]; then
  set -a
  source .env.local
  set +a
fi

: "${NEXT_PUBLIC_SUPABASE_URL:?Missing NEXT_PUBLIC_SUPABASE_URL}"
: "${NEXT_PUBLIC_SUPABASE_ANON_KEY:?Missing NEXT_PUBLIC_SUPABASE_ANON_KEY}"

CLUB_TOKEN="${1:-${CLUB_TOKEN:-}}"
if [ -z "${CLUB_TOKEN}" ]; then
  read -r -s -p "Enter CLUB_TOKEN: " CLUB_TOKEN
  echo ""
fi

if [ -z "${CLUB_TOKEN}" ]; then
  echo "Missing CLUB_TOKEN (arg, env, or prompt)."
  exit 1
fi

BASE_URL="${NEXT_PUBLIC_SUPABASE_URL%/}/functions/v1"

echo "== List sessions =="
curl -i -sS -X POST "${BASE_URL}/list-sessions" \
  -H "Authorization: Bearer ${NEXT_PUBLIC_SUPABASE_ANON_KEY}" \
  -H "apikey: ${NEXT_PUBLIC_SUPABASE_ANON_KEY}" \
  -H "x-club-token: ${CLUB_TOKEN}" \
  -H "content-type: application/json" \
  | sed -n '1p;/{"ok":/p'
