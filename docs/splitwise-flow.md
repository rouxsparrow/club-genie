# Splitwise Integration Flow

## Trigger
- Admin manual close (admin-only) triggers immediate Splitwise sync for that session.
- Daily 22:00 SGT (14:00 UTC) cron auto-closes recent OPEN sessions and creates Splitwise expenses.

## Behavior
- Create one Splitwise expense per session (equal split among joined participants).
- Payer precedence:
  - Use `sessions.payer_player_id` if set (session-level override).
  - Fallback to global default payer (`players.is_default_payer=true`) for legacy safety.
- Session fields:
  - `sessions.status` moves to `CLOSED`
  - `sessions.splitwise_status` tracks Splitwise outcome: `PENDING | CREATED | FAILED`
- Store `expenses.splitwise_expense_id` to enforce idempotency.
- If expense creation fails, keep session `CLOSED` but mark `splitwise_status=FAILED` and store `expenses.last_error`.

## Idempotency
- If an `expenses` row exists with `status=CREATED` and `splitwise_expense_id`, skip creation.
- If an `expenses` row exists with `status=PENDING` and was updated recently, skip (assume another run in progress).
- Retries are safe: `FAILED` sessions are re-attempted by cron or manual run.
