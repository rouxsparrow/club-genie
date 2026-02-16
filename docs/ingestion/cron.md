# Ingestion Cron Schedule

- Ingest receipts: once daily at 23:30 SGT (15:30 UTC).
- Scheduler host: Google Apps Script trigger (`runDailyIngestion` in `scripts/gmail-apps-script-bridge.js`).
- Splitwise sync + auto-close: 22:00 SGT (14:00 UTC) via `.github/workflows/run-splitwise-sync.yml`.

## Notes
- Apps Script calls Supabase `ingest-receipts` with `x-automation-secret`.
- Ingestion remains idempotent by `gmail_message_id`.
- Admin can trigger manual ingestion and preview from the web app, routed through the Apps Script bridge webhook.
- Apps Script writes ingestion run summaries to `automation_run_history` through Supabase function `log-ingestion-run`.
