# Tasks

## Delivery Plan
### Immediate Next Actions
- DB schema + migrations.
- Gmail parsing contract (receipt parser interface + failure handling).
- Session creation cron vertical slice (ingestion -> session upsert).

### Build Order
- DB
- Gmail/cron
- Public view
- Join/withdraw
- Admin
- Splitwise

## Build Order (Supabase)
1) DB schema + constraints + RLS + seed
2) Club access token model + Edge Function gates (Access Denied if invalid/missing)
3) Email ingestion cron -> sessions in DB
4) Read-only Sessions page (token required)
5) Join/Withdraw (Edge Functions, token required)
6) Admin console (rotate token, edit sessions, fix drafts)
7) Splitwise integration + manual end + daily close cron

### Milestones
- M1 Automation
- M2 Public RSVP
- M3 Admin
- M4 Splitwise

## Bootstrap Tasks (Done)
- [x] Initialize repo structure and configs.
- [x] Add baseline lint, format, typecheck, and test scaffolding.
- [x] Create core documentation and templates.

## Next Tasks
- [x] Define tables + relationships.
- [x] Define RLS policies (public read, controlled write, admin full).
- [x] Create initial SQL migrations.
- [x] Document DB constraints + indexes (sessions, receipts, participants).
- [x] Define club access token model (hashing + rotation).
- [x] Add Edge Function auth gate contract (Access Denied if missing/invalid).
- [x] Add rotate-token Edge Function (server-generated token).
- [x] Add minimal admin page for token rotation.
- [x] Add list-sessions Edge Function (read-only).
- [x] Wire /sessions to list-sessions Edge Function.
- [x] Add get-session Edge Function (read-only detail).
- [x] Add /sessions/[id] detail page.
- [x] Add temporary seed session for M2 validation.
- [x] Draft Gmail parsing contract (receipt parser interface + failure handling).
- [x] Create ingestion cron Edge Function (receipt -> session upsert).
- [x] Add receipt parse failure -> DRAFT session + admin notification stub.
- [x] Add receipt dedupe rules (gmail_message_id) + idempotency notes.
- [x] Add ingestion test fixtures for Playtomic HTML.
- [x] Add cron schedule config (5x/day + daily close).
- [x] Add Gmail fetch Edge Function (list message IDs/snippets).
- [x] Add Gmail setup doc + fetch test script.
- [x] Store Gmail OAuth secrets in Supabase.
- [x] Wire Gmail fetch -> receipt ingestion (HTML extraction).
- [x] Add run-ingestion Edge Function to call ingest-receipts.
- [x] Create Edge Function skeletons (join, withdraw, close-session).
- [x] Define Sessions page data contract (read-only, token required).
- [x] Draft join/withdraw rules and validation.
- [x] Add join/withdraw UI stub (dialog + list selection).
- [x] Add admin error visibility stub (ingestion failures).
- [x] Outline Splitwise integration flow + idempotency strategy.
- [x] Implement join-session/withdraw-session/close-session Edge Functions.
- [x] Add admin errors Edge Function + UI.
- [x] Add join/withdraw wiring from UI to Edge Functions.
- [x] Add session close UI + wiring.
- [x] Add list-players Edge Function + seed players.
- [x] Verify join/withdraw end-to-end with seeded players.
- [x] Splitwise integration (API calls + expense idempotency) + daily close/sync cron + admin settings/mapping UI (tests: `tests/splitwise-utils.test.ts`; manual browser check required for admin Splitwise tab and session badges).
- [x] Splitwise admin UX follow-ups: per-session error table after sync, DB-backed description template, groups fetch tools (`get_groups`/`get_group`), Players mapping without full refresh, and Splitwise badge stacked under Status on Sessions page (tests: `tests/splitwise-utils.test.ts`; manual browser check required for admin Splitwise tab and group tools).
- [x] Dev-only admin session delete (UI + admin API). Test rationale: guarded by `NODE_ENV==='development'`, exercised manually in browser; covered by `npm run lint` + `npm run typecheck`.
- [x] Splitwise expense description enhancements: session date formatting + location replacement mapping in `splitwise_settings`, wired through admin UI and Edge sync (tests: `tests/splitwise-utils.test.ts`).
- [x] Admin Splitwise records viewer + delete (local `expenses` table) with guard against deleting CREATED+Splitwise-ID records (test rationale: covered by `npm run lint` + `npm run typecheck`; manual browser check required).
- [x] Session payer override: explicit `sessions.payer_player_id` defaulted from global default payer across create/edit/ingestion + Splitwise payer precedence update (test rationale: covered by `npm test` + `npm run lint` + `npm run typecheck`; manual browser check required for edit-modal payer dropdown and Splitwise payer override behavior).
- [x] Fix payer reopen behavior by redeploying `list-sessions` with `payer_player_id` in response, and switch Splitwise payload `date` to API runtime `now` (test rationale: covered by `npm run lint` + `npm run typecheck`; verified via direct Edge response showing `payer_player_id` on sessions).
- [x] Add Vitest coverage for admin session cookie signing and token hashing (required by MVP).
- [x] Add admin session cookie signing tests.
- [x] Add token hashing helper tests.
- [x] Add automation settings model for receipt keyword filters + timezone.
- [x] Add dedicated automation secret auth for ingestion endpoints.
- [x] Add daily scheduler workflow (GitHub Actions) for `run-ingestion`.
- [x] Add admin automation controls (keyword config + manual run + parse failure queue).
- [x] Add admin email preview page for fetched Gmail content (text/HTML) via `fetch-gmail-receipts` proxy endpoint.
- [x] Upgrade Playtomic parser to extract Date/Time/Club/Court/Paid format with DD/MM primary date parsing and MM/DD fallback.
- [x] Enforce same-day location consistency during receipt merge (conflicts become `parse_failed` + DRAFT handling).
- [x] Add ingestion aggregation logic for same-day receipts (sum fee + deterministic courts).
- [x] Add unit tests for automation auth, query builder, timezone conversion, and aggregation.
- [x] Add backward-compatible club token admin API behavior for missing `token_value` migration, with warning metadata and hash-only rotate fallback.
- [x] Add unit tests for club token compatibility helpers (missing-column detection, token normalization, warning messages).
- [x] Replace hardcoded admin credentials with DB-backed account auth (`admin_users`), session-version cookie revocation checks, break-glass fallback, and Admin Accounts CRUD/reset/change-password UI (tests: `tests/admin-session.test.ts`, `tests/password-hash.test.ts`, `tests/admin-account-safety.test.ts`; manual browser check required for `/admin` Accounts tab and break-glass banner behavior).
- [x] Sessions UX polish: global top-right theme toggle across pages, remove footer helper cards, and show participant count next to joined names in session rows (test rationale: covered by `npm run lint` + `npm run typecheck`; manual browser verification required on mobile/desktop Sessions and Admin pages).
- [x] Sessions mobile UX refinement: larger tap targets for action buttons, segmented `Upcoming | Past` toggle, fee-left/actions-right row layout, and compact time/courts formatting (`1:00 – 3:00 AM`, `A1 (1–2 AM)`) (test rationale: covered by `npm run lint` + `npm run typecheck`; manual browser verification required on mobile session cards).
- [x] Sessions motion polish: stronger tap-feedback transitions, staged entrance animation for controls/cards, skeleton-first loading state, and neon flicker effect for OPEN badges (test rationale: covered by `npm run lint` + `npm run typecheck`; manual browser verification required on mobile Safari/Chrome and reduced-motion settings).
- [x] Theme + neon follow-up: default app theme switched to dark for first-time users, OPEN neon badge glow softened in light theme only, and flicker cadence reduced with a 5-second no-flick hold after every two flicker cycles while keeping dark-theme neon style (test rationale: covered by `npm run lint` + `npm run typecheck`; manual browser verification required for first-visit theme and OPEN badge appearance in both themes).
- [x] Sessions desktop/mobile layout refinement: rebalance desktop column widths, stack time into two lines, move row icons to header, place Edit/Delete under Status, use mobile-style court formatting on desktop, and add Time/Location/Courts icons on mobile cards (test rationale: covered by `npm run lint` + `npm run typecheck`; manual browser verification required at desktop and mobile breakpoints).
- [x] Sessions icon polish: use emerald accent color for session icons and increase icon/content spacing in headers and mobile rows (test rationale: covered by `npm run lint` + `npm run typecheck`; manual browser verification required for visual alignment in desktop and mobile views).
- [x] Player avatars: add `players.avatar_path` + `player-avatars` storage bucket, admin upload/replace/remove endpoints/UI, session participant avatar stacks with tap-to-toggle names, and avatar rows in Join/Withdraw dialog (tests: `tests/player-avatar.test.ts`; plus `npm run lint` + `npm run typecheck` + `npm run test`; manual browser verification required for upload/replace/remove and participant toggle UX).
- [x] Guest-aware session UX + Splitwise math: 2-column square player cards in Join/Withdraw, guest control morph (`Add Guests` -> `+ / count / -`), session participant grids capped at 6 avatars per row with guest badge, `sessions.guest_count` persistence, new `set-session-guests` Edge function, `list-sessions` guest payload, and guest-share allocation to payer in Splitwise sync (tests: `tests/splitwise-utils.test.ts`, `tests/session-guests.test.ts`; plus `npm run lint` + `npm run typecheck` + `npm run test`; manual browser verification required for guest control transition and submit behavior).
- [x] Automation observability: add DB-backed `automation_run_history`, instrument ingestion/splitwise cron functions with run source/status/summary/error logging, expose Admin run-history query endpoints/UI in Automation + Splitwise tabs, and tag GitHub/manual triggers via `x-run-source` headers; also adjust OPEN badge no-flick hold from 5s to 4s (test rationale: covered by `npm run lint` + `npm run typecheck`; manual browser verification required for admin run-history tables and OPEN badge timing).

