# Architecture

**Analysis Date:** 2026-04-05

## Pattern Overview

**Overall:** Three-tier web application with a Next.js frontend, Next.js API routes as a BFF (Backend-for-Frontend) layer for admin operations, and Supabase Edge Functions (Deno) as the primary backend for player-facing operations.

**Key Characteristics:**
- Two distinct authentication domains: club-token (shared secret for players) and admin-session (cookie-based for admins)
- Edge Functions run on Deno and access Supabase PostgreSQL via the Supabase JS client with service role
- Next.js API routes proxy to Edge Functions for automation tasks (ingestion, Splitwise sync)
- No ORM; all database access is through the Supabase JS client (`from().select()` pattern)
- Row Level Security enabled on all tables; all access uses the service role key (no public policies)

## Layers

**Presentation Layer (Next.js Pages):**
- Purpose: Server-rendered pages and client-side interactive components
- Location: `src/app/`
- Contains: React page components (`.tsx`), client components marked with `"use client"`
- Depends on: `src/lib/edge.ts` for data fetching, `src/components/` for UI
- Used by: End users (players and admins)

**Client Library Layer:**
- Purpose: Client-side SDK for calling Supabase Edge Functions
- Location: `src/lib/edge.ts`
- Contains: Typed fetch wrappers for every Edge Function endpoint
- Depends on: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` env vars
- Used by: Client components in `src/app/sessions/`

**Admin BFF Layer (Next.js API Routes):**
- Purpose: Server-side API for admin operations; proxies to Edge Functions for automation
- Location: `src/app/api/admin/`
- Contains: Route handlers (`route.ts`) using `NextResponse`
- Depends on: `src/lib/supabase/admin.ts` for direct DB access, `src/lib/admin-identity.ts` for auth
- Used by: Admin UI pages (`src/app/admin/`)

**Edge Functions Layer (Supabase/Deno):**
- Purpose: Serverless functions for player-facing operations and automation jobs
- Location: `supabase/functions/`
- Contains: Individual function directories, each with `index.ts` using `Deno.serve()`
- Depends on: Supabase client via ESM import, shared utilities in `supabase/functions/_shared/`
- Used by: Client-side via `src/lib/edge.ts`, admin API routes via HTTP proxy

**Shared Edge Utilities:**
- Purpose: Common code shared across Edge Functions
- Location: `supabase/functions/_shared/`
- Contains: Auth helpers (`automation-auth.ts`), Gmail config (`gmail-config.ts`), ingestion utils, Splitwise utils, run history tracking
- Depends on: Supabase client
- Used by: Edge Functions

**Database Layer (Supabase PostgreSQL):**
- Purpose: Persistent storage for all domain data
- Location: `supabase/migrations/`
- Contains: SQL migrations defining schema evolution
- Depends on: Nothing
- Used by: Edge Functions and Admin API routes via Supabase JS client

## Data Flow

**Player Views Sessions (read path):**

1. Browser loads `src/app/sessions/page.tsx` which renders `src/app/sessions/sessions-client.tsx`
2. Client reads club token from `localStorage` (key from `getClubTokenStorageKey()`)
3. Client calls `listSessions(token)` in `src/lib/edge.ts`
4. `edge.ts` POSTs to Supabase Edge Function `list-sessions` with `x-club-token` header
5. Edge Function validates token hash against `club_settings` table, queries `sessions`, `courts`, `session_participants` tables
6. Response returns `{ ok, sessions, courts, participants }` to client

**Player Joins Session (write path):**

1. Player clicks join in `src/components/v2/PlayerSelectionDialog.tsx`
2. Client calls `updateSessionParticipation(token, payload)` in `src/lib/edge.ts`
3. Edge Function `update-session-participation` validates token, then inserts/deletes `session_participants` rows
4. Response returns updated participant list; client updates local state

**Admin Creates Session (admin write path):**

1. Admin submits form in `src/app/admin/page.tsx` (client component)
2. Client POSTs to `/api/admin/sessions` (Next.js API route)
3. Middleware (`src/middleware.ts`) validates `admin_session` cookie before route handler executes
4. Route handler in `src/app/api/admin/sessions/route.ts` uses `getSupabaseAdmin()` to insert into `sessions` and `courts` tables

**Ingestion Pipeline (automation):**

1. Admin triggers via `/api/admin/ingestion/run` or automation schedule
2. API route calls `callAppsScriptBridge("manual_ingest")` in `src/lib/apps-script-bridge.ts` (alternative path) or proxies to Edge Function `run-ingestion`
3. `run-ingestion` Edge Function fetches Gmail messages via OAuth, calls `ingest-receipts` Edge Function for each message
4. `ingest-receipts` parses receipt HTML, creates/updates `sessions`, `courts`, `email_receipts` records
5. Run history logged to `automation_run_history` table

**Splitwise Sync (automation):**

1. Admin triggers via `/api/admin/splitwise/run` or automation schedule
2. API route proxies to Edge Function `run-splitwise-sync` with `x-automation-secret` header
3. Edge Function queries closed sessions without Splitwise expenses, computes cost splits per participant
4. Creates expenses via Splitwise API, records `splitwise_expense_id` in `expenses` table

**State Management:**
- No global state library (no Redux, Zustand, etc.)
- All client state managed with React `useState`/`useEffect` hooks
- Club token stored in `localStorage`
- Admin session stored in HTTP-only cookie (`admin_session`)

## Key Abstractions

**Club Token (Player Auth):**
- Purpose: Shared secret that gates access to player-facing Edge Functions
- Examples: `src/lib/edge.ts`, `supabase/functions/validate-token/index.ts`, `supabase/functions/list-sessions/index.ts`
- Pattern: Token passed as `x-club-token` header, hashed and compared against `club_settings.token_hash`

**Admin Session (Admin Auth):**
- Purpose: Cookie-based session for admin users with HMAC-signed payload
- Examples: `src/lib/admin-session.ts` (Node.js), `src/lib/admin-session-edge.ts` (Edge/Web Crypto), `src/lib/admin-session-contract.ts` (shared types)
- Pattern: Base64-encoded JSON payload + HMAC-SHA256 signature, stored in `admin_session` cookie

**Apps Script Bridge:**
- Purpose: Alternative ingestion path via Google Apps Script deployment
- Examples: `src/lib/apps-script-bridge.ts`
- Pattern: Server-to-server POST with shared secret, used for `manual_ingest` and `preview` actions

**Run History:**
- Purpose: Audit log for automation runs (ingestion, Splitwise sync)
- Examples: `supabase/functions/_shared/run-history.ts`
- Pattern: `startRunHistory()` at beginning, `finalizeRunHistory()` at end with status/summary

**Resilient Column Selection:**
- Purpose: Handle schema migrations that may not have been applied yet
- Examples: `supabase/functions/list-sessions/index.ts` (lines 100-133), `src/app/api/admin/sessions/route.ts` (lines 97-117)
- Pattern: Try query with all columns, on error retry with progressively fewer columns. Allows app to work with older DB schemas.

## Entry Points

**Next.js App (`src/app/layout.tsx`):**
- Location: `src/app/layout.tsx`
- Triggers: All HTTP requests to the Next.js server
- Responsibilities: Root HTML layout, font loading, theme initialization

**Next.js Middleware (`src/middleware.ts`):**
- Location: `src/middleware.ts`
- Triggers: Requests matching `/admin/:path*` and `/api/admin/:path*`
- Responsibilities: Admin authentication gate; validates cookie, checks user active status and session version against DB

**Edge Function Endpoints (`supabase/functions/*/index.ts`):**
- Location: `supabase/functions/` (19 functions)
- Triggers: HTTP POST to `{SUPABASE_URL}/functions/v1/{function-name}`
- Responsibilities: Business logic for sessions, players, ingestion, Splitwise, token management

## Error Handling

**Strategy:** Defensive programming with explicit null/error checks; no global error boundary

**Patterns:**
- Edge Functions return `{ ok: false, error: "error_code" }` with appropriate HTTP status codes
- Client-side `edge.ts` catches fetch errors and returns safe fallback objects (e.g., `{ ok: false, sessions: [] }`)
- Admin API routes return `NextResponse.json({ ok: false, error: "message" }, { status: N })`
- Type assertions use `as` casts on JSON responses with manual property validation (no runtime validation library like Zod)
- No centralized error logging; errors handled at each call site

## Cross-Cutting Concerns

**Logging:** No structured logging framework. Errors are returned as JSON responses; no server-side logging infrastructure detected.

**Validation:** Manual validation in each route handler and Edge Function. No schema validation library (no Zod, Joi, etc.). Types are defined inline or as local type aliases and cast with `as`.

**Authentication:**
- Player-facing: Club token validated via SHA-256 hash comparison in each Edge Function
- Admin-facing: HMAC-signed session cookie validated in Next.js middleware (`src/middleware.ts`)
- Automation: Shared secret via `x-automation-secret` header, validated by `isAutomationSecretValid()` in `supabase/functions/_shared/automation-auth.ts`
- Breakglass: Emergency admin access via env vars (`ENABLE_ADMIN_BREAKGLASS`, `ADMIN_BREAKGLASS_USERNAME`, `ADMIN_BREAKGLASS_PASSWORD`), implemented in `src/lib/admin-breakglass.ts`

**CORS:** Edge Functions include CORS headers allowing all origins (`Access-Control-Allow-Origin: *`).

---

*Architecture analysis: 2026-04-05*
