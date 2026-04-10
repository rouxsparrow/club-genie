---
phase: 02-tab-extraction
plan: 01
subsystem: ui
tags: [react, nextjs, admin, tabs, refactor]
requires:
  - phase: 01-shared-foundation
    provides: shared admin types, adminFetch utility, formatter helpers
provides:
  - accounts tab component under src/components/admin
  - players tab component under src/components/admin
  - keep-mounted admin shell for eager players and visited accounts tabs
affects: [phase-02-plan-02, phase-02-plan-03, phase-03-shell-reduction]
tech-stack:
  added: []
  patterns: [tab-local state ownership, visited-tab keep-mounted shell]
key-files:
  created:
    - src/components/admin/accounts-tab.tsx
    - src/components/admin/players-tab.tsx
    - tests/admin-tab-extraction.test.ts
    - .planning/phases/02-tab-extraction/02-tab-extraction-01-SUMMARY.md
  modified:
    - src/app/admin/page.tsx
    - src/components/admin-accounts-panel.tsx
    - TASKS.md
key-decisions:
  - "Players stays eager-mounted in page.tsx to preserve the existing initial admin-page load behavior."
  - "Accounts mounts on first visit and stays mounted afterward so drafts survive tab switches without introducing shared state."
patterns-established:
  - "Tab extraction pattern: move state, effects, API calls, and JSX into src/components/admin/<tab>-tab.tsx with minimal visual diff."
  - "Shell persistence pattern: page.tsx keeps visited tabs mounted while hidden rather than lifting tab drafts back into parent state."
requirements-completed: [COMP-01, COMP-05, PARITY-01, PARITY-05]
duration: 17min
completed: 2026-04-09
---

# Phase 02 Plan 01: Accounts and Players Summary

**Accounts and Players now render through standalone admin tab components, with page.tsx preserving eager Players loading and keep-mounted draft persistence for visited tabs**

## Performance

- **Duration:** 17 min
- **Started:** 2026-04-09T08:54:12Z
- **Completed:** 2026-04-09T09:11:17Z
- **Tasks:** 3
- **Files modified:** 6

## Accomplishments
- Moved the Accounts implementation into [src/components/admin/accounts-tab.tsx](/Users/rouxsparrow/Code/club-genie/src/components/admin/accounts-tab.tsx) and kept its existing CRUD, reset-password, and change-my-password flows intact.
- Extracted all Players state, fetches, mutations, avatar actions, and advanced-section behavior into [src/components/admin/players-tab.tsx](/Users/rouxsparrow/Code/club-genie/src/components/admin/players-tab.tsx).
- Converted [src/app/admin/page.tsx](/Users/rouxsparrow/Code/club-genie/src/app/admin/page.tsx) into a shell that eager-mounts Players and keep-mounts visited tabs, while [TASKS.md](/Users/rouxsparrow/Code/club-genie/TASKS.md) now records the explicit parity-test rationale for this refactor.

## Task Commits

Each task was committed atomically:

1. **Task 1 RED: add failing extraction test** - `a25201e` (test)
2. **Task 1 GREEN: create Accounts and Players tab components** - `e94929c` (feat)
3. **Task 2: convert page.tsx into keep-mounted shell and update TASKS rationale** - `88b9099` (feat)

**Plan metadata:** pending below

## Files Created/Modified
- `src/components/admin/accounts-tab.tsx` - New self-contained Accounts tab component using tab-local state and `adminFetch`.
- `src/components/admin/players-tab.tsx` - New self-contained Players tab component with roster CRUD, advanced controls, and avatar actions.
- `src/components/admin-accounts-panel.tsx` - Compatibility re-export to the new Accounts tab path so the old one-off implementation is no longer active.
- `src/app/admin/page.tsx` - Reduced Accounts and Players ownership to shell-level tab routing and keep-mounted rendering.
- `tests/admin-tab-extraction.test.ts` - Source-level TDD coverage that locks the new tab files and preserved Accounts/Players copy markers.
- `TASKS.md` - Added explicit rationale that this slice relies on browser parity verification plus automated checks because DOM component-test infrastructure is absent.

## Decisions Made
- Kept `players` in the shell’s eager-mounted set because that tab already loads as part of the default `/admin` experience today.
- Used a visited-tab keep-mounted wrapper for `accounts` so drafts persist after first visit without reintroducing parent-owned state.
- Reused `adminFetch` in the extracted tabs where it preserved the existing `{ ok, error }` response semantics and `credentials: "include"` behavior.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Tightened extracted player mutation response typing**
- **Found during:** Task 1 verification
- **Issue:** The first Players extraction used optional `ok` types incompatible with the shared `adminFetch` constraint, which broke `npm run typecheck`.
- **Fix:** Introduced a dedicated `PlayerMutationResponse` with required `ok: boolean` and reused it across the extracted mutation handlers.
- **Files modified:** `src/components/admin/players-tab.tsx`
- **Verification:** `npm run typecheck`
- **Committed in:** `e94929c` (part of Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Necessary for correctness of the extracted tab implementation. No scope creep.

## Issues Encountered
- The repo’s Vitest setup is `environment: "node"`, so DOM-level component tests were not available for this slice. This was handled by using a small source-level RED test plus the plan-mandated browser parity checkpoint.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- The Accounts/Players extraction pattern is in place for the remaining tab pairs in Phase 02.
- The keep-mounted shell behavior is established in [src/app/admin/page.tsx](/Users/rouxsparrow/Code/club-genie/src/app/admin/page.tsx) and can be extended to the remaining tabs in the next plans.
- Human verification was completed with `approved`, so this plan is ready for downstream shell-reduction work after the remaining tab extractions land.

## Self-Check: PASSED

- Found summary file: `.planning/phases/02-tab-extraction/02-tab-extraction-01-SUMMARY.md`
- Found commit: `a25201e`
- Found commit: `e94929c`
- Found commit: `88b9099`

---
*Phase: 02-tab-extraction*
*Completed: 2026-04-09*
