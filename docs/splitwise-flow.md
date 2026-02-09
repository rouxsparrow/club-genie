# Splitwise Integration Flow (Draft)

## Trigger
- Manual End Session in admin.
- Daily 23:00 cron closes any OPEN session.

## Behavior
- Create one Splitwise expense per session (equal split).
- Store `splitwise_expense_id` to enforce idempotency.
- If expense creation fails, keep session OPEN and surface error.

## Idempotency
- If `splitwise_expense_id` exists, skip creation.
- Retries should be safe and not duplicate expenses.
