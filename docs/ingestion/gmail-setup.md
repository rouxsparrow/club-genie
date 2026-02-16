# Gmail Ingestion Setup (Apps Script Bridge)

## Goal
Use Google Apps Script as the ingestion bridge so receipt fetching does not depend on runtime Gmail OAuth refresh tokens in this app.

## Files
- Apps Script source: `scripts/gmail-apps-script-bridge.js`
- Admin routes calling bridge:
  - `src/app/api/admin/ingestion/run/route.ts`
  - `src/app/api/admin/ingestion/preview/route.ts`
- Run-history logging endpoint:
  - `supabase/functions/log-ingestion-run/index.ts`

## Apps Script Setup
1. Create a new Apps Script project linked to the Gmail account that receives Playtomic receipts.
2. Paste `scripts/gmail-apps-script-bridge.js` into the project.
3. In Apps Script project settings:
   - Set timezone to `Asia/Singapore`.
4. Add Script Properties:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `AUTOMATION_SECRET`
   - `BRIDGE_SECRET`
   - `PROCESSED_LABEL` (optional, default `club-genie/ingested`)
   - `DEFAULT_QUERY` (optional, default `newer_than:30d subject:"Playtomic" subject:"Receipt" -label:"club-genie/ingested"`)
   - `INGEST_LIMIT` (optional, default `200`)
5. Deploy as Web App:
   - Execute as: Me
   - Who has access: Anyone with link (shared-secret protected)
6. Set daily trigger:
   - Run `ensureDailyIngestionTrigger()` once from Apps Script editor.

## App Env Vars (Next server)
- `APPS_SCRIPT_BRIDGE_URL`
- `APPS_SCRIPT_BRIDGE_SECRET`

These are used by admin API routes to call the Apps Script bridge for:
- manual ingestion (`manual_ingest`)
- email preview (`preview`)

## Manual Operations
- Daily schedule is owned by Apps Script trigger.
- Manual ingestion is still available in Admin Automation tab (button now calls bridge webhook path).

## Notes
- `ingest-receipts` idempotency (`gmail_message_id`) remains the dedupe guard.
- Processed Gmail messages are labeled, not deleted/moved.
- Apps Script logs ingestion summaries to `automation_run_history` via `log-ingestion-run` (`run_source=API` for daily trigger, `run_source=ADMIN_MANUAL` for admin-triggered runs).
- Legacy Supabase Gmail OAuth ingestion functions remain in repo for rollback only.
