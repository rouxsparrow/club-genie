# External Integrations

**Analysis Date:** 2026-04-05

## APIs & External Services

**Splitwise (Expense Splitting):**
- Creates shared expenses for badminton court fees and shuttlecock costs
- REST API: `https://secure.splitwise.com/api/v3.0/create_expense`
- Auth: Bearer token via `SPLITWISE_API_KEY` env var
- Implementation: `supabase/functions/run-splitwise-sync/index.ts`
- Shared utilities: `supabase/functions/_shared/splitwise-utils.ts`
- Related Edge Functions:
  - `supabase/functions/splitwise-ping/` - connectivity test
  - `supabase/functions/splitwise-get-group/` - fetch group details
  - `supabase/functions/splitwise-get-groups/` - list groups
- Configuration stored in `splitwise_settings` DB table (group_id, currency_code, description_template, shuttlecock_fee)
- Two expense types: COURT (court rental split) and SHUTTLECOCK (shuttlecock fee for non-paying players)

**Gmail API (Receipt Ingestion):**
- Fetches booking confirmation emails to auto-create sessions
- OAuth 2.0 refresh token flow via `https://oauth2.googleapis.com/token`
- Message listing: `https://gmail.googleapis.com/gmail/v1/users/me/messages`
- Message fetching: `https://gmail.googleapis.com/gmail/v1/users/me/messages/{id}?format=full`
- Auth: OAuth credentials via `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN` env vars (or stored in `gmail_oauth_config` DB table)
- Implementation: `supabase/functions/fetch-gmail-receipts/index.ts`
- Config resolution: `supabase/functions/_shared/gmail-config.ts` (DB row takes priority over env vars)
- Parses Playtomic booking receipts for date, time, court, fee
- Parsing logic: `supabase/functions/_shared/ingestion-utils.ts`

**Google Apps Script Bridge (Automation Orchestrator):**
- Calls an external Apps Script web app to trigger ingestion flows
- Implementation: `src/lib/apps-script-bridge.ts`
- Auth: shared secret via `APPS_SCRIPT_BRIDGE_URL` and `APPS_SCRIPT_BRIDGE_SECRET` env vars
- Actions: `manual_ingest`, `preview`
- Used by admin API routes for manual ingestion triggers

## Data Storage

**Database:**
- PostgreSQL via Supabase
- Connection: `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` (server-side)
- Client-side: `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Client library: `@supabase/supabase-js` (no ORM)
- Server-side client: `src/lib/supabase/admin.ts` (cached singleton, service role)
- Edge Functions client: created inline per request using `createClient` from `https://esm.sh/@supabase/supabase-js@2.45.4`
- Migrations: `supabase/migrations/` (14 migration files)
- Row Level Security enabled on all tables; access via service role in Edge Functions

**Core Tables (from `supabase/migrations/20260209075408_init_schema.sql`):**
- `club_settings` - token hash, version (club access token)
- `sessions` - badminton sessions (date, status, fee, location)
- `courts` - court bookings per session
- `players` - club members
- `session_participants` - join table (sessions <-> players)
- `email_receipts` - ingested Gmail messages
- `expenses` - Splitwise expense tracking per session

**Additional Tables (from later migrations):**
- `automation_settings` - ingestion config (keywords, timezone)
- `gmail_oauth_config` - stored OAuth credentials
- `splitwise_settings` - Splitwise sync configuration
- `admin_users` - admin account credentials
- `automation_run_history` - job execution logs

**File Storage:**
- Player avatars uploaded via `src/app/api/admin/players/[id]/avatar/route.ts`
- Storage mechanism: likely Supabase Storage (based on avatar_url field on players)

**Caching:**
- Supabase admin client cached as module-level singleton (`src/lib/supabase/admin.ts`)
- No external cache service (Redis, Memcached, etc.)

## Authentication & Identity

**Club Member Access (Token-based):**
- Shared club token stored in browser (`localStorage` key from `NEXT_PUBLIC_CLUB_TOKEN_STORAGE_KEY`)
- Token validated via `supabase/functions/validate-token/` Edge Function
- Token rotation via `supabase/functions/rotate-token/` Edge Function
- Token hash stored in `club_settings` table
- Client-side token flow: `src/lib/edge.ts` (`validateClubToken`, `rotateClubToken`)

**Admin Authentication (Cookie-based):**
- Custom session cookie (`ADMIN_COOKIE_NAME` from `src/lib/admin-session-contract.ts`)
- HMAC-SHA256 signed payload (base64url encoded JSON)
- Session secret: `ADMIN_SESSION_SECRET` env var
- Password hashing: scrypt (N=16384, r=8, p=1, keyLen=64) in `src/lib/password-hash.ts`
- Admin users stored in `admin_users` DB table with session versioning
- Breakglass bypass: env-based emergency admin access (`ENABLE_ADMIN_BREAKGLASS`, `ADMIN_BREAKGLASS_USERNAME`, `ADMIN_BREAKGLASS_PASSWORD`)
- Identity resolution: `src/lib/admin-identity.ts`
- Session management: `src/lib/admin-session.ts`
- Login route: `src/app/api/admin/login/route.ts`

