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
- [ ] Define tables + relationships.
- [ ] Define RLS policies (public read, controlled write, admin full).
- [ ] Create initial SQL migrations.
- [ ] Define club access token model (hashing + rotation).
- [ ] Add Edge Function auth gate contract (Access Denied if missing/invalid).
- [ ] Create Edge Function skeletons (ingest, join, withdraw, close-session).
- [ ] Draft ingestion parser contract and dedupe strategy.
- [ ] Define Sessions page data contract (read-only, token required).
- [ ] Draft join/withdraw rules and validation.
- [ ] Outline Splitwise integration flow + idempotency strategy.
