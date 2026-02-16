# Ingestion Cron Schedule

- Ingest receipts: once daily at 23:30 SGT (15:30 UTC).
- Scheduler host: GitHub Actions workflow (`.github/workflows/run-ingestion.yml`).
- Splitwise sync + auto-close: 22:00 SGT (14:00 UTC) via `.github/workflows/run-splitwise-sync.yml`.

## Notes
- Cron calls `run-ingestion` with `x-automation-secret`.
- Ingestion remains idempotent by `gmail_message_id`.
- Admin can trigger manual ingestion from the Automation tab.
