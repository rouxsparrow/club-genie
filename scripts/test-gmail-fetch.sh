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
QUERY="${2:-subject:(Receipt Playtomic)}"

if [ -z "${AUTOMATION_SECRET}" ]; then
  read -r -s -p "Enter AUTOMATION_SECRET: " AUTOMATION_SECRET
  echo ""
fi

if [ -z "${AUTOMATION_SECRET}" ]; then
  echo "Missing AUTOMATION_SECRET."
  exit 1
fi

BASE_URL="${NEXT_PUBLIC_SUPABASE_URL%/}/functions/v1"

payload=$(MESSAGE_QUERY="${QUERY}" python3 - <<'PY'
import json
import os

print(json.dumps({"query": os.environ["MESSAGE_QUERY"]}))
PY
)

echo "== Fetch Gmail messages =="
curl -i -sS -X POST "${BASE_URL}/fetch-gmail-receipts" \
  -H "Authorization: Bearer ${NEXT_PUBLIC_SUPABASE_ANON_KEY}" \
  -H "apikey: ${NEXT_PUBLIC_SUPABASE_ANON_KEY}" \
  -H "x-automation-secret: ${AUTOMATION_SECRET}" \
  -H "content-type: application/json" \
  --data "${payload}" \
  | sed -n '1p;/{"ok":/p'
