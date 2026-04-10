# Roadmap: Club Genie Admin Refactor

## Overview

Break the 2,329-line monolithic admin page.tsx into independent tab components. Phase 1 extracts the shared foundation (types, utilities) that all tabs depend on. Phase 2 extracts all 6 tab components with behavior parity validation. Phase 3 reduces page.tsx to a thin composition shell. Each phase delivers independently verifiable progress toward the core value: every admin tab is an independent component.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Shared Foundation** - Extract shared types and utility hooks from page.tsx so tab components have a clean API surface
- [x] **Phase 2: Tab Extraction** - Extract all 6 admin tabs into independent components with full behavior parity
- [x] **Phase 3: Shell Reduction** - Reduce page.tsx to a thin composition shell that mounts tab components

## Phase Details

### Phase 1: Shared Foundation
**Goal**: Tab components have a shared types file and reusable utility hooks to build against
**Depends on**: Nothing (first phase)
**Requirements**: SHELL-02, SHELL-03
**Success Criteria** (what must be TRUE):
  1. A `src/components/admin/types.ts` file exists containing all shared admin types currently inline in page.tsx (player, session, settings, etc.)
  2. Shared fetch/error-handling patterns used across tabs are available as reusable hooks or utility functions
  3. The existing admin page still works identically after type and utility extraction (no regressions)
**Plans**: 2 plans

Plans:
- [x] 01-01-PLAN.md -- Create shared types, adminFetch utility, and formatter functions
- [x] 01-02-PLAN.md -- Wire page.tsx to import from shared files (replace inline definitions)

### Phase 2: Tab Extraction
**Goal**: Every admin tab is an independent component with its own state, API calls, and rendering logic
**Depends on**: Phase 1
**Requirements**: COMP-01, COMP-02, COMP-03, COMP-04, COMP-05, COMP-06, PARITY-01, PARITY-02, PARITY-03, PARITY-04, PARITY-05, PARITY-06
**Success Criteria** (what must be TRUE):
  1. Each of the 6 tabs (Players, Club Access, Automation, Splitwise, Accounts, Emails) lives in its own file under `src/components/admin/`
  2. Each tab component manages its own useState/useEffect state and makes its own API calls -- no state passed down from the parent page
  3. All CRUD operations, toggles, settings changes, and action triggers on every tab work identically to the monolithic version
  4. Editing one tab's component file does not require changes to any other tab's component file
  5. The admin page renders and behaves the same as before when tab components are composed in page.tsx
**Plans**: 3 plans
**UI hint**: yes

Plans:
- [x] 02-01-PLAN.md -- Extract Accounts and Players into keep-mounted tab components (completed 2026-04-09)
- [x] 02-02-PLAN.md -- Extract Club Access and Automation into keep-mounted tab components (completed 2026-04-09)
- [x] 02-03-PLAN.md -- Extract Splitwise and Emails and finish the Phase 02 shell (completed 2026-04-09)

### Phase 3: Shell Reduction
**Goal**: Admin page.tsx is a thin shell that only handles tab routing and component mounting
**Depends on**: Phase 2
**Requirements**: SHELL-01, PARITY-07
**Success Criteria** (what must be TRUE):
  1. Admin page.tsx contains only tab navigation logic and component imports -- no business logic, no API calls, no inline state management
  2. Tab navigation (switching between tabs, URL state, active tab highlighting) works identically to the current behavior
  3. Admin page.tsx is under 150 lines (down from 2,329)
**Plans**: 1 plan
**UI hint**: yes

Plans:
- [x] 03-01-PLAN.md -- Extract shared admin tab-shell helpers so page.tsx stays under 150 lines while preserving current local tab navigation semantics

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Shared Foundation | 2/2 | Complete | 2026-04-08 |
| 2. Tab Extraction | 3/3 | Complete | 2026-04-09 |
| 3. Shell Reduction | 1/1 | Complete | 2026-04-10 |
