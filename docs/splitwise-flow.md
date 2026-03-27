# Splitwise Integration Flow

## Trigger
- Admin manual close (admin-only) triggers immediate Splitwise sync for that session.
- Daily 22:00 SGT (14:00 UTC) cron auto-closes recent OPEN sessions and creates Splitwise expenses.

## Behavior
- Create up to two Splitwise expenses per session:
  - `COURT`: equal split among joined participants (guest shares assigned to payer).
  - `SHUTTLECOCK` (optional): charge each session participant with `shuttlecock_paid=false` plus guest shares (guest shares assigned to session payer) using fixed fee (`splitwise_settings.shuttlecock_fee`), and redistribute to all active players with `shuttlecock_paid=true` and valid Splitwise mapping.
- Both expense payloads include `details` note text:
  - COURT: total, joined players + guests, session payer.
  - SHUTTLECOCK: total, shuttle OFF players + guests, session payer.
- Payer precedence:
  - Use `sessions.payer_player_id` if set (session-level override).
  - Fallback to global default payer (`players.is_default_payer=true`) for legacy safety.
- Session fields:
  - `sessions.status` moves to `CLOSED`
  - `sessions.splitwise_status` tracks Splitwise outcome: `PENDING | CREATED | FAILED`
- Store `expenses.splitwise_expense_id` to enforce idempotency.
- If required expense creation fails, keep session `CLOSED` but mark `splitwise_status=FAILED` and store `expenses.last_error`.
- If shuttlecock expense has no OFF participants or no valid ON recipients, skip shuttlecock expense and still allow session to reach `splitwise_status=CREATED` when court expense succeeds.

## Idempotency
- Idempotency key is `(session_id, expense_type)`.
- If an `expenses` row exists with `status=CREATED` and `splitwise_expense_id`, skip creation for that type.
- If an `expenses` row exists with `status=PENDING` and was updated recently, skip that type (assume another run in progress).
- Retries are safe: `FAILED` sessions are re-attempted by cron or manual run.
