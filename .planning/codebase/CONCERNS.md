# Codebase Concerns

**Analysis Date:** 2026-04-05

## Tech Debt

**Massive Admin Page Component (God Component):**
- Issue: `src/app/admin/page.tsx` is 2329 lines with 65 `useState` calls managing 6 tab panels (accounts, players, club, automation, emails, splitwise) in a single component. This is the single largest file in the codebase and contains all admin UI logic monolithically.
- Files: `src/app/admin/page.tsx`
- Impact: Extremely difficult to maintain, test, or review changes. Any modification to one tab risks breaking another. No unit tests exist for this component's rendering logic.
- Fix approach: Extract each tab panel into its own component (e.g., `src/components/admin/PlayersTab.tsx`, `src/components/admin/SplitwiseTab.tsx`). Move shared state into a context or reducer. Each tab component should own its own state and data fetching.

**Duplicated Token Validation Across Edge Functions:**
- Issue: `timingSafeEqual`, `hashToken`, and `validateClubToken` functions are copy-pasted identically into 10 separate edge function files rather than imported from `_shared/`.
- Files:
  - `supabase/functions/validate-token/index.ts`
  - `supabase/functions/list-sessions/index.ts`
  - `supabase/functions/list-players/index.ts`
  - `supabase/functions/join-session/index.ts`
  - `supabase/functions/withdraw-session/index.ts`
  - `supabase/functions/get-session/index.ts`
  - `supabase/functions/set-session-guests/index.ts`
  - `supabase/functions/update-session-participation/index.ts`
  - `supabase/functions/list-receipt-errors/index.ts`
  - `supabase/functions/rotate-token/index.ts`
- Impact: A bug fix or security improvement to token validation must be applied to 10 files simultaneously. Drift between copies is likely over time.
- Fix approach: Move `timingSafeEqual`, `hashToken`, and `validateClubToken` into `supabase/functions/_shared/club-token.ts` and import from there. The `_shared/automation-auth.ts` already demonstrates this pattern works for Deno edge functions.

**Duplicated Type Definitions (No Shared Types):**
- Issue: Type definitions for sessions, players, and other domain objects are redefined inline in `src/app/admin/page.tsx` (16 type definitions), `src/app/sessions/sessions-client.tsx` (11 type definitions), and various edge functions. The `src/types/` directory exists but is empty.
- Files: `src/app/admin/page.tsx`, `src/app/sessions/sessions-client.tsx`, `src/types/` (empty)
- Impact: Type definitions drift between files. Changes to API response shapes require updating types in multiple locations.
- Fix approach: Define shared domain types in `src/types/` (e.g., `src/types/session.ts`, `src/types/player.ts`) and import them across components and API routes.

**Legacy Session View Still in Codebase:**
- Issue: `src/app/sessions-legacy/` contains a 1560-line legacy sessions client (`sessions-legacy-client.tsx`) that is only accessible in development mode (gated by `process.env.NODE_ENV === "development"` in `src/app/page.tsx`).
- Files: `src/app/sessions-legacy/sessions-legacy-client.tsx`, `src/app/sessions-legacy/page.tsx`
- Impact: Dead code in production that adds maintenance burden. The current sessions view (`src/app/sessions/`) and v2 view (`src/app/sessions-v2/`) are the active implementations.
- Fix approach: Remove `src/app/sessions-legacy/` entirely once confidence in the v2 session view is established. Also assess whether `src/app/sessions-v2/` (524 lines) is still needed or if `src/app/sessions/` has fully replaced it.

**Committed Temporary Verification Directories:**
- Issue: `.tmp_verify/` and `.tmp_verify2/` are git-tracked directories containing duplicated copies of Supabase edge function code. These appear to be leftover from a manual verification process.
- Files: `.tmp_verify/supabase/functions/`, `.tmp_verify2/supabase/functions/`
- Impact: Clutters the repository and can cause confusion about which code is canonical. These files will rot over time as the real functions evolve.
- Fix approach: Delete `.tmp_verify/` and `.tmp_verify2/` and add them to `.gitignore`.

## Security Considerations

**Wildcard CORS on All Edge Functions:**
- Risk: Every Supabase edge function sets `Access-Control-Allow-Origin: "*"`, allowing any domain to call these APIs.
- Files: All 19 files in `supabase/functions/*/index.ts`
- Current mitigation: Functions require a valid club token (SHA-256 hashed and compared via timing-safe equality) or automation secret for authorization. The token-based auth provides the real access control.
- Recommendations: Consider restricting CORS to the actual deployment domain in production. While the token auth is solid, wildcard CORS combined with a leaked token would allow exploitation from any origin.

**No Rate Limiting:**
- Risk: No rate limiting exists on any API endpoint -- neither the Next.js API routes (29 route files in `src/app/api/`) nor the Supabase edge functions. Login endpoints, token validation, and ingestion triggers are all unprotected.
- Files: `src/app/api/admin/login/route.ts`, `supabase/functions/validate-token/index.ts`, all edge functions
- Current mitigation: None detected. Supabase may provide some platform-level rate limiting.
- Recommendations: Add rate limiting to at minimum the login route (`src/app/api/admin/login/route.ts`) and token validation endpoint to prevent brute-force attacks. Consider using Supabase's built-in rate limiting or a middleware-based approach.

**Breakglass Admin Access via Environment Variables:**
- Risk: The breakglass admin mechanism stores credentials as plaintext environment variables (`ADMIN_BREAKGLASS_USERNAME`, `ADMIN_BREAKGLASS_PASSWORD`), bypassing the database-backed admin user system and its session versioning protections.
- Files: `src/lib/admin-breakglass.ts`, `src/middleware.ts` (lines 61-69)
- Current mitigation: Must be explicitly enabled via `ENABLE_ADMIN_BREAKGLASS=true`. The breakglass session is validated on every request via middleware.
- Recommendations: Ensure breakglass is disabled in production unless during emergency recovery. Consider adding logging/alerting when breakglass access is used.

