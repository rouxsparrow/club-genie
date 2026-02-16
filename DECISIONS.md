# Decisions

## ADR-0001: Stack and Hosting
- Date: 2026-02-08
- Status: Accepted
- Decision: TypeScript + Node.js with a future Next.js App Router web app. Hosting on Vercel free tier with a Postgres-compatible database.
- Rationale: Matches team skill set, supports cron-based automation, and keeps deployment simple.

## ADR-0002: Cron Automation Model
- Date: 2026-02-08
- Status: Accepted
- Decision: Duplicate the session-creation logic across five identical cron jobs at 10:00, 13:00, 16:00, 19:00, and 23:00. Use a single closing cron at 23:00 with idempotent Splitwise creation.
- Rationale: Simplicity and resilience. Multiple runs reduce missed receipts without complex time branching.

## ADR-0003: Adopt Milestone-Driven Build Order
- Date: 2026-02-08
- Status: Accepted
- Decision: Build in milestones with a strict order: DB -> Gmail/cron -> public view -> join/withdraw -> admin -> Splitwise.
- Rationale: UI is postponed until automation works to avoid building flows without reliable ingestion. DB schema comes first to stabilize contracts and unblock ingestion/storage. Cron-based ingestion (5x/day) plus a daily close job ensures reliable automation before UI work.

## ADR-0004: Use Supabase (Postgres + RLS + Edge Functions) as Backend
- Date: 2026-02-08
- Status: Accepted
- Decision: Use Supabase Postgres with RLS and Edge Functions for backend storage, access control, and write operations.
- Rationale: Free tier friendly. RLS provides centralized security. Edge Functions handle write operations and cron endpoints cleanly.

## ADR-0005: Use Club-Level Access Token + Edge-Only Writes (No Per-Session Links)
- Date: 2026-02-08
- Status: Accepted
- Decision: Use a single club-level access token embedded in a shared link once and stored in localStorage. Missing/invalid token shows Access Denied (no input). Admin can rotate the token to invalidate old links. No direct DB access from the browser; Edge Functions enforce token + rules.
- Rationale: Simplifies access control and reduces link sprawl while keeping write operations centralized.
- Note: Store the token hashed in the database.

## ADR-0006: Use Daily GitHub Actions Scheduler + Dedicated Automation Secret for Gmail Ingestion
- Date: 2026-02-15
- Status: Accepted
- Decision: Run receipt ingestion once daily at 23:30 SGT (15:30 UTC) via GitHub Actions cron calling `run-ingestion`. Authenticate scheduler and admin manual ingestion with `AUTOMATION_SECRET` instead of the rotating club invite token.
- Rationale: Keeps automation stable when club tokens rotate, provides auditable runs/reruns on free tier, and matches end-of-day SLA.

## ADR-0007: Parse Real Playtomic Receipt Fields and Enforce Same-Location Merge per Session Date
- Date: 2026-02-15
- Status: Accepted
- Decision: Parse session date/time/location/court/paid amount directly from Playtomic email body format (`Date`, `Time`, `Club ... , Court`, `Paid ...`) using DD/MM primary with MM/DD fallback when DD/MM is invalid. Persist `parsed_location` and allow same-day aggregation only when location is consistent across successful receipts.
- Rationale: Matches real inbound receipt format and prevents silently merging receipts from different venues into one session.

## ADR-0008: Move Admin Club Token Display and Gmail OAuth Config to DB-backed Admin APIs
- Date: 2026-02-15
- Status: Accepted
- Decision: Persist latest raw club token in `club_settings.token_value` so admin can fetch current invite link from DB. Store Gmail OAuth config in `gmail_oauth_config` (singleton row) editable from `/admin/gmail-config`, and have ingestion/fetch Edge Functions read DB config first with env fallback.
- Rationale: Removes admin dependency on browser-local token state, centralizes Gmail integration settings in Supabase, and enables admin updates without redeploying function secrets.

