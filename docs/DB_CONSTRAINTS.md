# DB Constraints + Indexes (Planned)

## Constraints
- sessions.session_date UNIQUE
- session_participants UNIQUE(session_id, player_id)
- email_receipts.gmail_message_id UNIQUE
- expenses UNIQUE(session_id, expense_type)
- players.name UNIQUE

## Suggested Indexes
- sessions(session_date)
- email_receipts(gmail_message_id)
- session_participants(session_id, player_id)
- courts(session_id)
