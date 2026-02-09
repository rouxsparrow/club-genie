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
MESSAGE_ID="${2:-${MESSAGE_ID:-}}"
RAW_HTML_FILE="${3:-${RAW_HTML_FILE:-}}"

if [ -z "${CLUB_TOKEN}" ]; then
  read -r -s -p "Enter CLUB_TOKEN: " CLUB_TOKEN
  echo ""
fi

if [ -z "${MESSAGE_ID}" ]; then
  read -r -p "Enter MESSAGE_ID: " MESSAGE_ID
fi

if [ -z "${RAW_HTML_FILE}" ]; then
  read -r -p "Enter RAW_HTML_FILE path: " RAW_HTML_FILE
fi

if [ -z "${CLUB_TOKEN}" ] || [ -z "${MESSAGE_ID}" ] || [ ! -f "${RAW_HTML_FILE}" ]; then
  echo "Missing CLUB_TOKEN, MESSAGE_ID, or RAW_HTML_FILE."
  exit 1
fi

BASE_URL="${NEXT_PUBLIC_SUPABASE_URL%/}/functions/v1"
raw_html=$(cat "${RAW_HTML_FILE}")

payload=$(MESSAGE_ID="${MESSAGE_ID}" RAW_HTML="${raw_html}" python3 - <<'PY'
import json
import os

print(
    json.dumps(
        {
            "messageId": os.environ["MESSAGE_ID"],
            "rawHtml": os.environ["RAW_HTML"],
        }
    )
)
PY
)

echo "== Ingest receipt =="
curl -i -sS -X POST "${BASE_URL}/ingest-receipts" \
  -H "Authorization: Bearer ${NEXT_PUBLIC_SUPABASE_ANON_KEY}" \
  -H "apikey: ${NEXT_PUBLIC_SUPABASE_ANON_KEY}" \
  -H "x-club-token: ${CLUB_TOKEN}" \
  -H "content-type: application/json" \
  --data "${payload}" \
  | sed -n '1p;/{"ok":/p'