## ADR-0009: Backward-Compatible Club Token APIs Across Partially-Migrated Environments
- Date: 2026-02-15
- Status: Accepted
- Decision: `club-token/current` and `club-token/rotate` must gracefully handle missing `club_settings.token_value` (Postgres `42703`) by returning warnings and falling back to hash-only rotation when needed.
- Rationale: Prevents admin-page breakage during staged deployments and allows token rotation continuity before migration completion.

## ADR-0010: Replace Hardcoded Admin Credentials with DB-backed Accounts + Session Version Revocation
- Date: 2026-02-16
- Status: Accepted
- Decision: Move admin auth from hardcoded credentials to `admin_users` (username/password hash), keep signed `admin_session` cookie, and embed account id + `session_version` in cookie payload so middleware can revoke sessions on password reset/deactivation. Keep a flag-gated break-glass env fallback for bootstrap/recovery only.
- Rationale: Removes static credentials from code, supports multi-admin operations, and enables immediate access revocation without waiting for cookie expiry.

## ADR-0011: Store Player Avatars in Public Supabase Storage with Admin-only Server Uploads
- Date: 2026-02-16
- Status: Accepted
- Decision: Add `players.avatar_path` and store avatar files in a public Supabase bucket `player-avatars` (2MB, jpeg/png/webp). Upload/replace/remove operations are exposed only through admin server routes; public/session payloads return computed `avatar_url` and fall back safely when the avatar migration is not yet applied.
- Rationale: Keeps avatar management simple for free-tier infra, avoids exposing service credentials in the browser, and supports graceful rollout in partially-migrated environments.

## ADR-0012: Model Guests as Session-level Count and Allocate Guest Shares to Session Payer
- Date: 2026-02-16
- Status: Accepted
- Decision: Add `sessions.guest_count` (0..20, default 0), editable by any club-token holder from Join/Withdraw UI and persisted only on submit. Keep guests anonymous (count only). In Splitwise sync, total shares become `participants + guests`; participant shares remain one-per-player while all guest shares are assigned to the resolved session payer (session override payer first, else default payer).
- Rationale: Supports real-world "bring guests" behavior without creating fake player identities, keeps UI simple for public users, and preserves deterministic split math for automation.

## ADR-0013: Persist Automation Run History in DB and Surface Query UI in Admin
- Date: 2026-02-16
- Status: Accepted
- Decision: Add `automation_run_history` to persist ingestion/splitwise run outcomes (`job_type`, `run_source`, `status`, `summary`, `error_message`, timing fields). `run-ingestion` and `run-splitwise-sync` write run records using service-role access. Admin tabs expose filtered run-history queries for both automation tracks.
- Rationale: Provides auditability for scheduled jobs on free-tier infrastructure, helps diagnose cron/manual differences quickly, and avoids relying on external CI logs as the only source of truth.

## ADR-0014: Move Receipt Fetch Scheduling from Supabase Gmail OAuth to Gmail Apps Script Bridge
- Date: 2026-02-16
- Status: Accepted
- Decision: Use a Gmail Apps Script bridge as the ingestion scheduler and email fetch source. The bridge runs daily via Apps Script trigger, pulls Gmail receipts, calls Supabase `ingest-receipts` with `AUTOMATION_SECRET`, applies a processed label, and logs summary records to `automation_run_history` via `log-ingestion-run`. Admin manual run and preview now call the bridge webhook (`manual_ingest` / `preview`) via server-only envs `APPS_SCRIPT_BRIDGE_URL` and `APPS_SCRIPT_BRIDGE_SECRET`. Keep existing Supabase Gmail OAuth functions as rollback path only.
- Rationale: Removes app-runtime dependency on Gmail refresh-token exchange (`gmail_token_failed` risk), keeps the stack within free-tier limits, preserves existing ingestion parsing contracts, and allows fast recovery with admin manual runs.

## Pending Decisions
- Player identity model (predefined list vs free-text vs hybrid).
- Session edit rules (post-close edits, participant locking, Splitwise regeneration).
- Error visibility/retention (where shown, raw email retention policy).
- Public write protection approach (auth vs session code vs edge-only).
