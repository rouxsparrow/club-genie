# Security

## Principles
- Least-privilege API access.
- Admin-only actions for session edits, closures, and Splitwise operations.
- Store OAuth and API tokens in environment variables.

## Data Handling
- Store Gmail `messageId` for deduplication only.
- Avoid storing full email bodies unless required for audit.
