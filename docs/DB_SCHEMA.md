# Database Schema (Current)

## Tables
- club_settings: one row per token rotation (`token_hash` for validation + `token_value` for admin retrieval).
- automation_settings: singleton ingestion configuration (keywords/timezone/enabled).
- gmail_oauth_config: singleton Gmail OAuth config (`client_id`, `client_secret`, `refresh_token`).
- admin_users: admin authentication accounts (`username`, `password_hash`, `active`, `session_version`).
- sessions: one per calendar day (unique `session_date`).
- courts: time slots per session.
- players: predefined player roster.
- session_participants: join table (session_id + player_id unique).
- email_receipts: raw Gmail receipts with parse status.
- splitwise_settings: singleton Splitwise config (`group_id`, `currency_code`, `enabled`).
- expenses: Splitwise expense metadata per session (idempotency lock + status + payloads).

## Relationships
- sessions 1:N courts (courts.session_id -> sessions.id)
- sessions N:M players via session_participants
- sessions 1:1 expenses (expenses.session_id unique)

## Status
- sessions.status: DRAFT | OPEN | CLOSED
- sessions.splitwise_status: PENDING | CREATED | FAILED
- sessions.payer_player_id: explicit payer override for Splitwise (defaults to current default payer on create/backfill)

## Receipt Parse Metadata
- email_receipts.parsed_session_date: normalized session date used for aggregation.
- email_receipts.parsed_total_fee: parsed receipt fee.
- email_receipts.parsed_courts: parsed courts JSON used to rebuild deterministic session courts.
