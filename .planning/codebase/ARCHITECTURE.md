# Architecture

**Analysis Date:** 2026-04-05

## Pattern Overview

**Overall:** Next.js App Router with Supabase Edge Functions as a backend-for-frontend gateway

**Key Characteristics:**
- Two-tier auth: club-level token (shared secret for members) and admin cookie-based sessions
- Public-facing features go through Supabase Edge Functions (Deno) authenticated via `x-club-token` header
- Admin features go through Next.js API routes authenticated via HMAC-signed session cookie
- All database access uses Supabase service-role key (no client-side Supabase); RLS is enabled but policies delegate to service role
- Gmail receipt ingestion is bridged through Google Apps Script via a shared-secret HTTP bridge

## Layers

**UI Layer (React Client Components):**
- Purpose: Render pages and handle user interaction
- Location: `src/app/` (pages), `src/components/` (shared components)
- Contains: Client components (`"use client"`), page layouts, CSS
- Depends on: Edge client (`src/lib/edge.ts`), Next.js API routes (via `fetch`)
- Used by: End users (members and admins)

**Edge Client Layer:**
- Purpose: Typed client for calling Supabase Edge Functions from the browser
- Location: `src/lib/edge.ts`
- Contains: Functions like `listSessions()`, `joinSession()`, `validateClubToken()`, `updateSessionParticipation()`
- Depends on: Supabase Edge Functions (via fetch), env vars `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Used by: `src/app/sessions/sessions-client.tsx`

**Next.js API Routes (Admin Backend):**
- Purpose: Server-side admin operations requiring service-role access
- Location: `src/app/api/admin/`
- Contains: Route handlers for sessions CRUD, players CRUD, ingestion, Splitwise sync, account management
- Depends on: `src/lib/supabase/admin.ts`, `src/lib/admin-identity.ts`, `src/lib/apps-script-bridge.ts`
- Used by: Admin UI (`src/app/admin/page.tsx`)

**Supabase Edge Functions (Public Backend):**
- Purpose: Public-facing API secured by club token hash comparison
- Location: `supabase/functions/`
- Contains: 19 Deno edge functions (validate-token, list-sessions, join-session, etc.)
- Depends on: Supabase DB via service-role client, `supabase/functions/_shared/` utilities
- Used by: Edge client layer in browser

**Library Layer:**
- Purpose: Shared business logic, utilities, and auth primitives
- Location: `src/lib/`
- Contains: Session management, admin auth, password hashing, ingestion preview, display formatters
- Depends on: `@supabase/supabase-js`, Node.js crypto
- Used by: API routes, UI components, tests

**Database Layer:**
- Purpose: Persistent storage via Supabase (PostgreSQL)
- Location: `supabase/migrations/`
- Contains: 14 SQL migrations defining schema evolution
- Core tables: `sessions`, `players`, `courts`, `session_participants`, `email_receipts`, `expenses`, `club_settings`, `admin_users`

## Data Flow

**Member Session Viewing:**
1. Browser loads `src/app/sessions/sessions-client.tsx`
2. Component reads club token from `localStorage` (key from `NEXT_PUBLIC_CLUB_TOKEN_STORAGE_KEY`)
3. Calls `validateClubTokenDetailed()` in `src/lib/edge.ts` which POSTs to Edge Function `validate-token`
4. Edge Function hashes incoming token, compares against `club_settings.token_hash` in DB
5. On success, component calls `listSessions()` / `listPlayers()` which POST to respective Edge Functions
6. Edge Functions query DB with service-role client and return JSON

**Member Join/Withdraw Session:**
1. User opens PlayerSelectionDialog, selects players
2. Component calls `updateSessionParticipation()` in `src/lib/edge.ts`
3. Edge Function `update-session-participation` validates club token, updates `session_participants` table
4. Falls back to separate `joinSession()` + `setSessionGuests()` calls if endpoint returns 404

**Admin Login:**
1. Admin submits form to `POST /api/admin/login` (`src/app/api/admin/login/route.ts`)
2. Route looks up `admin_users` table via Supabase service-role client
3. Verifies password hash using `src/lib/password-hash.ts`
4. Falls back to breakglass env-var credentials if DB account not found
5. Creates HMAC-signed session cookie via `src/lib/admin-session.ts`
6. Redirects to `/admin`

**Admin Session Management:**
1. Admin page (`src/app/admin/page.tsx`, 2329 lines) fetches data from Next.js API routes
2. API routes authenticate via `resolveAdminIdentityFromRequest()` in `src/lib/admin-identity.ts`
3. Routes use `getSupabaseAdmin()` singleton to query/mutate DB

**Email Receipt Ingestion:**
1. Admin triggers ingestion via `POST /api/admin/ingestion/run` (`src/app/api/admin/ingestion/run/route.ts`)
2. Route calls `callAppsScriptBridge("manual_ingest")` in `src/lib/apps-script-bridge.ts`
3. Apps Script Bridge fetches Gmail receipts, calls Supabase Edge Function `run-ingestion`
4. Edge Function parses receipts and creates sessions/courts in DB

**Splitwise Expense Sync:**
1. Admin triggers via Splitwise tab in admin panel
2. API routes under `src/app/api/admin/splitwise/` manage settings, run sync, view history
3. Edge Function `run-splitwise-sync` creates Splitwise expenses for closed sessions

**State Management:**
- No global state library; each page component manages its own state via `useState`/`useEffect`
- Club token stored in `localStorage`
- Admin session stored in HTTP-only cookie (`admin_session`)

## Key Abstractions

**Club Token:**
- Purpose: Shared secret authenticating all club members (not per-user)
- Implementation: Token is SHA-256 hashed and stored in `club_settings.token_hash`; raw token shared out-of-band
- Files: `src/lib/edge.ts`, `supabase/functions/validate-token/index.ts`, `src/lib/club-token-compat.ts`
- Pattern: Every Edge Function call includes `x-club-token` header validated against DB hash

**Admin Session:**
- Purpose: Per-admin authentication via signed cookie
- Implementation: Base64url-encoded JSON payload + HMAC-SHA256 signature (custom, not JWT)
- Files: `src/lib/admin-session.ts`, `src/lib/admin-session-contract.ts`, `src/lib/admin-identity.ts`
- Pattern: Cookie contains `{uid, username, sessionVersion, isBreakglass, iat, exp}`; verified against `admin_users.session_version` on each request

**Breakglass Admin:**
- Purpose: Emergency admin access when DB admin accounts are inaccessible
- Implementation: Env-var-based username/password bypass
- Files: `src/lib/admin-breakglass.ts`
- Pattern: Checked only after DB lookup fails; creates session with `bg: true` flag

**Apps Script Bridge:**
- Purpose: Proxy for Gmail API access (Gmail receipts for court booking confirmations)
- Implementation: HTTP POST to Google Apps Script web app with shared secret
- Files: `src/lib/apps-script-bridge.ts`, `scripts/gmail-apps-script-bridge.js`
- Pattern: Two actions: `preview` (fetch emails) and `manual_ingest` (fetch + ingest)

**Progressive Column Fallback:**
- Purpose: Handle schema migrations that may not have been applied yet
- Files: `src/app/api/admin/players/route.ts`, `src/app/api/admin/sessions/route.ts`
- Pattern: Try SELECT/INSERT with all columns; if error mentions a missing column, retry with fewer columns. Allows code to deploy before migrations run.

## Entry Points

**Web Application:**
- Location: `src/app/layout.tsx` (root layout), `src/app/page.tsx` (home page)
- Triggers: HTTP requests to Next.js server
- Responsibilities: Renders the SPA shell, applies fonts and theme

**Public Sessions Page:**
- Location: `src/app/sessions/page.tsx` -> `src/app/sessions/sessions-client.tsx`
- Triggers: Navigation to `/sessions`
- Responsibilities: Token gate, session listing, join/withdraw participation

**Admin Dashboard:**
- Location: `src/app/admin/page.tsx` (2329 lines, monolithic client component)
- Triggers: Navigation to `/admin` after login
- Responsibilities: All admin functions (players, sessions, automation, Splitwise, accounts, emails)

**Admin API:**
- Location: `src/app/api/admin/` (29 route files)
- Triggers: Fetch calls from admin UI
- Responsibilities: CRUD operations, ingestion triggers, Splitwise sync

**Edge Functions:**
- Location: `supabase/functions/` (19 functions)
- Triggers: HTTP POST from browser via `src/lib/edge.ts`
- Responsibilities: Token validation, session/player queries, participation management

## Error Handling

**Strategy:** Return `{ ok: false, error: string }` JSON responses consistently

**Patterns:**
- API routes return `NextResponse.json({ ok: false, error: "..." }, { status: N })`
- Edge Functions return `Response(JSON.stringify({ ok: false }), { status: N })`
- Edge client functions return typed result objects (e.g., `ClubTokenValidationResult`) with discriminated unions
- Progressive column fallback catches Supabase errors containing column names and retries with fewer columns
- No global error boundary; errors handled per-component/per-route

## Cross-Cutting Concerns

**Logging:** `console` only (no structured logging framework)

**Validation:** Inline validation in API route handlers; no validation library (e.g., Zod). Types are asserted via `as` casts.

**Authentication:**
- Public routes: Club token in `x-club-token` header, validated by each Edge Function
- Admin routes: Cookie-based HMAC session, resolved by `resolveAdminIdentityFromRequest()`
- No middleware-level auth guard; each admin route must call identity resolution individually

**CORS:** Edge Functions set `Access-Control-Allow-Origin: *` with explicit allowed headers

---

*Architecture analysis: 2026-04-05*
