# Codebase Concerns

**Analysis Date:** 2026-04-05

## Tech Debt

**Monolithic Admin Page (2,329 lines, 65 useState calls):**
- Issue: `src/app/admin/page.tsx` is a single "use client" component containing all admin functionality (players, automation, emails, splitwise, club tokens, accounts) with 65 `useState` hooks and 16 inline type definitions.
- Files: `src/app/admin/page.tsx`
- Impact: Extremely difficult to maintain, test, or modify any single admin feature without risk of breaking others. State management is fragile; adding features compounds complexity exponentially.
- Fix approach: Extract each tab (players, automation, emails, splitwise, club) into its own component file under `src/components/admin/`. Move shared types to `src/types/admin.ts`. Use a reducer or context for related state groups.

**Legacy Sessions View Still in Codebase (1,560 lines):**
- Issue: `src/app/sessions-legacy/` contains a full 1,560-line sessions client that duplicates types and logic from the current `src/app/sessions/sessions-client.tsx` (1,050 lines). Both define `GateState`, `StoredTokenResult`, `SessionSummary`, `Player` types independently.
- Files: `src/app/sessions-legacy/sessions-legacy-client.tsx`, `src/app/sessions-legacy/page.tsx`
- Impact: Dead code that increases bundle analysis noise and creates maintenance confusion. Divergent type definitions could mask bugs if the wrong view is accidentally served.
- Fix approach: Delete `src/app/sessions-legacy/` entirely after confirming no routes link to it.

**Sessions V2 Prototype with Hardcoded Mock Data:**
- Issue: `src/app/sessions-v2/page.tsx` (524 lines) contains hardcoded `mockSessions` and `mockAllPlayers` arrays with fake data. Comment on line 15 reads "Mock data - replace with actual data fetching". This is shipping placeholder code.
- Files: `src/app/sessions-v2/page.tsx`
- Impact: This page is accessible in production but shows fake data. If users navigate to `/sessions-v2` they see mock sessions.
- Fix approach: Either wire up real data fetching (using `listSessions` from `src/lib/edge.ts`) or remove the route entirely if it was a design prototype.

**Duplicate Type Definitions Across Views:**
- Issue: `Player`, `SessionSummary`, `GateState`, `StoredTokenResult` types are independently defined in `src/app/sessions/sessions-client.tsx`, `src/app/sessions-legacy/sessions-legacy-client.tsx`, and `src/app/admin/page.tsx`. No shared types directory is used (the `src/types/` directory exists but is empty or unused).
- Files: `src/app/sessions/sessions-client.tsx`, `src/app/sessions-legacy/sessions-legacy-client.tsx`, `src/app/admin/page.tsx`
- Impact: Type drift between views. When the database schema changes, each file must be updated independently, risking inconsistencies.
- Fix approach: Create shared type modules in `src/types/` (e.g., `src/types/session.ts`, `src/types/player.ts`) and import from there.

**Committed Temporary Verification Directories:**
- Issue: `.tmp_verify/` and `.tmp_verify2/` directories are tracked in git. They contain duplicated Supabase function files and a `.temp/cli-latest` file. These are build/verification artifacts that should not be committed.
- Files: `.tmp_verify/`, `.tmp_verify2/`
- Impact: Repo clutter, confusing for new contributors, wastes git history.
- Fix approach: Add `.tmp_verify*` to `.gitignore` and remove from tracking with `git rm -r --cached .tmp_verify .tmp_verify2`.

**Massive CSS File (2,091 lines):**
- Issue: `src/app/globals-v2.css` is 2,091 lines of hand-written CSS defining a complete theme system, animations, and component styles. This duplicates and conflicts with the Tailwind-based approach used in `src/app/globals.css` (324 lines).
- Files: `src/app/globals-v2.css`, `src/app/globals.css`
- Impact: Two competing styling systems. The V2 CSS uses CSS custom properties extensively while the rest of the app uses Tailwind utility classes. Changes to one may not propagate to the other.
- Fix approach: Migrate the V2 CSS custom properties to `tailwind.config.ts` theme extensions. Convert component-specific CSS to Tailwind utilities or CSS modules.

## Security Considerations

