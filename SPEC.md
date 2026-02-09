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
- Deduplicate receipts by Gmail `messageId` stored in the database.
- Create one Session per calendar day; Session time spans earliest start to latest end.
- Sessions can contain multiple courts/time slots from a single receipt.
- On parse failure, create a DRAFT session and notify admin by email.
- Public users can join or withdraw from OPEN sessions, including multi-player registration.
- Admin can edit session details and fix DRAFT sessions.
- Admin can manage players (add, rename, deactivate/reactivate).
- Admin can close sessions immediately and trigger Splitwise expense recording.
- Admin can rotate the club access token and share a new invite link.
- Session closing cron creates Splitwise expenses and marks sessions CLOSED, idempotently.

## Access Model
- A single club-level access token is embedded in the shared link once and stored in localStorage.
- Missing or invalid token renders Access Denied (no input field).
- All reads/writes go through Edge Functions; no direct browser DB access.
- Store only a hashed token in `club_settings.token_hash` (never raw token).
- Admin can rotate the token via Edge Function to invalidate prior links.
- Admin login uses a signed httpOnly cookie (`admin_session`) with HMAC.

### Token Setup (Admin)
1. Generate a token: `openssl rand -hex 24`
2. Hash it: `printf '%s' "<token>" | openssl dgst -sha256 | awk '{print $2}'`
3. Seed DB: `insert into club_settings (token_hash) values ('<hash>');`

## Non-Functional Requirements
- Simplicity over scale; clear admin workflows.
- Idempotent cron jobs and safe re-runs.
- Hosted on Vercel free tier with Postgres-compatible DB.
- Basic security: least-privilege API access and admin-only actions.

## Acceptance Criteria
- Scheduled cron jobs create/update sessions from new receipts.
- Failed parses create DRAFT sessions and send admin notifications.
- Public registration flows allow join/withdraw for multiple players.
- Admin actions are restricted and audited for session edits and closures.
- Splitwise expenses are recorded once per session and retries are safe.
