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
- [x] Upgrade Playtomic parser to extract Date/Time/Club/Court/Paid format with MM/DD primary date parsing and DD/MM fallback, including regression coverage for ambiguous dates like `5/2/26`, `5/9/26`, and `5/30/26`.
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
- [x] Sessions desktop table cleanup: remove the standalone `Day` column and keep a single `Date` column in desktop view (test rationale: covered by `npm run lint` + `npm run typecheck`; manual browser verification required on `/sessions` desktop breakpoint).
- [x] Ingestion transport migration: switch admin preview/manual ingestion routes to Gmail Apps Script bridge webhook (`manual_ingest`/`preview`), add bridge env contract + script template, disable scheduled GitHub ingestion trigger, and keep Supabase Gmail OAuth flow for rollback only (tests: `tests/admin-ingestion-run-route.test.ts`, `tests/admin-ingestion-preview-route.test.ts`; plus `npm run lint` + `npm run typecheck` + `npm run test`; manual browser verification required for Admin Automation run + Email Preview load and Apps Script daily trigger).
- [x] Ingestion run-history continuity for Apps Script bridge: add `log-ingestion-run` Supabase function and call it from Apps Script daily/manual ingestion path so Admin Automation history remains populated after cron migration (test rationale: covered by `npm run lint` + `npm run typecheck` + `npm run test`; manual verification required in Supabase `automation_run_history` after daily trigger + Admin manual run).
- [x] OPEN badge desync polish: add deterministic per-session flicker vars (`delay`, `duration`, `glow opacity`) so OPEN badges are visually out of sync while staying stable across refreshes/devices (tests: `tests/open-badge-motion.test.ts`; plus `npm run lint` + `npm run typecheck` + `npm run test`; manual browser verification required for desktop/mobile OPEN badge desync and reduced-motion behavior).
- [x] Sessions V2 migration on `/sessions`: replace legacy table/cards with V2 card + dialog UI, wire live session/player/join/withdraw/guest/admin create-edit-delete data flows, keep `/sessions-v2` as backup, show avatars-only participants, and apply admin Past-tab DRAFT visibility (tests: `tests/sessions-v2-view.test.ts`; plus `npm run typecheck` + `npm run lint` + `npm run test`; manual browser verification required for public filters, admin DRAFT edit path, and dialog UX).
- [x] Admin page V2 theme revamp: apply Session V2 visual theme to `/admin` (background mesh, card/form/table/button restyle, dark dropdown menu colors) with no logic/API/state changes (tests: `npm run typecheck` + `npm run lint` + `npm run test`; manual browser verification required for all admin tabs).
- [x] Admin Players tab UX redesign: restructure `/admin` Players tab into Roster Summary + Add Player + Players Workspace (Active/Inactive), keep existing player handlers/APIs intact, add progressive disclosure (`Show/Hide Advanced`) for avatar + Splitwise/default-payer controls, and improve accessibility/touch states (`focus-visible`, labels/names, loading copy with ellipsis) (tests: `npm run typecheck` + `npm run lint` + `npm run test`; manual browser verification required for add/rename/deactivate/reactivate, advanced toggle behavior, avatar upload/remove, splitwise/default-payer updates, keyboard navigation, and mobile layout).
- [x] Access Denied mobile fit: constrain `/access-denied` to viewport height (`100dvh`) and use responsive lock/title/message sizing so mobile screens do not require scrolling; hide decorative floating emoji on mobile (tests: `npm run typecheck` + `npm run lint`; manual browser verification required on small/medium/large mobile screens).
- [x] Safari iPhone top-bar color fix (whole app): add root App Router `viewport` metadata (`themeColor`, `viewportFit=cover`, `colorScheme=dark`) and first-paint dark fallback backgrounds on `html`/`body` so Safari chrome/status area matches V2 background (tests: `npm run typecheck` + `npm run lint` + `npm run test`; manual iPhone Safari verification required for `/sessions`, `/admin`, and `/access-denied`).
- [x] Access denied route switch: update token-gate redirects from `/denied` to `/access-denied` for sessions list/detail, and keep `/denied` as compatibility redirect to `/access-denied` (tests: `npm run typecheck` + `npm run lint` + `npm run test`; manual browser verification required for invalid/missing token flows).
- [x] Session gate resilience: treat only explicit token-invalid responses as Access Denied; keep stored token on transient validation errors and show retry state on `/sessions` to prevent false denies during repeated refreshes (tests: `npm run typecheck` + `npm run lint` + `npm run test`; manual browser verification required by throttling/offline refresh and restoring network).
- [x] Mobile sessions scroll-freeze fix: remove duplicate body scroll-lock from `/sessions` client and keep a single lock owner in `PlayerSelectionDialog` with overflow + overscroll cleanup to avoid stuck `overflow:hidden` state on iOS Safari (tests: `npm run typecheck` + `npm run lint` + `npm run test`; manual mobile verification required by repeatedly open/close Select Players dialog and confirming page scroll always recovers).
- [x] iOS Safari black-rectangle mitigation for Sessions: scope compositor-safe fallbacks to `/sessions` + `/sessions-v2` (`v2-ios-safari-safe`), remount animated layers on resume (`visibilitychange/pageshow/focus`), and reduce high-risk fixed+blur/backdrop combinations on mobile iOS while preserving V2 look (tests: `npm run typecheck` + `npm run lint` + `npm run test`; manual iPhone Safari verification required for lock/app-switch resume cycles and dialog open/close flows).
- [x] Home page V2 visual revamp: migrate `/` from legacy card style to current Session V2 visual language (animated background, neon palette, V2 typography/buttons) while keeping existing navigation intent (`/sessions`, `/admin/login`) unchanged (tests: `npm run typecheck` + `npm run lint` + `npm run test`; manual browser verification required for desktop/mobile rendering).
- [x] Sessions confetti replay + lag fix on mobile resume/tap: keep iOS artifact background remount fallback but stop remounting `Confetti` on render-epoch changes, remove `focus`-based epoch bumps, and dedupe resume-trigger bumps (`visibilitychange` + persisted `pageshow`) so confetti only fires on actual submit events (tests: `npm run typecheck` + `npm run lint` + `npm run test`; manual mobile verification required for submit->app-switch->return cycles on Safari/Chrome).
- [x] Sessions black-rectangle fallback expansion: broaden compositor-safe fallback CSS from iOS-only to all mobile browsers on `/sessions` + `/sessions-v2` (keep scope via `v2-ios-safari-safe` class), reducing fixed/blur compositing risk in Chrome mobile as well (tests: `npm run typecheck` + `npm run lint` + `npm run test`; manual mobile verification required on iOS Safari and Android Chrome app-switch/lock-resume cycles).
- [x] Submit speed + smooth UX for player updates on `/sessions`: add consolidated `update-session-participation` Edge endpoint and client wrapper, switch submit flow to single-call path with 404 legacy fallback, close dialog immediately on success, patch local state, run non-blocking background refresh, and add dev timing logs (`submit_clicked -> api_done -> dialog_closed`) (tests: `tests/session-participation-submit.test.ts`, `tests/edge-update-session-participation.test.ts`; plus `npm run typecheck` + `npm run lint` + `npm run test`; manual mobile verification required for perceived speed and error/retry flows).
- [x] Preserve old Sessions UI at `/sessions-legacy` while keeping `/sessions` on V2 (copy legacy client into isolated route, add development-only homepage link, and avoid touching `sessions-v2` route ownership) (test rationale: route-level behavior validated by `npm run typecheck` + `npm run lint` and manual browser checks for `/sessions` unchanged plus `/sessions-legacy` load; no new unit tests added because this is route wiring and code-preservation, not new domain logic).
- [x] Fix player selection modal cutoff for >9 players by keeping a 3-column grid with internal player-list scrolling and always-visible action footer (`/sessions`, `/sessions-v2`, `/sessions-legacy`) (test rationale: validated by `npm run typecheck` + `npm run lint` + `npm run test`; manual mobile verification required for 9-player no-scroll baseline, 10+ player internal scroll, sticky footer visibility, and no horizontal clipping).
- [x] Remove `Gmail Config` tab from Admin Console navigation and hide its panel from `/admin` while leaving backend Gmail config endpoints unchanged (test rationale: validated by `npm run typecheck` + `npm run lint` + `npm run test`; manual browser verification required to confirm tab is absent and other tabs still render).
- [x] Mobile resume black-rectangle mitigation (balanced mode): strengthen `/sessions` + `/sessions-v2` resume recovery by adding `visibilitychange/pageshow/focus` repaint remount pulse and reduce risky mobile compositor pressure via `v2-ios-safari-safe` mesh isolation + gentler gradient animation (keep visual style, no static-only fallback) (test rationale: validated by `npm run typecheck` + `npm run lint` + `npm run test`; manual mobile verification required for lock/unlock and tab-switch resume cycles on iPhone Safari + Android Chrome to confirm no top-left black rectangle).
- [x] Mobile black-rectangle stabilization (reliability-first): switch `/sessions` + `/sessions-v2` animated background to static mesh fallback on coarse-pointer mobile devices, disable mesh/blob motion in mobile compositor-safe CSS, and stop key-driven background remount reliance while keeping resume repaint hooks scoped by `v2-ios-safari-safe` (tests: `npm run typecheck` + `npm run lint` + `npm run test`; manual mobile verification required for iPhone Safari + Android Chrome fresh load, lock/unlock, app-switch resume, dialog open/close, and Upcoming/Past toggle flows).
- [x] Mobile rendering revision: restore animated background parity on `/sessions` + `/sessions-v2` (remove static-mobile mesh fallback path) and disable confetti canvas rendering on coarse-pointer mobile devices to reduce fixed-layer compositor risk while preserving desktop confetti behavior (tests: `npm run typecheck` + `npm run lint` + `npm run test`; manual mobile verification required for fresh load, join/drop submit, lock/unlock, app-switch, and Upcoming/Past toggle artifact checks).
- [x] Mobile confetti compositor-safe upgrade: keep confetti enabled on `/sessions` + `/sessions-v2` across devices, but convert to burst-only canvas lifecycle (mount during burst, auto-unmount when particles finish) and page-absolute overlay anchoring (`.v2-page`) instead of persistent fixed full-viewport canvas; include lighter particle profile on coarse-pointer mobile (tests: `npm run typecheck` + `npm run lint` + `npm run test`; manual mobile verification required for submit burst visibility, post-burst layer teardown, and lock/app-switch artifact checks).
- [x] Icon-system migration to Phosphor: replace `lucide-react` usage with local wrapper-based `@phosphor-icons/react` exports (Regular default), update app/component icon imports, and remove `lucide-react` dependency in same change (test rationale: validated by `npm run typecheck` + `npm run lint` + `npm run test` + `rg \"lucide-react\" src tests package.json package-lock.json` returning no matches; manual browser verification required for icon alignment/contrast on `/`, `/sessions`, `/sessions-v2`, `/sessions-legacy`, `/admin`, `/access-denied`).
- [x] Shuttlecock Splitwise extension: add `players.shuttlecock_paid`, Splitwise setting `shuttlecock_fee`, and multi-expense idempotency (`expenses.expense_type` with `COURT` + `SHUTTLECOCK`) so each CLOSED session can create optional shuttlecock redistribution expense in addition to court expense; update admin Players/Settings/Records APIs + UI accordingly (tests: `tests/splitwise-utils.test.ts`; plus `npm run typecheck` + `npm run lint` + `npm run test`; manual browser verification required for player toggle, settings save, records delete-by-expense-id, and splitwise run outcomes).
- [x] Splitwise notes + shuttlecock guest fix: include guest shares in SHUTTLECOCK charge math (guest owed assigned to session payer), add multi-line `details` note payload for COURT/SHUTTLECOCK, expose note in Admin Splitwise Records API/UI from `request_payload.details` (tests: `tests/splitwise-utils.test.ts`; plus `npm run typecheck` + `npm run lint` + `npm run test`; manual browser verification required for Splitwise app note visibility and Admin Records note column).
- [x] Phase 02 tab extraction: Accounts + Players moved into keep-mounted tab components with `page.tsx` as the eager/visited shell. Test rationale: manual parity verification required because the repo lacks DOM component-test infrastructure; validated with `npm test -- tests/admin-tab-extraction.test.ts tests/admin-formatters.test.ts tests/admin-email-preview-rerun.test.ts`, `npm run lint`, and `npm run typecheck`.
- [x] Phase 02 tab extraction: Club Access + Automation moved into keep-mounted tab components with `page.tsx` extending the eager/visited shell to preserve initial preload and hidden-tab state. Test rationale: manual parity verification required because eager preload and keep-mounted behavior are user-visible; validated with `npm test -- tests/admin-tab-extraction.test.ts tests/admin-formatters.test.ts tests/admin-email-preview-rerun.test.ts`, `npm run lint`, and `npm run typecheck`.

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
- [x] Email Preview per-email rerun: add `Re-run` button on `Not Ingested` rows to ingest only the clicked message ID (row-rerun mode), return per-message outcome payload from bridge (`INGESTED`/`DEDUPED`/`PARSE_FAILED`/`FETCH_FAILED`), keep row-level loading state, and show inline row result chip after auto-refresh with current query override (tests: `tests/admin-email-preview-rerun.test.ts`, `tests/admin-ingestion-run-route.test.ts`, `tests/gmail-apps-script-bridge.test.ts`; plus `npm run test` + `npm run lint` + `npm run typecheck`; manual browser verification required in Admin Email Preview tab).
- [x] Email Preview per-email rerun diagnostics: return row-level `debug` payload from `/api/admin/ingestion/run` + bridge `debug_entries`, persist per-message rerun logs in UI state, and render `Re-run Log` (summary + raw JSON) inside each email card after rerun (tests: `tests/admin-ingestion-run-route.test.ts`, `tests/gmail-apps-script-bridge.test.ts`; plus `npm run test` + `npm run lint` + `npm run typecheck`; manual browser verification required in Admin Email Preview tab).
- [x] Fix admin session create/list compatibility for DBs missing `sessions.location` (API writes avoid `location`; list-sessions retries without `location`), streamline session/court form inputs to time-only 15-minute blocks, and add mobile-first session cards plus logged-in admin navbar with logout (test rationale: covered by `npm test` + `npm run lint` + `npm run typecheck`; browser repro required for final confirmation).
- [x] Harden session create/edit/list compatibility for DBs missing `sessions.remarks` and improve dark-mode contrast in court form controls (test rationale: covered by `npm test` + `npm run lint` + `npm run typecheck`; browser repro required for final confirmation).
- [x] Add withdraw validation for not-joined players (named error message), auto-close join/withdraw dialog on completion, restore location input with schema-safe API fallbacks, and upgrade sessions UI (toggle-style player selection, orange withdraw button, fee column, centered rows, sort controls, and past-session toggle with OPEN-only default) (test rationale: covered by `npm test` + `npm run lint` + `npm run typecheck`; browser repro required for final confirmation).
- [x] Update player action dialog to single-submit toggle flow (joined defaults on, in-dialog red errors on failure, no close on failure), set Sessions list action button green, and push missing `location/remarks` migration to remote DB (test rationale: covered by `npm test` + `npm run lint` + `npm run typecheck`; DB schema validated via `supabase db push` applying `20260209120000_add_session_fields.sql`).
- [x] Light/dark mode toggle with localStorage persistence.
- [x] Manual test steps documented in README.
