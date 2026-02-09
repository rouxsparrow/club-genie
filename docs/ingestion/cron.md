# Ingestion Cron Schedule

- Ingest receipts: 10:00, 13:00, 16:00, 19:00, 23:00 (local club time).
- Daily close: 23:00 (idempotent close + Splitwise later).

## Notes
- Each run scans unread/unprocessed Gmail receipts.
- Ingestion should be idempotent by Gmail messageId.
