# Security

## Principles
- Least-privilege API access.
- Admin-only actions for session edits, closures, and Splitwise operations.
- Store OAuth and API tokens in environment variables.
- Separate machine auth (`AUTOMATION_SECRET`) from rotating club invite token.
- Store admin passwords as scrypt hashes in DB (`admin_users.password_hash`), never plaintext.
- Keep break-glass login disabled by default and enable only for recovery.

## Data Handling
- Store Gmail `messageId` for deduplication only.
- Avoid storing full email bodies unless required for audit.
