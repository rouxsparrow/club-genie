#!/usr/bin/env bash
set -euo pipefail

if [ -f .env.local ]; then
  set -a
  source .env.local
  set +a
fi

: "${NEXT_PUBLIC_SUPABASE_URL:?Missing NEXT_PUBLIC_SUPABASE_URL}"
: "${NEXT_PUBLIC_SUPABASE_ANON_KEY:?Missing NEXT_PUBLIC_SUPABASE_ANON_KEY}"

AUTOMATION_SECRET="${1:-${AUTOMATION_SECRET:-}}"
SESSION_ID="${2:-${SESSION_ID:-}}"

if [ -z "${AUTOMATION_SECRET}" ]; then
  read -r -s -p "Enter AUTOMATION_SECRET: " AUTOMATION_SECRET
  echo ""
fi

if [ -z "${SESSION_ID}" ]; then
  read -r -p "Enter SESSION_ID: " SESSION_ID
fi

if [ -z "${AUTOMATION_SECRET}" ] || [ -z "${SESSION_ID}" ]; then
  echo "Missing AUTOMATION_SECRET or SESSION_ID."
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
  -H "x-automation-secret: ${AUTOMATION_SECRET}" \
  -H "content-type: application/json" \
  --data "${payload}" \
  | sed -n '1p;/{"ok":/p'
