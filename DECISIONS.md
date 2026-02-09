# Decisions

## ADR-0001: Stack and Hosting
- Date: 2026-02-08
- Status: Accepted
- Decision: TypeScript + Node.js with a future Next.js App Router web app. Hosting on Vercel free tier with a Postgres-compatible database.
- Rationale: Matches team skill set, supports cron-based automation, and keeps deployment simple.

## ADR-0002: Cron Automation Model
- Date: 2026-02-08
- Status: Accepted
- Decision: Duplicate the session-creation logic across five identical cron jobs at 10:00, 13:00, 16:00, 19:00, and 23:00. Use a single closing cron at 23:00 with idempotent Splitwise creation.
- Rationale: Simplicity and resilience. Multiple runs reduce missed receipts without complex time branching.

## ADR-0003: Adopt Milestone-Driven Build Order
- Date: 2026-02-08
- Status: Accepted
- Decision: Build in milestones with a strict order: DB -> Gmail/cron -> public view -> join/withdraw -> admin -> Splitwise.
- Rationale: UI is postponed until automation works to avoid building flows without reliable ingestion. DB schema comes first to stabilize contracts and unblock ingestion/storage. Cron-based ingestion (5x/day) plus a daily close job ensures reliable automation before UI work.

## ADR-0004: Use Supabase (Postgres + RLS + Edge Functions) as Backend
- Date: 2026-02-08
- Status: Accepted
- Decision: Use Supabase Postgres with RLS and Edge Functions for backend storage, access control, and write operations.
- Rationale: Free tier friendly. RLS provides centralized security. Edge Functions handle write operations and cron endpoints cleanly.

## ADR-0005: Use Club-Level Access Token + Edge-Only Writes (No Per-Session Links)
- Date: 2026-02-08
- Status: Accepted
- Decision: Use a single club-level access token embedded in a shared link once and stored in localStorage. Missing/invalid token shows Access Denied (no input). Admin can rotate the token to invalidate old links. No direct DB access from the browser; Edge Functions enforce token + rules.
- Rationale: Simplifies access control and reduces link sprawl while keeping write operations centralized.
- Note: Store the token hashed in the database.

## Pending Decisions
- Player identity model (predefined list vs free-text vs hybrid).
- Admin access control (magic link vs password vs secret URL).
- Session edit rules (post-close edits, participant locking, Splitwise regeneration).
- Error visibility/retention (where shown, raw email retention policy).
- Public write protection approach (auth vs session code vs edge-only).
