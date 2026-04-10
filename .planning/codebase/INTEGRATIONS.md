# External Integrations

**Analysis Date:** 2026-04-05

## APIs & External Services

**Gmail API:**
- Purpose: Fetch email receipts (Playtomic court booking confirmations) for automated ingestion
- SDK/Client: Direct `fetch()` calls to `https://gmail.googleapis.com/gmail/v1/`
- Auth: OAuth 2.0 refresh token flow via `https://oauth2.googleapis.com/token`
- Auth env vars: `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN`
- Auth storage: Database table `gmail_oauth_config` (preferred) with env var fallback
- Config resolution: `supabase/functions/_shared/gmail-config.ts` - `resolveGmailOauthConfig()` checks DB first, then env vars
- Endpoints used:
  - `GET /gmail/v1/users/me/messages` - List messages matching query
  - `GET /gmail/v1/users/me/messages/{id}?format=full` - Fetch full message content
- Implementation: `supabase/functions/fetch-gmail-receipts/index.ts`, `supabase/functions/run-ingestion/index.ts`

**Splitwise API:**
- Purpose: Create expense entries for badminton session costs, split among participants
- SDK/Client: Direct `fetch()` calls to Splitwise API (`https://secure.splitwise.com/api/v3.0/`)
- Auth: API key via `SPLITWISE_API_KEY` env var
- Group config: `SPLITWISE_GROUP_ID` env var + DB table `splitwise_settings`
- Implementation: `supabase/functions/run-splitwise-sync/index.ts`
- Expense types: COURT (session booking) and SHUTTLECOCK (shuttlecock fees)
- Payload builder: `supabase/functions/_shared/splitwise-utils.ts` - builds `by_shares` expense payloads
- Settings stored in DB: `splitwise_settings` table (group_id, currency_code, description_template, date_format, location_replacements, shuttlecock_fee)

**Google Apps Script Bridge:**
- Purpose: Proxy for Gmail operations from the Next.js server side (alternative ingestion path)
- Auth: Shared secret via `APPS_SCRIPT_BRIDGE_SECRET` env var
- Endpoint: `APPS_SCRIPT_BRIDGE_URL` env var
- Client: `src/lib/apps-script-bridge.ts` - `callAppsScriptBridge(action, payload)`
- Actions: `"manual_ingest"`, `"preview"`
- Used by admin ingestion API routes: `src/app/api/admin/ingestion/preview/route.ts`, `src/app/api/admin/ingestion/run/route.ts`

## Data Storage

**Database:**
- Provider: Supabase (PostgreSQL)
- Connection env vars: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Client (Next.js server): `src/lib/supabase/admin.ts` - singleton `getSupabaseAdmin()` using service role key
- Client (Edge Functions): `createClient()` from `https://esm.sh/@supabase/supabase-js@2.45.4` with service role key via `Deno.env`
- Client (browser): Via Supabase Edge Functions only (no direct browser-to-DB connection)
- Local dev config: `supabase/config.toml` (project_id: `club-genie`, API port: 54321, DB port: 54322)
- Migrations: `supabase/migrations/` (20 migration files, 2026-02-09 through 2026-03-27)
- Row Level Security: Enabled on all tables, no public policies - access exclusively through Edge Functions using service role

**Core Tables:**
- `club_settings` - Token hash, version, rotation tracking
- `sessions` - Badminton sessions (date, status, fee, location, times)
- `courts` - Court bookings per session
- `players` - Player roster (name, active status, avatar)
- `session_participants` - Many-to-many sessions-to-players
- `email_receipts` - Ingested Gmail receipts (raw HTML, parse status/errors)
- `expenses` - Splitwise expense tracking per session
- `automation_settings` - Ingestion config (keywords, timezone, enabled flag)
- `gmail_oauth_config` - Gmail OAuth credentials (DB-stored alternative to env vars)
- `splitwise_settings` - Splitwise integration config
- `admin_users` - Admin account credentials and session versioning
- `automation_run_history` - Audit log for ingestion and Splitwise sync runs

**File Storage:**
- Player avatars: Managed via `src/app/api/admin/players/[id]/avatar/route.ts`
- Avatar helper: `src/lib/player-avatar.ts`

**Caching:**
- None (no Redis or other caching layer)

## Authentication & Identity

**Club Member Access:**
- Token-based authentication (no user accounts for members)
- Shared club token stored in `club_settings` table (hashed)
- Token validated via Supabase Edge Function: `supabase/functions/validate-token/`
- Token rotation via Edge Function: `supabase/functions/rotate-token/`
- Client-side storage key: `NEXT_PUBLIC_CLUB_TOKEN_STORAGE_KEY` (default: `"club_token"`)
- Token validation client: `src/lib/edge.ts` - `validateClubToken()`, `validateClubTokenDetailed()`
- Compatibility layer: `src/lib/club-token-compat.ts`

**Admin Access:**
- Custom session-based authentication (no third-party auth provider)
- Password hashing: scrypt (N=16384, r=8, p=1, keyLen=64) in `src/lib/password-hash.ts`
- Session token: HMAC-SHA256 signed JSON payload (custom JWT-like) in `src/lib/admin-session.ts`
- Session cookie: `httpOnly`, `secure` in production, `sameSite: lax`, path `/`
- Session contract: `src/lib/admin-session-contract.ts`
- Identity resolution: `src/lib/admin-identity.ts`
- Breakglass emergency access: `src/lib/admin-breakglass.ts` - env var based (`ENABLE_ADMIN_BREAKGLASS`, `ADMIN_BREAKGLASS_USERNAME`, `ADMIN_BREAKGLASS_PASSWORD`)
- Session secret: `ADMIN_SESSION_SECRET` env var
- Login route: `src/app/api/admin/login/route.ts` (POST, form data)
- Logout route: `src/app/api/admin/logout/route.ts`
- Account management: `src/app/api/admin/accounts/route.ts`, `src/app/api/admin/account/change-password/route.ts`

