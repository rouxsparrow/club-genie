# Playtomic Receipt Parsing Contract

## Goal
Parse Playtomic email receipts into a normalized session payload. This contract defines the parsing inputs, outputs, and failure handling used by the ingestion cron.

## Input
- Source: Gmail message (HTML body preferred, fallback to plain text).
- Identifier: Gmail `messageId`.
- Required fields:
  - Receipt date (session date)
  - Court labels (optional)
  - Start/end times for each court slot
  - Total fee

## Output (Parsed Receipt)
```json
{
  "messageId": "<gmail message id>",
  "sessionDate": "YYYY-MM-DD",
  "courts": [
    {
      "courtLabel": "Court 1",
      "startTime": "YYYY-MM-DDTHH:MM:SSZ",
      "endTime": "YYYY-MM-DDTHH:MM:SSZ"
    }
  ],
  "totalFee": 120.00
}
```

## Mapping Rules
- One email receipt corresponds to one session date.
- Session start_time = earliest court startTime.
- Session end_time = latest court endTime.
- If a receipt contains multiple courts/time slots, all are included.
- `totalFee` should parse from receipt summary (currency ignored for now).
- Times are normalized using `Asia/Singapore`.
- Multiple successful receipts for one `sessionDate` are aggregated:
  - `sessions.total_fee` = sum of receipt fees
  - courts are rebuilt deterministically by unique `(court_label, start_time, end_time)`.

## Failure Handling
- If required fields are missing or parsing fails:
  - Create a DRAFT session for the session date (if date is known).
  - Store raw HTML in `email_receipts` with `parse_status = 'FAILED'` and `parse_error` summary.
  - Notify admin (email stub for now).

## Idempotency & Deduping
- Ingestion is keyed by `gmail_message_id` stored in `email_receipts`.
- If `gmail_message_id` already exists, skip processing.

## Parser Output Validation
- Validate ISO timestamps and non-empty `sessionDate`.
- Reject negative or zero `totalFee`.
- Empty `courts` array is invalid unless marked as failure.