## MVP (Current)
- [x] Admin login with signed httpOnly cookie.
- [x] Admin Players CRUD (add, rename, deactivate/reactivate).
- [x] Sessions table UI with courts, participants, remarks, status.
- [x] Join/withdraw dialog for public users.
- [x] Admin create/edit session dialog + endpoints.
- [x] Club token rotation endpoint + invite link UI.
- [x] Move Admin Club Access current-link source from browser localStorage to DB-backed API, add admin Gmail config page (`/admin/gmail-config`) for Supabase-stored OAuth values, and load Gmail OAuth config from DB in Supabase Edge Functions with env fallback (test rationale: covered by `npm test` + `npm run lint` + `npm run typecheck`; browser repro required for admin page flows and ingestion run confirmation).
- [x] Harden token rotation/validation to select latest by `token_version` (fallback `created_at`) and guard admin rotation against Supabase URL mismatch to prevent Access Denied after rotation (test rationale: covered by `npm test`; edge-function integration validated manually via local admin rotate + remote `validate-token` call).
- [x] Prevent false Access Denied on `/sessions` when `api/admin-session` request fails; token validity is now the only access gate (test rationale: covered by `npm test` + `npm run lint`; manual repro expected in browser with network error simulation).
- [x] Parse invite token from `window.location.search` in client pages (`/sessions`, `/sessions/[id]`) to ensure `?t=...` is captured reliably in local dev (test rationale: covered by `npm test` + `npm run lint` + `npm run typecheck`; browser repro required for final confirmation).
- [x] Fix admin session create/list compatibility for DBs missing `sessions.location` (API writes avoid `location`; list-sessions retries without `location`), streamline session/court form inputs to time-only 15-minute blocks, and add mobile-first session cards plus logged-in admin navbar with logout (test rationale: covered by `npm test` + `npm run lint` + `npm run typecheck`; browser repro required for final confirmation).
- [x] Harden session create/edit/list compatibility for DBs missing `sessions.remarks` and improve dark-mode contrast in court form controls (test rationale: covered by `npm test` + `npm run lint` + `npm run typecheck`; browser repro required for final confirmation).
- [x] Add withdraw validation for not-joined players (named error message), auto-close join/withdraw dialog on completion, restore location input with schema-safe API fallbacks, and upgrade sessions UI (toggle-style player selection, orange withdraw button, fee column, centered rows, sort controls, and past-session toggle with OPEN-only default) (test rationale: covered by `npm test` + `npm run lint` + `npm run typecheck`; browser repro required for final confirmation).
- [x] Update player action dialog to single-submit toggle flow (joined defaults on, in-dialog red errors on failure, no close on failure), set Sessions list action button green, and push missing `location/remarks` migration to remote DB (test rationale: covered by `npm test` + `npm run lint` + `npm run typecheck`; DB schema validated via `supabase db push` applying `20260209120000_add_session_fields.sql`).
- [x] Light/dark mode toggle with localStorage persistence.
- [x] Manual test steps documented in README.
