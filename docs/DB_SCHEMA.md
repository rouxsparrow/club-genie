# Database Schema (Current)

## Tables
- club_settings: one row per token rotation.
- automation_settings: singleton ingestion configuration (keywords/timezone/enabled).
- sessions: one per calendar day (unique `session_date`).
- courts: time slots per session.
- players: predefined player roster.
- session_participants: join table (session_id + player_id unique).
- email_receipts: raw Gmail receipts with parse status.
- expenses: Splitwise expense metadata per session.

## Relationships
- sessions 1:N courts (courts.session_id -> sessions.id)
- sessions N:M players via session_participants
- sessions 1:1 expenses (expenses.session_id unique)

## Status
- sessions.status: DRAFT | OPEN | CLOSED

## Receipt Parse Metadata
- email_receipts.parsed_session_date: normalized session date used for aggregation.
- email_receipts.parsed_total_fee: parsed receipt fee.
- email_receipts.parsed_courts: parsed courts JSON used to rebuild deterministic session courts.
