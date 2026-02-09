# Database Schema (Current)

## Tables
- club_settings: one row per token rotation.
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