## Performance Bottlenecks

**Per-Request Database Lookup in Middleware:**
- Problem: Every request to `/admin/*` or `/api/admin/*` triggers a direct fetch to Supabase REST API to validate the admin user's active status and session version.
- Files: `src/middleware.ts` (lines 8-35, function `loadAdminUserForMiddleware`)
- Cause: The middleware makes a network call to `SUPABASE_URL/rest/v1/admin_users` on every admin page navigation and API call, with `cache: "no-store"`.
- Improvement path: Consider caching the admin user validation for a short TTL (e.g., 60 seconds) or embedding critical claims in the session token itself. The session already contains `sv` (session_version) which could be validated less frequently against the database.

**Large Client-Side Bundle for Admin:**
- Problem: The admin page is a single "use client" component with 2329 lines. All tab panel code, all state, and all fetch logic ships to the client even if only one tab is viewed.
- Files: `src/app/admin/page.tsx`
- Cause: Monolithic client component with no code splitting.
- Improvement path: Split tab panels into separate dynamic imports using `next/dynamic` with `ssr: false`. Each tab's code would only load when that tab is activated.

## Fragile Areas

**Edge Function Token Validation:**
- Files: All `supabase/functions/*/index.ts` files that include inline `validateClubToken`
- Why fragile: The identical ~40-line token validation block is copy-pasted across 10 edge functions. If the `club_settings` table schema changes (e.g., column rename), or the hashing algorithm needs to be updated, every file must be updated in lockstep.
- Safe modification: Any change to token validation logic must be applied to all 10 files simultaneously. Search for `validateClubToken` and `hashToken` across all edge functions.
- Test coverage: Only `supabase/functions/_shared/automation-auth.ts` is tested (via `tests/ingestion-automation.test.ts`). The inline `validateClubToken` implementations in individual edge functions have no tests.

**Session State Machine:**
- Files: `supabase/functions/close-session/index.ts`, `supabase/functions/run-splitwise-sync/index.ts`, `supabase/functions/join-session/index.ts`, `supabase/functions/withdraw-session/index.ts`
- Why fragile: Session status transitions (open -> closed -> splitwise_synced) are enforced via ad-hoc status string checks scattered across multiple edge functions with no centralized state machine definition.
- Safe modification: Review all edge functions that modify `sessions.status` or `sessions.splitwise_status` before adding new states or transitions.
- Test coverage: No integration tests exist for the session lifecycle. Only utility functions are unit-tested.

## Scaling Limits

**Single Admin Page Component:**
- Current capacity: 6 tab panels (accounts, players, club, automation, emails, splitwise) in one component.
- Limit: Adding more admin features will push the file past readability limits. At 2329 lines, it is already at the threshold.
- Scaling path: Component decomposition as described in the tech debt section.

**Edge Function Duplication:**
- Current capacity: 10 edge functions with duplicated auth code.
- Limit: Each new edge function that requires club token auth requires copying ~40 lines of boilerplate.
- Scaling path: Extract shared auth into `_shared/club-token.ts`.

## Dependencies at Risk

**React 18 with Next.js 16:**
- Risk: `react` and `react-dom` are pinned to `^18.3.1` while `next` is `^16.1.6`. Next.js 16 likely expects React 19. This mismatch may cause subtle issues with server components, streaming, or concurrent features.
- Impact: Build warnings, potential runtime issues with newer Next.js features.
- Migration plan: Upgrade React to 19 or ensure Next.js 16 compatibility with React 18 is confirmed.

## Test Coverage Gaps

**No Tests for Edge Functions:**
- What's not tested: The actual request handling logic of all 19 Supabase edge functions. Only the shared utility modules (`_shared/automation-auth.ts`, `_shared/ingestion-utils.ts`, `_shared/splitwise-utils.ts`) have tests.
- Files: All `supabase/functions/*/index.ts` files
- Risk: Token validation, authorization flows, database mutations, and API integrations (Gmail, Splitwise) are untested. Regressions in edge function behavior would not be caught.
- Priority: High -- these functions handle all data mutations and external API calls.

**No Tests for Admin UI:**
- What's not tested: The entire `src/app/admin/page.tsx` (2329 lines) has no component tests. No tests exist for any of the 29 API route handlers in `src/app/api/`.
- Files: `src/app/admin/page.tsx`, `src/app/api/admin/*/route.ts`
- Risk: Admin operations (player management, session management, ingestion, splitwise sync) have no automated verification.
- Priority: Medium -- admin operations are behind authentication and used by a small set of users.

**No Tests for Sessions Client:**
- What's not tested: The main user-facing component `src/app/sessions/sessions-client.tsx` (1050 lines) and `src/app/sessions/[id]/session-detail-client.tsx` (198 lines) have no component or integration tests. Only the utility functions they import are tested.
- Files: `src/app/sessions/sessions-client.tsx`, `src/app/sessions/[id]/session-detail-client.tsx`
- Risk: User-facing session join/withdraw/participation flows could break without detection.
- Priority: High -- this is the primary user-facing feature.

**No E2E Tests:**
- What's not tested: No end-to-end test framework is configured. No Playwright, Cypress, or similar tool is present.
- Risk: Full user flows (token validation -> session listing -> join -> withdraw) are never tested as a whole.
- Priority: Medium -- unit tests on utilities cover some logic, but integration between frontend and edge functions is untested.

---

*Concerns audit: 2026-04-05*
