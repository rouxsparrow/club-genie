# Architecture

## High-Level System Diagram (Text)
- Gmail API (read-only) -> Ingestion Worker -> Receipt Parser -> Session Store (Postgres)
- Public Web App -> Session Store
- Admin Web App -> Session Store -> Splitwise API
- Cron Scheduler -> Ingestion Worker and Session Closing Worker

## Email Ingestion Flow
- Gmail API fetches unread or unprocessed Playtomic receipts from the club inbox.
- HTML/body is parsed to extract courts, dates, and time slots.
- Receipts are deduplicated by Gmail `messageId` stored in the database.
- On parse failure, a DRAFT session is created and admin is notified by email.

## Cron-Based Automation Model
- One daily ingestion cron at 23:30 SGT (15:30 UTC) via GitHub Actions.
- Each run parses unprocessed receipts and creates/updates the session for the calendar day.
- One closing cron at 23:00 handles session completion and Splitwise recording.

## Automation Authentication Boundary
- Cron/manual ingestion uses `AUTOMATION_SECRET` (machine auth), not the rotating club invite token.
- Public read/write flows continue to require `x-club-token`.

## Splitwise Integration Boundary
- Session closing triggers a Splitwise expense with equal split, admin as payer.
- The resulting `splitwise_expense_id` is stored to ensure idempotency.

## Milestone Delivery Plan
- M1 Automation: DB schema, Gmail parsing contract, ingestion + session creation cron.
- M2 Public RSVP: read-only public session view and basic join/withdraw flow.
- M3 Admin: admin UI, access control, and error visibility tooling.
- M4 Splitwise: expense creation, idempotency, and reconciliation hooks.
