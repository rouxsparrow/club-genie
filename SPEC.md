# Specification

## Goal
Automate badminton club session management by ingesting Playtomic receipts, publishing sessions, handling player registration, and recording Splitwise expenses.

## Non-Goals
- Real-time court availability or booking.
- Payments collection or refunds.
- Multi-club support or complex roles.

## Personas
- Public Player: views sessions and registers multiple players.
- Admin: manages sessions, fixes drafts, closes sessions, and records expenses.

## User Journeys
- Player views upcoming sessions and joins with friends.
- Player withdraws before a session starts.
- Admin reviews draft session created from a failed email parse.
- Admin manually closes a session and triggers Splitwise expense.

## Functional Requirements
- Ingest Playtomic receipts via Gmail API (read-only) using HTML/body parsing.
- Parse Playtomic receipt body fields: `Date`, `Time`, `Club ... , <Court>`, and `Paid ...`.
- Receipt subject keyword matching is configurable by admin (default: `Playtomic`, `Receipt`).
- Deduplicate receipts by Gmail `messageId` stored in the database.
- Create one Session per calendar day; Session time spans earliest start to latest end.
- Sessions can contain multiple courts/time slots from a single receipt.
- Multiple receipts on the same `session_date` are aggregated into one session (sum fees, merge/dedupe courts).
- Same-day receipt aggregation requires a single consistent location; location conflicts are treated as parse failures.
- On parse failure, create a DRAFT session and notify admin via in-app admin error queue.
- Public users can join or withdraw from OPEN sessions, including multi-player registration.
- Public users can set per-session anonymous guest count (0-20) in the Join/Withdraw dialog.
- Admin can edit session details and fix DRAFT sessions.
- Admin can set a per-session Splitwise payer override from session edit; new sessions default to the current default payer.
- Admin can manage players (add, rename, deactivate/reactivate).
- Admin can upload/replace/remove player avatars (JPEG/PNG/WebP up to 2MB).
- Admin can close sessions immediately and trigger Splitwise expense recording.
- Admin can rotate the club access token and share a new invite link.
- Admin can view the current club access token/link from DB (not browser localStorage).
- Admin can preview raw Gmail receipt bodies (text/HTML) in the Automation area for parser debugging.
- Admin can query ingestion and Splitwise automation run history (cron/manual source, status, summary, errors) from Admin tabs.
- Admin can edit Gmail OAuth config (`client_id`, `client_secret`, `refresh_token`) stored in Supabase.
- Admin can manage admin accounts (create/update/deactivate/reset password) and change own password.
- Session closing cron creates Splitwise expenses and marks sessions CLOSED, idempotently.
- Sessions display participants as avatar circles by default; tapping toggles participant names.
- Join/Withdraw player picker shows avatar + name rows.
- Session cards show participant count as "`x players joined`", and include guest indicator when guests are added.
- Splitwise share math includes guest shares and assigns those guest shares to the resolved session payer.

## Access Model
- A single club-level access token is embedded in the shared link once and stored in localStorage.
- Missing or invalid token renders Access Denied (no input field).
- All reads/writes go through Edge Functions; no direct browser DB access.
- Store hashed token for validation in `club_settings.token_hash`, and store the latest raw token in DB for admin invite-link retrieval.
- Club token admin APIs handle legacy hash-only environments gracefully with actionable warnings until migration is applied.
- Admin can rotate the token via Edge Function to invalidate prior links.
- Admin login uses account-based username/password credentials from `admin_users`.
- Admin session uses a signed httpOnly cookie (`admin_session`) with account id + session version snapshot.
- Passwords are stored hashed (scrypt) in `admin_users.password_hash`.
- Optional break-glass login is flag-gated by env (`ENABLE_ADMIN_BREAKGLASS=true`) for recovery only.
- Scheduled ingestion uses a dedicated machine secret (`AUTOMATION_SECRET`), separate from the club invite token.

### Token Setup (Admin)
1. Generate a token: `openssl rand -hex 24`
2. Hash it: `printf '%s' "<token>" | openssl dgst -sha256 | awk '{print $2}'`
3. Seed DB: `insert into club_settings (token_hash, token_value) values ('<hash>', '<token>');`

## Non-Functional Requirements
- Simplicity over scale; clear admin workflows.
- Idempotent cron jobs and safe re-runs.
- Hosted on Vercel free tier with Postgres-compatible DB.
- Basic security: least-privilege API access and admin-only actions.

## Acceptance Criteria
- Scheduled cron jobs create/update sessions from new receipts.
- Failed parses create DRAFT sessions and send admin notifications.
- Parse failures are visible in the in-app admin error queue.
- Public registration flows allow join/withdraw for multiple players.
- Admin actions are restricted and audited for session edits and closures.
- Splitwise expenses are recorded once per session and retries are safe.
