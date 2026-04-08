---
phase: 01-shared-foundation
plan: 01
subsystem: ui
tags: [typescript, types, fetch, formatters, admin]

# Dependency graph
requires: []
provides:
  - "Shared cross-tab type definitions (TabKey, Player, RunHistoryEntry, etc.)"
  - "Generic adminFetch utility with credentials:'include' and JSON error handling"
  - "Pure formatter functions (formatDuration, formatIngestionHistorySummary, formatSplitwiseHistorySummary)"
affects: [01-02, phase-02-tab-extraction]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "adminFetch generic typed wrapper for API calls"
    - "Pure formatter functions as module-level exports"
    - "Cross-tab types in dedicated types.ts file"

key-files:
  created:
    - src/components/admin/types.ts
    - src/components/admin/admin-fetch.ts
    - src/components/admin/formatters.ts
    - tests/admin-formatters.test.ts
  modified: []

key-decisions:
  - "11 cross-tab types extracted; 5 tab-specific types intentionally left inline"
  - "adminFetch is a plain async function, not a React hook, matching zero-hooks convention"
  - "Formatters extracted verbatim from page.tsx with single-quote style applied"

patterns-established:
  - "adminFetch<T> pattern: generic typed fetch with credentials injection"
  - "Shared types in src/components/admin/types.ts for cross-tab definitions"
  - "Pure utility functions in src/components/admin/formatters.ts"

requirements-completed: [SHELL-02, SHELL-03]

# Metrics
duration: 3min
completed: 2026-04-08
---

# Phase 1 Plan 01: Shared Admin Types and Utilities Summary

**Cross-tab type definitions (11 types), adminFetch wrapper with credentials injection, and 3 pure formatter functions with 10 passing tests**

## Performance

- **Duration:** 3 min
- **Started:** 2026-04-08T09:57:54Z
- **Completed:** 2026-04-08T10:00:45Z
- **Tasks:** 2
- **Files created:** 4

## Accomplishments
- Extracted 11 cross-tab types from page.tsx into shared types.ts (TabKey, Player, PlayersResponse, RunHistoryStatusFilter, RunHistorySourceFilter, RunHistoryEntry, EmailPreviewMessage, EmailRerunOutcomeStatus, EmailRerunOutcome, EmailRerunChip, EmailRerunLog)
- Created adminFetch generic utility wrapping fetch with credentials:'include' and JSON parse error handling
- Extracted 3 pure formatter functions (formatDuration, formatIngestionHistorySummary, formatSplitwiseHistorySummary) with 10 unit tests

## Task Commits

Each task was committed atomically:

1. **Task 1: Create shared admin types file** - `3f16a28` (feat)
2. **Task 2 RED: Failing formatter tests** - `29fb24d` (test)
3. **Task 2 GREEN: adminFetch utility and formatters** - `c881426` (feat)

_TDD tasks have separate test and implementation commits._

## Files Created/Modified
- `src/components/admin/types.ts` - 11 shared cross-tab type definitions
- `src/components/admin/admin-fetch.ts` - Generic admin API fetch utility with credentials injection
- `src/components/admin/formatters.ts` - Pure formatter functions for duration and run history summaries
- `tests/admin-formatters.test.ts` - 10 unit tests covering all 3 formatter functions

## Decisions Made
- Extracted only cross-tab types per D-01; tab-specific types (SplitwiseSettings, AutomationSettings, ClubTokenCurrentResponse, ClubTokenWarningCode, ReceiptError) intentionally left inline for Phase 2 per D-02
- adminFetch implemented as plain async function (not React hook) per D-04, matching zero-hooks codebase convention
- Formatters extracted verbatim from page.tsx arrow functions, converted to module-level named exports with single-quote formatting per .prettierrc

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All shared types, fetch utility, and formatters ready for import by Plan 02 (tab shell wiring)
- page.tsx remains untouched -- Plan 02 will wire imports and reduce the monolith
- No blockers for proceeding to Plan 02

## Self-Check: PASSED

All 4 created files verified on disk. All 3 task commits verified in git history.

---
*Phase: 01-shared-foundation*
*Completed: 2026-04-08*
