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

rotate_response=$(curl -sS -i -X POST "${BASE_URL}/rotate-token" \
  -H "Authorization: Bearer ${NEXT_PUBLIC_SUPABASE_ANON_KEY}" \
  -H "apikey: ${NEXT_PUBLIC_SUPABASE_ANON_KEY}" \
  -H "x-club-token: ${CLUB_TOKEN}" \
  -H "content-type: application/json")

echo "== Rotate token =="
echo "${rotate_response}" | sed -n '1p;/{"ok":/p'

new_token=$(echo "${rotate_response}" | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')
if [ -z "${new_token}" ]; then
  echo "Failed to extract new token from response."
  exit 1
fi

echo "== Validate old token (expect 403) =="
curl -i -sS -X POST "${BASE_URL}/validate-token" \
  -H "Authorization: Bearer ${NEXT_PUBLIC_SUPABASE_ANON_KEY}" \
  -H "apikey: ${NEXT_PUBLIC_SUPABASE_ANON_KEY}" \
  -H "x-club-token: ${CLUB_TOKEN}" \
  -H "content-type: application/json" \
  | sed -n '1p;/{"ok":/p'

echo "== Validate new token (expect 200) =="
curl -i -sS -X POST "${BASE_URL}/validate-token" \
  -H "Authorization: Bearer ${NEXT_PUBLIC_SUPABASE_ANON_KEY}" \
  -H "apikey: ${NEXT_PUBLIC_SUPABASE_ANON_KEY}" \
  -H "x-club-token: ${new_token}" \
  -H "content-type: application/json" \
  | sed -n '1p;/{"ok":/p'
