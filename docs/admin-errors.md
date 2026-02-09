# Admin Error Visibility (Stub)

## Source
- `email_receipts` with `parse_status = 'FAILED'`.

## Display
- List latest failures with `gmail_message_id`, `parse_error`, and received_at.
- Provide link to raw HTML (admin-only).

## Actions
- Create/fix DRAFT session manually.
- Mark failure resolved (TBD).
