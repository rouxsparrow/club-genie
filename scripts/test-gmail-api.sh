#!/usr/bin/env bash
set -euo pipefail

if [ -f .env.local ]; then
  set -a
  source .env.local
  set +a
fi

GMAIL_CLIENT_ID="${GMAIL_CLIENT_ID:-}"
GMAIL_CLIENT_SECRET="${GMAIL_CLIENT_SECRET:-}"
GMAIL_REFRESH_TOKEN="${GMAIL_REFRESH_TOKEN:-}"
QUERY="${1:-newer_than:14d}"

if [ -z "${GMAIL_CLIENT_ID}" ] || [ -z "${GMAIL_CLIENT_SECRET}" ] || [ -z "${GMAIL_REFRESH_TOKEN}" ]; then
  echo "Missing GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, or GMAIL_REFRESH_TOKEN."
  exit 1
fi

token_response=$(curl -sS -X POST "https://oauth2.googleapis.com/token" \
  -H "content-type: application/x-www-form-urlencoded" \
  -d "client_id=${GMAIL_CLIENT_ID}" \
  -d "client_secret=${GMAIL_CLIENT_SECRET}" \
  -d "refresh_token=${GMAIL_REFRESH_TOKEN}" \
  -d "grant_type=refresh_token")

if [ -z "${token_response}" ]; then
  echo "Empty response from token endpoint."
  exit 1
fi

access_token=$(TOKEN_RESPONSE="${token_response}" python3 - <<'PY'
import json
import os
import sys

payload = os.environ.get("TOKEN_RESPONSE", "")
try:
    data = json.loads(payload)
except Exception:
    print("")
    sys.exit(0)

print(data.get("access_token", ""))
PY
)

if [ -z "${access_token}" ]; then
  echo "Failed to obtain access token. Token response:"
  echo "${token_response}" | python3 - <<'PY'
import json
import sys

try:
    data = json.load(sys.stdin)
except Exception:
    print("<non-json response>")
    sys.exit(0)

for key in ("error", "error_description"):
    if key in data:
        print(f"{key}: {data[key]}")
PY
  exit 1
fi

body_file=$(mktemp)
status=$(curl -sS -o "${body_file}" -w "%{http_code}" \
  "https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${QUERY}" \
  -H "Authorization: Bearer ${access_token}" \
  -H "Accept-Encoding: identity")

echo "HTTP ${status}"

BODY_FILE="${body_file}" python3 - <<'PY'
import json
import os
import sys

body_file = os.environ.get("BODY_FILE")
if not body_file:
    print("Missing body file")
    sys.exit(1)

with open(body_file, "r", encoding="utf-8") as f:
    body = f.read()

try:
    payload = json.loads(body)
except Exception:
    print("Failed to parse JSON body")
    sys.exit(1)

messages = payload.get("messages", [])[:5]
for msg in messages:
    print(msg.get("id"))
PY

rm -f "${body_file}"
