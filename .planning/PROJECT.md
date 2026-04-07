# Club Genie Admin Refactor

## What This Is

A structural refactor of the Club Genie admin dashboard — breaking a 2,329-line monolithic page component into isolated, maintainable tab components. The admin page manages players, sessions, automation, Splitwise integration, accounts, and email ingestion for a badminton club. This project preserves all existing functionality and visual design while making the codebase sustainable for future development.

## Core Value

Every admin tab is an independent component with its own state, API calls, and logic — so changing one tab never risks breaking another.

## Requirements

### Validated

- ✓ Admin login with password hashing and HMAC-signed session cookies — existing
- ✓ Breakglass emergency admin access via env vars — existing
- ✓ Players tab: CRUD operations, avatar management, Splitwise user ID mapping, shuttlecock_paid toggle — existing
- ✓ Sessions tab: create, edit, close sessions; manage participants and courts; set payer and guest count — existing
- ✓ Automation tab: ingestion settings, Gmail config, preview/run ingestion, view receipt errors, run history — existing
- ✓ Splitwise tab: sync settings (group, currency, description template, date format, location replacements, shuttlecock fee), run sync, view history — existing
- ✓ Accounts tab: manage admin users, change password — existing
- ✓ Emails tab: preview ingested receipts, re-run failed parses — existing
- ✓ Tab-based navigation between admin sections — existing
- ✓ Dark mode support via class-based Tailwind — existing

### Active

- [ ] Extract Players tab into standalone component with own state and API calls
- [ ] Extract Sessions tab into standalone component with own state and API calls
- [ ] Extract Automation tab into standalone component with own state and API calls
- [ ] Extract Splitwise tab into standalone component with own state and API calls
- [ ] Extract Accounts tab into standalone component (already partially extracted to admin-accounts-panel.tsx)
- [ ] Extract Emails tab into standalone component with own state and API calls
- [ ] Reduce admin/page.tsx to a thin shell that composes tab components
- [ ] Extract shared admin types into a dedicated types file
- [ ] Extract shared admin API call patterns into reusable hooks or utilities

### Out of Scope

- New features or functionality — pure refactor, ship features after
- Visual redesign — keep current look and feel exactly as-is
- Member-facing sessions page — only admin page is in scope
- Edge functions or API route changes — only client-side refactor
- State management library (Redux, Zustand, etc.) — use React useState/useEffect per component
- Component library adoption (shadcn, Radix, etc.) — use existing Tailwind patterns

## Context

- The admin page (`src/app/admin/page.tsx`) is 2,329 lines — a single client component managing all admin features
- One component already partially extracted: `src/components/admin-accounts-panel.tsx`
- Admin navbar exists as `src/components/admin-navbar.tsx`
- 29 API route files under `src/app/api/admin/` — these stay untouched
- The app uses Next.js 16 App Router, React 18, Tailwind CSS 3, Phosphor Icons
- No validation library — inline validation with `as` casts
- No global state — each tab manages own state via useState/useEffect
- Progressive column fallback pattern in API routes handles schema evolution

## Constraints

- **Tech stack**: Next.js App Router, React 18, Tailwind CSS 3 — no new dependencies
- **Behavior parity**: Every tab must work identically after refactor — same API calls, same UI, same interactions
- **No API changes**: Only client-side files are modified; API routes and edge functions are untouched
- **Incremental**: Each tab extraction should be independently deployable — don't break other tabs while extracting one

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Refactor before features | Monolith makes feature work risky and slow | -- Pending |
| Keep current visual design | Scope containment — visual changes are a separate project | -- Pending |
| No state management library | Current useState/useEffect pattern is fine per-component; global state adds complexity without clear benefit | -- Pending |
| Extract to src/components/admin/ | Co-locate admin tab components under a dedicated directory | -- Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? -> Move to Out of Scope with reason
2. Requirements validated? -> Move to Validated with phase reference
3. New requirements emerged? -> Add to Active
4. Decisions to log? -> Add to Key Decisions
5. "What This Is" still accurate? -> Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-08 after initialization*
