# Gmail OAuth Setup

## Google Cloud Console
1) OAuth consent screen:
   - Add the club Gmail account as a test user if the app is in testing.
2) OAuth client:
   - Authorized JavaScript origins: `http://localhost:3000`
   - Authorized redirect URI: `http://localhost:3002/callback`

## Run the OAuth helper
```bash
GMAIL_CLIENT_ID=... GMAIL_CLIENT_SECRET=... node scripts/get-gmail-refresh-token.js
```

1) Open the printed URL in your browser.
2) Select the club Gmail account and approve access.
3) After redirect, the script will print `refresh_token` once.

## If no refresh_token is returned
- Ensure `prompt=consent` is set (the script already does this).
- Remove prior app access at https://myaccount.google.com/permissions and re-consent.
- Verify the redirect URI matches exactly `http://localhost:3002/callback`.