**Admin Auth Relies Solely on Middleware:**
- Risk: All 29 admin API routes under `src/app/api/admin/` are protected by middleware in `src/middleware.ts` (matcher: `/admin/:path*`, `/api/admin/:path*`). Most routes do NOT perform their own auth checks -- they trust middleware handled it. Only a few routes (like `src/app/api/admin/accounts/route.ts`) additionally call `resolveAdminIdentityFromRequest`.
- Files: `src/middleware.ts`, all routes under `src/app/api/admin/`
- Current mitigation: The middleware validates the `admin_session` cookie, checks the HMAC signature, verifies the admin user is active, and checks `session_version`. This is a sound design -- Next.js middleware runs before route handlers.
- Recommendations: Consider adding route-level auth checks in sensitive routes (account management, token rotation, session deletion) as defense-in-depth. If middleware is ever misconfigured or the matcher pattern changes, all admin routes become unprotected.

**No Rate Limiting on Login Endpoint:**
- Risk: `src/app/api/admin/login/route.ts` has no rate limiting or brute-force protection. An attacker can attempt unlimited password guesses.
- Files: `src/app/api/admin/login/route.ts`
- Current mitigation: Passwords are validated with `verifyPassword` (using scrypt-based hashing per `src/lib/password-hash.ts`), and the password policy requires min 10 chars with letters and numbers. Breakglass credentials are env-var based.
- Recommendations: Add rate limiting (e.g., IP-based throttle via middleware or an edge function). Even basic "lock after N failed attempts" would help.

**Club Token as URL Parameter:**
- Risk: The club access token is passed as a URL query parameter (`?t=<token>`). URL parameters are logged in browser history, server access logs, analytics tools, and HTTP referrer headers.
- Files: `src/app/sessions/sessions-client.tsx` (token extraction from URL), `src/app/admin/page.tsx` (line 269: builds access link with `?t=${token}`)
- Current mitigation: The token is copied to `localStorage` and the URL parameter is cleaned. The token is rotatable.
- Recommendations: Consider using a short-lived redirect through a POST endpoint that sets an httpOnly cookie instead.

**dangerouslySetInnerHTML in Root Layout:**
- Risk: `src/app/layout.tsx` line 40 uses `dangerouslySetInnerHTML` to inject a theme-initialization script.
- Files: `src/app/layout.tsx`
- Current mitigation: The injected content is a hardcoded string constant (`themeScript`), not user input. This is safe.
- Recommendations: No action needed -- this is a standard Next.js pattern for avoiding FOUC.

## Performance Bottlenecks

**Admin Page Initial Load - 5 Parallel API Calls:**
- Problem: `src/app/admin/page.tsx` fires 5 `fetch()` calls in a `Promise.all` on mount (players, automation settings, receipt errors, club token, splitwise settings).
- Files: `src/app/admin/page.tsx` (lines 280-286)
- Cause: All admin data is loaded eagerly regardless of which tab is active.
- Improvement path: Lazy-load data per tab. Only fetch players data when the "players" tab is active, splitwise data when the "splitwise" tab is active, etc.

**Splitwise Sync Processes Sessions Sequentially:**
- Problem: `supabase/functions/run-splitwise-sync/index.ts` (873 lines) processes each session in a `for` loop, making sequential Splitwise API calls for each session's court and shuttlecock expenses.
- Files: `supabase/functions/run-splitwise-sync/index.ts`
- Cause: Each session requires multiple Supabase queries and Splitwise API calls done serially.
- Improvement path: Batch Supabase reads where possible. Consider parallel processing for independent sessions (with Splitwise API rate limit awareness).

## Fragile Areas

**Session Participation Submit Flow:**
- Files: `src/lib/session-participation-submit.ts`, `src/app/sessions/sessions-client.tsx`, `supabase/functions/update-session-participation/index.ts`
- Why fragile: The participation update involves computing a diff between current and desired state, building a payload, calling an edge function, then optimistically updating local state. The diff logic in `session-participation-submit.ts` must stay in sync with the edge function's expectations.
- Safe modification: Always run `tests/session-participation-submit.test.ts` and `tests/edge-update-session-participation.test.ts` after changes. Test both join and withdraw flows.
- Test coverage: Has dedicated tests, but no integration test covering the full client-to-edge-function flow.

