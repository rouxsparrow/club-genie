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
SESSION_ID="${2:-${SESSION_ID:-}}"

if [ -z "${CLUB_TOKEN}" ]; then
  read -r -s -p "Enter CLUB_TOKEN: " CLUB_TOKEN
  echo ""
fi

if [ -z "${SESSION_ID}" ]; then
  read -r -p "Enter SESSION_ID: " SESSION_ID
fi

if [ -z "${CLUB_TOKEN}" ] || [ -z "${SESSION_ID}" ]; then
  echo "Missing CLUB_TOKEN or SESSION_ID."
  exit 1
fi

payload=$(SESSION_ID="${SESSION_ID}" python3 - <<'PY'
import json
import os

print(json.dumps({"sessionId": os.environ["SESSION_ID"]}))
PY
)

BASE_URL="${NEXT_PUBLIC_SUPABASE_URL%/}/functions/v1"

echo "== Close session =="
curl -i -sS -X POST "${BASE_URL}/close-session" \
  -H "Authorization: Bearer ${NEXT_PUBLIC_SUPABASE_ANON_KEY}" \
  -H "apikey: ${NEXT_PUBLIC_SUPABASE_ANON_KEY}" \
  -H "x-club-token: ${CLUB_TOKEN}" \
  -H "content-type: application/json" \
  --data "${payload}" \
  | sed -n '1p;/{"ok":/p'