**Automation Access:**
- Shared secret authentication for automated Edge Function calls
- Secret: `AUTOMATION_SECRET` env var
- Header: `x-automation-secret`
- Validation: `supabase/functions/_shared/automation-auth.ts` - timing-safe comparison
- Run source tracking: `GITHUB_CRON`, `ADMIN_MANUAL`, `API`, `UNKNOWN` via `x-run-source` header

## Monitoring & Observability

**Error Tracking:**
- None (no Sentry, Datadog, etc.)

**Logs:**
- Console-based logging in Edge Functions
- Receipt parse errors stored in `email_receipts` table (`parse_error` column)
- Errors surfaced via: `src/app/api/admin/receipt-errors/route.ts`, `supabase/functions/list-receipt-errors/`

**Run History:**
- `automation_run_history` table tracks ingestion and Splitwise sync runs
- Fields: job_type, run_source, status, started_at, finished_at, duration_ms, summary, error_message
- Implementation: `supabase/functions/_shared/run-history.ts`
- API routes: `src/app/api/admin/automation/run-history/route.ts`, `src/app/api/admin/splitwise/run-history/route.ts`

## CI/CD & Deployment

**Hosting:**
- Supabase (database + Edge Functions)
- Next.js hosting platform not explicitly configured in repo

**CI Pipeline:**
- GitHub Actions implied by `GITHUB_CRON` run source enum, but no workflow files visible in repo root

## Supabase Edge Functions

All edge functions live in `supabase/functions/` and run on Deno:

**Session Management:**
- `get-session/` - Get session details
- `list-sessions/` - List all sessions
- `join-session/` - Player joins a session
- `withdraw-session/` - Player withdraws from session
- `close-session/` - Close a session
- `set-session-guests/` - Set guest count for session
- `update-session-participation/` - Batch update participants + guests

**Token Management:**
- `validate-token/` - Validate club access token
- `rotate-token/` - Rotate club access token

**Ingestion Pipeline:**
- `fetch-gmail-receipts/` - Fetch receipts from Gmail
- `ingest-receipts/` - Parse and store receipt data
- `run-ingestion/` - Orchestrate full ingestion run (fetch + ingest)
- `log-ingestion-run/` - Log ingestion run result

**Splitwise Integration:**
- `run-splitwise-sync/` - Create Splitwise expenses for closed sessions
- `splitwise-ping/` - Test Splitwise API connectivity
- `splitwise-get-groups/` - List Splitwise groups
- `splitwise-get-group/` - Get single Splitwise group details

**Data Access:**
- `list-players/` - List player roster
- `list-receipt-errors/` - List failed receipt parses

**Shared Utilities:**
- `_shared/automation-auth.ts` - Automation secret validation
- `_shared/gmail-config.ts` - Gmail OAuth config resolution
- `_shared/ingestion-utils.ts` - Receipt parsing (Playtomic format: date, time, location, fee)
- `_shared/splitwise-utils.ts` - Splitwise payload construction, cost splitting math
- `_shared/run-history.ts` - Automation run history tracking

## Environment Configuration

**Required env vars (from `.env.example`):**

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL (client-side) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key (client-side) |
| `NEXT_PUBLIC_CLUB_TOKEN_STORAGE_KEY` | LocalStorage key for club token |
| `SUPABASE_URL` | Supabase project URL (server-side) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-side) |
| `DATABASE_URL` | Direct database connection string |
| `GMAIL_CLIENT_ID` | Gmail OAuth client ID |
| `GMAIL_CLIENT_SECRET` | Gmail OAuth client secret |
| `GMAIL_REFRESH_TOKEN` | Gmail OAuth refresh token |
| `SPLITWISE_API_KEY` | Splitwise API key |
| `SPLITWISE_GROUP_ID` | Default Splitwise group ID |
| `ADMIN_SESSION_SECRET` | HMAC secret for admin session tokens |
| `ENABLE_ADMIN_BREAKGLASS` | Enable emergency admin access |
| `ADMIN_BREAKGLASS_USERNAME` | Breakglass admin username |
| `ADMIN_BREAKGLASS_PASSWORD` | Breakglass admin password |
| `AUTOMATION_SECRET` | Shared secret for automation endpoints |
| `APPS_SCRIPT_BRIDGE_URL` | Google Apps Script bridge endpoint URL |
| `APPS_SCRIPT_BRIDGE_SECRET` | Apps Script bridge shared secret |

## Webhooks & Callbacks

**Incoming:**
- Automation endpoints accept `x-automation-secret` header for cron/scheduled triggers
- Run source tracked via `x-run-source` header (`GITHUB_CRON` suggests external cron webhook)

**Outgoing:**
- Apps Script Bridge: POST to `APPS_SCRIPT_BRIDGE_URL` for Gmail operations
- Splitwise API: POST to create expenses
- Gmail API: GET to fetch messages

---

*Integration audit: 2026-04-05*
