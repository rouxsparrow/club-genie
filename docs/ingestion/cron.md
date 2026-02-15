# Ingestion Cron Schedule

- Ingest receipts: once daily at 23:30 SGT (15:30 UTC).
- Scheduler host: GitHub Actions workflow (`.github/workflows/run-ingestion.yml`).
- Daily close: 23:00 (idempotent close + Splitwise later).

## Notes
- Cron calls `run-ingestion` with `x-automation-secret`.
- Ingestion remains idempotent by `gmail_message_id`.
- Admin can trigger manual ingestion from the Automation tab.