**Ingestion Pipeline (Gmail to Sessions):**
- Files: `supabase/functions/run-ingestion/index.ts`, `supabase/functions/fetch-gmail-receipts/index.ts`, `supabase/functions/ingest-receipts/index.ts`, `supabase/functions/_shared/ingestion-utils.ts`
- Why fragile: Multi-step pipeline: fetch Gmail -> parse receipt HTML -> extract session data -> create session record. Changes to Gmail email format break parsing silently. The parser in `_shared/ingestion-utils.ts` (361 lines) uses regex/string matching on email body content.
- Safe modification: Add test fixtures in `docs/ingestion/fixtures/` for any new email format. Run `tests/ingestion-automation.test.ts` and `tests/ingestion-preview.test.ts`.
- Test coverage: Has unit tests for parsing, but no tests with real Gmail API responses.

**Mobile Rendering Stability:**
- Files: `src/app/sessions/sessions-client.tsx` (lines 230-237)
- Why fragile: The sessions client uses `renderEpoch`, `resumeRepaintPulse`, `repaintRafOneRef`, and `repaintRafTwoRef` -- multiple refs and state variables dedicated to forcing re-renders on mobile resume. This suggests underlying rendering issues that were patched over.
- Safe modification: Test on iOS Safari and Android Chrome after any layout or animation changes.
- Test coverage: No automated mobile rendering tests.

## Missing Critical Features

**No Error Boundaries:**
- Problem: No `error.tsx` or `not-found.tsx` files exist anywhere in the app directory tree. There are no React error boundaries.
- Blocks: Any unhandled runtime error in a client component crashes the entire page with no recovery path. Users see a blank screen.

**No Loading States at Route Level:**
- Problem: No `loading.tsx` files exist in any route segment. All loading states are manually managed with `useState` flags.
- Blocks: No Suspense-based streaming. Route transitions show no loading indicator until client-side JS hydrates and manages its own loading state.

## Test Coverage Gaps

**Zero Tests for Admin Page UI:**
- What's not tested: The 2,329-line `src/app/admin/page.tsx` has no tests. None of the admin UI interactions (tab switching, player CRUD, token rotation, splitwise configuration) are tested.
- Files: `src/app/admin/page.tsx`
- Risk: Any refactoring of the admin page could silently break critical admin workflows.
- Priority: Medium (admin-only feature, but high-impact if broken)

**No Tests for 29 API Routes:**
- What's not tested: Only 2 API route test files exist (`tests/admin-ingestion-run-route.test.ts`, `tests/admin-ingestion-preview-route.test.ts`). The remaining 27 API routes under `src/app/api/admin/` have no tests.
- Files: All routes under `src/app/api/admin/` except ingestion routes
- Risk: Session CRUD, player management, splitwise settings, account management, and token rotation could break without detection.
- Priority: High (these are data-mutating endpoints)

**No Tests for Supabase Edge Functions:**
- What's not tested: All 18 Supabase edge functions under `supabase/functions/` have no tests. The shared utilities in `supabase/functions/_shared/` are partially covered by `tests/splitwise-utils.test.ts` but the function handlers themselves are untested.
- Files: All files under `supabase/functions/`
- Risk: The splitwise sync (873 lines) and ingestion pipeline are the core automation features and have no handler-level tests.
- Priority: High

**No E2E Tests:**
- What's not tested: No end-to-end testing framework (Playwright, Cypress) is configured. The complete user journey (access with token -> view sessions -> join session) has no automated test.
- Files: N/A
- Risk: Integration issues between frontend, API routes, and edge functions go undetected.
- Priority: Medium

## Dependencies at Risk

**React 18 with Next.js 16:**
- Risk: `package.json` specifies `react@^18.3.1` while using `next@^16.1.6`. Next.js 16 may expect React 19. This version mismatch could cause subtle issues with server components and the new React features Next.js 16 relies on.
- Impact: Potential hydration mismatches, missing features, or deprecation warnings.
- Migration plan: Upgrade React to 19.x to match Next.js 16 expectations, or pin Next.js to a version compatible with React 18.

---

*Concerns audit: 2026-04-05*