**Edge Function Auth (Automation):**
- Shared secret header: `x-automation-secret` matched against `AUTOMATION_SECRET` env var
- Timing-safe comparison: `supabase/functions/_shared/automation-auth.ts`
- Used by GitHub Actions workflows and Apps Script bridge

## Monitoring & Observability

**Error Tracking:**
- None (no Sentry, Datadog, etc.)

**Logs:**
- Console-based logging in Edge Functions
- Automation run history stored in `automation_run_history` table
- Run history utilities: `supabase/functions/_shared/run-history.ts`
- Job types: `INGESTION`, `SPLITWISE`
- Run sources: `GITHUB_CRON`, `ADMIN_MANUAL`, `API`, `UNKNOWN`
- Receipt parse errors stored in `email_receipts.parse_error` column
- Expense creation errors stored in `expenses.last_error` column

## CI/CD & Deployment

**Hosting:**
- Frontend: Not specified in config (likely Vercel given Next.js)
- Backend: Supabase (Edge Functions + PostgreSQL)

**CI Pipeline:**
- GitHub Actions (`.github/workflows/`)

**Scheduled Jobs:**
- `run-splitwise-sync.yml` - Daily at 14:00 UTC (cron), also manual dispatch
- `run-ingestion.yml` - Manual dispatch only (daily scheduling owned by Apps Script bridge)

**Workflow Pattern:**
- Both workflows call Supabase Edge Functions via `curl`
- Auth headers: `Authorization: Bearer {SUPABASE_ANON_KEY}`, `apikey: {SUPABASE_ANON_KEY}`, `x-automation-secret: {AUTOMATION_SECRET}`
- Run source header: `x-run-source: GITHUB_CRON` or `x-run-source: API`

## Environment Configuration

**Required env vars:**

| Variable | Usage | Where |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Frontend + server |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | Frontend |
| `NEXT_PUBLIC_CLUB_TOKEN_STORAGE_KEY` | localStorage key name | Frontend |
| `SUPABASE_URL` | Supabase project URL | Server/Edge Functions |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | Server/Edge Functions |
| `SPLITWISE_API_KEY` | Splitwise API bearer token | Edge Functions |
| `SPLITWISE_GROUP_ID` | Splitwise group for expenses | Edge Functions |
| `GMAIL_CLIENT_ID` | Gmail OAuth client ID | Edge Functions (fallback) |
| `GMAIL_CLIENT_SECRET` | Gmail OAuth client secret | Edge Functions (fallback) |
| `GMAIL_REFRESH_TOKEN` | Gmail OAuth refresh token | Edge Functions (fallback) |
| `ADMIN_SESSION_SECRET` | HMAC signing key for admin cookies | Server |
| `ENABLE_ADMIN_BREAKGLASS` | Enable emergency admin access | Server |
| `ADMIN_BREAKGLASS_USERNAME` | Breakglass admin username | Server |
| `ADMIN_BREAKGLASS_PASSWORD` | Breakglass admin password | Server |
| `AUTOMATION_SECRET` | Shared secret for automation calls | Server/Edge/CI |
| `APPS_SCRIPT_BRIDGE_URL` | Google Apps Script web app URL | Server |
| `APPS_SCRIPT_BRIDGE_SECRET` | Apps Script bridge shared secret | Server |
| `DATABASE_URL` | Direct PostgreSQL connection string | Scripts |

**Secrets location:**
- Development: `.env.local` (gitignored)
- CI: GitHub repository secrets
- Edge Functions: Supabase project secrets

## Webhooks & Callbacks

**Incoming:**
- None detected (no webhook endpoints)

**Outgoing:**
- Apps Script bridge calls (`src/lib/apps-script-bridge.ts`) - POST to external Google Apps Script web app
- Splitwise API calls from Edge Functions
- Gmail API calls from Edge Functions

## Supabase Edge Functions

All Edge Functions use the Deno runtime and are located under `supabase/functions/`:

| Function | Purpose |
|---|---|
| `validate-token` | Validate club access token |
| `rotate-token` | Rotate club access token |
| `list-sessions` | List badminton sessions |
| `get-session` | Get session details |
| `join-session` | Join a session |
| `withdraw-session` | Leave a session |
| `set-session-guests` | Set guest count for session |
| `update-session-participation` | Batch update participation + guests |
| `close-session` | Close a session |
| `list-players` | List club members |
| `list-receipt-errors` | List failed email receipt parses |
| `fetch-gmail-receipts` | Fetch emails from Gmail |
| `ingest-receipts` | Parse receipts and create sessions |
| `run-ingestion` | Orchestrate full ingestion pipeline |
| `log-ingestion-run` | Log ingestion run history |
| `run-splitwise-sync` | Create Splitwise expenses for closed sessions |
| `splitwise-ping` | Test Splitwise API connectivity |
| `splitwise-get-group` | Fetch Splitwise group details |
| `splitwise-get-groups` | List Splitwise groups |

Shared code in `supabase/functions/_shared/`:
- `automation-auth.ts` - Timing-safe secret validation
- `gmail-config.ts` - Gmail OAuth config resolution
- `ingestion-utils.ts` - Receipt parsing (Playtomic format)
- `run-history.ts` - Automation run history tracking
- `splitwise-utils.ts` - Splitwise payload builders and money utilities

---

*Integration audit: 2026-04-05*
