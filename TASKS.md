# Tasks

## Delivery Plan
### Immediate Next Actions
- DB schema + migrations.
- Gmail parsing contract (receipt parser interface + failure handling).
- Session creation cron vertical slice (ingestion -> session upsert).

### Build Order
- DB
- Gmail/cron
- Public view
- Join/withdraw
- Admin
- Splitwise

## Build Order (Supabase)
1) DB schema + constraints + RLS + seed
2) Club access token model + Edge Function gates (Access Denied if invalid/missing)
3) Email ingestion cron -> sessions in DB
4) Read-only Sessions page (token required)
5) Join/Withdraw (Edge Functions, token required)
6) Admin console (rotate token, edit sessions, fix drafts)
7) Splitwise integration + manual end + daily close cron

### Milestones
- M1 Automation
- M2 Public RSVP
- M3 Admin
- M4 Splitwise

## Bootstrap Tasks (Done)
- [x] Initialize repo structure and configs.
- [x] Add baseline lint, format, typecheck, and test scaffolding.
- [x] Create core documentation and templates.

## Next Tasks
- [x] Define tables + relationships.
- [x] Define RLS policies (public read, controlled write, admin full).
- [x] Create initial SQL migrations.
- [x] Document DB constraints + indexes (sessions, receipts, participants).
- [x] Define club access token model (hashing + rotation).
- [x] Add Edge Function auth gate contract (Access Denied if missing/invalid).
- [x] Add rotate-token Edge Function (server-generated token).
- [x] Add minimal admin page for token rotation.
- [x] Add list-sessions Edge Function (read-only).
- [x] Wire /sessions to list-sessions Edge Function.
- [x] Add get-session Edge Function (read-only detail).
- [x] Add /sessions/[id] detail page.
- [x] Add temporary seed session for M2 validation.
- [x] Draft Gmail parsing contract (receipt parser interface + failure handling).
- [x] Create ingestion cron Edge Function (receipt -> session upsert).
- [x] Add receipt parse failure -> DRAFT session + admin notification stub.
- [x] Add receipt dedupe rules (gmail_message_id) + idempotency notes.
- [x] Add ingestion test fixtures for Playtomic HTML.
- [x] Add cron schedule config (5x/day + daily close).
- [x] Add Gmail fetch Edge Function (list message IDs/snippets).
- [x] Add Gmail setup doc + fetch test script.
- [x] Store Gmail OAuth secrets in Supabase.
- [x] Wire Gmail fetch -> receipt ingestion (HTML extraction).
- [x] Add run-ingestion Edge Function to call ingest-receipts.
- [x] Create Edge Function skeletons (join, withdraw, close-session).
- [x] Define Sessions page data contract (read-only, token required).
- [x] Draft join/withdraw rules and validation.
- [x] Add join/withdraw UI stub (dialog + list selection).
- [x] Add admin error visibility stub (ingestion failures).
- [x] Outline Splitwise integration flow + idempotency strategy.
- [x] Implement join-session/withdraw-session/close-session Edge Functions.
- [x] Add admin errors Edge Function + UI.
- [x] Add join/withdraw wiring from UI to Edge Functions.
- [x] Add session close UI + wiring.
- [x] Add list-players Edge Function + seed players.
- [x] Verify join/withdraw end-to-end with seeded players.
- [ ] Splitwise integration (API calls + expense idempotency).
- [x] Add Vitest coverage for admin session cookie signing and token hashing (required by MVP).
- [x] Add admin session cookie signing tests.
- [x] Add token hashing helper tests.

## MVP (Current)
- [x] Admin login with signed httpOnly cookie.
- [x] Admin Players CRUD (add, rename, deactivate/reactivate).
- [x] Sessions table UI with courts, participants, remarks, status.
- [x] Join/withdraw dialog for public users.
- [x] Admin create/edit session dialog + endpoints.
- [x] Club token rotation endpoint + invite link UI.
- [x] Light/dark mode toggle with localStorage persistence.
- [x] Manual test steps documented in README.
