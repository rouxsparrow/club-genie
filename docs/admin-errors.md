# Admin Error Visibility

## Source
- `email_receipts` with `parse_status = 'FAILED'`.

## Display
- List latest failures with `gmail_message_id`, `parse_error`, and received_at.
- Exposed in Admin -> Automation tab (in-app queue).

## Actions
- Create/fix DRAFT session manually.
- Re-run ingestion manually from Admin -> Automation.
