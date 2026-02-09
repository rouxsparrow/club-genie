# Gmail Ingestion Setup

## OAuth Requirements
- Gmail API enabled in Google Cloud console.
- OAuth client (web or desktop) credentials.
- Refresh token with Gmail readonly scope.

Required env vars (Supabase secrets):
- `GMAIL_CLIENT_ID`
- `GMAIL_CLIENT_SECRET`
- `GMAIL_REFRESH_TOKEN`

## Refresh Token Acquisition
1) Create OAuth client in Google Cloud.
2) Use OAuth playground to authorize scope:
   - `https://www.googleapis.com/auth/gmail.readonly`
3) Exchange authorization code for refresh token.

## Cron Hook
- Schedule calls to `fetch-gmail-receipts` 5x/day.
- This function currently returns Gmail message IDs and snippets.
- Next step: map message IDs to full raw HTML payload and call `ingest-receipts`.
