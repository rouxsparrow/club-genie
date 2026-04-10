# Club Genie Admin Refactor

## What This Is

Club Genie is a badminton club operations app with sessions, player management, receipt ingestion, Splitwise sync, and an admin dashboard. The v1.0 admin refactor milestone split the former 2,329-line admin page into standalone tab components behind a thin route shell while preserving existing behavior and visual design.

## Core Value

Every admin tab is an independent component with its own state, API calls, and logic — so changing one tab never risks breaking another.

## Requirements

### Validated

- ✓ Admin login with password hashing and HMAC-signed session cookies — existing
- ✓ Breakglass emergency admin access via env vars — existing
- ✓ Players tab: CRUD operations, avatar management, Splitwise user ID mapping, shuttlecock_paid toggle — existing
- ✓ Sessions tab: create, edit, close sessions; manage participants and courts; set payer and guest count — existing
- ✓ Automation tab: ingestion settings, Gmail config, preview/run ingestion, view receipt errors, run history — existing
- ✓ Splitwise tab: sync settings, run sync, view history, group tools, and records — existing
- ✓ Accounts tab: manage admin users, change password — existing
- ✓ Emails tab: preview ingested receipts, re-run failed parses — existing
- ✓ Tab-based navigation between admin sections — existing
- ✓ Dark mode support via class-based Tailwind — existing
- ✓ Admin tab components are independently extracted under `src/components/admin/` — v1.0
- ✓ Admin shared types, `adminFetch`, and formatters are extracted from `page.tsx` — v1.0
- ✓ Admin `page.tsx` is a thin local-state shell under 150 lines — v1.0
- ✓ Automation manual ingestion can include Email Preview Not Ingested message IDs after tab extraction — v1.0

### Active

None — v1.0 admin refactor milestone is complete. Define fresh active requirements when the next milestone starts.

### Out of Scope

- New features or functionality — pure refactor shipped first
- Visual redesign — keep current look and feel exactly as-is
- Member-facing sessions page — only admin page was in scope
- Edge functions or API route refactors — only client-side refactor was in scope
- State management library (Redux, Zustand, etc.) — use React useState/useEffect per component
- Component library adoption (shadcn, Radix, etc.) — use existing Tailwind patterns

## Current State

- v1.0 Admin Refactor shipped on 2026-04-10.
- The admin route (`src/app/admin/page.tsx`) is a thin 64-line shell.
- Admin tab rendering metadata lives in `src/components/admin/admin-tab-shell.tsx`.
- Six admin tabs live under `src/components/admin/`: Accounts, Players, Club Access, Automation, Email Preview, and Splitwise.
- The milestone archive is in `.planning/milestones/v1.0-ROADMAP.md`, `.planning/milestones/v1.0-REQUIREMENTS.md`, and `.planning/milestones/v1.0-MILESTONE-AUDIT.md`.

## Context

- The former admin page (`src/app/admin/page.tsx`) was 2,329 lines before the v1.0 refactor.
- The compatibility export `src/components/admin-accounts-panel.tsx` points to the new Accounts tab component.
- Admin navbar exists as `src/components/admin-navbar.tsx`.
- 29 API route files under `src/app/api/admin/` stayed untouched during the refactor.
- The app uses Next.js 16 App Router, React 18, Tailwind CSS 3, and Phosphor Icons.
- No validation library — inline validation with `as` casts remains a future quality opportunity.
- No global state — each tab manages its own state via useState/useEffect, with explicit shell bridge state only where a cross-tab workflow requires it.
- Progressive column fallback pattern in API routes handles schema evolution.

## Constraints

- **Tech stack**: Next.js App Router, React 18, Tailwind CSS 3 — no new dependencies for this milestone.
- **Behavior parity**: Every tab must work identically after refactor — same API calls, same UI, same interactions.
- **No API changes**: Client-side refactor only; API routes and edge functions remain untouched.
- **Incremental**: Each future tab or shell change should remain independently deployable.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Refactor before features | Monolith made feature work risky and slow | ✓ Completed in v1.0 |
| Keep current visual design | Scope containment — visual changes are a separate project | ✓ Honored in v1.0 |
| No state management library | Current useState/useEffect pattern is fine per-component; global state adds complexity without clear benefit | ✓ Honored in v1.0 |
| Extract to `src/components/admin/` | Co-locate admin tab components under a dedicated directory | ✓ Completed in v1.0 |
| Keep tab routing local to `/admin` | Preserves current behavior and avoids new URL/query-param scope | ✓ Completed in v1.0 |
| Bridge Email Preview to Automation through the shell | Automation manual ingestion needs preview-derived Not Ingested IDs after tab extraction | ✓ Completed in v1.0 closure fix |

## Evolution

This document evolves at milestone boundaries.

**After each milestone:**
1. Requirements invalidated? -> Move to Out of Scope with reason
2. Requirements validated? -> Move to Validated with phase or milestone reference
3. New requirements emerged? -> Add to Active
4. Decisions to log? -> Add to Key Decisions
5. "What This Is" still accurate? -> Update if drifted

---
*Last updated: 2026-04-10 after v1.0 milestone completion*
