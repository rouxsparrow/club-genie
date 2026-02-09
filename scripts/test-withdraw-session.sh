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
PLAYER_IDS="${3:-${PLAYER_IDS:-}}"

if [ -z "${CLUB_TOKEN}" ]; then
  read -r -s -p "Enter CLUB_TOKEN: " CLUB_TOKEN
  echo ""
fi

if [ -z "${SESSION_ID}" ]; then
  read -r -p "Enter SESSION_ID: " SESSION_ID
fi

if [ -z "${PLAYER_IDS}" ]; then
  read -r -p "Enter comma-separated PLAYER_IDS: " PLAYER_IDS
fi

if [ -z "${CLUB_TOKEN}" ] || [ -z "${SESSION_ID}" ] || [ -z "${PLAYER_IDS}" ]; then
  echo "Missing CLUB_TOKEN, SESSION_ID, or PLAYER_IDS."
  exit 1
fi

payload=$(SESSION_ID="${SESSION_ID}" PLAYER_IDS="${PLAYER_IDS}" python3 - <<'PY'
import json
import os

player_ids = [p.strip() for p in os.environ["PLAYER_IDS"].split(",") if p.strip()]
print(json.dumps({"sessionId": os.environ["SESSION_ID"], "playerIds": player_ids}))
PY
)

BASE_URL="${NEXT_PUBLIC_SUPABASE_URL%/}/functions/v1"

echo "== Withdraw session =="
curl -i -sS -X POST "${BASE_URL}/withdraw-session" \
  -H "Authorization: Bearer ${NEXT_PUBLIC_SUPABASE_ANON_KEY}" \
  -H "apikey: ${NEXT_PUBLIC_SUPABASE_ANON_KEY}" \
  -H "x-club-token: ${CLUB_TOKEN}" \
  -H "content-type: application/json" \
  --data "${payload}" \
  | sed -n '1p;/{"ok":/p'
